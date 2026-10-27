"""Yönetmelik: oylamanın kurallarını taşıyan değer nesnesi.

Yönetmeliğin kendisi de oylamayla değişir (``CHANGE_REGULATION`` teklifi, 2/3 ile). Her değişiklik yeni
bir sürümdür; eski sürümler silinmez. Hangi teklif türünün hangi oylama stratejisiyle ve hangi eşikle
oylanacağı da buradadır; böylece "çoğunluğun azınlığı ezmesine" karşı korumalar oylamayla ayarlanabilir.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from fractions import Fraction
from typing import Any

from kurultay.domain.exceptions import InvalidValue

STRATEGY_LABELS = {
    "basit": "Basit çoğunluk (kişi başı 1 oy)",
    "karesel": "Karesel oylama (Quadratic Voting)",
    "uzman": "Uzman ağırlıklı oylama",
    "itibar": "İtibar tabanlı oylama",
}
THRESHOLD_LABELS = {"1/2": "Yarıdan fazla", "3/5": "5'te 3", "2/3": "3'te 2"}

KIND_LABELS = {
    "yeni_konu": "Yeni konu",
    "alt_konu": "Alt konu",
    "duzenleme": "Konu düzenleme",
    "konu_silme": "Konu silme (gizleme)",
    "mesaj_gizleme": "Mesaj gizleme",
    "uzlasma": "Uzlaşma (konuyu kapatma)",
    "yonetmelik": "Yönetmelik değişikliği",
    "uzmanlik": "Uzmanlık tanınması",
}


@dataclass(frozen=True)
class Regulation:
    version: int = 1
    minimum_age: int = 13
    voting_days: int = 3
    quorum_percent: int = 30  # süre dolduğunda en az bu oranda seçmen katılmış olmalı
    agent_weight_percent: int = 50  # YZ ajanı oyunun insan oyuna oranı
    agents_may_vote: bool = True
    quadratic_credits: int = 9  # karesel oylama kredisi: tek pusulada en fazla k² ≤ 9 (3 oy); ek bütçe 9 − 1 = 8
    strategies: tuple[tuple[str, str], ...] = (
        ("yeni_konu", "basit"),
        ("alt_konu", "basit"),
        ("duzenleme", "uzman"),
        ("konu_silme", "karesel"),
        ("mesaj_gizleme", "karesel"),
        ("uzlasma", "itibar"),
        ("yonetmelik", "karesel"),
        ("uzmanlik", "uzman"),
    )
    thresholds: tuple[tuple[str, str], ...] = (
        ("konu_silme", "3/5"),
        ("mesaj_gizleme", "3/5"),
        ("yonetmelik", "2/3"),
    )

    def strategy_for(self, kind: str) -> str:
        return dict(self.strategies).get(kind, "basit")

    def threshold_for(self, kind: str) -> str:
        return dict(self.thresholds).get(kind, "1/2")

    @property
    def quorum(self) -> Fraction:
        return Fraction(self.quorum_percent, 100)

    @property
    def agent_weight(self) -> Fraction:
        return Fraction(self.agent_weight_percent, 100)

    # ---- değişiklik (her zaman yeni sürüm)

    def with_change(self, key: str, raw: str) -> Regulation:
        rule = CHANGEABLE.get(key)
        if rule is None:
            raise InvalidValue("Bu kural oylamayla değiştirilemez.")
        field, value = rule.parse(raw)
        if field.startswith("strateji:") or field.startswith("esik:"):
            prefix, kind = field.split(":", 1)
            table = dict(self.strategies if prefix == "strateji" else self.thresholds)
            table[kind] = str(value)
            attr = "strategies" if prefix == "strateji" else "thresholds"
            changes: dict[str, Any] = {attr: tuple(sorted(table.items()))}
        else:
            changes = {field: value}
        return replace(self, version=self.version + 1, **changes)

    def current_value(self, key: str) -> str:
        rule = CHANGEABLE[key]
        if rule.field.startswith("strateji:"):
            return self.strategy_for(rule.field.split(":", 1)[1])
        if rule.field.startswith("esik:"):
            return self.threshold_for(rule.field.split(":", 1)[1])
        value = getattr(self, rule.field)
        return ("evet" if value else "hayir") if isinstance(value, bool) else str(value)


@dataclass(frozen=True)
class ChangeableRule:
    label: str
    field: str
    options: tuple[tuple[str, str], ...] = ()  # (değer, etiket); boşsa sayı
    minimum: int = 0
    maximum: int = 0

    def parse(self, raw: str) -> tuple[str, object]:
        if self.options:
            if raw not in dict(self.options):
                raise InvalidValue("Geçersiz seçenek.")
            if raw in ("evet", "hayir"):
                return self.field, raw == "evet"
            return self.field, raw
        try:
            number = int(raw)
        except ValueError as exc:
            raise InvalidValue("Bir sayı girin.") from exc
        if not self.minimum <= number <= self.maximum:
            raise InvalidValue(f"Değer {self.minimum} ile {self.maximum} arasında olmalı.")
        return self.field, number


_STRATEGY_OPTIONS = tuple(STRATEGY_LABELS.items())
_THRESHOLD_OPTIONS = tuple(THRESHOLD_LABELS.items())
_YES_NO = (("evet", "Evet"), ("hayir", "Hayır"))


def _strategy_rule(kind: str) -> ChangeableRule:
    return ChangeableRule(f"Strateji · {KIND_LABELS[kind]}", f"strateji:{kind}", _STRATEGY_OPTIONS)


def _threshold_rule(kind: str) -> ChangeableRule:
    return ChangeableRule(f"Eşik · {KIND_LABELS[kind]}", f"esik:{kind}", _THRESHOLD_OPTIONS)


CHANGEABLE: dict[str, ChangeableRule] = {
    "minimum_age": ChangeableRule("En küçük üyelik yaşı", "minimum_age", minimum=13, maximum=21),
    "voting_days": ChangeableRule("Oylama süresi (gün)", "voting_days", minimum=1, maximum=30),
    "quorum_percent": ChangeableRule("Yeter sayı (seçmenlerin %'si)", "quorum_percent", minimum=0, maximum=100),
    "agent_weight_percent": ChangeableRule("YZ ajanı oy ağırlığı (%)", "agent_weight_percent", minimum=0, maximum=100),
    "agents_may_vote": ChangeableRule("YZ ajanları oy kullanabilir", "agents_may_vote", _YES_NO),
    "quadratic_credits": ChangeableRule("Karesel oylama kredisi", "quadratic_credits", minimum=1, maximum=100),
    **{f"strateji_{k}": _strategy_rule(k) for k in KIND_LABELS},
    **{f"esik_{k}": _threshold_rule(k) for k in KIND_LABELS},
}

