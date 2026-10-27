"""Türkçe metin ön işleme hattı (Pipeline) ve tehdit kuralı.

İlk sürümdeki ``metin.ts`` ve ``tehdit.ts`` modüllerinin Python karşılığıdır; davranış aynıdır.

Türkçe tuzağı: ``"I".lower()`` → ``"i"`` (ı değil), ``"İ".lower()`` → ``"i̇"``. Bu yüzden küçültme
her zaman :func:`tr_lower` ile yapılır.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from functools import reduce

Step = Callable[[str], str]


def pipeline(*steps: Step) -> Step:
    """Adımları sırayla uygulayan tek bir adım üretir."""
    return lambda text: reduce(lambda acc, step: step(acc), steps, text)


def tr_lower(text: str) -> str:
    return text.replace("I", "ı").replace("İ", "i").lower()


def strip_marks(keep: str = "") -> Step:
    """Harf, rakam ve boşluk dışındaki işaretleri boşluğa çevirir; ``keep`` içindekiler kalır."""
    pattern = re.compile(rf"[^\w\s{re.escape(keep)}]|_", re.UNICODE)
    return lambda text: pattern.sub(" ", text)


def drop_mentions(text: str) -> str:
    return re.sub(r"@\w+", " ", text)


def squeeze_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text)


def trim(text: str) -> str:
    return text.strip()


def pad(text: str) -> str:
    """Baş ve sona boşluk ekler: ``" kelime"`` araması kelime başını yakalar."""
    return f" {text} "


normalize = pipeline(tr_lower, strip_marks(), squeeze_spaces, trim, pad)


# ---------------------------------------------------------------- tehdit kuralı
# Tek içerik kısıtı gerçek tehdittir (ABD 1. Değişiklik, "true threat"). Hakaret ve sert eleştiri serbesttir.

_EXPLICIT_PATTERNS = (
    "seni bulaca", "seni bulur", "sizi bulaca", "canına okuy", "canına okur", "adresini biliyorum",
    "evini biliyorum", "sonun gelecek", "yaşamayacaksın", "gebertirim", "gebertece", "geberteca",
)
_VERB = re.compile(
    r"(öldür|kes|vur|yak|döv|boğ|patlat|as|kır|sık)"
    r"(ürüm|urum|irim|ırım|erim|arım|eceğim|acağım|ecem|acam|icem|ıcam|ucam|ücem)"
    r"|(bıçakla|parçala)(rım|yacağım|yacam)"
)
_TARGET = re.compile(r"(^|\s)(seni|sizi|hepinizi|aileni|ailenizi|evini|kafanı|kafanızı|çocuğunu|anneni)(\s|$)")
_sentence_normalize = pipeline(tr_lower, strip_marks(".!?"), squeeze_spaces)

THREAT_MESSAGE = (
    "Bu ifade tehdit olarak algılandı. Kurultay'da tehdit dışında her ifade serbesttir; "
    "lütfen tehdit içermeyecek şekilde yeniden yaz."
)


def find_threat(text: str) -> str | None:
    """Tehdit içeren cümleyi döndürür; yoksa ``None``."""
    for sentence in re.split(r"[.!?\n]+", _sentence_normalize(text)):
        padded = f" {sentence.strip()} "
        if any(p in padded for p in _EXPLICIT_PATTERNS):
            return sentence.strip()
        if _TARGET.search(padded) and any(_VERB.search(w) for w in padded.split()):
            return sentence.strip()
    return None


def keyword_hits(text: str, keywords: tuple[str, ...]) -> list[str]:
    """Anahtar kelimenin bir kelime başında geçmesi yeterli: ``"vergi"`` → ``"vergiler"`` eşleşir."""
    normalized = normalize(text)
    return [k for k in keywords if f" {tr_lower(k)}" in normalized]
