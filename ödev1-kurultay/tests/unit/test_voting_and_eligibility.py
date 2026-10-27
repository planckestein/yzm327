"""Strategy (oylama algoritmaları), sayım/karar, Proposal aggregate ve Chain of Responsibility."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from fractions import Fraction

import pytest

from kurultay.domain.eligibility import (
    EligibilityContext,
    EligibilityDecision,
    build_electorate,
    build_voting_chain,
)
from kurultay.domain.exceptions import InvalidValue, NotEligible, ProposalClosed
from kurultay.domain.ontology import Ontology
from kurultay.domain.proposal import Proposal, ProposalKind, ProposalStatus
from kurultay.domain.regulation import Regulation
from kurultay.domain.user import Role
from kurultay.domain.voting import (
    Ballot,
    Choice,
    Electorate,
    ExpertWeighted,
    Outcome,
    QuadraticVoting,
    ReputationWeighted,
    SimpleMajority,
    VoterProfile,
    create_strategy,
    decide,
    tally,
)
from tests.conftest import make_user

NOW = datetime(2026, 10, 20, 12, 0)
ALLOW = EligibilityDecision(True, "", ())


def ballot(voter: str, choice: Choice, intensity: int = 1, agent: bool = False) -> Ballot:
    return Ballot(voter, choice, NOW, intensity, agent)


def electorate(*voters: VoterProfile, agent_weight: Fraction = Fraction(1, 2)) -> Electorate:
    return Electorate(tuple(voters), agent_weight)


# ---------------------------------------------------------------- stratejiler


def test_registry_creates_every_strategy() -> None:
    reg = Regulation(quadratic_credits=16)
    assert isinstance(create_strategy("basit", reg), SimpleMajority)
    assert create_strategy("karesel", reg).max_weight(VoterProfile("x")) == 4  # √16
    assert isinstance(create_strategy("uzman", reg), ExpertWeighted)
    assert isinstance(create_strategy("itibar", reg), ReputationWeighted)
    with pytest.raises(InvalidValue):
        create_strategy("yok", reg)


def test_quadratic_voting_costs_and_budget() -> None:
    qv = QuadraticVoting(credits=9)
    assert [qv.cost(k) for k in (1, 2, 3)] == [1, 4, 9]
    qv.validate(3, VoterProfile("x"))
    with pytest.raises(InvalidValue):
        qv.validate(4, VoterProfile("x"))  # 16 kredi > 9


def test_quadratic_extra_credits_are_shared_but_one_vote_is_always_free() -> None:
    """Gerçek karesel oylamada kıtlık gerekir: ek krediler (8) açık oylamalar arasında paylaşılır."""
    qv = QuadraticVoting(credits=9)
    assert [qv.extra_cost(k) for k in (1, 2, 3)] == [0, 3, 8]
    qv.validate(2, VoterProfile("x"), spent=3)  # 3 + 3 ≤ 8
    with pytest.raises(InvalidValue, match="Ek kredin yetmiyor"):
        qv.validate(3, VoterProfile("x"), spent=3)  # 3 + 8 > 8
    qv.validate(1, VoterProfile("x"), spent=8)  # bütçe bitse de 1 oy her zaman kullanılır


def test_quadratic_voting_lets_an_intense_minority_outweigh_an_indifferent_majority() -> None:
    """Basit çoğunlukta 3'e 2 kazanan çoğunluk, konuyu çok önemseyen azınlığa karesel oylamada yenilir."""
    voters = [VoterProfile(v) for v in "abcde"]
    ballots_simple = [ballot("a", Choice.YES), ballot("b", Choice.YES), ballot("c", Choice.YES),
                      ballot("d", Choice.NO), ballot("e", Choice.NO)]
    simple = tally(SimpleMajority(), ballots_simple, electorate(*voters))
    assert simple.yes > simple.no

    ballots_qv = [ballot("a", Choice.YES), ballot("b", Choice.YES), ballot("c", Choice.YES),
                  ballot("d", Choice.NO, 3), ballot("e", Choice.NO, 3)]
    quadratic = tally(QuadraticVoting(9), ballots_qv, electorate(*voters))
    assert quadratic.no > quadratic.yes


def test_expert_weight_and_reputation_cap() -> None:
    expert = VoterProfile("uzman", expertise_level=3)
    assert ExpertWeighted().weight(ballot("uzman", Choice.YES), expert) == 4
    whale = VoterProfile("balina", reputation=100_000)
    newbie = VoterProfile("yeni", reputation=0)
    rw = ReputationWeighted()
    assert rw.weight(ballot("yeni", Choice.YES), newbie) == 1.0
    assert rw.weight(ballot("balina", Choice.YES), whale) == 3.0  # tavan: kimse tek başına karar veremez


def test_agent_votes_are_weighted_by_regulation() -> None:
    voters = electorate(VoterProfile("insan"), VoterProfile("yz", is_agent=True), agent_weight=Fraction(1, 2))
    t = tally(SimpleMajority(), [ballot("insan", Choice.NO), ballot("yz", Choice.YES, agent=True)], voters)
    assert (t.yes, t.no) == (0.5, 1.0)


# ---------------------------------------------------------------- karar


def test_early_acceptance_when_remaining_votes_cannot_change_the_result() -> None:
    voters = electorate(*(VoterProfile(v) for v in "abcde"))
    t = tally(SimpleMajority(), [ballot(v, Choice.YES) for v in "abc"], voters)
    decision = decide(t, Fraction(1, 2), Fraction(3, 10), deadline_passed=False)
    assert decision is not None and decision.outcome is Outcome.ACCEPTED


def test_open_while_undecided_then_quorum_at_deadline() -> None:
    voters = electorate(*(VoterProfile(v) for v in "abcdefghij"))
    t = tally(SimpleMajority(), [ballot("a", Choice.YES)], voters)
    assert decide(t, Fraction(1, 2), Fraction(3, 10), deadline_passed=False) is None
    late = decide(t, Fraction(1, 2), Fraction(3, 10), deadline_passed=True)
    assert late is not None and late.outcome is Outcome.REJECTED and "yeter sayı" in late.reason


def test_supermajority_requires_three_fifths() -> None:
    voters = electorate(*(VoterProfile(v) for v in "abcde"))
    ballots = [ballot("a", Choice.YES), ballot("b", Choice.YES), ballot("c", Choice.YES), ballot("d", Choice.NO)]
    t = tally(SimpleMajority(), ballots, voters)
    assert decide(t, Fraction(3, 5), Fraction(0), deadline_passed=False) is not None  # 3/5 = eşik → kabul
    t2 = tally(SimpleMajority(), ballots[:2] + [ballot("c", Choice.NO), ballot("d", Choice.NO), ballot("e", Choice.NO)], voters)
    result = decide(t2, Fraction(3, 5), Fraction(0), deadline_passed=False)
    assert result is not None and result.outcome is Outcome.REJECTED


# ---------------------------------------------------------------- Proposal aggregate


def open_proposal(kind: ProposalKind = ProposalKind.NEW_TOPIC, concepts: frozenset[str] = frozenset({"ekonomi"}),
                  regulation: Regulation | None = None) -> Proposal:
    return Proposal.open(kind, "Başlık", "Gerekçe", "oneren", concepts, regulation or Regulation(), NOW, target_id="t1")


def test_proposal_takes_rules_from_regulation_and_announces_voting() -> None:
    p = open_proposal(ProposalKind.DELETE_TOPIC)
    assert (p.strategy_name, p.threshold) == ("karesel", "3/5")
    assert p.deadline == NOW + timedelta(days=3)
    assert [e.__class__.__name__ for e in p.events] == ["ProposalOpened", "VotingStarted"]


def test_proposal_requires_a_positive_eligibility_decision() -> None:
    p = open_proposal()
    with pytest.raises(NotEligible):
        p.cast(ballot("x", Choice.YES), EligibilityDecision(False, "ilgisiz"))
    p.cast(ballot("x", Choice.YES), ALLOW)
    with pytest.raises(NotEligible):
        p.cast(ballot("x", Choice.NO), ALLOW)


def test_proposal_closes_and_rejects_further_votes() -> None:
    p = open_proposal()
    voters = electorate(VoterProfile("a"), VoterProfile("b"))
    p.cast(ballot("a", Choice.YES), ALLOW)
    p.cast(ballot("b", Choice.YES), ALLOW)
    p.try_close(SimpleMajority(), voters, Regulation(), NOW)
    assert p.status is ProposalStatus.ACCEPTED and p.result is not None
    with pytest.raises(ProposalClosed):
        p.cast(ballot("c", Choice.YES), ALLOW)


def test_supersede_drops_an_open_proposal() -> None:
    p = open_proposal(ProposalKind.CLOSE_TOPIC)
    p.supersede("Konu başka uzlaşmayla kapandı.", NOW)
    assert p.status is ProposalStatus.REJECTED and p.events[-1].__class__.__name__ == "ProposalRejected"


# ---------------------------------------------------------------- Chain of Responsibility


def check(user, proposal: Proposal, ontology: Ontology, regulation: Regulation | None = None,  # type: ignore[no-untyped-def]
          intensity: int = 1) -> EligibilityDecision:
    reg = regulation or Regulation()
    strategy = create_strategy(proposal.strategy_name, reg)
    return build_voting_chain().handle(EligibilityContext(user, proposal, ontology, reg, date(2026, 10, 20), strategy, intensity))


def test_chain_passes_every_link_for_an_interested_member(ontology: Ontology) -> None:
    decision = check(make_user(interests=("ekonomi",)), open_proposal(concepts=frozenset({"vergi"})), ontology)
    assert decision.allowed
    assert decision.trail == ("Kimlik", "Oylama açık", "Rol", "Yönetmelik", "Ontolojik ilgi", "Tek oy", "Pusula kuralı")


def test_chain_stops_at_the_first_failing_link(ontology: Ontology) -> None:
    proposal = open_proposal(concepts=frozenset({"saglik"}))
    anonymous = check(None, proposal, ontology)
    assert not anonymous.allowed and anonymous.trail == ()
    unrelated = check(make_user(interests=("ekonomi",)), proposal, ontology)
    assert not unrelated.allowed and unrelated.trail[-1] == "Yönetmelik" and "Sağlık" in unrelated.reason


def test_related_concept_edge_grants_a_vote(ontology: Ontology) -> None:
    proposal = open_proposal(concepts=frozenset({"veri-gizliligi"}))
    assert check(make_user(interests=("temel-haklar",)), proposal, ontology).allowed


def test_regulation_link_blocks_minors_and_self_expertise(ontology: Ontology) -> None:
    young = make_user(birth=date(2015, 1, 1))
    assert "yaşında" in check(young, open_proposal(), ontology).reason
    user = make_user(interests=("hukuk",))
    own = Proposal.open(ProposalKind.GRANT_EXPERTISE, "Uzmanlık", "", user.id, frozenset({"hukuk"}), Regulation(), NOW,
                        target_id=user.id)
    assert "Kendi uzmanlık" in check(user, own, ontology).reason


def test_role_link_respects_agent_regulation(ontology: Ontology) -> None:
    agent = make_user("yz_ajan1", role=Role.AI_AGENT)
    assert check(agent, open_proposal(), ontology).allowed
    assert not check(agent, open_proposal(), ontology, Regulation(agents_may_vote=False)).allowed


def test_ballot_rule_link_checks_quadratic_budget(ontology: Ontology) -> None:
    proposal = open_proposal(ProposalKind.HIDE_MESSAGE)
    assert check(make_user(), proposal, ontology, intensity=3).allowed
    decision = check(make_user(), proposal, ontology, intensity=4)
    assert not decision.allowed and decision.trail[-1] == "Tek oy"


def test_electorate_contains_only_interested_people(ontology: Ontology) -> None:
    users = [make_user("ekonomici", ("ekonomi",)), make_user("hekim", ("saglik",)), make_user("yz_eko", ("vergi",), Role.AI_AGENT)]
    electorate_ = build_electorate(users, open_proposal(concepts=frozenset({"vergi"})), ontology, Regulation(), date(2026, 10, 20))
    names = {u.nickname.value for u in users if u.id in electorate_}
    assert names == {"ekonomici", "yz_eko"}


# ---------------------------------------------------------------- seçmen kütüğü (dondurulmuş)


def test_frozen_electorate_is_used_instead_of_current_users(ontology: Ontology) -> None:
    early = make_user("erken", ("vergi",))
    proposal = open_proposal(concepts=frozenset({"vergi"}))
    proposal.freeze_electorate(build_electorate([early], proposal, ontology, Regulation(), date(2026, 10, 20)))
    late = make_user("gec", ("vergi",))
    again = build_electorate([early, late], proposal, ontology, Regulation(), date(2026, 10, 20))
    assert early.id in again and late.id not in again
    decision = check(late, proposal, ontology)
    assert not decision.allowed and "Seçmen kütüğü" in decision.reason
    assert check(early, proposal, ontology).allowed


def test_electorate_cannot_be_frozen_twice(ontology: Ontology) -> None:
    proposal = open_proposal()
    proposal.freeze_electorate(electorate())
    with pytest.raises(Exception, match="dondurulmuş"):
        proposal.freeze_electorate(electorate())


def test_tally_remaining_weight_matches_a_full_recount() -> None:
    voters = [VoterProfile(f"v{i}", reputation=i * 7, expertise_level=i % 3, is_agent=i % 5 == 0) for i in range(40)]
    el = Electorate(tuple(voters), Fraction(1, 2))
    ballots = [ballot(f"v{i}", Choice.YES if i % 3 else Choice.NO, 1, i % 5 == 0) for i in range(0, 40, 2)]
    for strategy in (SimpleMajority(), ExpertWeighted(), ReputationWeighted(), QuadraticVoting(9)):
        t = tally(strategy, ballots, el)
        voted = {b.voter_id for b in ballots}
        expected = sum(strategy.max_weight(v) * (0.5 if v.is_agent else 1.0) for v in voters if v.user_id not in voted)
        assert t.remaining_max == pytest.approx(round(expected, 2), abs=0.02)
