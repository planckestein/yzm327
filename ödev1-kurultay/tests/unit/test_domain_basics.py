"""Değer nesneleri, metin hattı, kullanıcı gizliliği ve ontoloji."""

from __future__ import annotations

import dataclasses
from datetime import date

import pytest

from kurultay.domain.exceptions import InvalidValue
from kurultay.domain.ontology import Ontology
from kurultay.domain.text import find_threat, keyword_hits, normalize, tr_lower
from kurultay.domain.user import PrivateProfile, PublicProfile
from kurultay.domain.value_objects import ContentHash, Expertise, Nickname, PersonalInfo
from tests.conftest import make_user

# ---------------------------------------------------------------- değer nesneleri


def test_nickname_is_validated_and_immutable() -> None:
    nick = Nickname("ayşe_42")
    assert str(nick) == "ayşe_42"
    with pytest.raises(dataclasses.FrozenInstanceError):
        nick.value = "baska"  # type: ignore[misc]
    for bad in ("ab", "boşluk var", "x" * 21, "nokta.lı"):
        with pytest.raises(InvalidValue):
            Nickname(bad)


def test_value_objects_compare_by_value() -> None:
    assert Nickname("kurultay") == Nickname("kurultay")
    assert ContentHash.of("merhaba") == ContentHash.of("merhaba")
    assert ContentHash.of("merhaba") != ContentHash.of("Merhaba")


def test_personal_info_age_and_masked_repr() -> None:
    info = PersonalInfo("Ayşe", "Kaya", date(2000, 6, 15), "Ankara")
    assert info.age_on(date(2026, 6, 14)) == 25
    assert info.age_on(date(2026, 6, 15)) == 26
    assert "Kaya" not in repr(info) and "Ankara" not in repr(info)
    with pytest.raises(InvalidValue):
        PersonalInfo("", "Kaya", date(2000, 1, 1), "Ankara")


def test_expertise_level_bounds() -> None:
    assert Expertise("hukuk", 3).level == 3
    with pytest.raises(InvalidValue):
        Expertise("hukuk", 4)


# ---------------------------------------------------------------- PII


def test_public_profile_has_no_personal_fields() -> None:
    fields = {f.name for f in dataclasses.fields(PublicProfile)}
    assert not fields & {"first_name", "last_name", "birth_date", "address", "personal_info", "password_hash"}


def test_user_profiles() -> None:
    user = make_user("gizli_kisi")
    public = user.public_profile()
    private = user.private_profile()
    assert public.nickname == "gizli_kisi" and not public.is_private
    assert isinstance(private, PrivateProfile) and private.is_private
    assert private.personal_info is not None and private.personal_info.first_name == "Ad"


def test_expertise_grant_promotes_member_to_expert() -> None:
    user = make_user()
    user.grant_expertise("hukuk", 2)
    assert user.role.value == "uzman"
    assert user.expertise_level(frozenset({"hukuk", "ekonomi"})) == 2
    assert "hukuk" in user.concept_ids
    assert user.events[-1].__class__.__name__ == "ExpertiseGranted"


def test_reputation_never_negative() -> None:
    user = make_user()
    user.change_reputation(-50, "ceza")
    assert user.reputation == 0


# ---------------------------------------------------------------- Türkçe metin hattı ve tehdit


def test_turkish_lowercase_trap() -> None:
    assert tr_lower("IŞIK İZMİR") == "ışık izmir"
    assert normalize("Merhaba, DÜNYA!") == " merhaba dünya "


@pytest.mark.parametrize(
    "text",
    ["Seni bulacağım.", "Adresini biliyorum, dikkat et.", "Seni öldürürüm!", "Aileni yakacağım", "Seni bıçaklarım."],
)
def test_threats_are_detected(text: str) -> None:
    assert find_threat(text) is not None


@pytest.mark.parametrize(
    "text",
    ["YZ insanlığı öldürür mü?", "Bu karar ekonomiyi öldürür.", "Sen tam bir aptalsın.", "Vergiyi kesinlikle düşürmeliyiz."],
)
def test_criticism_and_insult_are_not_threats(text: str) -> None:
    assert find_threat(text) is None


def test_keyword_matches_word_starts() -> None:
    assert keyword_hits("Vergiler ve bütçe şeffaflığı", ("vergi", "bütçe", "ceza")) == ["vergi", "bütçe"]


# ---------------------------------------------------------------- ontoloji


def test_ontology_tree_and_neighbourhood(ontology: Ontology) -> None:
    assert [c.id for c in ontology.ancestors("vergi")] == ["ekonomi", "vergi"]
    hood = ontology.neighbourhood(["veri-gizliligi"])
    assert {"dijital", "veri-gizliligi", "temel-haklar"} <= hood  # üst kavram ve ilişkili kavram
    assert "ekonomi" not in hood


def test_relevance_rules(ontology: Ontology) -> None:
    assert ontology.is_relevant_to(frozenset({"ekonomi"}), ["vergi"])  # üst kavramı takip eden alt kavramı oylar
    assert not ontology.is_relevant_to(frozenset({"vergi"}), ["saglik"])
    assert ontology.is_relevant_to(frozenset(), [])  # kavramsız teklif herkesi ilgilendirir


def test_suggest_and_relevance_score(ontology: Ontology) -> None:
    text = "KDV ve gelir vergisi bütçe açığını kapatmak için artırılmamalı"
    assert ontology.suggest(text)[0].concept.id in {"vergi", "ekonomi"}
    assert ontology.relevance(text, ["vergi"]) >= 50
    assert ontology.relevance("Bugün hava güzel", ["vergi"]) == 0
