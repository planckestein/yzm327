"""Composite deseni: konu ağacı.

``TopicComponent`` ortak arayüzdür. ``Message`` yapraktır (leaf); ``Topic`` hem mesajları hem alt konuları
taşıyan bileşiktir (composite). İstemci (arayüz, YZ ajanı, oylama) bir konuyla tek bir mesajla
çalışır gibi çalışır: ``visible_message_count()``, ``walk()``, ``concept_ids_in_tree()`` her düğümde aynıdır.

Aggregate sınırı: bir kök konu ve altındaki bütün ağaç tek aggregate'tir; olaylar kökte toplanır.
Silme yoktur (append-only): mesaj ve konular yalnızca maskelenir, düzenlemeler yeni sürüm olarak eklenir.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator, Sequence
from datetime import datetime

from kurultay.domain import events
from kurultay.domain.exceptions import InvalidTransition, NotFound
from kurultay.domain.topic_states import PROPOSED, STATES, TopicState
from kurultay.domain.value_objects import ContentHash, Mask, TopicRevision, new_id


class TopicComponent(ABC):
    id: str
    author_id: str
    created_at: datetime
    parent: Topic | None

    @abstractmethod
    def children(self) -> Sequence[TopicComponent]: ...

    @abstractmethod
    def is_visible(self) -> bool: ...

    @abstractmethod
    def visible_message_count(self) -> int: ...

    @property
    def is_composite(self) -> bool:
        return False

    def walk(self) -> Iterator[TopicComponent]:
        yield self
        for child in self.children():
            yield from child.walk()

    def root(self) -> Topic:
        node: TopicComponent = self
        while node.parent is not None:
            node = node.parent
        assert isinstance(node, Topic)
        return node

    def depth(self) -> int:
        return 0 if self.parent is None else self.parent.depth() + 1


class Message(TopicComponent):
    """Yaprak: tartışma mesajı. Değiştirilemez; yalnızca oylamayla maskelenebilir."""

    def __init__(
        self,
        id: str,
        author_id: str,
        text: str,
        created_at: datetime,
        reply_to: str | None = None,
        mask: Mask | None = None,
    ) -> None:
        self.id = id
        self.author_id = author_id
        self.text = text
        self.content_hash = ContentHash.of(text)
        self.created_at = created_at
        self.reply_to = reply_to
        self.mask = mask
        self.parent: Topic | None = None

    def children(self) -> Sequence[TopicComponent]:
        return ()

    def is_visible(self) -> bool:
        return self.mask is None and (self.parent is None or self.parent.is_visible())

    def visible_message_count(self) -> int:
        return 1 if self.is_visible() else 0

    def apply_mask(self, proposal_id: str, now: datetime) -> None:
        if self.mask is not None:
            raise InvalidTransition("Bu mesaj zaten gizlenmiş.")
        self.mask = Mask(proposal_id, now)
        self.root().events.append(events.ContentMasked("mesaj", self.id, proposal_id))

    def __repr__(self) -> str:
        return f"Message({self.id})"


class Topic(TopicComponent):
    """Bileşik: konu ya da alt konu. Çocukları mesajlar ve alt konulardır."""

    def __init__(
        self,
        id: str,
        author_id: str,
        title: str,
        description: str,
        concept_ids: frozenset[str],
        created_at: datetime,
        state: TopicState = PROPOSED,
        revisions: list[TopicRevision] | None = None,
        mask: Mask | None = None,
    ) -> None:
        self.id = id
        self.author_id = author_id
        self.concept_ids = concept_ids
        self.created_at = created_at
        self.state = state
        self.revisions: list[TopicRevision] = revisions or [TopicRevision(new_id(), title, description, created_at)]
        self.mask = mask
        self.parent: Topic | None = None
        self._children: list[TopicComponent] = []
        self.events: list[events.Event] = []

    @classmethod
    def propose(
        cls, author_id: str, title: str, description: str, concept_ids: frozenset[str], now: datetime
    ) -> Topic:
        topic = cls(new_id(), author_id, title.strip(), description.strip(), concept_ids, now)
        topic.events.append(
            events.TopicProposed(topic.id, None, topic.title, author_id, tuple(sorted(concept_ids)))
        )
        return topic

    # ---- Composite arayüzü

    @property
    def is_composite(self) -> bool:
        return True

    def children(self) -> Sequence[TopicComponent]:
        return tuple(self._children)

    def add(self, component: TopicComponent) -> None:
        component.parent = self
        self._children.append(component)

    def is_visible(self) -> bool:
        return self.state.is_visible and (self.parent is None or self.parent.is_visible())

    def visible_message_count(self) -> int:
        return sum(child.visible_message_count() for child in self._children)

    def messages(self) -> list[Message]:
        return [c for c in self._children if isinstance(c, Message)]

    def subtopics(self) -> list[Topic]:
        return [c for c in self._children if isinstance(c, Topic)]

    def find(self, component_id: str) -> TopicComponent:
        for node in self.walk():
            if node.id == component_id:
                return node
        raise NotFound("Konu ya da mesaj bulunamadı.")

    def path(self) -> list[Topic]:
        """Kökten bu konuya kadar olan konu zinciri (gezinti yolu)."""
        return ([] if self.parent is None else self.parent.path()) + [self]

    def concept_ids_in_tree(self) -> frozenset[str]:
        ids: set[str] = set()
        for node in self.walk():
            if isinstance(node, Topic):
                ids |= node.concept_ids
        return frozenset(ids)

    def last_activity(self) -> datetime:
        return max(node.created_at for node in self.walk())

    # ---- içerik

    @property
    def title(self) -> str:
        return self.revisions[-1].title

    @property
    def description(self) -> str:
        return self.revisions[-1].description

    def post_message(self, author_id: str, text: str, now: datetime, reply_to: str | None = None) -> Message:
        if not self.state.can_discuss:
            raise InvalidTransition(f"“{self.state.label}” durumundaki konuya mesaj yazılamaz.")
        if reply_to is not None and not any(m.id == reply_to for m in self.messages()):
            reply_to = None
        message = Message(new_id(), author_id, text.strip(), now, reply_to)
        self.add(message)
        self.root().events.append(
            events.MessagePosted(message.id, self.id, author_id, message.content_hash.value, reply_to)
        )
        return message

    def attach_subtopic(self, subtopic: Topic) -> None:
        """Önerilen alt konu ağaca bağlanır (henüz oylamada); yalnızca aktif konulara alt konu önerilir."""
        if not self.state.can_branch:
            raise InvalidTransition("Alt konu yalnızca tartışmaya açık konulara önerilebilir.")
        self.add(subtopic)
        root = self.root()
        for event in subtopic.events:
            if isinstance(event, events.TopicProposed):
                event = events.TopicProposed(
                    event.topic_id, self.id, event.title, event.author_id, event.concept_ids
                )
            root.events.append(event)
        subtopic.events.clear()

    def revise(self, title: str, description: str, proposal_id: str, now: datetime) -> None:
        """Memento: eski sürüm silinmez, yeni sürüm listenin sonuna eklenir."""
        revision = TopicRevision(new_id(), title.strip(), description.strip(), now, proposal_id)
        self.revisions.append(revision)
        self.root().events.append(events.TopicRevised(self.id, revision.id, proposal_id, revision.title))

    def ensure_changeable(self) -> None:
        if not self.state.can_be_changed:
            raise InvalidTransition(f"“{self.state.label}” durumundaki konu için teklif yapılamaz.")

    # ---- State deseni: geçişler durum nesnesine devredilir

    def start_voting(self) -> None:
        self.state.start_voting(self)

    def accept(self) -> None:
        self.state.accept(self)

    def reject(self) -> None:
        self.state.reject(self)

    def request_deletion(self) -> None:
        self.state.request_deletion(self)

    def confirm_deletion(self, proposal_id: str, now: datetime) -> None:
        self.state.confirm_deletion(self)
        self.mask = Mask(proposal_id, now)
        self.root().events.append(events.ContentMasked("konu", self.id, proposal_id))

    def cancel_deletion(self) -> None:
        self.state.cancel_deletion(self)

    def archive(self) -> None:
        self.state.archive(self)

    def _transition_to(self, new_state: TopicState) -> None:
        old = self.state
        self.state = new_state
        self.root().events.append(events.TopicStateChanged(self.id, old.name, new_state.name))

    @staticmethod
    def state_from_name(name: str) -> TopicState:
        return STATES[name]

    def __repr__(self) -> str:
        return f"Topic({self.id}, {self.state.name})"
