"""Değer nesneleri (Value Objects).

Hepsi ``@dataclass(frozen=True)``: kimlikleri yoktur, değerleriyle eşittirler ve kurulduktan sonra değişmezler.
Doğrulama kurucuda yapılır; geçersiz bir değer nesnesi hiç var olamaz.
"""

from __future__ import annotations

import hashlib
import re
import uuid
from dataclasses import dataclass
from datetime import date, datetime

from kurultay.domain.exceptions import InvalidValue

_NICKNAME = re.compile(r"^[a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]{3,20}$")


def new_id() -> str:
    """Kalıcılıktan bağımsız kimlik: alan nesnesi veritabanına gitmeden önce kimliğini bilir."""
    return uuid.uuid4().hex[:10]


@dataclass(frozen=True)
class Nickname:
    """Takma ad: arayüzde görünen TEK kimlik bilgisi."""

    value: str

    def __post_init__(self) -> None:
        if not _NICKNAME.fullmatch(self.value):
            raise InvalidValue("Takma ad 3-20 karakter olmalı; yalnızca harf, rakam ve _ içerebilir.")

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class PersonalInfo:
    """Kişisel bilgiler (PII). Yalnızca sahibine gösterilir; ``repr`` bile içeriği yazmaz."""

    first_name: str
    last_name: str
    birth_date: date
    address: str

    def __post_init__(self) -> None:
        if not all(s.strip() for s in (self.first_name, self.last_name, self.address)):
            raise InvalidValue("Ad, soyad ve adres boş olamaz.")

    def age_on(self, today: date) -> int:
        years = today.year - self.birth_date.year
        if (today.month, today.day) < (self.birth_date.month, self.birth_date.day):
            years -= 1
        return years

    def __repr__(self) -> str:  # günlük kayıtlarına kişisel veri sızmasın
        return "PersonalInfo(***)"


@dataclass(frozen=True)
class PasswordHash:
    value: str

    def __repr__(self) -> str:
        return "PasswordHash(***)"


@dataclass(frozen=True)
class ContentHash:
    """Bir metnin SHA-256 özeti. Defterde metnin kendisi değil bu özet tutulur."""

    value: str

    @classmethod
    def of(cls, text: str) -> ContentHash:
        return cls(hashlib.sha256(text.encode("utf-8")).hexdigest())

    @property
    def short(self) -> str:
        return self.value[:12]


@dataclass(frozen=True)
class Expertise:
    """Bir kullanıcının bir ontoloji kavramındaki uzmanlık düzeyi (1-3). Oylamayla verilir."""

    concept_id: str
    level: int

    def __post_init__(self) -> None:
        if not 1 <= self.level <= 3:
            raise InvalidValue("Uzmanlık düzeyi 1 ile 3 arasında olmalı.")


@dataclass(frozen=True)
class Mask:
    """Maskeleme kaydı: oylamayla gizlenen içerik silinmez, üzerine bu kayıt düşülür."""

    proposal_id: str
    masked_at: datetime


@dataclass(frozen=True)
class TopicRevision:
    """Memento: konunun her düzenlemesi yeni bir sürümdür, eskisi kaybolmaz."""

    id: str
    title: str
    description: str
    created_at: datetime
    proposal_id: str | None = None
