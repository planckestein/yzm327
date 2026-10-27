"""Dağıtık defter düğümleri.

Asıl defter veritabanındadır; her yeni kayıt ayrıca birkaç bağımsız düğüme (burada her biri ayrı bir
JSON Lines dosyası) çoğaltılır. Gerçek bir ağda bunlar farklı makineler olurdu; arayüz aynı kalır
(``LedgerReplica`` portu). Uzlaşma raporu, düğümlerin uç özetlerini karşılaştırarak kurcalanmış kopyayı bulur.
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import asdict
from pathlib import Path
from typing import TextIO

from kurultay.domain.ledger import LedgerEntry


class JsonLinesLedgerNode:
    def __init__(self, name: str, path: Path) -> None:
        self.name = name
        self.path = path
        self._handle: TextIO | None = None  # ekleme için açık tutulur (her kayıtta dosya açıp kapamak Windows'ta yavaş)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.touch(exist_ok=True)

    def append(self, entry: LedgerEntry) -> None:
        if self._handle is None:
            self._handle = self.path.open("a", encoding="utf-8")
        self._handle.write(json.dumps(asdict(entry), ensure_ascii=False) + "\n")
        self._handle.flush()

    def signature(self) -> tuple[str, int, int]:
        """Dosya değişti mi? (boyut, değişiklik zamanı) — doğrulama sonucunu önbellekte tutmak için."""
        stat = self.path.stat()
        return (self.name, stat.st_size, stat.st_mtime_ns)

    def close(self) -> None:
        if self._handle is not None:
            self._handle.close()
            self._handle = None

    def write_all(self, entries: Sequence[LedgerEntry]) -> None:
        """Kopyayı verilen zincirle baştan yazar (onarım ya da toplu kurulum)."""
        self.close()
        with self.path.open("w", encoding="utf-8") as f:
            f.writelines(json.dumps(asdict(e), ensure_ascii=False) + "\n" for e in entries)

    def entries(self) -> Sequence[LedgerEntry]:
        result = []
        for line in self.path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                result.append(LedgerEntry(**json.loads(line)))
        return result

    def sync(self, entries: Sequence[LedgerEntry]) -> None:
        """Eksik kayıtları tamamlar (yeni katılan ya da geride kalan düğüm)."""
        have = len(self.entries())
        for entry in entries[have:]:
            self.append(entry)

    def tamper(self, index: int, new_payload: str) -> None:
        """Yalnızca demo: bir kopyadaki geçmiş kaydı değiştirir; uzlaşma raporu bunu yakalamalı."""
        self.close()
        lines = self.path.read_text(encoding="utf-8").splitlines()
        if not 0 <= index < len(lines):
            return
        record = json.loads(lines[index])
        record["payload"] = new_payload
        lines[index] = json.dumps(record, ensure_ascii=False)
        self.path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def reset_from(self, entries: Sequence[LedgerEntry]) -> None:
        """Yalnızca demo: kurcalanan kopyayı çoğunluğun zincirinden onarır."""
        self.write_all(entries)


class InMemoryLedgerNode:
    def __init__(self, name: str) -> None:
        self.name = name
        self._entries: list[LedgerEntry] = []

    def append(self, entry: LedgerEntry) -> None:
        self._entries.append(entry)

    def entries(self) -> Sequence[LedgerEntry]:
        return list(self._entries)

    def sync(self, entries: Sequence[LedgerEntry]) -> None:
        self._entries.extend(entries[len(self._entries):])
