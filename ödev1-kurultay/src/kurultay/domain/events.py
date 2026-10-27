"""Alan olayları (Domain Events): sistemde OLMUŞ şeyler, geçmiş zamanla adlandırılır.

Aggregate'ler olayları kendi ``events`` listelerine ekler; Unit of Work bunları toplar, Message Bus
ilgili işleyicilere dağıtır. Her olay ayrıca dağıtık deftere yazılır (bkz. ``handlers.record_in_ledger``).
Olaylarda kişisel veri yoktur: kullanıcılar kimlikleriyle, metinler özetleriyle anılır.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field


@dataclass(frozen=True)
class Event:
    def ledger_payload(self) -> dict[str, object]:
        """Deftere yazılacak veri. Varsayılan: olayın bütün alanları (hepsi kişisel veri içermez)."""
        return asdict(self)


@dataclass(frozen=True)
class UserRegistered(Event):
    user_id: str
    nickname: str
    role: str


@dataclass(frozen=True)
class InterestsChanged(Event):
    user_id: str
    interests: tuple[str, ...]


@dataclass(frozen=True)
class ExpertiseGranted(Event):
    user_id: str
    concept_id: str
    level: int


@dataclass(frozen=True)
class ReputationChanged(Event):
    user_id: str
    delta: int
    reason: str


@dataclass(frozen=True)
class TopicProposed(Event):
    topic_id: str
    parent_id: str | None
    title: str
    author_id: str
    concept_ids: tuple[str, ...]


@dataclass(frozen=True)
class TopicStateChanged(Event):
    topic_id: str
    old_state: str
    new_state: str


@dataclass(frozen=True)
class TopicRevised(Event):
    topic_id: str
    revision_id: str
    proposal_id: str | None
    title: str


@dataclass(frozen=True)
class MessagePosted(Event):
    message_id: str
    topic_id: str
    author_id: str
    content_hash: str
    reply_to: str | None = None


@dataclass(frozen=True)
class ContentMasked(Event):
    """Bir mesaj ya da konu oylamayla gizlendi. İçerik ve özeti defterde kalır."""

    target_kind: str
    target_id: str
    proposal_id: str


@dataclass(frozen=True)
class ProposalOpened(Event):
    proposal_id: str
    kind: str
    title: str
    proposer_id: str
    strategy: str
    threshold: str
    concept_ids: tuple[str, ...]
    deadline: str


@dataclass(frozen=True)
class VotingStarted(Event):
    """Observer deseninin konusu: ilgili üyelere ve YZ ajanlarına haber verilir."""

    proposal_id: str
    title: str
    concept_ids: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class VoteCast(Event):
    proposal_id: str
    voter_id: str
    choice: str
    intensity: int
    is_agent: bool


@dataclass(frozen=True)
class ProposalAccepted(Event):
    proposal_id: str
    kind: str
    yes: float
    no: float


@dataclass(frozen=True)
class ProposalRejected(Event):
    proposal_id: str
    kind: str
    yes: float
    no: float
    reason: str


@dataclass(frozen=True)
class RegulationChanged(Event):
    version: int
    key: str
    value: str
    proposal_id: str

