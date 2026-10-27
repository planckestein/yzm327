"""Ölçüm modülü: metrikler el hesabıyla, temel çizgi merdiveni sıralamasıyla doğrulanır."""

from __future__ import annotations

import pytest

from kurultay.evaluation.baselines import naive_threat, section_ladder, threat_ladder
from kurultay.evaluation.metrics import binary_metrics, f_beta, macro_f1, seeded_random
from kurultay.evaluation.threat_set import THREAT_SET
from kurultay.reference_data import build_ontology


def test_binary_metrics_match_hand_calculation() -> None:
    r = binary_metrics([True, True, False, False, True], [True, False, True, False, True])
    assert (r.tp, r.fp, r.fn, r.tn) == (2, 1, 1, 1)
    assert r.precision == pytest.approx(2 / 3)
    assert r.recall == pytest.approx(2 / 3)
    assert r.f1 == pytest.approx(2 / 3)
    assert r.cost() == 3  # 1 sansür × 2 + 1 kaçan tehdit × 1


def test_f_half_rewards_precision_more_than_recall() -> None:
    assert f_beta(0.9, 0.5, 0.5) > f_beta(0.5, 0.9, 0.5)
    assert f_beta(0, 0, 0.5) == 0


def test_macro_f1_gives_small_classes_equal_weight() -> None:
    truth = ["a"] * 9 + ["b"]
    assert macro_f1(truth, ["a"] * 10) == pytest.approx((2 * 0.9 / 1.9) / 2)


def test_seeded_random_is_reproducible() -> None:
    a, b = seeded_random(7), seeded_random(7)
    assert [a() for _ in range(5)] == [b() for _ in range(5)]


def test_naive_baseline_raises_false_alarms_on_metaphors() -> None:
    assert naive_threat("Enflasyon emekliyi öldürüyor.")  # naif kural mecazı tehdit sanır


def test_threat_set_is_balanced_enough_to_be_meaningful() -> None:
    threats = sum(label for _, label in THREAT_SET)
    assert 15 <= threats <= len(THREAT_SET) - 15


def test_our_rule_beats_every_baseline_on_f_half() -> None:
    rows, misses = threat_ladder()
    by_name = {r.method: r.result for r in rows}
    ours = by_name["Bizim kural"]
    assert all(ours.f05 > r.f05 for name, r in by_name.items() if name != "Bizim kural")
    assert ours.precision >= 0.8  # sansür maliyeti yüksek: kesinlik öncelikli
    assert len(misses) == ours.fp + ours.fn


def test_section_rule_beats_majority_and_random() -> None:
    ontology = build_ontology()
    items = [
        ("Asgari ücret ve maaş artışı", "ucretler"),
        ("Hastane randevu sorunu", "saglik"),
        ("Kömür santralleri ve karbon", "cevre"),
        ("Sınav sistemi ve dershane", "sinav"),
        ("Metro ve toplu taşıma", "sehir"),
    ]
    rows = {r.method: r for r in section_ladder(ontology, items)}
    assert rows["Bizim kural"].macro_f1 > rows["Çoğunluk sınıfı"].macro_f1
    assert rows["Bizim kural"].accuracy == 1.0
