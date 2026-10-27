"""Temel çizgi merdiveni (Hafta 2): rastgele → çoğunluk sınıfı → naif kural → bizim kural.

Her yöntem aynı etiketli veride ölçülür. Bizim kuralın (ya da ileride bir dil modelinin) anlamlı olması için bu
basamakları açık farkla geçmesi gerekir. Ölçülen bileşenler alan katmanındaki saf fonksiyonlardır
(:func:`find_threat`, :meth:`Ontology.suggest`); ölçüm için veritabanı ya da ağ gerekmez.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable, Sequence
from dataclasses import dataclass

from kurultay.domain.ontology import Ontology
from kurultay.domain.text import find_threat, pipeline, strip_marks, tr_lower
from kurultay.evaluation.metrics import BinaryResult, accuracy, binary_metrics, macro_f1, seeded_random
from kurultay.evaluation.threat_set import THREAT_SET

# ------------------------------------------------------------------ tehdit (ikili)

NAIVE_ROOTS = ("öldür", "gebert", "bıçak", "vur", "döv", "kes", "yak", "boğ", "kır", "bomba", "canına")
_naive_prepare = pipeline(tr_lower, strip_marks())


def naive_threat(text: str) -> bool:
    """Naif temel çizgi: şiddet çağrıştıran bir kök geçiyorsa tehdit."""
    return any(word.startswith(NAIVE_ROOTS) for word in _naive_prepare(text).split())


def rule_threat(text: str) -> bool:
    return find_threat(text) is not None


@dataclass(frozen=True)
class LadderRow:
    method: str
    description: str
    result: BinaryResult


@dataclass(frozen=True)
class Miss:
    text: str
    kind: str  # "YP" (yanlış alarm) ya da "YN" (kaçan tehdit)


def threat_ladder(
    data: Sequence[tuple[str, bool]] = THREAT_SET,
) -> tuple[list[LadderRow], list[Miss]]:
    texts = [t for t, _ in data]
    truth = [label for _, label in data]
    rate = sum(truth) / len(truth)
    rnd = seeded_random()
    methods: list[tuple[str, str, Callable[[str], bool]]] = [
        ("Rastgele (oranla)", "Sınıf oranına göre yazı tura", lambda _t: rnd() < rate),
        ("Çoğunluk sınıfı", "Her şeye “tehdit değil” der", lambda _t: False),
        ("Naif anahtar kelime", "Şiddet kökü geçiyorsa tehdit", naive_threat),
        ("Bizim kural", "Açık kalıp ya da 1. tekil şiddet fiili + hedef", rule_threat),
    ]
    rows = [LadderRow(name, desc, binary_metrics(truth, [f(t) for t in texts])) for name, desc, f in methods]
    misses = [
        Miss(text, "YP" if predicted else "YN")
        for text, label in data
        if (predicted := rule_threat(text)) != label
    ]
    return rows, misses


# ------------------------------------------------------------------ ontoloji (çok sınıflı)


@dataclass(frozen=True)
class ClassRow:
    method: str
    description: str
    accuracy: float
    macro_f1: float


def _root(ontology: Ontology, concept_id: str) -> str:
    chain = ontology.ancestors(concept_id)
    return chain[0].id if chain else concept_id  # zincir kökten başlar


def section_ladder(ontology: Ontology, items: Sequence[tuple[str, str]]) -> list[ClassRow]:
    """``items``: (metin, doğru kavram id). Doğru cevap kavramın ana bölümüdür (ağacın kökü)."""
    truth = [_root(ontology, cid) for _, cid in items]
    counts = Counter(truth)
    most_common = counts.most_common(1)[0][0]
    rnd = seeded_random()

    def proportional(_text: str) -> str:
        r = rnd() * len(truth)
        for cls, n in sorted(counts.items()):
            r -= n
            if r < 0:
                return cls
        return most_common

    def rule(text: str) -> str:
        best = ontology.suggest(text, limit=1)
        return _root(ontology, best[0].concept.id) if best else most_common

    methods: list[tuple[str, str, Callable[[str], str]]] = [
        ("Rastgele (oranla)", "Bölüm oranlarına göre rastgele", proportional),
        ("Çoğunluk sınıfı", f"Her konuya “{most_common}” der", lambda _t: most_common),
        ("Bizim kural", "Anahtar kelime örtüşmesi (Ontology.suggest)", rule),
    ]
    rows = []
    for name, desc, f in methods:
        predicted = [f(text) for text, _ in items]
        rows.append(ClassRow(name, desc, accuracy(truth, predicted), macro_f1(truth, predicted)))
    return rows
