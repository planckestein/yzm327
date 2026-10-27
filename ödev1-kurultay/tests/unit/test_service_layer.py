"""Servis katmanı: komut işleyicileri, Message Bus, Observer, YZ ajanları ve Protection Proxy.

Hepsi ``FakeUnitOfWork`` ve sahte YZ modeliyle, veritabanı olmadan çalışır.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from kurultay.adapters.llm.ollama import FallbackExpertModel, ModelUnavailable, OllamaExpertModel
from kurultay.adapters.llm.rule_based import RuleBasedExpertModel
from kurultay.domain import commands as c
from kurultay.domain import events
from kurultay.domain.exceptions import AccessDenied, ContentRejected, InvalidTransition, InvalidValue, NotEligible
from kurultay.domain.ledger import verify_chain
from kurultay.domain.proposal import ProposalStatus
from kurultay.domain.topic import Message, Topic
from kurultay.domain.user import PrivateProfile
from kurultay.service_layer.agents import ExpertModelRegistry
from kurultay.service_layer.messagebus import MessageBus
from kurultay.service_layer.notifications import VotingNotificationCenter
from kurultay.service_layer.ports import AssessmentRequest
from tests.conftest import Harness
from tests.fakes import FakeExpertModel, FakeUnitOfWork


def community(h: Harness, n: int = 4, interests: tuple[str, ...] = ("ekonomi",)) -> list[str]:
    return [h.register(f"uye{i}", interests) for i in range(n)]


def accepted_topic(h: Harness, members: list[str], title: str = "Vergi adaleti") -> str:
    topic_id = str(h.run(c.ProposeTopic(members[0], title, "KDV ve gelir vergisi bütçe yükü", ("vergi",))))
    proposal = h.proposal_for(topic_id)
    for m in members:
        if proposal.is_open:
            h.run(c.CastVote(m, proposal.id, "evet"))
    return topic_id


def node(h: Harness, node_id: str):  # type: ignore[no-untyped-def]
    return h.uow.topics.get_node(node_id)


# ---------------------------------------------------------------- kayıt


def test_register_user_keeps_pii_but_publishes_only_the_nickname(harness: Harness) -> None:
    user_id = harness.register("ayse")
    registered = [e for e in harness.app.bus.handled if isinstance(e, events.UserRegistered)][0]
    assert registered.nickname == "ayse" and "Soyad" not in str(registered)
    user = harness.uow.users.get(user_id)
    assert user is not None and user.personal_info.last_name == "Soyad"
    assert "Soyad" not in str([e.payload for e in harness.uow.ledger.entries])


def test_register_rejects_duplicates_and_minors(harness: Harness) -> None:
    harness.register("ayse")
    with pytest.raises(InvalidValue):
        harness.register("AYSE")
    with pytest.raises(InvalidValue):
        harness.register("cocuk", birth=date(2020, 1, 1))


# ---------------------------------------------------------------- konu önerisi uçtan uca


def test_topic_proposal_goes_to_vote_notifies_and_activates(harness: Harness) -> None:
    members = community(harness)
    harness.register("hekim", ("saglik",))
    agent = harness.register("yz_eko", ("ekonomi",), role="yz_ajan")
    topic_id = str(harness.run(c.ProposeTopic(members[0], "Vergi adaleti", "KDV dar gelirliye yük", ("vergi",))))

    topic = node(harness, topic_id)
    proposal = harness.proposal_for(topic_id)
    assert topic.state.name == "oylamada" and proposal.kind.value == "yeni_konu"
    # Observer: ilgili üyelere bildirim (öneren ve ilgisiz hekim hariç), ajana inceleme
    notified = {n.user_id for n in harness.uow.notifications.items}
    assert notified == set(members[1:])
    assert proposal.has_voted(agent) and harness.model.requests  # ajan oy verdi
    assert proposal.ballot_of(agent).is_agent  # type: ignore[union-attr]

    for m in members[:3]:
        if proposal.is_open:
            harness.run(c.CastVote(m, proposal.id, "evet"))
    assert proposal.status is ProposalStatus.ACCEPTED
    assert node(harness, topic_id).state.name == "aktif"
    assert harness.uow.users.get(members[0]).reputation == 10  # type: ignore[union-attr]


def test_uninterested_member_cannot_vote(harness: Harness) -> None:
    members = community(harness)
    outsider = harness.register("hekim", ("saglik",))
    topic_id = str(harness.run(c.ProposeTopic(members[0], "Vergi", "KDV", ("vergi",))))
    with pytest.raises(NotEligible, match="kavram"):
        harness.run(c.CastVote(outsider, harness.proposal_for(topic_id).id, "evet"))


def test_threats_are_the_only_content_that_is_blocked(harness: Harness) -> None:
    members = community(harness)
    topic_id = accepted_topic(harness, members)
    with pytest.raises(ContentRejected):
        harness.run(c.PostMessage(members[1], topic_id, "Seni bulacağım."))
    harness.run(c.PostMessage(members[1], topic_id, "Bu fikir tamamen saçma, hiç katılmıyorum."))


def test_subtopic_proposal_hangs_under_the_parent(harness: Harness) -> None:
    members = community(harness)
    parent = accepted_topic(harness, members)
    sub_id = str(harness.run(c.ProposeTopic(members[1], "KDV oranları", "Temel gıdada KDV", (), parent)))
    sub = node(harness, sub_id)
    assert isinstance(sub, Topic) and sub.parent is not None and sub.parent.id == parent
    assert sub.concept_ids == frozenset({"vergi"})  # üst konudan miras
    assert harness.proposal_for(sub_id).kind.value == "alt_konu"


# ---------------------------------------------------------------- mesaj gizleme (karesel oylama)


def test_message_hiding_masks_but_never_deletes(harness: Harness) -> None:
    members = community(harness, 5)
    topic_id = accepted_topic(harness, members)
    message_id = str(harness.run(c.PostMessage(members[1], topic_id, "Hakaret içeren bir mesaj")))
    proposal_id = str(harness.run(c.ProposeMessageHiding(members[2], message_id, "Hakaret")))
    proposal = harness.uow.proposals.get(proposal_id)
    assert proposal is not None and proposal.strategy_name == "karesel"
    for m in members[:4]:
        if proposal.is_open:
            harness.run(c.CastVote(m, proposal_id, "evet", 2))
    message = node(harness, message_id)
    assert isinstance(message, Message) and message.mask is not None
    assert message.text == "Hakaret içeren bir mesaj"
    assert harness.uow.users.get(members[1]).reputation == 0  # type: ignore[union-attr]  # +1 -5 → 0
    with pytest.raises(InvalidTransition):
        harness.run(c.ProposeMessageHiding(members[3], message_id, "tekrar"))


def test_intensity_budget_is_shared_across_open_quadratic_votes_and_freed_on_close(harness: Harness) -> None:
    members = community(harness, 6)
    topic_id = accepted_topic(harness, members)
    first, second = (str(harness.run(c.PostMessage(members[1], topic_id, f"Sert mesaj {i}"))) for i in range(2))
    p1 = str(harness.run(c.ProposeMessageHiding(members[2], first, "sert")))
    p2 = str(harness.run(c.ProposeMessageHiding(members[2], second, "sert")))
    harness.run(c.CastVote(members[0], p1, "hayir", 3))  # 8 ek kredinin hepsi
    with pytest.raises(NotEligible, match="Ek kredin yetmiyor"):
        harness.run(c.CastVote(members[0], p2, "hayir", 2))
    harness.run(c.CastVote(members[0], p2, "hayir", 1))  # sesi yine de sayılır
    assert harness.uow.proposals.quadratic_extra_spent(members[0]) == 8
    for m in members[1:]:
        if harness.uow.proposals.get(p1).is_open:  # type: ignore[union-attr]
            harness.run(c.CastVote(m, p1, "hayir"))
    assert not harness.uow.proposals.get(p1).is_open  # type: ignore[union-attr]
    assert harness.uow.proposals.quadratic_extra_spent(members[0]) == 0  # kapanan oylamanın kredisi geri gelir


# ---------------------------------------------------------------- düzenleme, silme, uzlaşma


def test_anyone_can_propose_an_edit_and_old_version_is_kept(harness: Harness) -> None:
    members = community(harness)
    topic_id = accepted_topic(harness, members, "Eski başlık")
    proposal_id = str(harness.run(c.ProposeTopicEdit(members[3], topic_id, "Yeni başlık", "Yeni açıklama", "Daha açık")))
    for m in members:
        harness.run(c.CastVote(m, proposal_id, "evet")) if harness.uow.proposals.get(proposal_id).is_open else None  # type: ignore[union-attr]
    topic = node(harness, topic_id)
    assert topic.title == "Yeni başlık" and [r.title for r in topic.revisions] == ["Eski başlık", "Yeni başlık"]


def test_deletion_vote_rejected_returns_topic_to_active(harness: Harness) -> None:
    members = community(harness, 4)
    topic_id = accepted_topic(harness, members)
    proposal_id = str(harness.run(c.ProposeTopicDeletion(members[1], topic_id, "Gereksiz")))
    assert node(harness, topic_id).state.name == "silinme_oylamasinda"
    with pytest.raises(InvalidTransition):
        harness.run(c.ProposeTopicDeletion(members[2], topic_id, "İkinci kez"))
    harness.run(c.CastVote(members[1], proposal_id, "evet", 1))
    harness.run(c.CastVote(members[2], proposal_id, "hayir", 3))
    harness.run(c.CastVote(members[3], proposal_id, "hayir", 3))
    assert harness.uow.proposals.get(proposal_id).status is ProposalStatus.REJECTED  # type: ignore[union-attr]
    assert node(harness, topic_id).state.name == "aktif"


def test_deletion_vote_accepted_hides_topic_and_drops_its_open_proposals(harness: Harness) -> None:
    members = community(harness, 4)
    topic_id = accepted_topic(harness, members)
    deletion = str(harness.run(c.ProposeTopicDeletion(members[1], topic_id, "Reklam")))
    for m in members:
        harness.run(c.CastVote(m, deletion, "evet", 3)) if harness.uow.proposals.get(deletion).is_open else None  # type: ignore[union-attr]
    assert node(harness, topic_id).state.name == "gizlendi"


def test_consensus_archives_and_supersedes_competing_proposals(harness: Harness) -> None:
    members = community(harness, 4)
    topic_id = accepted_topic(harness, members)
    first = str(harness.run(c.ProposeConsensus(members[0], topic_id, "Ortak tutum A")))
    second = str(harness.run(c.ProposeConsensus(members[1], topic_id, "Ortak tutum B")))
    for m in members:
        if harness.uow.proposals.get(first).is_open:  # type: ignore[union-attr]
            harness.run(c.CastVote(m, first, "evet"))
    assert node(harness, topic_id).state.name == "arsivlendi"
    rival = harness.uow.proposals.get(second)
    assert rival is not None and rival.status is ProposalStatus.REJECTED and "uzlaşma" in rival.result.reason  # type: ignore[union-attr]


# ---------------------------------------------------------------- yönetmelik ve uzmanlık


def test_regulation_change_creates_new_version(harness: Harness) -> None:
    members = community(harness, 3)
    proposal_id = str(harness.run(c.ProposeRegulationChange(members[0], "quorum_percent", "50", "Daha geniş katılım")))
    for m in members:
        harness.run(c.CastVote(m, proposal_id, "evet", 3)) if harness.uow.proposals.get(proposal_id).is_open else None  # type: ignore[union-attr]
    current = harness.uow.regulations.current()
    assert current.quorum_percent == 50 and current.version == 2
    with pytest.raises(InvalidValue):
        harness.run(c.ProposeRegulationChange(members[0], "quorum_percent", "500", "geçersiz"))


def test_expertise_is_granted_by_the_concept_community(harness: Harness) -> None:
    candidate = harness.register("aday", ("hukuk",))
    voters = [harness.register(f"hukukcu{i}", ("hukuk",)) for i in range(3)]
    proposal_id = str(harness.run(c.ProposeExpertise(candidate, "hukuk", 2, "Avukatım")))
    with pytest.raises(NotEligible, match="Kendi"):
        harness.run(c.CastVote(candidate, proposal_id, "evet"))
    for v in voters:
        harness.run(c.CastVote(v, proposal_id, "evet")) if harness.uow.proposals.get(proposal_id).is_open else None  # type: ignore[union-attr]
    user = harness.uow.users.get(candidate)
    assert user is not None and user.expertise_level(frozenset({"hukuk"})) == 2 and user.role.value == "uzman"


# ---------------------------------------------------------------- süre ve yeter sayı


def test_deadline_closes_with_quorum_rule(harness: Harness) -> None:
    members = community(harness, 10)
    topic_id = str(harness.run(c.ProposeTopic(members[0], "Vergi", "KDV", ("vergi",))))
    proposal = harness.proposal_for(topic_id)
    harness.run(c.CastVote(members[0], proposal.id, "evet"))
    harness.clock.advance(timedelta(days=4))
    assert harness.app.bus.handle(c.CloseDueProposals(None)) == 1
    assert proposal.status is ProposalStatus.REJECTED and "yeter sayı" in proposal.result.reason  # type: ignore[union-attr]
    assert node(harness, topic_id).state.name == "reddedildi"


# ---------------------------------------------------------------- defter


def test_every_event_is_appended_to_a_valid_hash_chain_and_replicated(harness: Harness) -> None:
    members = community(harness)
    accepted_topic(harness, members)
    entries = harness.uow.ledger.entries
    kinds = {e.kind for e in entries}
    assert {"UserRegistered", "TopicProposed", "ProposalOpened", "VotingStarted", "VoteCast", "ProposalAccepted", "TopicStateChanged"} <= kinds
    assert verify_chain(entries).valid
    assert all(list(node_.entries()) == entries for node_ in harness.nodes)


# ---------------------------------------------------------------- Message Bus


def test_failing_event_handler_does_not_stop_others() -> None:
    uow = FakeUnitOfWork()
    seen: list[str] = []

    def broken(event: events.Event) -> None:
        raise RuntimeError("bozuk")

    bus = MessageBus(uow, {events.UserRegistered: [broken, lambda e: seen.append("ikinci")]}, {})
    bus.handle(events.UserRegistered("1", "x", "uye"))
    assert seen == ["ikinci"]


def test_event_handlers_can_queue_follow_up_commands() -> None:
    uow = FakeUnitOfWork()
    handled: list[str] = []
    bus = MessageBus(
        uow,
        {events.UserRegistered: [lambda e: [c.CloseDueProposals(None)]]},
        {c.CloseDueProposals: lambda cmd: handled.append("kapat")},
    )
    bus.handle(events.UserRegistered("1", "x", "uye"))
    assert handled == ["kapat"]


# ---------------------------------------------------------------- Observer


def test_observers_can_be_attached_and_detached() -> None:
    center = VotingNotificationCenter()
    calls: list[str] = []

    class Spy:
        def update(self, event, uow):  # type: ignore[no-untyped-def]
            calls.append(event.proposal_id)
            return []

    spy = Spy()
    center.attach(spy)
    center.attach(spy)
    center.notify(events.VotingStarted("p1", "t"), FakeUnitOfWork())
    center.detach(spy)
    center.notify(events.VotingStarted("p2", "t"), FakeUnitOfWork())
    assert calls == ["p1"]


def test_agents_stay_silent_when_regulation_forbids(make_harness) -> None:  # type: ignore[no-untyped-def]
    from kurultay.domain.regulation import Regulation

    h = make_harness()
    h.uow.regulations.append(Regulation(version=2, agents_may_vote=False), None, h.clock.now())
    members = community(h)
    h.register("yz_ajan", ("ekonomi",), role="yz_ajan")
    topic_id = str(h.run(c.ProposeTopic(members[0], "Vergi", "KDV", ("vergi",))))
    assert not any(b.is_agent for b in h.proposal_for(topic_id).ballots)


# ---------------------------------------------------------------- YZ adaptörleri ve registry


def request(kind: str = "yeni_konu", **kw: object) -> AssessmentRequest:
    base: dict[str, object] = {"prompt": "…", "proposal_kind": kind, "title": "t", "text": "", "relevance": 50}
    base.update(kw)
    return AssessmentRequest(**base)  # type: ignore[arg-type]


def test_rule_based_model_protects_speech_and_minorities() -> None:
    model = RuleBasedExpertModel()
    assert not model.assess(request("mesaj_gizleme", text="Bu görüşe katılmıyorum")).approve
    assert not model.assess(request("mesaj_gizleme", text="sen aptal birisin")).approve  # hakaret de görüştür
    assert model.assess(request("mesaj_gizleme", text="Büyük indirim! Kapıda ödeme, ücretsiz kargo")).approve
    assert not model.assess(request("yonetmelik", regulation_change=("esik_konu_silme", "1/2"))).approve
    assert not model.assess(request("yeni_konu", contains_threat=True)).approve
    assert not model.assess(request("konu_silme", discussion_size=5)).approve


def test_ollama_response_parsing() -> None:
    result = OllamaExpertModel.parse("KARAR: HAYIR\nGEREKÇE: Azınlığı korumuyor.", "m")
    assert not result.approve and result.rationale == "Azınlığı korumuyor."
    with pytest.raises(ModelUnavailable):
        OllamaExpertModel.parse("bilmiyorum", "m")


def test_fallback_model_cascades_when_local_llm_is_down() -> None:
    offline = OllamaExpertModel("llama3.2", url="http://127.0.0.1:9", timeout=0.5)
    model = FallbackExpertModel(offline, FakeExpertModel(approve=False))
    result = model.assess(request())
    assert not result.approve and "kapalıydı" in result.model_label


def test_registry_picks_model_by_key_with_default() -> None:
    registry = ExpertModelRegistry()
    fake = FakeExpertModel()
    registry.register("kural", lambda opt: RuleBasedExpertModel(), default=True)
    registry.register("sahte", lambda opt: fake)
    assert registry.create("sahte:x") is fake
    assert isinstance(registry.create(None), RuleBasedExpertModel)
    assert isinstance(registry.create("bilinmeyen"), RuleBasedExpertModel)


# ---------------------------------------------------------------- Protection Proxy


def test_authorization_proxy_requires_login_and_role(harness: Harness) -> None:
    with pytest.raises(AccessDenied):
        harness.run(c.ProposeTopic(None, "Başlık", "…", ("vergi",)))
    agent = harness.register("yz_ajan", ("ekonomi",), role="yz_ajan")
    with pytest.raises(AccessDenied):
        harness.run(c.ProposeTopic(agent, "Ajan konu açamaz", "…", ("vergi",)))
    with pytest.raises(AccessDenied):
        harness.run(c.RegisterUser(None, "sahte_yz", "a", "b", date(2000, 1, 1), "x", "sifre1234", "yz_ajan"))


def test_profile_proxy_shows_pii_only_to_the_owner(harness: Harness) -> None:
    owner = harness.register("sahip")
    other = harness.register("baskasi")
    assert isinstance(harness.app.profiles.profile("sahip", owner), PrivateProfile)
    for viewer in (other, None):
        profile = harness.app.profiles.profile("sahip", viewer)
        assert not isinstance(profile, PrivateProfile) and not hasattr(profile, "personal_info")


# ---------------------------------------------------------------- seçmen kütüğü


def test_members_who_join_after_voting_opens_cannot_vote_on_it(harness: Harness) -> None:
    members = community(harness)
    topic_id = str(harness.run(c.ProposeTopic(members[0], "Vergi", "KDV oranları", ("vergi",))))
    proposal = harness.proposal_for(topic_id)
    assert proposal.electorate is not None and len(proposal.electorate) == len(members)
    newcomer = harness.register("yeni_uye", ("ekonomi",))
    with pytest.raises(NotEligible, match="Seçmen kütüğü"):
        harness.run(c.CastVote(newcomer, proposal.id, "evet"))
    later = harness.run(c.ProposeTopic(members[1], "Bütçe", "Bütçe açığı", ("vergi",)))
    assert newcomer in harness.proposal_for(str(later)).electorate  # sonraki oylamalarda seçmendir


def test_voting_started_notifies_the_frozen_electorate_in_bulk(harness: Harness) -> None:
    members = community(harness, 5)
    harness.run(c.ProposeTopic(members[0], "Vergi", "KDV oranları", ("vergi",)))
    notified = {n.user_id for n in harness.uow.notifications.items}
    assert notified == set(members[1:])  # öneren hariç herkes, bir kez
