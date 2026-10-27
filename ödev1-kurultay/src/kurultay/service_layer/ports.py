"""Portlar: servis katmanının dış dünyadan beklediği yetenekler (Dependency Inversion).

Servis katmanı bu soyutlamalara bağımlıdır; somut sınıflar ``adapters`` paketindedir ve
``bootstrap.py`` (kompozisyon kökü) tarafından enjekte edilir. Testlerde aynı portların sahteleri kullanılır.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol

from kurultay.domain.ledger import LedgerEntry


class Clock(Protocol):
    def now(self) -> datetime: ...


class PasswordHasher(Protocol):
    def hash(self, password: str) -> str: ...

    def verify(self, password: str, hashed: str) -> bool: ...


@dataclass(frozen=True)
class AssessmentRequest:
    """Bir YZ uzman ajanına sorulan soru: hem doğal dil istemi hem yapılandırılmış bağlam taşır.

    Dil modeli adaptörleri ``prompt``u, kural tabanlı adaptör yapılandırılmış alanları kullanır.
    """

    prompt: str
    proposal_kind: str
    title: str
    text: str
    relevance: int  # 0-100, ontolojiyle örtüşme
    contains_threat: bool = False
    discussion_size: int = 0
    proposer_reputation: int = 0
    regulation_change: tuple[str, str] | None = None
    agent_expertise: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class Assessment:
    approve: bool
    rationale: str
    model_label: str


class ExpertModel(Protocol):
    """Adapter deseninin hedef arayüzü: farklı YZ arka uçları bu tek metoda uyarlanır."""

    label: str

    def assess(self, request: AssessmentRequest) -> Assessment: ...


class LedgerReplica(Protocol):
    """Defterin bir kopyasını tutan düğüm (dağıtık defter)."""

    name: str

    def append(self, entry: LedgerEntry) -> None: ...

    def entries(self) -> Sequence[LedgerEntry]: ...

    def sync(self, entries: Sequence[LedgerEntry]) -> None: ...
