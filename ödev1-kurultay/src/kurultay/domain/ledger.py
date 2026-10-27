"""Dağıtık defter: değiştirilemez, hash zinciriyle bağlı olay kaydı.

Her kayıt bir öncekinin özetini içerir:  ``hash = SHA-256(sıra | zaman | tür | veri | önceki_hash)``.
Geçmişteki tek bir kayıt değiştirilirse ondan sonraki bütün halkalar tutmaz; :func:`verify_chain` bunu
yakalar. Defter yalnızca eklenir (append-only): bu modülde güncelleme ya da silme işlemi yoktur.

Defter birden fazla düğümde (replica) tutulur. :func:`reach_consensus` düğümlerin uç özetlerini karşılaştırır;
çoğunluğun uzlaştığı zincir geçerlidir, ondan ayrılan düğüm "kurcalanmış" olarak işaretlenir.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime

GENESIS_HASH = "0" * 64


def canonical_json(payload: Mapping[str, object]) -> str:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)


@dataclass(frozen=True)
class LedgerEntry:
    index: int
    timestamp: str
    kind: str
    payload: str
    previous_hash: str
    hash: str

    @staticmethod
    def compute_hash(index: int, timestamp: str, kind: str, payload: str, previous_hash: str) -> str:
        material = f"{index}|{timestamp}|{kind}|{payload}|{previous_hash}"
        return hashlib.sha256(material.encode("utf-8")).hexdigest()

    @classmethod
    def next_after(
        cls, previous: LedgerEntry | None, kind: str, payload: Mapping[str, object], now: datetime
    ) -> LedgerEntry:
        index = 0 if previous is None else previous.index + 1
        previous_hash = GENESIS_HASH if previous is None else previous.hash
        timestamp = now.isoformat(timespec="seconds")
        body = canonical_json(payload)
        return cls(index, timestamp, kind, body, previous_hash, cls.compute_hash(index, timestamp, kind, body, previous_hash))

    def is_intact(self) -> bool:
        return self.hash == self.compute_hash(self.index, self.timestamp, self.kind, self.payload, self.previous_hash)

    @property
    def data(self) -> dict[str, object]:
        loaded: dict[str, object] = json.loads(self.payload)
        return loaded


@dataclass(frozen=True)
class VerificationReport:
    valid: bool
    length: int
    head_hash: str
    broken_index: int | None = None


def verify_chain(entries: Sequence[LedgerEntry]) -> VerificationReport:
    previous_hash = GENESIS_HASH
    for position, entry in enumerate(entries):
        if entry.index != position or entry.previous_hash != previous_hash or not entry.is_intact():
            return VerificationReport(False, len(entries), previous_hash, entry.index)
        previous_hash = entry.hash
    return VerificationReport(True, len(entries), previous_hash)


@dataclass(frozen=True)
class NodeStatus:
    node: str
    report: VerificationReport
    agrees: bool


@dataclass(frozen=True)
class ConsensusReport:
    head_hash: str | None
    nodes: tuple[NodeStatus, ...]

    @property
    def healthy(self) -> bool:
        return all(n.agrees for n in self.nodes)

    @property
    def agreeing(self) -> int:
        return sum(1 for n in self.nodes if n.agrees)


def reach_consensus(reports: Mapping[str, VerificationReport]) -> ConsensusReport:
    """Geçerli zincirlerin uç özetleri arasında çoğunluk oylaması (basit bir uzlaşma)."""
    valid_heads = Counter(r.head_hash for r in reports.values() if r.valid)
    head = valid_heads.most_common(1)[0][0] if valid_heads else None
    if head is not None and valid_heads[head] * 2 <= len(reports):
        head = None  # salt çoğunluk yoksa uzlaşma yok
    nodes = tuple(NodeStatus(name, r, r.valid and r.head_hash == head) for name, r in reports.items())
    return ConsensusReport(head, nodes)
