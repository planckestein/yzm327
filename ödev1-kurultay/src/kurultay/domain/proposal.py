"""Teklif (Proposal) aggregate'i: "hiçbir işlem doğrudan gerçekleşmez".

Konu açmak, alt konu önermek, düzenlemek, silmek, mesaj gizlemek, uzlaşmayla kapatmak, yönetmeliği
değiştirmek ve uzmanlık tanımak — hepsi bir tekliftir. Teklif açılırken yönetmelikten hangi
stratejiyle ve hangi eşikle oylanacağını alır ve bunu kaydeder (sonradan yönetmelik değişse bile
süren oylamanın kuralları değişmez). Oylar teklifin içindedir; aggregate sınırı oylamanın tutarlılığını korur.

Seçmen kütüğü de oylama açılırken dondurulur: oylama sürerken üye olan ya da ilgi alanını sonradan değiştiren
kişi o teklifte oy kullanamaz. Böylece süren bir oylamaya dışarıdan kalabalık taşınarak sonuç değiştirilemez.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

from kurultay.domain import events
from kurultay.domain.eligibility import EligibilityDecision
from kurultay.domain.exceptions import InvalidTransition, NotEligible, ProposalClosed
from kurultay.domain.regulation import KIND_LABELS, Regulation
from kurultay.domain.value_objects import new_id
from kurultay.domain.voting import (
    Ballot,
    Decision,
    Electorate,
    Outcome,
    Tally,
    VotingStrategy,
    decide,
    parse_threshold,
    tally,
)


class ProposalKind(str, Enum):
    NEW_TOPIC = "yeni_konu"
    NEW_SUBTOPIC = "alt_konu"
    EDIT_TOPIC = "duzenleme"
    DELETE_TOPIC = "konu_silme"
    HIDE_MESSAGE = "mesaj_gizleme"
    CLOSE_TOPIC = "uzlasma"
    CHANGE_REGULATION = "yonetmelik"
    GRANT_EXPERTISE = "uzmanlik"

    @property
    def label(self) -> str:
        return KIND_LABELS[self.value]


class ProposalStatus(str, Enum):
    OPEN = "acik"
    ACCEPTED = "kabul"
    REJECTED = "red"

    @property
    def label(self) -> str:
        return {"acik": "Oylamada", "kabul": "Kabul edildi", "red": "Reddedildi"}[self.value]


@dataclass(frozen=True)
class ProposalResult:
    yes: float
    no: float
    reason: str


class Proposal:
    def __init__(
        self,
        id: str,
        kind: ProposalKind,
        title: str,
        rationale: str,
        proposer_id: str,
        concept_ids: frozenset[str],
        strategy_name: str,
        threshold: str,
        opened_at: datetime,
        deadline: datetime,
        topic_id: str | None = None,
        target_id: str | None = None,
        payload: dict[str, str] | None = None,
        status: ProposalStatus = ProposalStatus.OPEN,
        ballots: list[Ballot] | None = None,
        result: ProposalResult | None = None,
        closed_at: datetime | None = None,
        electorate: Electorate | None = None,
    ) -> None:
        self.id = id
        self.kind = kind
        self.title = title
        self.rationale = rationale
        self.proposer_id = proposer_id
        self.concept_ids = concept_ids
        self.strategy_name = strategy_name
        self.threshold = threshold
        self.opened_at = opened_at
        self.deadline = deadline
        self.topic_id = topic_id
        self.target_id = target_id
        self.payload = dict(payload or {})
        self.status = status
        self.ballots: list[Ballot] = list(ballots or [])
        self.result = result
        self.closed_at = closed_at
        self.electorate = electorate
        self.events: list[events.Event] = []

    @classmethod
    def open(
        cls,
        kind: ProposalKind,
        title: str,
        rationale: str,
        proposer_id: str,
        concept_ids: frozenset[str],
        regulation: Regulation,
        now: datetime,
        topic_id: str | None = None,
        target_id: str | None = None,
        payload: dict[str, str] | None = None,
    ) -> Proposal:
        """Factory Method: kuralları o anki yönetmelikten alarak teklifi açar ve oylamayı başlatır."""
        proposal = cls(
            id=new_id(),
            kind=kind,
            title=title,
            rationale=rationale,
            proposer_id=proposer_id,
            concept_ids=concept_ids,
            strategy_name=regulation.strategy_for(kind.value),
            threshold=regulation.threshold_for(kind.value),
            opened_at=now,
            deadline=now + timedelta(days=regulation.voting_days),
            topic_id=topic_id,
            target_id=target_id,
            payload=payload,
        )
        ids = tuple(sorted(concept_ids))
        proposal.events.append(
            events.ProposalOpened(
                proposal.id, kind.value, title, proposer_id, proposal.strategy_name, proposal.threshold, ids,
                proposal.deadline.isoformat(),
            )
        )
        proposal.events.append(events.VotingStarted(proposal.id, title, ids))
        return proposal

    def __repr__(self) -> str:
        return f"Proposal({self.id}, {self.kind.value}, {self.status.value})"

    def freeze_electorate(self, electorate: Electorate) -> None:
        """Seçmen kütüğünü bir kez ve oylama açıkken belirler; sonradan değiştirilemez."""
        if self.electorate is not None:
            raise InvalidTransition("Seçmen kütüğü zaten dondurulmuş.")
        self.electorate = electorate

    @property
    def is_open(self) -> bool:
        return self.status is ProposalStatus.OPEN

    def has_voted(self, user_id: str) -> bool:
        return any(b.voter_id == user_id for b in self.ballots)

    def ballot_of(self, user_id: str) -> Ballot | None:
        return next((b for b in self.ballots if b.voter_id == user_id), None)

    def cast(self, ballot: Ballot, decision: EligibilityDecision) -> None:
        """Oy, ancak yetki zinciri (Chain of Responsibility) onay verdiyse kabul edilir."""
        if not self.is_open:
            raise ProposalClosed("Bu oylama kapandı.")
        if not decision.allowed:
            raise NotEligible(decision.reason)
        if self.has_voted(ballot.voter_id):
            raise NotEligible("Bu oylamada zaten oy kullandın.")
        self.ballots.append(ballot)
        self.events.append(
            events.VoteCast(self.id, ballot.voter_id, ballot.choice.value, ballot.intensity, ballot.is_agent)
        )

    def current_tally(self, strategy: VotingStrategy, electorate: Electorate) -> Tally:
        return tally(strategy, self.ballots, electorate)

    def try_close(
        self, strategy: VotingStrategy, electorate: Electorate, regulation: Regulation, now: datetime
    ) -> Decision | None:
        """Sonuç kesinleştiyse teklifi kapatır ve kabul/red olayını yayar."""
        if not self.is_open:
            return None
        t = self.current_tally(strategy, electorate)
        decision = decide(t, parse_threshold(self.threshold), regulation.quorum, now >= self.deadline)
        if decision is None:
            return None
        self.closed_at = now
        self.result = ProposalResult(t.yes, t.no, decision.reason)
        if decision.outcome is Outcome.ACCEPTED:
            self.status = ProposalStatus.ACCEPTED
            self.events.append(events.ProposalAccepted(self.id, self.kind.value, t.yes, t.no))
        else:
            self.status = ProposalStatus.REJECTED
            self.events.append(events.ProposalRejected(self.id, self.kind.value, t.yes, t.no, decision.reason))
        return decision

    def supersede(self, reason: str, now: datetime) -> None:
        """Teklif konusuz kaldı (ör. konu başka bir uzlaşmayla kapandı ya da gizlendi): oylanmadan düşer."""
        if not self.is_open:
            return
        t_yes = sum(b.intensity for b in self.ballots if b.choice.value == "evet")
        t_no = sum(b.intensity for b in self.ballots if b.choice.value == "hayir")
        self.status = ProposalStatus.REJECTED
        self.closed_at = now
        self.result = ProposalResult(float(t_yes), float(t_no), reason)
        self.events.append(events.ProposalRejected(self.id, self.kind.value, float(t_yes), float(t_no), reason))
