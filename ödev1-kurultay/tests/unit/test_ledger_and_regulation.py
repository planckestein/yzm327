"""Hash zinciri, düğümler arası uzlaşma ve yönetmelik sürümleri."""

from __future__ import annotations

import dataclasses
from datetime import datetime, timedelta

import pytest

from kurultay.domain.exceptions import InvalidValue
from kurultay.domain.ledger import GENESIS_HASH, LedgerEntry, reach_consensus, verify_chain
from kurultay.domain.regulation import CHANGEABLE, Regulation

NOW = datetime(2026, 10, 20, 12, 0)


def chain(n: int) -> list[LedgerEntry]:
    entries: list[LedgerEntry] = []
    for i in range(n):
        entries.append(LedgerEntry.next_after(entries[-1] if entries else None, "Deneme", {"i": i, "metin": "ç"}, NOW + timedelta(minutes=i)))
    return entries


def test_chain_links_each_entry_to_the_previous_one() -> None:
    entries = chain(4)
    assert entries[0].previous_hash == GENESIS_HASH and entries[0].index == 0
    assert all(b.previous_hash == a.hash for a, b in zip(entries, entries[1:]))
    report = verify_chain(entries)
    assert report.valid and report.length == 4 and report.head_hash == entries[-1].hash


def test_tampering_with_history_is_detected() -> None:
    entries = chain(5)
    entries[2] = dataclasses.replace(entries[2], payload='{"i":99}')
    report = verify_chain(entries)
    assert not report.valid and report.broken_index == 2


def test_removing_an_entry_is_detected() -> None:
    entries = chain(5)
    del entries[1]
    assert not verify_chain(entries).valid


def test_entries_are_immutable() -> None:
    with pytest.raises(dataclasses.FrozenInstanceError):
        chain(1)[0].payload = "x"  # type: ignore[misc]


def test_consensus_isolates_the_tampered_node() -> None:
    good = chain(4)
    bad = list(good)
    bad[1] = dataclasses.replace(bad[1], payload="{}")
    report = reach_consensus({"A": verify_chain(good), "B": verify_chain(good), "C": verify_chain(bad)})
    assert report.head_hash == good[-1].hash
    assert [n.agrees for n in report.nodes] == [True, True, False] and not report.healthy


def test_no_consensus_without_a_majority() -> None:
    a, b = chain(3), chain(4)
    report = reach_consensus({"A": verify_chain(a), "B": verify_chain(b)})
    assert report.head_hash is None


def test_regulation_changes_create_new_versions() -> None:
    reg = Regulation()
    new = reg.with_change("quorum_percent", "40")
    assert (reg.quorum_percent, new.quorum_percent, new.version) == (30, 40, 2)
    stricter = new.with_change("esik_mesaj_gizleme", "2/3").with_change("strateji_yeni_konu", "karesel")
    assert stricter.threshold_for("mesaj_gizleme") == "2/3" and stricter.strategy_for("yeni_konu") == "karesel"
    assert stricter.version == 4
    assert Regulation().with_change("agents_may_vote", "hayir").agents_may_vote is False


@pytest.mark.parametrize("key, value", [("quorum_percent", "150"), ("voting_days", "abc"), ("strateji_yeni_konu", "kura"), ("yok", "1")])
def test_invalid_regulation_changes_are_rejected(key: str, value: str) -> None:
    with pytest.raises(InvalidValue):
        Regulation().with_change(key, value)


def test_every_changeable_rule_reports_its_current_value() -> None:
    reg = Regulation()
    assert all(reg.current_value(key) for key in CHANGEABLE)
