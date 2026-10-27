"""Kullanıcı aggregate'i ve profil görünümleri.

Kişisel bilgiler (ad, soyad, doğum tarihi, adres, şifre özeti) sistemde tutulur ama yalnızca
:class:`PrivateProfile` içinde taşınır. Herkese açık olan tek görünüm :class:`PublicProfile`'dır ve
içinde takma ad dışında kimlik bilgisi yoktur. Hangi görünümün kime verileceğine
``service_layer.proxies.ProfileAccessProxy`` (Protection Proxy) karar verir.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from kurultay.domain import events
from kurultay.domain.value_objects import Expertise, Nickname, PasswordHash, PersonalInfo


class Role(str, Enum):
    MEMBER = "uye"
    EXPERT = "uzman"
    AI_AGENT = "yz_ajan"

    @property
    def label(self) -> str:
        return {"uye": "Üye", "uzman": "Uzman", "yz_ajan": "YZ Ajanı"}[self.value]


@dataclass(frozen=True)
class PublicProfile:
    """Herkesin görebildiği profil. Kişisel veri alanı YOKTUR (tasarım gereği sızamaz)."""

    user_id: str
    nickname: str
    role: Role
    reputation: int
    interests: frozenset[str]
    expertise: tuple[Expertise, ...]
    joined_at: datetime
    agent_model: str | None = None

    @property
    def is_private(self) -> bool:
        return False


@dataclass(frozen=True)
class PrivateProfile(PublicProfile):
    """Yalnızca hesabın sahibine gösterilen profil."""

    personal_info: PersonalInfo | None = None

    @property
    def is_private(self) -> bool:
        return True


class User:
    def __init__(
        self,
        id: str,
        nickname: Nickname,
        personal_info: PersonalInfo,
        password_hash: PasswordHash,
        role: Role,
        joined_at: datetime,
        interests: frozenset[str] = frozenset(),
        expertise: tuple[Expertise, ...] = (),
        reputation: int = 0,
        agent_model: str | None = None,
    ) -> None:
        self.id = id
        self.nickname = nickname
        self.personal_info = personal_info
        self.password_hash = password_hash
        self.role = role
        self.joined_at = joined_at
        self.interests = interests
        self.expertise = expertise
        self.reputation = reputation
        self.agent_model = agent_model
        self.events: list[events.Event] = []

    def __repr__(self) -> str:
        return f"User({self.nickname})"

    def __eq__(self, other: object) -> bool:
        return isinstance(other, User) and other.id == self.id

    def __hash__(self) -> int:
        return hash(self.id)

    @property
    def is_agent(self) -> bool:
        return self.role is Role.AI_AGENT

    # ---- ilgi alanları ve uzmanlık (ontolojiye bağlanır)

    def set_interest(self, concept_id: str, following: bool) -> None:
        new = self.interests | {concept_id} if following else self.interests - {concept_id}
        if new != self.interests:
            self.interests = frozenset(new)
            self.events.append(events.InterestsChanged(self.id, tuple(sorted(new))))

    def grant_expertise(self, concept_id: str, level: int) -> None:
        """Uzmanlık yalnızca oylamayla kabul edilen bir tekliften sonra verilir."""
        others = tuple(e for e in self.expertise if e.concept_id != concept_id)
        self.expertise = (*others, Expertise(concept_id, level))
        self.interests = self.interests | {concept_id}
        if self.role is Role.MEMBER:
            self.role = Role.EXPERT
        self.events.append(events.ExpertiseGranted(self.id, concept_id, level))

    def expertise_level(self, concept_ids: frozenset[str]) -> int:
        return max((e.level for e in self.expertise if e.concept_id in concept_ids), default=0)

    @property
    def concept_ids(self) -> frozenset[str]:
        """Kullanıcıyı ontolojiye bağlayan kavramlar: ilgi alanları + uzmanlıkları."""
        return self.interests | {e.concept_id for e in self.expertise}

    def change_reputation(self, delta: int, reason: str) -> None:
        self.reputation = max(0, self.reputation + delta)
        self.events.append(events.ReputationChanged(self.id, delta, reason))

    # ---- profil görünümleri

    def public_profile(self) -> PublicProfile:
        return PublicProfile(
            user_id=self.id,
            nickname=str(self.nickname),
            role=self.role,
            reputation=self.reputation,
            interests=self.interests,
            expertise=self.expertise,
            joined_at=self.joined_at,
            agent_model=self.agent_model,
        )

    def private_profile(self) -> PrivateProfile:
        public = self.public_profile()
        return PrivateProfile(**{f: getattr(public, f) for f in public.__dataclass_fields__}, personal_info=self.personal_info)
