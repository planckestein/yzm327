"""Sahte (Fake) bileşenler: aynı soyut sözleşmelerin bellek içi uygulamaları.

Servis katmanı testleri veritabanına, dosyaya ya da ağa dokunmadan bunlarla çalışır (Cosmic Python, 3. ve 6. bölüm).
"""

from __future__ import annotations

from datetime import datetime

from kurultay.adapters.repository import (
    AbstractLedgerRepository,
    AbstractNotificationRepository,
    AbstractOntologyRepository,
    AbstractProposalRepository,
    AbstractRegulationRepository,
    AbstractTopicRepository,
    AbstractUserRepository,
)
from kurultay.domain.ledger import LedgerEntry
from kurultay.domain.notification import Notification
from kurultay.domain.ontology import Ontology
from kurultay.domain.proposal import Proposal
from kurultay.domain.regulation import Regulation
from kurultay.domain.topic import Topic
from kurultay.domain.user import User
from kurultay.reference_data import build_ontology
from kurultay.service_layer.ports import Assessment, AssessmentRequest
from kurultay.service_layer.unit_of_work import AbstractUnitOfWork


class FakeUserRepository(AbstractUserRepository):
    def __init__(self, users: list[User] | None = None) -> None:
        super().__init__()
        self._users = {u.id: u for u in users or []}

    def _add(self, user: User) -> None:
        self._users[user.id] = user

    def _get(self, id: str) -> User | None:
        return self._users.get(id)

    def _get_by_nickname(self, nickname: str) -> User | None:
        return next((u for u in self._users.values() if str(u.nickname).lower() == nickname.lower()), None)

    def list(self) -> list[User]:
        self.seen.update(self._users.values())
        return list(self._users.values())


class FakeTopicRepository(AbstractTopicRepository):
    def __init__(self) -> None:
        super().__init__()
        self._roots: dict[str, Topic] = {}

    def _add(self, topic: Topic) -> None:
        self._roots[topic.id] = topic

    def _get(self, id: str) -> Topic | None:
        for root in self._roots.values():
            if any(node.id == id for node in root.walk()):
                return root
        return None

    def roots(self) -> list[Topic]:
        self.seen.update(self._roots.values())
        return list(self._roots.values())


class FakeProposalRepository(AbstractProposalRepository):
    def __init__(self) -> None:
        super().__init__()
        self._items: dict[str, Proposal] = {}

    def _add(self, proposal: Proposal) -> None:
        self._items[proposal.id] = proposal

    def _get(self, id: str) -> Proposal | None:
        return self._items.get(id)

    def list(self) -> list[Proposal]:
        self.seen.update(self._items.values())
        return sorted(self._items.values(), key=lambda p: p.opened_at, reverse=True)


class FakeOntologyRepository(AbstractOntologyRepository):
    def __init__(self, ontology: Ontology | None = None) -> None:
        self._ontology = ontology or build_ontology()

    def get(self) -> Ontology:
        return self._ontology

    def save(self, ontology: Ontology) -> None:
        self._ontology = ontology


class FakeRegulationRepository(AbstractRegulationRepository):
    def __init__(self, regulation: Regulation | None = None) -> None:
        self._history: list[tuple[Regulation, str | None, str]] = [(regulation or Regulation(), None, "")]

    def current(self) -> Regulation:
        return self._history[-1][0]

    def append(self, regulation: Regulation, proposal_id: str | None, now: datetime) -> None:
        self._history.append((regulation, proposal_id, now.isoformat()))

    def history(self) -> list[tuple[Regulation, str | None, str]]:
        return list(reversed(self._history))


class FakeLedgerRepository(AbstractLedgerRepository):
    def __init__(self) -> None:
        self.entries: list[LedgerEntry] = []

    def append(self, entry: LedgerEntry) -> None:
        self.entries.append(entry)

    def head(self) -> LedgerEntry | None:
        return self.entries[-1] if self.entries else None

    def all(self) -> list[LedgerEntry]:
        return list(self.entries)


class FakeNotificationRepository(AbstractNotificationRepository):
    def __init__(self) -> None:
        self.items: list[Notification] = []

    def add(self, notification: Notification) -> None:
        if not any(n.user_id == notification.user_id and n.link == notification.link for n in self.items):
            self.items.append(notification)

    def for_user(self, user_id: str, limit: int = 30) -> list[Notification]:
        return [n for n in reversed(self.items) if n.user_id == user_id][:limit]

    def mark_all_read(self, user_id: str, now: datetime) -> None:
        for n in self.items:
            if n.user_id == user_id and n.read_at is None:
                n.read_at = now


class FakeUnitOfWork(AbstractUnitOfWork):
    def __init__(self, regulation: Regulation | None = None) -> None:
        self.users = FakeUserRepository()
        self.topics = FakeTopicRepository()
        self.proposals = FakeProposalRepository()
        self.ontology = FakeOntologyRepository()
        self.regulations = FakeRegulationRepository(regulation)
        self.ledger = FakeLedgerRepository()
        self.notifications = FakeNotificationRepository()
        self.committed = 0

    def _commit(self) -> None:
        self.committed += 1

    def rollback(self) -> None:
        pass


class FakePasswordHasher:
    def hash(self, password: str) -> str:
        return f"sahte:{password}"

    def verify(self, password: str, hashed: str) -> bool:
        return hashed == f"sahte:{password}"


class FakeExpertModel:
    """Önceden belirlenmiş kararı veren sahte YZ modeli; aldığı istekleri kaydeder."""

    label = "sahte model"

    def __init__(self, approve: bool = True) -> None:
        self.approve = approve
        self.requests: list[AssessmentRequest] = []

    def assess(self, request: AssessmentRequest) -> Assessment:
        self.requests.append(request)
        return Assessment(self.approve, "Sahte gerekçe.", self.label)
