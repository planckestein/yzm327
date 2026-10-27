"""State deseni: konuların ve tartışmaların yaşam döngüsü.

    Önerildi ──oylamaya çık──▶ Oylamada ──kabul──▶ Aktif ──silme teklifi──▶ Silinme Oylamasında
                                   │                  │                        │         │
                                   └──red──▶ Reddedildi └──uzlaşma──▶ Arşivlendi  kabul│    red│
                                                                              ▼         ▼
                                                                          Gizlendi    Aktif

Her durum bir sınıftır ve yalnızca kendisinden mümkün olan geçişleri bilir. İzin verilmeyen bir geçiş
:class:`InvalidTransition` fırlatır; ``if durum == ...`` zincirleri yoktur. Durum nesneleri durumsuzdur
(stateless), bu yüzden her durumdan tek bir örnek paylaşılır.
"""

from __future__ import annotations

from abc import ABC
from typing import TYPE_CHECKING, ClassVar

from kurultay.domain.exceptions import InvalidTransition

if TYPE_CHECKING:
    from kurultay.domain.topic import Topic


class TopicState(ABC):
    name: ClassVar[str]
    label: ClassVar[str]
    can_discuss: ClassVar[bool] = False
    can_branch: ClassVar[bool] = False  # alt konu önerilebilir mi
    can_be_changed: ClassVar[bool] = False  # düzenleme / silme / uzlaşma teklif edilebilir mi
    is_visible: ClassVar[bool] = True

    def _refuse(self, action: str) -> None:
        raise InvalidTransition(f"“{self.label}” durumundaki bir konu için {action} yapılamaz.")

    def start_voting(self, topic: Topic) -> None:
        self._refuse("oylama başlatma")

    def accept(self, topic: Topic) -> None:
        self._refuse("kabul")

    def reject(self, topic: Topic) -> None:
        self._refuse("red")

    def request_deletion(self, topic: Topic) -> None:
        self._refuse("silme teklifi")

    def confirm_deletion(self, topic: Topic) -> None:
        self._refuse("gizleme")

    def cancel_deletion(self, topic: Topic) -> None:
        self._refuse("silme teklifini geri çevirme")

    def archive(self, topic: Topic) -> None:
        self._refuse("arşivleme")

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}>"


class Proposed(TopicState):
    name, label = "onerildi", "Önerildi"

    def start_voting(self, topic: Topic) -> None:
        topic._transition_to(IN_VOTING)


class InVoting(TopicState):
    name, label = "oylamada", "Oylamada"

    def accept(self, topic: Topic) -> None:
        topic._transition_to(ACTIVE)

    def reject(self, topic: Topic) -> None:
        topic._transition_to(REJECTED)


class Active(TopicState):
    name, label = "aktif", "Tartışmaya açık"
    can_discuss = True
    can_branch = True
    can_be_changed = True

    def request_deletion(self, topic: Topic) -> None:
        topic._transition_to(IN_DELETION_VOTE)

    def archive(self, topic: Topic) -> None:
        topic._transition_to(ARCHIVED)


class InDeletionVote(TopicState):
    """Silme oylaması sürerken tartışma devam eder; sonuç gelene kadar hiçbir şey kaybolmaz."""

    name, label = "silinme_oylamasinda", "Silinme oylamasında"
    can_discuss = True

    def confirm_deletion(self, topic: Topic) -> None:
        topic._transition_to(HIDDEN)

    def cancel_deletion(self, topic: Topic) -> None:
        topic._transition_to(ACTIVE)


class Archived(TopicState):
    name, label = "arsivlendi", "Uzlaşıyla arşivlendi"


class Hidden(TopicState):
    """Gizlendi: kayıt silinmez, yalnızca maskelenir; defterdeki hash zinciri bozulmaz."""

    name, label = "gizlendi", "Oylamayla gizlendi"
    is_visible = False


class Rejected(TopicState):
    name, label = "reddedildi", "Reddedildi"


PROPOSED, IN_VOTING, ACTIVE = Proposed(), InVoting(), Active()
IN_DELETION_VOTE, ARCHIVED, HIDDEN, REJECTED = InDeletionVote(), Archived(), Hidden(), Rejected()

STATES: dict[str, TopicState] = {
    s.name: s for s in (PROPOSED, IN_VOTING, ACTIVE, IN_DELETION_VOTE, ARCHIVED, HIDDEN, REJECTED)
}
LIFECYCLE_ORDER = ("onerildi", "oylamada", "aktif", "silinme_oylamasinda", "arsivlendi", "gizlendi")
