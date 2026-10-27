"""Strategy deseni: "çoğunluğun azınlığı ezmesini" engelleyen oylama algoritmaları.

Her strateji aynı sözleşmeyi (``VotingStrategy`` Protocol) uygular: bir oy pusulasının ağırlığını,
bir seçmenin en fazla ne kadar ağırlık taşıyabileceğini ve pusulanın kurallara uygunluğunu söyler.
Sayım ve karar (``tally`` / ``decide``) stratejiden bağımsızdır; yeni bir algoritma eklemek mevcut kodu
değiştirmez, ``STRATEGIES`` kaydına bir satır eklemektir (Açık/Kapalı ilkesi).

* Basit çoğunluk ........ kişi başı 1 oy (karşılaştırma için temel çizgi).
* Karesel oylama ........ k oy kullanmanın bedeli k² kredi; ilk oy bedava, ek kredi bütçesi açık oylamalar arasında paylaşılır. Az sayıda ama konuyu çok önemseyen azınlık,
                           kayıtsız çoğunluğa karşı sesini yükseltebilir.
* Uzman ağırlıklı ....... teklifin kavramlarında oylamayla tanınmış uzmanlığı olanın oyu 1 + düzey.
* İtibar tabanlı ........ katkıyla kazanılan itibar logaritmik ağırlık verir; tavanlıdır, "balina" olmaz.

YZ ajanlarının oyu yönetmelikteki ``agent_weight`` oranıyla çarpılır (varsayılan yarım oy).
"""

from __future__ import annotations

import math
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from fractions import Fraction
from typing import Protocol

from kurultay.domain.exceptions import InvalidValue
from kurultay.domain.regulation import Regulation


class Choice(str, Enum):
    YES = "evet"
    NO = "hayir"


@dataclass(frozen=True)
class Ballot:
    voter_id: str
    choice: Choice
    cast_at: datetime
    intensity: int = 1  # karesel oylamada kullanılan oy sayısı
    is_agent: bool = False
    rationale: str = ""


@dataclass(frozen=True)
class VoterProfile:
    """Bir seçmenin oylamayla ilgili özellikleri (kişisel veri içermez)."""

    user_id: str
    reputation: int = 0
    expertise_level: int = 0
    is_agent: bool = False


@dataclass(frozen=True)
class Electorate:
    """Seçmen kütüğü: oylamaya katılabilecekler ve oylamayla ilgili özellikleri (değer nesnesi)."""

    voters: tuple[VoterProfile, ...]
    agent_weight: Fraction = Fraction(1, 2)
    _index: dict[str, VoterProfile] = field(init=False, repr=False, compare=False, hash=False)
    _max_weight: dict[tuple[str, object], float] = field(init=False, repr=False, compare=False, hash=False)

    def __post_init__(self) -> None:
        object.__setattr__(self, "_index", {v.user_id: v for v in self.voters})
        object.__setattr__(self, "_max_weight", {})

    def factor(self, voter: VoterProfile) -> float:
        """YZ ajanı oyunun insan oyuna oranı."""
        return float(self.agent_weight) if voter.is_agent else 1.0

    def total_max_weight(self, strategy: VotingStrategy) -> float:
        """Bütün seçmenlerin taşıyabileceği en yüksek toplam ağırlık (kütük değişmediği için bir kez hesaplanır)."""
        key = (strategy.name, getattr(strategy, "credits", None))
        if key not in self._max_weight:
            self._max_weight[key] = sum(strategy.max_weight(v) * self.factor(v) for v in self.voters)
        return self._max_weight[key]

    def get(self, user_id: str) -> VoterProfile | None:
        return self._index.get(user_id)

    def __len__(self) -> int:
        return len(self.voters)

    def __contains__(self, user_id: object) -> bool:
        return user_id in self._index


class VotingStrategy(Protocol):
    @property
    def name(self) -> str: ...

    @property
    def label(self) -> str: ...

    @property
    def explanation(self) -> str: ...

    def weight(self, ballot: Ballot, voter: VoterProfile) -> float: ...

    def max_weight(self, voter: VoterProfile) -> float: ...

    def validate(self, intensity: int, voter: VoterProfile, spent: int = 0) -> None:
        """Pusula kuralı. ``spent``: seçmenin açık oylamalarda harcadığı ek kredi (yalnızca karesel kullanır)."""
        ...


class SimpleMajority:
    name = "basit"
    label = "Basit çoğunluk"
    explanation = "Her seçmenin bir oyu vardır. Diğer stratejilerin karşılaştırıldığı temel çizgidir."

    def weight(self, ballot: Ballot, voter: VoterProfile) -> float:
        return 1.0

    def max_weight(self, voter: VoterProfile) -> float:
        return 1.0

    def validate(self, intensity: int, voter: VoterProfile, spent: int = 0) -> None:
        if intensity != 1:
            raise InvalidValue("Bu oylamada herkes tek oy kullanır.")


class QuadraticVoting:
    name = "karesel"
    label = "Karesel oylama"

    def __init__(self, credits: int = 9) -> None:
        self.credits = credits

    @property
    def max_votes(self) -> int:
        return max(1, math.isqrt(self.credits))

    @property
    def budget(self) -> int:
        """Ek kredi bütçesi: ilk oy bedava olduğu için kredinin bir eksiği."""
        return self.credits - 1

    @property
    def explanation(self) -> str:
        return (
            f"k oy kullanmanın bedeli k² kredidir; ilk oy herkese bedava. 2 ya da {self.max_votes} oy için gereken "
            f"ek krediler (k²−1) seçmenin {self.budget} kredilik bütçesinden düşer ve bu bütçe o an açık olan "
            "bütün karesel oylamalar arasında paylaşılır. Herkes “bunu çok önemsiyorum” diyebilir, "
            "ama her şey için diyemez."
        )

    def cost(self, intensity: int) -> int:
        return intensity * intensity

    def extra_cost(self, intensity: int) -> int:
        """İlk oyun üstündeki bedel: bütçeden düşen kısım."""
        return self.cost(intensity) - 1

    def weight(self, ballot: Ballot, voter: VoterProfile) -> float:
        return float(ballot.intensity)

    def max_weight(self, voter: VoterProfile) -> float:
        return float(self.max_votes)

    def validate(self, intensity: int, voter: VoterProfile, spent: int = 0) -> None:
        if intensity < 1 or self.cost(intensity) > self.credits:
            raise InvalidValue(f"Karesel oylamada en fazla {self.max_votes} oy ({self.credits} kredi) kullanılır.")
        left = max(0, self.budget - spent)
        if self.extra_cost(intensity) > left:
            raise InvalidValue(
                f"Ek kredin yetmiyor: açık karesel oylamalarda {spent} ek kredi kullandın, {left} kaldı. "
                f"{intensity} oy {self.extra_cost(intensity)} ek kredi ister; 1 oy her zaman kullanılabilir."
            )


class ExpertWeighted:
    name = "uzman"
    label = "Uzman ağırlıklı oylama"
    explanation = (
        "Teklifin kavramlarında oylamayla tanınmış uzmanlığı olanın oyu 1 + uzmanlık düzeyi (en fazla 4) sayılır. "
        "Uzmanlık satın alınamaz, topluluk tarafından oylanarak verilir."
    )

    def weight(self, ballot: Ballot, voter: VoterProfile) -> float:
        return 1.0 + voter.expertise_level

    def max_weight(self, voter: VoterProfile) -> float:
        return 1.0 + voter.expertise_level

    def validate(self, intensity: int, voter: VoterProfile, spent: int = 0) -> None:
        SimpleMajority().validate(intensity, voter)


class ReputationWeighted:
    name = "itibar"
    label = "İtibar tabanlı oylama"
    CAP = 2.0
    explanation = (
        "Kabul gören teklifler ve tartışmaya katkıyla kazanılan itibar, logaritmik bir ek ağırlık verir: "
        "1 + log₂(1 + itibar/10), en fazla 3. Tavan sayesinde kimse tek başına sonucu belirleyemez."
    )

    def weight(self, ballot: Ballot, voter: VoterProfile) -> float:
        return self.max_weight(voter)

    def max_weight(self, voter: VoterProfile) -> float:
        return round(1.0 + min(self.CAP, math.log2(1 + voter.reputation / 10)), 2)

    def validate(self, intensity: int, voter: VoterProfile, spent: int = 0) -> None:
        SimpleMajority().validate(intensity, voter)


StrategyFactory = Callable[[Regulation], VotingStrategy]

STRATEGIES: dict[str, StrategyFactory] = {
    "basit": lambda reg: SimpleMajority(),
    "karesel": lambda reg: QuadraticVoting(reg.quadratic_credits),
    "uzman": lambda reg: ExpertWeighted(),
    "itibar": lambda reg: ReputationWeighted(),
}


def create_strategy(name: str, regulation: Regulation) -> VotingStrategy:
    """Registry + Factory: strateji adından nesneyi üretir."""
    try:
        return STRATEGIES[name](regulation)
    except KeyError as exc:
        raise InvalidValue(f"Bilinmeyen oylama stratejisi: {name}") from exc


# ---------------------------------------------------------------- sayım ve karar


@dataclass(frozen=True)
class WeightedBallot:
    ballot: Ballot
    weight: float


@dataclass(frozen=True)
class Tally:
    yes: float
    no: float
    remaining_max: float  # henüz oy vermemiş seçmenlerin taşıyabileceği en fazla ağırlık
    eligible: int
    voted: int
    weighted: tuple[WeightedBallot, ...] = ()

    @property
    def cast(self) -> float:
        return self.yes + self.no

    @property
    def yes_share(self) -> float:
        return self.yes / self.cast if self.cast else 0.0

    @property
    def participation(self) -> float:
        return self.voted / self.eligible if self.eligible else 0.0


class Outcome(str, Enum):
    ACCEPTED = "kabul"
    REJECTED = "red"


@dataclass(frozen=True)
class Decision:
    outcome: Outcome
    reason: str


def tally(strategy: VotingStrategy, ballots: Iterable[Ballot], electorate: Electorate) -> Tally:
    weighted: list[WeightedBallot] = []
    voted_ids: set[str] = set()
    voted_max = 0.0  # oy vermiş seçmenlerin taşıyabileceği en yüksek ağırlık (kalanı bulmak için)
    for ballot in ballots:
        known = electorate.get(ballot.voter_id)
        voter = known or VoterProfile(ballot.voter_id, is_agent=ballot.is_agent)
        factor = electorate.factor(voter)
        weighted.append(WeightedBallot(ballot, round(strategy.weight(ballot, voter) * factor, 2)))
        if known is not None and ballot.voter_id not in voted_ids:
            voted_max += strategy.max_weight(known) * factor
        voted_ids.add(ballot.voter_id)
    remaining = max(0.0, electorate.total_max_weight(strategy) - voted_max)
    yes = sum(w.weight for w in weighted if w.ballot.choice is Choice.YES)
    no = sum(w.weight for w in weighted if w.ballot.choice is Choice.NO)
    return Tally(round(yes, 2), round(no, 2), round(remaining, 2), len(electorate), len(voted_ids), tuple(weighted))


def _f(value: float) -> Fraction:
    return Fraction(str(round(value, 4)))


def _meets(share: Fraction | float, threshold: Fraction) -> bool:
    """"Yarıdan fazla" kesin büyüklük ister; 3/5 ve 2/3 eşitliği kabul eder."""
    return share > threshold if threshold == Fraction(1, 2) else share >= threshold


def decide(t: Tally, threshold: Fraction, quorum: Fraction, deadline_passed: bool) -> Decision | None:
    """Sonuç kesinleştiyse kararı döndürür; kesinleşmediyse ``None``.

    Erken karar: kalan bütün seçmenler aleyhte oy verse bile eşik aşılıyorsa kabul, lehte oy verse bile
    aşılamıyorsa red. Böylece oylama süre beklenmeden kapanabilir ama sonuç asla değişmez.
    """
    possible = t.cast + t.remaining_max
    if possible > 0 and t.cast > 0:
        if _meets(_f(t.yes) / _f(possible), threshold):
            return Decision(Outcome.ACCEPTED, "Eşik, kalan oylar ne olursa olsun aşıldı.")
        if not _meets(_f(t.yes + t.remaining_max) / _f(possible), threshold):
            return Decision(Outcome.REJECTED, "Kalan oyların hepsi lehte olsa bile eşik aşılamıyor.")
    if not deadline_passed:
        return None
    if t.eligible and Fraction(t.voted, t.eligible) < quorum:
        return Decision(Outcome.REJECTED, "Süre doldu; yeter sayıya ulaşılamadı.")
    if t.cast and _meets(_f(t.yes) / _f(t.cast), threshold):
        return Decision(Outcome.ACCEPTED, "Süre doldu; kullanılan oylarda eşik aşıldı.")
    return Decision(Outcome.REJECTED, "Süre doldu; eşik aşılamadı.")


def parse_threshold(text: str) -> Fraction:
    return Fraction(text)
