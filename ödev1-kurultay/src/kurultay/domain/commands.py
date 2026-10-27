"""Komutlar (Commands): sistemden İSTENEN şeyler, emir kipiyle adlandırılır.

Arayüz (entrypoints) yalnızca komut gönderir; durum değişikliklerinin tamamı Message Bus üzerinden
komut işleyicilerinde olur. ``actor_id`` komutu gönderen kullanıcıdır; Protection Proxy ona bakar.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Command:
    actor_id: str | None


@dataclass(frozen=True)
class RegisterUser(Command):
    nickname: str
    first_name: str
    last_name: str
    birth_date: date
    address: str
    password: str
    role: str = "uye"
    interests: tuple[str, ...] = ()
    agent_model: str | None = None


@dataclass(frozen=True)
class SetInterest(Command):
    concept_id: str
    following: bool


@dataclass(frozen=True)
class ProposeTopic(Command):
    """Konu ya da (``parent_id`` doluysa) alt konu önerisi. Doğrudan açılmaz, oylamaya çıkar."""

    title: str
    description: str
    concept_ids: tuple[str, ...]
    parent_id: str | None = None


@dataclass(frozen=True)
class PostMessage(Command):
    topic_id: str
    text: str
    reply_to: str | None = None


@dataclass(frozen=True)
class ProposeTopicEdit(Command):
    topic_id: str
    title: str
    description: str
    rationale: str


@dataclass(frozen=True)
class ProposeTopicDeletion(Command):
    topic_id: str
    rationale: str


@dataclass(frozen=True)
class ProposeMessageHiding(Command):
    message_id: str
    rationale: str


@dataclass(frozen=True)
class ProposeConsensus(Command):
    topic_id: str
    text: str


@dataclass(frozen=True)
class ProposeRegulationChange(Command):
    key: str
    value: str
    rationale: str


@dataclass(frozen=True)
class ProposeExpertise(Command):
    concept_id: str
    level: int
    rationale: str


@dataclass(frozen=True)
class CastVote(Command):
    proposal_id: str
    choice: str
    intensity: int = 1
    rationale: str = ""


@dataclass(frozen=True)
class CloseDueProposals(Command):
    """Süresi dolan oylamaları sonuçlandırır (zamanlayıcı ya da sayfa yüklemesi gönderir)."""


@dataclass(frozen=True)
class MarkNotificationsRead(Command):
    pass
