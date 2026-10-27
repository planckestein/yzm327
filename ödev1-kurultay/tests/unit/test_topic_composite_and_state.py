"""Composite (konu ağacı) ve State (yaşam döngüsü) desenleri."""

from __future__ import annotations

from datetime import datetime

import pytest

from kurultay.domain import events
from kurultay.domain.exceptions import InvalidTransition, NotFound
from kurultay.domain.topic import Message, Topic, TopicComponent
from kurultay.domain.topic_states import ACTIVE, HIDDEN, IN_DELETION_VOTE, STATES

NOW = datetime(2026, 10, 20, 12, 0)


def active_topic(title: str = "Kök konu") -> Topic:
    topic = Topic.propose("u1", title, "Açıklama", frozenset({"ekonomi"}), NOW)
    topic.start_voting()
    topic.accept()
    return topic


# ---------------------------------------------------------------- Composite


def test_topic_and_message_share_the_component_interface() -> None:
    root = active_topic()
    message = root.post_message("u2", "İlk mesaj", NOW)
    assert isinstance(root, TopicComponent) and isinstance(message, TopicComponent)
    assert root.is_composite and not message.is_composite
    assert message.children() == ()


def test_counts_walk_and_find_work_on_the_whole_tree() -> None:
    root = active_topic()
    root.post_message("u2", "Kök mesajı", NOW)
    sub = Topic.propose("u3", "Alt konu", "…", frozenset({"vergi"}), NOW)
    root.attach_subtopic(sub)
    sub.start_voting()
    sub.accept()
    leaf = sub.post_message("u4", "Alt konu mesajı", NOW)
    sub.post_message("u5", "İkinci mesaj", NOW)

    assert root.visible_message_count() == 3
    assert sub.visible_message_count() == 2
    assert [n.id for n in root.walk()][0] == root.id and len(list(root.walk())) == 5
    assert root.find(leaf.id) is leaf and leaf.root() is root
    assert [t.title for t in sub.path()] == ["Kök konu", "Alt konu"]
    assert root.concept_ids_in_tree() == {"ekonomi", "vergi"}
    with pytest.raises(NotFound):
        root.find("yok")


def test_masking_a_leaf_hides_only_that_message_and_keeps_it() -> None:
    root = active_topic()
    keep = root.post_message("u2", "Kalan", NOW)
    hide = root.post_message("u3", "Gizlenecek", NOW)
    hide.apply_mask("p1", NOW)
    assert root.visible_message_count() == 1
    assert hide.text == "Gizlenecek" and hide.content_hash.value  # silinmedi
    assert keep.is_visible() and not hide.is_visible()
    with pytest.raises(InvalidTransition):
        hide.apply_mask("p2", NOW)


def test_hiding_a_composite_hides_its_whole_subtree() -> None:
    root = active_topic()
    sub = Topic.propose("u3", "Alt", "…", frozenset({"vergi"}), NOW)
    root.attach_subtopic(sub)
    sub.start_voting()
    sub.accept()
    sub.post_message("u4", "Mesaj", NOW)
    root.request_deletion()
    root.confirm_deletion("p9", NOW)
    assert not root.is_visible() and not sub.is_visible()
    assert root.visible_message_count() == 0
    assert root.mask is not None and root.mask.proposal_id == "p9"


def test_events_bubble_up_to_the_aggregate_root() -> None:
    root = active_topic()
    root.events.clear()
    sub = Topic.propose("u3", "Alt", "…", frozenset(), NOW)
    root.attach_subtopic(sub)
    sub.start_voting()
    proposed = [e for e in root.events if isinstance(e, events.TopicProposed)]
    assert proposed and proposed[0].parent_id == root.id
    assert any(isinstance(e, events.TopicStateChanged) and e.topic_id == sub.id for e in root.events)
    assert sub.events == []


def test_subtopics_only_under_active_topics() -> None:
    proposed = Topic.propose("u1", "Henüz oylamada", "…", frozenset(), NOW)
    with pytest.raises(InvalidTransition):
        proposed.attach_subtopic(Topic.propose("u2", "Alt", "…", frozenset(), NOW))


def test_revisions_are_kept_like_a_memento() -> None:
    topic = active_topic("Eski başlık")
    topic.revise("Yeni başlık", "Yeni açıklama", "p1", NOW)
    assert topic.title == "Yeni başlık"
    assert [r.title for r in topic.revisions] == ["Eski başlık", "Yeni başlık"]


# ---------------------------------------------------------------- State


def test_full_lifecycle_happy_path() -> None:
    topic = Topic.propose("u1", "Konu", "…", frozenset(), NOW)
    assert topic.state.name == "onerildi"
    topic.start_voting()
    assert topic.state.name == "oylamada"
    topic.accept()
    assert topic.state is ACTIVE and topic.state.can_discuss
    topic.request_deletion()
    assert topic.state is IN_DELETION_VOTE and topic.state.can_discuss and not topic.state.can_be_changed
    topic.cancel_deletion()
    assert topic.state is ACTIVE
    topic.archive()
    assert topic.state.name == "arsivlendi" and not topic.state.can_discuss


def test_deletion_vote_can_end_in_hidden() -> None:
    topic = active_topic()
    topic.request_deletion()
    topic.confirm_deletion("p1", NOW)
    assert topic.state is HIDDEN and not topic.state.is_visible


def test_rejected_proposal() -> None:
    topic = Topic.propose("u1", "Konu", "…", frozenset(), NOW)
    topic.start_voting()
    topic.reject()
    assert topic.state.name == "reddedildi"


@pytest.mark.parametrize(
    "state_name, action",
    [
        ("onerildi", "accept"),
        ("oylamada", "request_deletion"),
        ("aktif", "start_voting"),
        ("aktif", "cancel_deletion"),
        ("arsivlendi", "request_deletion"),
        ("gizlendi", "archive"),
        ("reddedildi", "accept"),
    ],
)
def test_invalid_transitions_raise(state_name: str, action: str) -> None:
    topic = Topic.propose("u1", "Konu", "…", frozenset(), NOW)
    topic.state = STATES[state_name]
    with pytest.raises(InvalidTransition):
        getattr(topic, action)()


def test_messages_only_while_discussion_is_open() -> None:
    topic = Topic.propose("u1", "Konu", "…", frozenset(), NOW)
    topic.start_voting()
    with pytest.raises(InvalidTransition):
        topic.post_message("u2", "Erken", NOW)
    topic.accept()
    assert isinstance(topic.post_message("u2", "Şimdi olur", NOW), Message)


def test_every_transition_is_an_event() -> None:
    topic = Topic.propose("u1", "Konu", "…", frozenset(), NOW)
    topic.start_voting()
    topic.accept()
    changes = [(e.old_state, e.new_state) for e in topic.events if isinstance(e, events.TopicStateChanged)]
    assert changes == [("onerildi", "oylamada"), ("oylamada", "aktif")]
