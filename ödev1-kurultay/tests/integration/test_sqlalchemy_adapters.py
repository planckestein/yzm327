"""Gerçek SQLite (bellek içi) ile repository, Unit of Work, append-only tetikleyiciler ve defter düğümleri."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

import pytest
from sqlalchemy import Engine, text
from sqlalchemy.exc import DatabaseError

from kurultay.adapters.ledger_nodes import JsonLinesLedgerNode
from kurultay.bootstrap import sqlite_engine
from kurultay.domain.ledger import LedgerEntry, reach_consensus, verify_chain
from kurultay.domain.proposal import Proposal, ProposalKind
from kurultay.domain.regulation import Regulation
from kurultay.domain.topic import Topic
from kurultay.domain.voting import Ballot, Choice
from kurultay.reference_data import ensure_reference_data
from kurultay.service_layer.unit_of_work import SqlAlchemyUnitOfWork
from tests.conftest import make_user

NOW = datetime(2026, 10, 20, 12, 0)


@pytest.fixture
def engine() -> Engine:
    e = sqlite_engine("sqlite:///:memory:")
    ensure_reference_data(lambda: SqlAlchemyUnitOfWork(e), NOW)
    return e


def uow(engine: Engine) -> SqlAlchemyUnitOfWork:
    return SqlAlchemyUnitOfWork(engine)


def test_user_round_trip_keeps_value_objects(engine: Engine) -> None:
    user = make_user("kalici", ("ekonomi", "vergi"))
    user.grant_expertise("hukuk", 2)
    with uow(engine) as u:
        u.users.add(user)
        u.commit()
    with uow(engine) as u:
        loaded = u.users.get_by_nickname("KALICI")
        assert loaded is not None and loaded.id == user.id
        assert loaded.personal_info == user.personal_info and loaded.expertise == user.expertise
        assert loaded.interests == frozenset({"ekonomi", "vergi", "hukuk"}) and loaded.role.value == "uzman"


def test_topic_tree_round_trip(engine: Engine) -> None:
    author = make_user("yazar")
    root = Topic.propose(author.id, "Kök", "Açıklama", frozenset({"ekonomi"}), NOW)
    root.start_voting()
    root.accept()
    first = root.post_message(author.id, "Birinci", NOW)
    sub = Topic.propose(author.id, "Alt", "Alt açıklama", frozenset({"vergi"}), NOW)
    root.attach_subtopic(sub)
    sub.start_voting()
    sub.accept()
    sub.post_message(author.id, "Alt mesaj", NOW, None)
    first.apply_mask("p1", NOW)
    root.revise("Kök (yeni)", "Yeni", "p2", NOW)
    with uow(engine) as u:
        u.users.add(author)
        u.topics.add(root)
        u.commit()
    with uow(engine) as u:
        node = u.topics.get_node(sub.id)
        assert isinstance(node, Topic) and node.parent is not None
        loaded_root = node.root()
        assert loaded_root.title == "Kök (yeni)" and len(loaded_root.revisions) == 2
        assert loaded_root.visible_message_count() == 1
        masked = loaded_root.messages()[0]
        assert masked.mask is not None and masked.text == "Birinci"
        assert node.state.name == "aktif" and loaded_root.concept_ids_in_tree() == {"ekonomi", "vergi"}


def test_proposal_with_ballots_round_trip(engine: Engine) -> None:
    voter = make_user("secmen")
    proposal = Proposal.open(ProposalKind.NEW_TOPIC, "Başlık", "Gerekçe", voter.id, frozenset({"ekonomi"}), Regulation(), NOW)
    with uow(engine) as u:
        u.users.add(voter)
        u.proposals.add(proposal)
        u.commit()
    with uow(engine) as u:
        loaded = u.proposals.get(proposal.id)
        assert loaded is not None
        from kurultay.domain.eligibility import EligibilityDecision

        loaded.cast(Ballot(voter.id, Choice.YES, NOW, 1, False, "katılıyorum"), EligibilityDecision(True))
        u.commit()
    with uow(engine) as u:
        again = u.proposals.get(proposal.id)
        assert again is not None and again.ballots[0].rationale == "katılıyorum"
        assert again.strategy_name == "basit" and again.deadline == proposal.deadline


def test_uncommitted_work_is_rolled_back(engine: Engine) -> None:
    with uow(engine) as u:
        u.users.add(make_user("hayalet"))
        u.users.flush()
    with uow(engine) as u:
        assert u.users.get_by_nickname("hayalet") is None


def test_regulation_history_is_append_only(engine: Engine) -> None:
    with uow(engine) as u:
        u.regulations.append(u.regulations.current().with_change("quorum_percent", "45"), "p1", NOW)
        u.commit()
    with uow(engine) as u:
        assert u.regulations.current().quorum_percent == 45
        assert [r.version for r, _, _ in u.regulations.history()] == [2, 1]


@pytest.mark.parametrize(
    "statement",
    [
        "UPDATE ledger SET payload = '{}'",
        "DELETE FROM ledger",
        "UPDATE messages SET text = 'değişti'",
        "DELETE FROM messages",
        "DELETE FROM ballots",
        "DELETE FROM masks",
        "DELETE FROM topics",
        "DELETE FROM users",
        "UPDATE topics SET author_id = 'baskasi'",
    ],
)
def test_database_triggers_forbid_rewriting_history(engine: Engine, statement: str) -> None:
    author = make_user("tetik")
    topic = Topic.propose(author.id, "Kök", "…", frozenset(), NOW)
    topic.start_voting()
    topic.accept()
    topic.post_message(author.id, "Kalıcı mesaj", NOW).apply_mask("p", NOW)
    proposal = Proposal.open(ProposalKind.NEW_TOPIC, "t", "", author.id, frozenset(), Regulation(), NOW)
    from kurultay.domain.eligibility import EligibilityDecision

    proposal.cast(Ballot(author.id, Choice.YES, NOW), EligibilityDecision(True))
    with uow(engine) as u:
        u.users.add(author)
        u.topics.add(topic)
        u.proposals.add(proposal)
        u.ledger.append(LedgerEntry.next_after(None, "Deneme", {"a": 1}, NOW))
        u.commit()
    with engine.begin() as conn, pytest.raises(DatabaseError, match="Kurultay"):
        conn.execute(text(statement))


def test_topic_status_may_still_change(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("UPDATE topics SET status = 'aktif'"))  # durum değişikliği serbest (satır yok, hata da yok)


def test_json_lines_nodes_detect_tampering(tmp_path: Path) -> None:
    entries: list[LedgerEntry] = []
    for i in range(6):
        entries.append(LedgerEntry.next_after(entries[-1] if entries else None, "K", {"i": i}, NOW))
    nodes = [JsonLinesLedgerNode(n, tmp_path / f"{n}.jsonl") for n in "ABC"]
    for node in nodes:
        node.sync(entries)
        node.sync(entries)  # idempotent
    assert all(len(n.entries()) == 6 for n in nodes)
    nodes[2].tamper(3, '{"i":"sahte"}')
    report = reach_consensus({n.name: verify_chain(n.entries()) for n in nodes})
    assert [s.agrees for s in report.nodes] == [True, True, False]
    nodes[2].reset_from(entries)
    assert reach_consensus({n.name: verify_chain(n.entries()) for n in nodes}).healthy


def test_reference_data_is_seeded_once(engine: Engine) -> None:
    ensure_reference_data(lambda: SqlAlchemyUnitOfWork(engine), NOW)
    with uow(engine) as u:
        assert len(u.ontology.get().concepts) == 19
        assert len(u.regulations.history()) == 1
    _ = date.today()


def test_frozen_electorate_and_ballots_survive_reloads(engine: Engine) -> None:
    from fractions import Fraction

    from kurultay.domain.eligibility import EligibilityDecision
    from kurultay.domain.voting import Electorate, VoterProfile

    voters = [make_user(f"secmen{i}", ("vergi",)) for i in range(3)]
    proposal = Proposal.open(ProposalKind.NEW_TOPIC, "Vergi", "", voters[0].id, frozenset({"vergi"}), Regulation(), NOW)
    proposal.freeze_electorate(Electorate(tuple(VoterProfile(v.id, 5, 1) for v in voters), Fraction(1, 2)))
    with uow(engine) as u:
        for v in voters:
            u.users.add(v)
        u.proposals.add(proposal)
        u.commit()
    allow = EligibilityDecision(True, "", ())
    for i, v in enumerate(voters[:2]):
        with uow(engine) as u:
            p = u.proposals.get(proposal.id)
            assert p is not None and p.electorate is not None and len(p.electorate) == 3
            assert len(p.ballots) == i  # önceki oylar (önbellek + yeni satırlar) eksiksiz gelir
            p.cast(Ballot(v.id, Choice.YES, NOW), allow)
            u.commit()
    with uow(engine) as u:
        p = u.proposals.get(proposal.id)
        assert p is not None and [b.voter_id for b in p.ballots] == [voters[0].id, voters[1].id]
        assert p.electorate is not None and p.electorate.get(voters[2].id) == VoterProfile(voters[2].id, 5, 1)
        with pytest.raises(DatabaseError):
            u.conn.execute(text("DELETE FROM electorate_voters"))  # type: ignore[union-attr]


def test_unchanged_users_are_not_rewritten(engine: Engine) -> None:
    with uow(engine) as u:
        for i in range(3):
            u.users.add(make_user(f"sabit{i}"))
        u.commit()
    with uow(engine) as u:
        statements: list[str] = []
        from sqlalchemy import event

        event.listen(u.conn, "before_cursor_execute", lambda *args: statements.append(str(args[2])))  # type: ignore[arg-type]
        u.users.list()
        u.commit()
        assert not any(s.startswith("UPDATE users") for s in statements)


def test_sql_quadratic_spend_matches_the_abstract_definition(engine: Engine) -> None:
    """SQL toplamı, soyut repository'deki tanımla (Σ k²−1, yalnızca açık karesel oylamalar) aynı sonucu verir."""
    from kurultay.adapters.repository import AbstractProposalRepository
    from kurultay.domain.eligibility import EligibilityDecision

    voter = make_user("yogun")
    hide = [Proposal.open(ProposalKind.HIDE_MESSAGE, f"Gizle {i}", "", voter.id, frozenset(), Regulation(), NOW)
            for i in range(2)]
    plain = Proposal.open(ProposalKind.NEW_TOPIC, "Konu", "", voter.id, frozenset(), Regulation(), NOW)
    with uow(engine) as u:
        u.users.add(voter)
        for p, k in ((hide[0], 2), (hide[1], 1), (plain, 1)):
            p.cast(Ballot(voter.id, Choice.NO, NOW, k), EligibilityDecision(True))
            u.proposals.add(p)
        assert u.proposals.quadratic_extra_spent(voter.id) == 3  # henüz yazılmamış oylar da sayılır
        u.commit()
    with uow(engine) as u:
        assert u.proposals.quadratic_extra_spent(voter.id) == 3
        assert AbstractProposalRepository.quadratic_extra_spent(u.proposals, voter.id) == 3
