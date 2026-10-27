"""Sınıflandırma metrikleri (Hafta 2: başarı metrikleri).

Saf fonksiyonlar; hiçbir altyapıya bağlı değil. ``Fβ`` ile hangi hatanın daha pahalı olduğu sayıya dökülür:
Kurultay'da yanlış pozitif (masum bir sözün engellenmesi = sansür) yanlış negatiften pahalıdır, bu yüzden ana
metrik **F0.5**'tir (kesinliğe iki kat ağırlık).
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass


def _div(a: float, b: float) -> float:
    return 0.0 if b == 0 else a / b


def f_beta(precision: float, recall: float, beta: float) -> float:
    """β < 1 kesinliğe, β > 1 duyarlılığa ağırlık verir."""
    return _div((1 + beta**2) * precision * recall, beta**2 * precision + recall)


@dataclass(frozen=True)
class BinaryResult:
    tp: int  # doğru pozitif: tehdit dedi, gerçekten tehdit
    fp: int  # yanlış pozitif: masum söz engellendi (sansür)
    fn: int  # yanlış negatif: tehdit kaçtı
    tn: int

    @property
    def total(self) -> int:
        return self.tp + self.fp + self.fn + self.tn

    @property
    def accuracy(self) -> float:
        return _div(self.tp + self.tn, self.total)

    @property
    def precision(self) -> float:
        return _div(self.tp, self.tp + self.fp)

    @property
    def recall(self) -> float:
        return _div(self.tp, self.tp + self.fn)

    @property
    def f1(self) -> float:
        return f_beta(self.precision, self.recall, 1)

    @property
    def f05(self) -> float:
        return f_beta(self.precision, self.recall, 0.5)

    def cost(self, fp_cost: float = 2.0, fn_cost: float = 1.0) -> float:
        """Hata maliyeti: varsayılan olarak bir sansür, kaçan bir tehdidin iki katı sayılır."""
        return self.fp * fp_cost + self.fn * fn_cost


def binary_metrics(truth: Sequence[bool], predicted: Sequence[bool]) -> BinaryResult:
    if len(truth) != len(predicted):
        raise ValueError("Gerçek ve tahmin listeleri aynı uzunlukta olmalı.")
    pairs = list(zip(truth, predicted, strict=True))
    return BinaryResult(
        tp=sum(t and p for t, p in pairs),
        fp=sum((not t) and p for t, p in pairs),
        fn=sum(t and not p for t, p in pairs),
        tn=sum((not t) and not p for t, p in pairs),
    )


def macro_f1(truth: Sequence[str], predicted: Sequence[str]) -> float:
    """Her sınıfın F1'i eşit ağırlıkla ortalanır: küçük sınıflar da eşit söz sahibidir."""
    classes = sorted(set(truth))
    scores = [binary_metrics([t == c for t in truth], [p == c for p in predicted]).f1 for c in classes]
    return _div(sum(scores), len(classes))


def accuracy(truth: Sequence[str], predicted: Sequence[str]) -> float:
    return _div(sum(t == p for t, p in zip(truth, predicted, strict=True)), len(truth))


def seeded_random(seed: int = 42) -> Callable[[], float]:
    """Tekrarlanabilir rastgelelik (LCG): her çalıştırmada aynı sayı dizisi, aynı tablo."""
    state = seed

    def next_value() -> float:
        nonlocal state
        state = (state * 1103515245 + 12345) % 2147483648
        return state / 2147483648

    return next_value
