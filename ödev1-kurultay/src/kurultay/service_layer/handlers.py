"""Komut ve olay işleyicileri: servis katmanının orkestrasyonu.

Her işleyici aynı kalıbı izler: Unit of Work aç → aggregate'leri repository'den al → alan nesnesine
iş yaptır (kurallar alan modelindedir) → commit. İşleyiciler SQL, HTTP ya da çerçeve bilmez; bağımlılıkları
(saat, şifre özetleyici, bildirim merkezi, defter düğümleri) ``bootstrap.py`` tarafından enjekte edilir.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from datetime import datetime

from kurultay.domain import commands, events
from kurultay.domain.content_policy import review_content
from kurultay.domain.eligibility import EligibilityContext, build_electorate, build_voting_chain
from kurultay.domain.exceptions import ContentRejected, InvalidTransition, InvalidValue, NotFound
from kurultay.domain.ledger import LedgerEntry
from kurultay.domain.proposal import Proposal, ProposalKind
from kurultay.domain.regulation import CHANGEABLE
from kurultay.domain.topic import Message, Topic
from kurultay.domain.user import Role, User
from kurultay.domain.value_objects import Nickname, PasswordHash, PersonalInfo, new_id
from kurultay.domain.voting import Ballot, Choice, create_strategy
from kurultay.service_layer.notifications import VotingNotificationCenter
from kurultay.service_layer.ports import Clock, LedgerReplica, PasswordHasher
from kurultay.service_layer.unit_of_work import AbstractUnitOfWork

# ====================================================================== yardımcılar


def _actor(uow: AbstractUnitOfWork, cmd: commands.Command) -> User:
    user = uow.users.get(cmd.actor_id) if cmd.actor_id else None
    if user is None:
        raise NotFound("Bu işlem için giriş yapmalısın.")
    return user


def _topic(uow: AbstractUnitOfWork, topic_id: str) -> Topic:
    node = uow.topics.get_node(topic_id)
    if not isinstance(node, Topic):
        raise NotFound("Konu bulunamadı.")
    return node


def _check_content(text: str, title: str = "") -> None:
    review = review_content(text, title=title)
    if not review.allowed:
        raise ContentRejected(review.blockers[0])


def _open_proposal(uow: AbstractUnitOfWork, now: datetime, kind: ProposalKind, **fields: object) -> Proposal:
    """Teklifi açar ve seçmen kütüğünü o anki üyelere, ilgi alanlarına ve yönetmeliğe göre dondurur."""
    regulation = uow.regulations.current()
    proposal = Proposal.open(kind=kind, regulation=regulation, now=now, **fields)  # type: ignore[arg-type]
    proposal.freeze_electorate(build_electorate(uow.users.list(), proposal, uow.ontology.get(), regulation, now.date()))
    uow.proposals.add(proposal)
    return proposal


def close_if_decided(proposal: Proposal, uow: AbstractUnitOfWork, now: datetime) -> None:
    """Teklifin sonucu kesinleştiyse kapatır (erken karar ya da süre dolması)."""
    regulation = uow.regulations.current()
    ontology = uow.ontology.get()
    users = uow.users.list() if proposal.electorate is None else []  # kütük dondurulduysa üyeleri yüklemeye gerek yok
    electorate = build_electorate(users, proposal, ontology, regulation, now.date())
    strategy = create_strategy(proposal.strategy_name, regulation)
    proposal.try_close(strategy, electorate, regulation, now)


# ====================================================================== komut işleyicileri


def register_user(cmd: commands.RegisterUser, uow: AbstractUnitOfWork, hasher: PasswordHasher, clock: Clock) -> str:
    nickname = Nickname(cmd.nickname.strip())
    info = PersonalInfo(cmd.first_name.strip(), cmd.last_name.strip(), cmd.birth_date, cmd.address.strip())
    if len(cmd.password) < 8:
        raise InvalidValue("Şifre en az 8 karakter olmalı.")
    now = clock.now()
    role = Role(cmd.role)
    with uow:
        regulation = uow.regulations.current()
        if role is not Role.AI_AGENT and info.age_on(now.date()) < regulation.minimum_age:
            raise InvalidValue(f"Kayıt için en az {regulation.minimum_age} yaşında olmalısın.")
        if cmd.birth_date > now.date():
            raise InvalidValue("Geçerli bir doğum tarihi gir.")
        if uow.users.get_by_nickname(str(nickname)) is not None:
            raise InvalidValue("Bu takma ad alınmış.")
        user = User(
            new_id(), nickname, info, PasswordHash(hasher.hash(cmd.password)), role, now,
            interests=frozenset(cmd.interests), agent_model=cmd.agent_model,
        )
        user.events.append(events.UserRegistered(user.id, str(nickname), role.value))
        uow.users.add(user)
        uow.commit()
        return user.id


def set_interest(cmd: commands.SetInterest, uow: AbstractUnitOfWork) -> None:
    with uow:
        if uow.ontology.get().get(cmd.concept_id) is None:
            raise NotFound("Kavram bulunamadı.")
        _actor(uow, cmd).set_interest(cmd.concept_id, cmd.following)
        uow.commit()


def propose_topic(cmd: commands.ProposeTopic, uow: AbstractUnitOfWork, clock: Clock) -> str:
    """Konu/alt konu önerisi: denetim → konu 'Önerildi' → teklif açılır → konu 'Oylamada'."""
    now = clock.now()
    with uow:
        actor = _actor(uow, cmd)
        ontology = uow.ontology.get()
        concept_ids = frozenset(c for c in cmd.concept_ids if ontology.get(c) is not None)
        parent = _topic(uow, cmd.parent_id) if cmd.parent_id else None
        if parent is not None and not concept_ids:
            concept_ids = parent.concept_ids
        if not concept_ids:
            raise InvalidValue("En az bir kavram seç: konu ontolojiye bağlanmalı.")
        if not cmd.title.strip():
            raise InvalidValue("Başlık boş olamaz.")
        _check_content(cmd.description, cmd.title)
        topic = Topic.propose(actor.id, cmd.title, cmd.description, concept_ids, now)
        if parent is not None:
            parent.attach_subtopic(topic)
        else:
            uow.topics.add(topic)
        topic.start_voting()
        actor.set_interest(sorted(concept_ids)[0], True)  # öneren konuyla ilgili sayılır
        _open_proposal(
            uow, now, ProposalKind.NEW_SUBTOPIC if parent else ProposalKind.NEW_TOPIC,
            title=topic.title, rationale=topic.description, proposer_id=actor.id, concept_ids=concept_ids,
            topic_id=topic.id, target_id=topic.id,
        )
        uow.commit()
        return topic.id


def post_message(cmd: commands.PostMessage, uow: AbstractUnitOfWork, clock: Clock) -> str:
    with uow:
        actor = _actor(uow, cmd)
        _check_content(cmd.text)
        message = _topic(uow, cmd.topic_id).post_message(actor.id, cmd.text, clock.now(), cmd.reply_to)
        uow.commit()
        return message.id


def propose_topic_edit(cmd: commands.ProposeTopicEdit, uow: AbstractUnitOfWork, clock: Clock) -> str:
    """Düzenlemeyi herkes teklif edebilir (ilk sürümde yalnızca konuyu açan yapabiliyordu)."""
    with uow:
        actor = _actor(uow, cmd)
        topic = _topic(uow, cmd.topic_id)
        topic.ensure_changeable()
        if (cmd.title.strip(), cmd.description.strip()) == (topic.title, topic.description):
            raise InvalidValue("Hiçbir değişiklik yapılmamış.")
        if not cmd.title.strip():
            raise InvalidValue("Başlık boş olamaz.")
        _check_content(f"{cmd.description}\n{cmd.rationale}", cmd.title)
        if uow.proposals.open_for_target(ProposalKind.EDIT_TOPIC, topic.id):
            raise InvalidValue("Bu konu için zaten açık bir düzenleme teklifi var.")
        proposal = _open_proposal(
            uow, clock.now(), ProposalKind.EDIT_TOPIC, title=f"Düzenleme: {cmd.title.strip()}", rationale=cmd.rationale,
            proposer_id=actor.id, concept_ids=topic.concept_ids, topic_id=topic.id, target_id=topic.id,
            payload={"title": cmd.title.strip(), "description": cmd.description.strip(),
                     "old_title": topic.title, "old_description": topic.description},
        )
        uow.commit()
        return proposal.id


def propose_topic_deletion(cmd: commands.ProposeTopicDeletion, uow: AbstractUnitOfWork, clock: Clock) -> str:
    with uow:
        actor = _actor(uow, cmd)
        topic = _topic(uow, cmd.topic_id)
        _check_content(cmd.rationale)
        topic.request_deletion()  # State: Aktif → Silinme Oylamasında (değilse InvalidTransition)
        proposal = _open_proposal(
            uow, clock.now(), ProposalKind.DELETE_TOPIC, title=f"Gizleme: {topic.title}", rationale=cmd.rationale,
            proposer_id=actor.id, concept_ids=topic.concept_ids, topic_id=topic.id, target_id=topic.id,
        )
        uow.commit()
        return proposal.id


def propose_message_hiding(cmd: commands.ProposeMessageHiding, uow: AbstractUnitOfWork, clock: Clock) -> str:
    with uow:
        actor = _actor(uow, cmd)
        node = uow.topics.get_node(cmd.message_id)
        if not isinstance(node, Message) or node.parent is None:
            raise NotFound("Mesaj bulunamadı.")
        if node.mask is not None:
            raise InvalidTransition("Bu mesaj zaten gizlenmiş.")
        if uow.proposals.open_for_target(ProposalKind.HIDE_MESSAGE, node.id):
            raise InvalidValue("Bu mesaj için zaten açık bir gizleme teklifi var.")
        _check_content(cmd.rationale)
        topic = node.parent
        proposal = _open_proposal(
            uow, clock.now(), ProposalKind.HIDE_MESSAGE, title=f"Mesaj gizleme · {topic.title}", rationale=cmd.rationale,
            proposer_id=actor.id, concept_ids=topic.concept_ids, topic_id=topic.id, target_id=node.id,
            payload={"message_text": node.text[:400], "message_hash": node.content_hash.value},
        )
        uow.commit()
        return proposal.id


def propose_consensus(cmd: commands.ProposeConsensus, uow: AbstractUnitOfWork, clock: Clock) -> str:
    with uow:
        actor = _actor(uow, cmd)
        topic = _topic(uow, cmd.topic_id)
        topic.ensure_changeable()
        _check_content(cmd.text)
        proposal = _open_proposal(
            uow, clock.now(), ProposalKind.CLOSE_TOPIC, title=f"Uzlaşma: {topic.title}", rationale=cmd.text.strip(),
            proposer_id=actor.id, concept_ids=topic.concept_ids, topic_id=topic.id, target_id=topic.id,
            payload={"text": cmd.text.strip()},
        )
        uow.commit()
        return proposal.id


def propose_regulation_change(cmd: commands.ProposeRegulationChange, uow: AbstractUnitOfWork, clock: Clock) -> str:
    with uow:
        actor = _actor(uow, cmd)
        current = uow.regulations.current()
        current.with_change(cmd.key, cmd.value)  # geçersizse burada hata verir
        if current.current_value(cmd.key) == cmd.value:
            raise InvalidValue("Bu kural zaten bu değerde.")
        _check_content(cmd.rationale)
        label = CHANGEABLE[cmd.key].label
        proposal = _open_proposal(
            uow, clock.now(), ProposalKind.CHANGE_REGULATION, title=f"Yönetmelik: {label} → {cmd.value}",
            rationale=cmd.rationale, proposer_id=actor.id, concept_ids=frozenset(),
            payload={"key": cmd.key, "value": cmd.value, "old_value": current.current_value(cmd.key)},
        )
        uow.commit()
        return proposal.id


def propose_expertise(cmd: commands.ProposeExpertise, uow: AbstractUnitOfWork, clock: Clock) -> str:
    """Uzmanlık beyanla değil, o kavramın topluluğunun oyuyla tanınır."""
    with uow:
        actor = _actor(uow, cmd)
        concept = uow.ontology.get().get(cmd.concept_id)
        if concept is None:
            raise NotFound("Kavram bulunamadı.")
        if not 1 <= cmd.level <= 3:
            raise InvalidValue("Uzmanlık düzeyi 1-3 arasında olmalı.")
        _check_content(cmd.rationale)
        proposal = _open_proposal(
            uow, clock.now(), ProposalKind.GRANT_EXPERTISE,
            title=f"@{actor.nickname} için uzmanlık: {concept.name} (düzey {cmd.level})", rationale=cmd.rationale,
            proposer_id=actor.id, concept_ids=frozenset({concept.id}), target_id=actor.id,
            payload={"concept_id": concept.id, "level": str(cmd.level)},
        )
        uow.commit()
        return proposal.id


def cast_vote(cmd: commands.CastVote, uow: AbstractUnitOfWork, clock: Clock) -> None:
    """Oy: yetki zinciri (Chain of Responsibility) → teklif oyu kabul eder → sonuç kesinleştiyse kapanır."""
    now = clock.now()
    with uow:
        proposal = uow.proposals.get(cmd.proposal_id)
        if proposal is None:
            raise NotFound("Teklif bulunamadı.")
        user = uow.users.get(cmd.actor_id) if cmd.actor_id else None
        regulation = uow.regulations.current()
        strategy = create_strategy(proposal.strategy_name, regulation)
        spent = uow.proposals.quadratic_extra_spent(user.id) if user and strategy.name == "karesel" else 0
        context = EligibilityContext(
            user, proposal, uow.ontology.get(), regulation, now.date(), strategy, cmd.intensity, spent
        )
        decision = build_voting_chain().handle(context)
        assert user is not None or not decision.allowed
        ballot = Ballot(
            voter_id=user.id if user else "", choice=Choice(cmd.choice), cast_at=now, intensity=cmd.intensity,
            is_agent=bool(user and user.is_agent), rationale=cmd.rationale.strip()[:500],
        )
        proposal.cast(ballot, decision)
        close_if_decided(proposal, uow, now)
        uow.commit()


def close_due_proposals(cmd: commands.CloseDueProposals, uow: AbstractUnitOfWork, clock: Clock) -> int:
    now = clock.now()
    closed = 0
    with uow:
        for proposal in uow.proposals.list_open():
            if proposal.deadline <= now:
                close_if_decided(proposal, uow, now)
                closed += 0 if proposal.is_open else 1
        uow.commit()
    return closed


def mark_notifications_read(cmd: commands.MarkNotificationsRead, uow: AbstractUnitOfWork, clock: Clock) -> None:
    with uow:
        uow.notifications.mark_all_read(_actor(uow, cmd).id, clock.now())
        uow.commit()


# ====================================================================== olay işleyicileri


def record_in_ledger(
    event: events.Event, uow: AbstractUnitOfWork, clock: Clock, replicas: Sequence[LedgerReplica] = ()
) -> None:
    """Her olay hash zincirine eklenir ve defter düğümlerine çoğaltılır."""
    with uow:
        entry = LedgerEntry.next_after(uow.ledger.head(), type(event).__name__, event.ledger_payload(), clock.now())
        uow.ledger.append(entry)
        uow.commit()
    for replica in replicas:
        replica.append(entry)


def notify_voting_started(
    event: events.VotingStarted, uow: AbstractUnitOfWork, center: VotingNotificationCenter
) -> list[commands.Command]:
    with uow:
        follow_ups = center.notify(event, uow)
        uow.commit()
    return follow_ups


# ---- kabul edilen teklifin etkisi (Registry: tür → etki)

Effect = Callable[[Proposal, AbstractUnitOfWork, datetime], None]


def _activate_topic(p: Proposal, uow: AbstractUnitOfWork, now: datetime) -> None:
    _topic(uow, p.target_id or "").accept()


def _revise_topic(p: Proposal, uow: AbstractUnitOfWork, now: datetime) -> None:
    _topic(uow, p.target_id or "").revise(p.payload["title"], p.payload["description"], p.id, now)


def _supersede_others(p: Proposal, topic: Topic, uow: AbstractUnitOfWork, now: datetime, reason: str) -> None:
    tree_ids = {node.id for node in topic.walk()}
    for other in uow.proposals.list_open():
        if other.id != p.id and (other.topic_id in tree_ids or other.target_id in tree_ids):
            other.supersede(reason, now)


def _hide_topic(p: Proposal, uow: AbstractUnitOfWork, now: datetime) -> None:
    topic = _topic(uow, p.target_id or "")
    topic.confirm_deletion(p.id, now)
    _supersede_others(p, topic, uow, now, "Konu oylamayla gizlendiği için teklif düştü.")


def _hide_message(p: Proposal, uow: AbstractUnitOfWork, now: datetime) -> None:
    node = uow.topics.get_node(p.target_id or "")
    if isinstance(node, Message) and node.mask is None:
        node.apply_mask(p.id, now)


def _archive_topic(p: Proposal, uow: AbstractUnitOfWork, now: datetime) -> None:
    topic = _topic(uow, p.target_id or "")
    topic.archive()
    _supersede_others(p, topic, uow, now, "Konu başka bir uzlaşmayla arşivlendiği için teklif düştü.")


def _change_regulation(p: Proposal, uow: AbstractUnitOfWork, now: datetime) -> None:
    new = uow.regulations.current().with_change(p.payload["key"], p.payload["value"])
    uow.regulations.append(new, p.id, now)
    uow.proposals.get(p.id).events.append(  # type: ignore[union-attr]
        events.RegulationChanged(new.version, p.payload["key"], p.payload["value"], p.id)
    )


def _grant_expertise(p: Proposal, uow: AbstractUnitOfWork, now: datetime) -> None:
    user = uow.users.get(p.target_id or "")
    if user is not None:
        user.grant_expertise(p.payload["concept_id"], int(p.payload["level"]))


ACCEPT_EFFECTS: dict[ProposalKind, Effect] = {
    ProposalKind.NEW_TOPIC: _activate_topic,
    ProposalKind.NEW_SUBTOPIC: _activate_topic,
    ProposalKind.EDIT_TOPIC: _revise_topic,
    ProposalKind.DELETE_TOPIC: _hide_topic,
    ProposalKind.HIDE_MESSAGE: _hide_message,
    ProposalKind.CLOSE_TOPIC: _archive_topic,
    ProposalKind.CHANGE_REGULATION: _change_regulation,
    ProposalKind.GRANT_EXPERTISE: _grant_expertise,
}

REJECT_EFFECTS: dict[ProposalKind, Effect] = {
    ProposalKind.NEW_TOPIC: lambda p, uow, now: _topic(uow, p.target_id or "").reject(),
    ProposalKind.NEW_SUBTOPIC: lambda p, uow, now: _topic(uow, p.target_id or "").reject(),
    ProposalKind.DELETE_TOPIC: lambda p, uow, now: _topic(uow, p.target_id or "").cancel_deletion(),
}


def apply_accepted_proposal(event: events.ProposalAccepted, uow: AbstractUnitOfWork, clock: Clock) -> None:
    with uow:
        proposal = uow.proposals.get(event.proposal_id)
        if proposal is None:
            return
        ACCEPT_EFFECTS[proposal.kind](proposal, uow, proposal.closed_at or clock.now())
        proposer = uow.users.get(proposal.proposer_id)
        if proposer is not None:
            proposer.change_reputation(10, "Teklifi kabul edildi")
        uow.commit()


def apply_rejected_proposal(event: events.ProposalRejected, uow: AbstractUnitOfWork, clock: Clock) -> None:
    with uow:
        proposal = uow.proposals.get(event.proposal_id)
        effect = REJECT_EFFECTS.get(proposal.kind) if proposal else None
        if proposal is not None and effect is not None:
            effect(proposal, uow, clock.now())
            uow.commit()


def reward_message(event: events.MessagePosted, uow: AbstractUnitOfWork) -> None:
    with uow:
        author = uow.users.get(event.author_id)
        if author is not None and not author.is_agent:
            author.change_reputation(1, "Tartışmaya katkı")
            uow.commit()


def penalize_masked_message(event: events.ContentMasked, uow: AbstractUnitOfWork) -> None:
    if event.target_kind != "mesaj":
        return
    with uow:
        node = uow.topics.get_node(event.target_id)
        author = uow.users.get(node.author_id) if node else None
        if author is not None:
            author.change_reputation(-5, "Mesajı oylamayla gizlendi")
            uow.commit()


EVENT_HANDLERS: dict[type[events.Event], list[Callable[..., object]]] = {
    events.VotingStarted: [notify_voting_started],
    events.ProposalAccepted: [apply_accepted_proposal],
    events.ProposalRejected: [apply_rejected_proposal],
    events.MessagePosted: [reward_message],
    events.ContentMasked: [penalize_masked_message],
}

COMMAND_HANDLERS: dict[type[commands.Command], Callable[..., object]] = {
    commands.RegisterUser: register_user,
    commands.SetInterest: set_interest,
    commands.ProposeTopic: propose_topic,
    commands.PostMessage: post_message,
    commands.ProposeTopicEdit: propose_topic_edit,
    commands.ProposeTopicDeletion: propose_topic_deletion,
    commands.ProposeMessageHiding: propose_message_hiding,
    commands.ProposeConsensus: propose_consensus,
    commands.ProposeRegulationChange: propose_regulation_change,
    commands.ProposeExpertise: propose_expertise,
    commands.CastVote: cast_vote,
    commands.CloseDueProposals: close_due_proposals,
    commands.MarkNotificationsRead: mark_notifications_read,
}
