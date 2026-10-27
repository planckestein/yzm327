"""Observer deseni: oylama başladığında ilgilileri haberdar etmek.

``VotingNotificationCenter`` konudur (subject); gözlemciler ``attach`` ile kaydolur. Oylama başladığında
(``VotingStarted`` olayı) merkez, kayıtlı her gözlemcinin ``update`` metodunu çağırır:

* ``InterestedMemberNotifier`` — teklifin ontolojisiyle eşleşen insan üyelere bildirim yazar.
* ``ExpertAgentNotifier``      — eşleşen YZ ajanlarını uyandırır; ajan teklifi inceler ve oy komutu üretir.

Yeni bir kanal (e-posta, anlık bildirim…) eklemek yeni bir gözlemci yazıp ``attach`` etmektir.
"""

from __future__ import annotations

from datetime import date
from typing import Protocol

from kurultay.domain.commands import CastVote, Command
from kurultay.domain.eligibility import build_electorate
from kurultay.domain.events import VotingStarted
from kurultay.domain.notification import Notification
from kurultay.domain.proposal import Proposal
from kurultay.domain.topic import Topic
from kurultay.domain.value_objects import new_id
from kurultay.domain.voting import Electorate
from kurultay.service_layer.agents import ExpertAgentFactory
from kurultay.service_layer.ports import Clock
from kurultay.service_layer.unit_of_work import AbstractUnitOfWork


class VotingObserver(Protocol):
    def update(self, event: VotingStarted, uow: AbstractUnitOfWork) -> list[Command]: ...


class VotingNotificationCenter:
    def __init__(self) -> None:
        self._observers: list[VotingObserver] = []

    def attach(self, observer: VotingObserver) -> None:
        if observer not in self._observers:
            self._observers.append(observer)

    def detach(self, observer: VotingObserver) -> None:
        self._observers.remove(observer)

    @property
    def observers(self) -> tuple[VotingObserver, ...]:
        return tuple(self._observers)

    def notify(self, event: VotingStarted, uow: AbstractUnitOfWork) -> list[Command]:
        commands: list[Command] = []
        for observer in self._observers:
            commands.extend(observer.update(event, uow))
        return commands


def _electorate(proposal: Proposal, uow: AbstractUnitOfWork, today: date) -> Electorate:
    """Teklifin seçmen kütüğü (oylama açılırken dondurulmuştur)."""
    return build_electorate(uow.users.list() if proposal.electorate is None else [], proposal,
                            uow.ontology.get(), uow.regulations.current(), today)


class InterestedMemberNotifier:
    def __init__(self, clock: Clock) -> None:
        self.clock = clock

    def update(self, event: VotingStarted, uow: AbstractUnitOfWork) -> list[Command]:
        proposal = uow.proposals.get(event.proposal_id)
        if proposal is None:
            return []
        now = self.clock.now()
        text = f"İlgi alanında oylama başladı: {proposal.kind.label}: “{proposal.title}”"
        uow.notifications.add_many(
            Notification(new_id(), voter.user_id, text, f"/teklif/{proposal.id}", now)
            for voter in _electorate(proposal, uow, now.date()).voters
            if not voter.is_agent and voter.user_id != proposal.proposer_id
        )
        return []


class ExpertAgentNotifier:
    def __init__(self, factory: ExpertAgentFactory) -> None:
        self.factory = factory

    def update(self, event: VotingStarted, uow: AbstractUnitOfWork) -> list[Command]:
        proposal = uow.proposals.get(event.proposal_id)
        if proposal is None or not uow.regulations.current().agents_may_vote:
            return []
        ontology = uow.ontology.get()
        topic_node = uow.topics.get_node(proposal.topic_id) if proposal.topic_id else None
        topic = topic_node if isinstance(topic_node, Topic) else None
        proposer = uow.users.get(proposal.proposer_id)
        commands: list[Command] = []
        for voter in _electorate(proposal, uow, proposal.opened_at.date()).voters:
            user = uow.users.get(voter.user_id) if voter.is_agent else None
            if user is None:
                continue
            verdict = self.factory.create(user).review(proposal, ontology, topic, proposer)
            commands.append(CastVote(user.id, proposal.id, verdict.choice.value, 1, verdict.rationale))
        return commands
