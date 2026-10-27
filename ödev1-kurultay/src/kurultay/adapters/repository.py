"""Repository deseni: aggregate'lere koleksiyon gibi erişim.

Soyut repository'ler servis katmanının bağımlı olduğu sözleşmedir. ``SqlAlchemy*`` sınıfları bu sözleşmeyi
SQLite üzerinde, açık veri eşleyicileriyle (satır ↔ alan nesnesi) uygular. Testlerde aynı sözleşmenin
bellek içi sahteleri (``tests/fakes.py``) kullanılır.

Değişmezlik burada da korunur: hiçbir repository'de ``delete`` yoktur; mesaj, oy, maske, sürüm ve defter
kayıtları yalnızca eklenir.
"""

from __future__ import annotations

import builtins
import json
from abc import ABC, abstractmethod
from collections.abc import Iterable, Sequence
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from fractions import Fraction
from typing import Generic, TypeVar

from sqlalchemy import ColumnElement, Connection, func, insert, literal_column, select, update

from kurultay.adapters import orm
from kurultay.domain.ledger import LedgerEntry
from kurultay.domain.notification import Notification
from kurultay.domain.ontology import Concept, ConceptRelation, Ontology, RelationKind
from kurultay.domain.proposal import Proposal, ProposalKind, ProposalResult, ProposalStatus
from kurultay.domain.regulation import Regulation
from kurultay.domain.topic import Message, Topic, TopicComponent
from kurultay.domain.topic_states import STATES
from kurultay.domain.user import Role, User
from kurultay.domain.value_objects import Expertise, Mask, Nickname, PasswordHash, PersonalInfo, TopicRevision
from kurultay.domain.voting import Ballot, Choice, Electorate, VoterProfile

T = TypeVar("T")


class AbstractRepository(ABC, Generic[T]):
    """Ortak iskelet: ``seen`` kümesi, Unit of Work'ün olay toplaması için izlenen aggregate'lerdir."""

    def __init__(self) -> None:
        self.seen: set[T] = set()

    def add(self, aggregate: T) -> None:
        self._add(aggregate)
        self.seen.add(aggregate)

    def get(self, id: str) -> T | None:
        aggregate = self._get(id)
        if aggregate is not None:
            self.seen.add(aggregate)
        return aggregate

    @abstractmethod
    def _add(self, aggregate: T) -> None: ...

    @abstractmethod
    def _get(self, id: str) -> T | None: ...

    def flush(self) -> None:
        """Commit öncesi izlenen aggregate'lerin değişikliklerini kalıcı katmana yazar."""


class AbstractUserRepository(AbstractRepository[User]):
    def get_by_nickname(self, nickname: str) -> User | None:
        user = self._get_by_nickname(nickname)
        if user is not None:
            self.seen.add(user)
        return user

    @abstractmethod
    def _get_by_nickname(self, nickname: str) -> User | None: ...

    @abstractmethod
    def list(self) -> builtins.list[User]: ...

    def count(self, agents: bool = False) -> int:
        return sum(1 for u in self.list() if u.is_agent == agents)


class AbstractTopicRepository(AbstractRepository[Topic]):
    """Aggregate kök konudur; ``get(id)`` ağaçtaki herhangi bir düğümün kimliğiyle kökü döndürür."""

    def get_node(self, node_id: str) -> TopicComponent | None:
        root = self.get(node_id)
        return root.find(node_id) if root is not None else None

    @abstractmethod
    def roots(self) -> builtins.list[Topic]: ...


class AbstractProposalRepository(AbstractRepository[Proposal]):
    @abstractmethod
    def list(self) -> builtins.list[Proposal]: ...

    def list_open(self) -> builtins.list[Proposal]:
        return [p for p in self.list() if p.is_open]

    def open_for_target(self, kind: ProposalKind, target_id: str) -> Proposal | None:
        return next((p for p in self.list_open() if p.kind is kind and p.target_id == target_id), None)

    def for_topics(self, topic_ids: Iterable[str]) -> builtins.list[Proposal]:
        ids = set(topic_ids)
        return [p for p in self.list() if p.topic_id in ids]

    def quadratic_extra_spent(self, voter_id: str) -> int:
        """Seçmenin açık karesel oylamalarda harcadığı ek kredi: Σ(k² − 1). Kapanan oylamanın kredisi geri gelir."""
        return sum(
            b.intensity * b.intensity - 1
            for p in self.list_open() if p.strategy_name == "karesel"
            for b in p.ballots if b.voter_id == voter_id
        )


class AbstractOntologyRepository(ABC):
    @abstractmethod
    def get(self) -> Ontology: ...

    @abstractmethod
    def save(self, ontology: Ontology) -> None: ...


class AbstractRegulationRepository(ABC):
    @abstractmethod
    def current(self) -> Regulation: ...

    @abstractmethod
    def append(self, regulation: Regulation, proposal_id: str | None, now: datetime) -> None: ...

    @abstractmethod
    def history(self) -> builtins.list[tuple[Regulation, str | None, str]]: ...


class AbstractLedgerRepository(ABC):
    """Yalnızca ekleme ve okuma. Güncelleme/silme metodu bilerek yoktur."""

    @abstractmethod
    def append(self, entry: LedgerEntry) -> None: ...

    @abstractmethod
    def head(self) -> LedgerEntry | None: ...

    @abstractmethod
    def all(self) -> builtins.list[LedgerEntry]: ...

    def recent(self, limit: int = 50) -> builtins.list[LedgerEntry]:
        return list(reversed(self.all()[-limit:]))

    def count(self) -> int:
        return len(self.all())


class AbstractNotificationRepository(ABC):
    @abstractmethod
    def add(self, notification: Notification) -> None: ...

    @abstractmethod
    def for_user(self, user_id: str, limit: int = 30) -> builtins.list[Notification]: ...

    @abstractmethod
    def mark_all_read(self, user_id: str, now: datetime) -> None: ...

    def add_many(self, notifications: Iterable[Notification]) -> None:
        for notification in notifications:
            self.add(notification)

    def unread_count(self, user_id: str) -> int:
        return sum(1 for n in self.for_user(user_id, 500) if not n.is_read)


# ====================================================================== SQLAlchemy uygulamaları


def _dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


class SqlAlchemyUserRepository(AbstractUserRepository):
    """Kimlik haritası (identity map) ve değişiklik izleme: yalnızca değişen kullanıcılar güncellenir."""

    def __init__(self, conn: Connection) -> None:
        super().__init__()
        self.conn = conn
        self._new: list[User] = []
        self._identity: dict[str, User] = {}
        self._loaded: dict[str, dict[str, object]] = {}  # yüklendiği andaki satır değerleri

    def _add(self, user: User) -> None:
        self._new.append(user)
        self._identity[user.id] = user

    def _row_to_user(self, row) -> User:  # type: ignore[no-untyped-def]
        known = self._identity.get(row.id)
        if known is not None:
            return known
        user = User(
            id=row.id,
            nickname=Nickname(row.nickname),
            personal_info=PersonalInfo(row.first_name, row.last_name, row.birth_date, row.address),
            password_hash=PasswordHash(row.password_hash),
            role=Role(row.role),
            joined_at=datetime.fromisoformat(row.joined_at),
            interests=frozenset(json.loads(row.interests)),
            expertise=tuple(Expertise(**e) for e in json.loads(row.expertise)),
            reputation=row.reputation,
            agent_model=row.agent_model,
        )
        self._identity[user.id] = user
        self._loaded[user.id] = self._values(user)
        return user

    def _get(self, id: str) -> User | None:
        if id in self._identity:
            return self._identity[id]
        row = self.conn.execute(select(orm.users).where(orm.users.c.id == id)).first()
        return self._row_to_user(row) if row else None

    def _get_by_nickname(self, nickname: str) -> User | None:
        wanted = nickname.lower()
        cached = next((u for u in self._identity.values() if str(u.nickname).lower() == wanted), None)
        if cached:
            return cached
        row = self.conn.execute(select(orm.users).where(func.lower(orm.users.c.nickname) == wanted)).first()
        return self._row_to_user(row) if row else None

    def list(self) -> builtins.list[User]:
        rows = self.conn.execute(select(orm.users).order_by(orm.users.c.joined_at)).all()
        result: builtins.list[User] = [self._row_to_user(r) for r in rows]
        stored = {r.id for r in rows}
        result += [u for u in self._new if u.id not in stored]
        self.seen.update(result)
        return result

    def count(self, agents: bool = False) -> int:
        role_filter = orm.users.c.role == "yz_ajan" if agents else orm.users.c.role != "yz_ajan"
        return int(self.conn.execute(select(func.count()).select_from(orm.users).where(role_filter)).scalar_one())

    def _values(self, user: User) -> dict[str, object]:
        info = user.personal_info
        return {
            "nickname": str(user.nickname),
            "first_name": info.first_name,
            "last_name": info.last_name,
            "birth_date": info.birth_date,
            "address": info.address,
            "password_hash": user.password_hash.value,
            "role": user.role.value,
            "interests": json.dumps(sorted(user.interests), ensure_ascii=False),
            "expertise": json.dumps([asdict(e) for e in user.expertise]),
            "reputation": user.reputation,
            "agent_model": user.agent_model,
            "joined_at": user.joined_at.isoformat(),
        }

    def flush(self) -> None:
        new_rows = [{"id": u.id, **self._values(u)} for u in self._new]
        if new_rows:
            self.conn.execute(insert(orm.users), new_rows)
        for row in new_rows:
            self._loaded[str(row["id"])] = {k: v for k, v in row.items() if k != "id"}
        self._new.clear()
        for user in self.seen:
            values = self._values(user)
            if self._loaded.get(user.id) != values:
                self.conn.execute(update(orm.users).where(orm.users.c.id == user.id).values(**values))
                self._loaded[user.id] = values


class SqlAlchemyTopicRepository(AbstractTopicRepository):
    def __init__(self, conn: Connection) -> None:
        super().__init__()
        self.conn = conn
        self._persisted: set[tuple[str, str]] = set()  # (tür, kimlik): veritabanında olan düğüm/sürüm/maske
        self._cache: dict[str, Topic] = {}

    def _add(self, topic: Topic) -> None:
        self._cache[topic.id] = topic

    def _root_id_of(self, node_id: str) -> str | None:
        for t in self.seen:
            for node in t.walk():
                if node.id == node_id:
                    return t.id
        row = self.conn.execute(select(orm.topics.c.root_id).where(orm.topics.c.id == node_id)).first()
        if row:
            return str(row.root_id)
        row = self.conn.execute(select(orm.messages.c.root_id).where(orm.messages.c.id == node_id)).first()
        return str(row.root_id) if row else None

    def _get(self, id: str) -> Topic | None:
        root_id = self._root_id_of(id)
        if root_id is None:
            return self._cache.get(id)
        if root_id in self._cache:
            return self._cache[root_id]
        tree = self._load_tree(root_id)
        if tree is not None:
            self._cache[root_id] = tree
        return tree

    def _load_tree(self, root_id: str) -> Topic | None:
        topic_rows = self.conn.execute(
            select(orm.topics).where(orm.topics.c.root_id == root_id).order_by(orm.topics.c.created_at)
        ).all()
        if not topic_rows:
            return None
        ids = [r.id for r in topic_rows]
        revisions: dict[str, list[TopicRevision]] = {}
        for r in self.conn.execute(
            select(orm.topic_revisions).where(orm.topic_revisions.c.topic_id.in_(ids)).order_by(orm.topic_revisions.c.seq)
        ):
            revisions.setdefault(r.topic_id, []).append(
                TopicRevision(r.id, r.title, r.description, datetime.fromisoformat(r.created_at), r.proposal_id)
            )
            self._persisted.add(("revision", r.id))
        mask_rows = {
            (m.target_kind, m.target_id): Mask(m.proposal_id, datetime.fromisoformat(m.masked_at))
            for m in self.conn.execute(select(orm.masks).where(orm.masks.c.root_id == root_id))
        }
        for key in mask_rows:
            self._persisted.add(("mask", key[1]))
        nodes: dict[str, Topic] = {}
        for r in topic_rows:
            nodes[r.id] = Topic(
                id=r.id,
                author_id=r.author_id,
                title="",
                description="",
                concept_ids=frozenset(json.loads(r.concept_ids)),
                created_at=datetime.fromisoformat(r.created_at),
                state=STATES[r.status],
                revisions=revisions[r.id],
                mask=mask_rows.get(("konu", r.id)),
            )
            self._persisted.add(("topic", r.id))
        children: list[tuple[datetime, str, TopicComponent]] = []
        for r in topic_rows:
            if r.parent_id:
                children.append((nodes[r.id].created_at, r.parent_id, nodes[r.id]))
        for m in self.conn.execute(select(orm.messages).where(orm.messages.c.root_id == root_id)):
            message = Message(m.id, m.author_id, m.text, datetime.fromisoformat(m.created_at), m.reply_to, mask_rows.get(("mesaj", m.id)))
            children.append((message.created_at, m.topic_id, message))
            self._persisted.add(("message", m.id))
        for _, parent_id, child in sorted(children, key=lambda c: (c[0], c[2].id)):
            nodes[parent_id].add(child)
        return nodes[root_id]

    def roots(self) -> builtins.list[Topic]:
        rows = self.conn.execute(select(orm.topics.c.id).where(orm.topics.c.parent_id.is_(None))).all()
        result = [t for t in (self.get(r.id) for r in rows) if t is not None]
        result += [t for t in self._cache.values() if t.parent is None and t not in result]
        return result

    def flush(self) -> None:
        for root in list(self.seen) + [t for t in self._cache.values() if t.parent is None]:
            self._flush_tree(root)

    def _flush_tree(self, root: Topic) -> None:
        for node in root.walk():
            if isinstance(node, Topic):
                self._flush_topic(root, node)
            elif isinstance(node, Message):
                self._flush_message(root, node)

    def _flush_topic(self, root: Topic, topic: Topic) -> None:
        if ("topic", topic.id) not in self._persisted:
            self.conn.execute(
                insert(orm.topics).values(
                    id=topic.id,
                    root_id=root.id,
                    parent_id=topic.parent.id if topic.parent else None,
                    author_id=topic.author_id,
                    concept_ids=json.dumps(sorted(topic.concept_ids)),
                    status=topic.state.name,
                    created_at=topic.created_at.isoformat(),
                )
            )
            self._persisted.add(("topic", topic.id))
        else:
            self.conn.execute(update(orm.topics).where(orm.topics.c.id == topic.id).values(status=topic.state.name))
        for seq, revision in enumerate(topic.revisions):
            if ("revision", revision.id) not in self._persisted:
                self.conn.execute(
                    insert(orm.topic_revisions).values(
                        id=revision.id, topic_id=topic.id, seq=seq, title=revision.title,
                        description=revision.description, proposal_id=revision.proposal_id,
                        created_at=revision.created_at.isoformat(),
                    )
                )
                self._persisted.add(("revision", revision.id))
        self._flush_mask(root, "konu", topic.id, topic.mask)

    def _flush_message(self, root: Topic, message: Message) -> None:
        if ("message", message.id) not in self._persisted:
            assert message.parent is not None
            self.conn.execute(
                insert(orm.messages).values(
                    id=message.id, topic_id=message.parent.id, root_id=root.id, author_id=message.author_id,
                    text=message.text, content_hash=message.content_hash.value, reply_to=message.reply_to,
                    created_at=message.created_at.isoformat(),
                )
            )
            self._persisted.add(("message", message.id))
        self._flush_mask(root, "mesaj", message.id, message.mask)

    def _flush_mask(self, root: Topic, kind: str, target_id: str, mask: Mask | None) -> None:
        if mask is not None and ("mask", target_id) not in self._persisted:
            self.conn.execute(
                insert(orm.masks).values(
                    target_kind=kind, target_id=target_id, root_id=root.id,
                    proposal_id=mask.proposal_id, masked_at=mask.masked_at.isoformat(),
                )
            )
            self._persisted.add(("mask", target_id))


@dataclass
class AppendOnlyReadCache:
    """Seçmen kütükleri ve oylar değişmez (append-only); bir kez okunanlar burada tutulur.

    Oylar için yalnızca son okunandan sonra eklenen satırlar (rowid) okunur; bir oy asla güncellenmediği için
    önbellek bayatlamaz. Gizli bir global değildir: ``bootstrap`` her veritabanı motoru için bir tane üretip
    Unit of Work'lere enjekte eder, böylece iki veritabanının satır numaraları birbirine karışmaz.
    """

    electorates: dict[str, Electorate] = field(default_factory=dict)
    ballots: dict[str, tuple[int, list[Ballot]]] = field(default_factory=dict)


class SqlAlchemyProposalRepository(AbstractProposalRepository):
    def __init__(self, conn: Connection, cache: AppendOnlyReadCache | None = None) -> None:
        super().__init__()
        self.conn = conn
        self.shared = cache if cache is not None else AppendOnlyReadCache()
        self._cache: dict[str, Proposal] = {}
        self._persisted_ballots: set[tuple[str, str]] = set()
        self._persisted: set[str] = set()
        self._state: dict[str, tuple[object, ...]] = {}  # yüklendiği andaki durum: yalnızca değişen güncellenir

    def _add(self, proposal: Proposal) -> None:
        self._cache[proposal.id] = proposal

    @staticmethod
    def _status_of(p: Proposal) -> tuple[object, ...]:
        r = p.result
        return (p.status.value, r.yes if r else None, r.no if r else None, r.reason if r else None, _iso(p.closed_at))

    def _electorates_for(self, rows: Sequence[object]) -> dict[str, Electorate]:
        result = {r.id: self.shared.electorates[r.id] for r in rows if r.id in self.shared.electorates}  # type: ignore[attr-defined]
        missing = [r for r in rows if r.id not in result]  # type: ignore[attr-defined]
        if not missing:
            return result
        voters: dict[str, list[VoterProfile]] = {}
        for v in self.conn.execute(
            select(orm.electorate_voters).where(orm.electorate_voters.c.proposal_id.in_([r.id for r in missing]))  # type: ignore[attr-defined]
        ):
            voters.setdefault(v.proposal_id, []).append(VoterProfile(v.voter_id, v.reputation, v.expertise_level, v.is_agent))
        for r in missing:
            if r.id in voters or r.agent_weight:  # type: ignore[attr-defined]
                electorate = Electorate(tuple(voters.get(r.id, [])), Fraction(r.agent_weight))  # type: ignore[attr-defined]
                self.shared.electorates[r.id] = result[r.id] = electorate  # type: ignore[attr-defined]
        return result

    def _from_row(self, row, ballots: list[Ballot], electorate: Electorate | None) -> Proposal:  # type: ignore[no-untyped-def]
        result = None
        if row.result_reason is not None:
            result = ProposalResult(row.result_yes, row.result_no, row.result_reason)
        self._persisted.add(row.id)
        proposal = Proposal(
            id=row.id,
            kind=ProposalKind(row.kind),
            title=row.title,
            rationale=row.rationale,
            proposer_id=row.proposer_id,
            concept_ids=frozenset(json.loads(row.concept_ids)),
            strategy_name=row.strategy,
            threshold=row.threshold,
            opened_at=datetime.fromisoformat(row.opened_at),
            deadline=datetime.fromisoformat(row.deadline),
            topic_id=row.topic_id,
            target_id=row.target_id,
            payload=json.loads(row.payload),
            status=ProposalStatus(row.status),
            ballots=ballots,
            result=result,
            closed_at=_dt(row.closed_at),
            electorate=electorate,
        )
        self._state[proposal.id] = self._status_of(proposal)
        return proposal

    def _ballots_for(self, ids: Sequence[str]) -> dict[str, list[Ballot]]:
        rowid: ColumnElement[int] = literal_column("ballots.rowid")
        after = min((self.shared.ballots[i][0] if i in self.shared.ballots else 0) for i in ids) if ids else 0
        fresh: dict[str, list[tuple[int, Ballot]]] = {}
        rows = self.conn.execute(
            select(orm.ballots, rowid.label("rid")).where(orm.ballots.c.proposal_id.in_(ids), rowid > after).order_by(rowid)
        )
        for b in rows:
            fresh.setdefault(b.proposal_id, []).append(
                (b.rid, Ballot(b.voter_id, Choice(b.choice), datetime.fromisoformat(b.cast_at), b.intensity, b.is_agent, b.rationale))
            )
        result: dict[str, list[Ballot]] = {}
        for pid in ids:
            last, cached = self.shared.ballots.get(pid, (0, []))
            new = [(r, b) for r, b in fresh.get(pid, []) if r > last]
            if new:
                cached = cached + [b for _, b in new]
                self.shared.ballots[pid] = (new[-1][0], cached)
            result[pid] = list(cached)
            self._persisted_ballots.update((pid, b.voter_id) for b in cached)
        return result

    def _get(self, id: str) -> Proposal | None:
        if id in self._cache:
            return self._cache[id]
        row = self.conn.execute(select(orm.proposals).where(orm.proposals.c.id == id)).first()
        if row is None:
            return None
        proposal = self._from_row(row, self._ballots_for([id]).get(id, []), self._electorates_for([row]).get(id))
        self._cache[id] = proposal
        return proposal

    def list(self) -> builtins.list[Proposal]:
        rows = self.conn.execute(select(orm.proposals).order_by(orm.proposals.c.opened_at.desc())).all()
        missing = [r for r in rows if r.id not in self._cache]
        ballots = self._ballots_for([r.id for r in missing]) if missing else {}
        electorates = self._electorates_for(missing) if missing else {}
        for r in missing:
            self._cache[r.id] = self._from_row(r, ballots.get(r.id, []), electorates.get(r.id))
        result = sorted(self._cache.values(), key=lambda p: p.opened_at, reverse=True)
        self.seen.update(result)
        return result

    def quadratic_extra_spent(self, voter_id: str) -> int:
        """Tek bir SQL toplamı; bu oturumda henüz yazılmamış oylar da eklenir."""
        stored = self.conn.execute(
            select(func.coalesce(func.sum(orm.ballots.c.intensity * orm.ballots.c.intensity - 1), 0))
            .select_from(orm.ballots.join(orm.proposals, orm.ballots.c.proposal_id == orm.proposals.c.id))
            .where(orm.ballots.c.voter_id == voter_id, orm.proposals.c.status == "acik",
                   orm.proposals.c.strategy == "karesel")
        ).scalar_one()
        pending = sum(
            b.intensity * b.intensity - 1
            for p in self._cache.values() if p.is_open and p.strategy_name == "karesel"
            for b in p.ballots if b.voter_id == voter_id and (p.id, voter_id) not in self._persisted_ballots
        )
        return int(stored) + pending

    def list_open(self) -> builtins.list[Proposal]:
        """Yalnızca süren oylamalar (kapanmış binlerce oyu yüklemeden)."""
        ids = [r.id for r in self.conn.execute(select(orm.proposals.c.id).where(orm.proposals.c.status == "acik"))]
        result = [p for p in (self.get(i) for i in ids) if p is not None and p.is_open]
        result += [p for p in self._cache.values() if p.is_open and p.id not in ids]
        return sorted(result, key=lambda p: p.opened_at, reverse=True)

    def flush(self) -> None:
        for proposal in set(self.seen) | set(self._cache.values()):
            state = self._status_of(proposal)
            values = dict(zip(("status", "result_yes", "result_no", "result_reason", "closed_at"), state))
            if proposal.id not in self._persisted:
                electorate = proposal.electorate
                self.conn.execute(
                    insert(orm.proposals).values(
                        id=proposal.id, kind=proposal.kind.value, title=proposal.title, rationale=proposal.rationale,
                        proposer_id=proposal.proposer_id, concept_ids=json.dumps(sorted(proposal.concept_ids)),
                        strategy=proposal.strategy_name, threshold=proposal.threshold,
                        opened_at=proposal.opened_at.isoformat(), deadline=proposal.deadline.isoformat(),
                        topic_id=proposal.topic_id, target_id=proposal.target_id,
                        payload=json.dumps(proposal.payload, ensure_ascii=False),
                        agent_weight=str(electorate.agent_weight) if electorate else "",
                        **values,
                    )
                )
                if electorate is not None and electorate.voters:
                    self.conn.execute(
                        insert(orm.electorate_voters),
                        [{"proposal_id": proposal.id, "voter_id": v.user_id, "reputation": v.reputation,
                          "expertise_level": v.expertise_level, "is_agent": v.is_agent} for v in electorate.voters],
                    )
                if electorate is not None:
                    self.shared.electorates[proposal.id] = electorate
                self._persisted.add(proposal.id)
            elif self._state.get(proposal.id) != state:
                self.conn.execute(update(orm.proposals).where(orm.proposals.c.id == proposal.id).values(**values))
            self._state[proposal.id] = state
            new_ballots = [b for b in proposal.ballots if (proposal.id, b.voter_id) not in self._persisted_ballots]
            if new_ballots:
                self.conn.execute(
                    insert(orm.ballots),
                    [{"proposal_id": proposal.id, "voter_id": b.voter_id, "choice": b.choice.value,
                      "intensity": b.intensity, "is_agent": b.is_agent, "rationale": b.rationale,
                      "cast_at": b.cast_at.isoformat()} for b in new_ballots],
                )
                self._persisted_ballots.update((proposal.id, b.voter_id) for b in new_ballots)


class SqlAlchemyOntologyRepository(AbstractOntologyRepository):
    def __init__(self, conn: Connection) -> None:
        self.conn = conn
        self._ontology: Ontology | None = None

    def get(self) -> Ontology:
        if self._ontology is None:
            rows = self.conn.execute(select(orm.concepts)).all()
            by_id = {r.id: r for r in rows}
            ontology = Ontology()
            added: set[str] = set()

            def add(row) -> None:  # type: ignore[no-untyped-def]
                if row.id in added:
                    return
                if row.parent_id and row.parent_id not in added:
                    add(by_id[row.parent_id])
                ontology.add(Concept(row.id, row.name, row.description, tuple(json.loads(row.keywords)), row.parent_id))
                added.add(row.id)

            for row in rows:
                add(row)
            for r in self.conn.execute(select(orm.concept_relations)):
                ontology.relations.append(ConceptRelation(r.source, r.target, RelationKind(r.kind)))
            self._ontology = ontology
        return self._ontology

    def save(self, ontology: Ontology) -> None:
        existing = {r.id for r in self.conn.execute(select(orm.concepts.c.id))}
        for concept in ontology.concepts.values():
            if concept.id not in existing:
                self.conn.execute(
                    insert(orm.concepts).values(
                        id=concept.id, name=concept.name, description=concept.description,
                        keywords=json.dumps(list(concept.keywords), ensure_ascii=False), parent_id=concept.parent_id,
                    )
                )
        existing_rel = {(r.source, r.target) for r in self.conn.execute(select(orm.concept_relations))}
        for rel in ontology.relations:
            if (rel.source, rel.target) not in existing_rel:
                self.conn.execute(insert(orm.concept_relations).values(source=rel.source, target=rel.target, kind=rel.kind.value))
        self._ontology = ontology


class SqlAlchemyRegulationRepository(AbstractRegulationRepository):
    def __init__(self, conn: Connection) -> None:
        self.conn = conn

    @staticmethod
    def _decode(data: str) -> Regulation:
        raw = json.loads(data)
        raw["strategies"] = tuple(tuple(x) for x in raw["strategies"])
        raw["thresholds"] = tuple(tuple(x) for x in raw["thresholds"])
        return Regulation(**raw)

    def current(self) -> Regulation:
        row = self.conn.execute(select(orm.regulations).order_by(orm.regulations.c.version.desc())).first()
        return self._decode(row.data) if row else Regulation()

    def append(self, regulation: Regulation, proposal_id: str | None, now: datetime) -> None:
        self.conn.execute(
            insert(orm.regulations).values(
                version=regulation.version, data=json.dumps(asdict(regulation)), proposal_id=proposal_id,
                created_at=now.isoformat(),
            )
        )

    def history(self) -> builtins.list[tuple[Regulation, str | None, str]]:
        rows = self.conn.execute(select(orm.regulations).order_by(orm.regulations.c.version.desc())).all()
        return [(self._decode(r.data), r.proposal_id, r.created_at) for r in rows]


class SqlAlchemyLedgerRepository(AbstractLedgerRepository):
    def __init__(self, conn: Connection) -> None:
        self.conn = conn

    @staticmethod
    def _entry(row) -> LedgerEntry:  # type: ignore[no-untyped-def]
        return LedgerEntry(row.idx, row.timestamp, row.kind, row.payload, row.previous_hash, row.hash)

    def append(self, entry: LedgerEntry) -> None:
        self.conn.execute(
            insert(orm.ledger).values(
                idx=entry.index, timestamp=entry.timestamp, kind=entry.kind, payload=entry.payload,
                previous_hash=entry.previous_hash, hash=entry.hash,
            )
        )

    def head(self) -> LedgerEntry | None:
        row = self.conn.execute(select(orm.ledger).order_by(orm.ledger.c.idx.desc()).limit(1)).first()
        return self._entry(row) if row else None

    def all(self) -> builtins.list[LedgerEntry]:
        return [self._entry(r) for r in self.conn.execute(select(orm.ledger).order_by(orm.ledger.c.idx))]

    def recent(self, limit: int = 50) -> builtins.list[LedgerEntry]:
        rows = self.conn.execute(select(orm.ledger).order_by(orm.ledger.c.idx.desc()).limit(limit))
        return [self._entry(r) for r in rows]

    def count(self) -> int:
        return int(self.conn.execute(select(func.count()).select_from(orm.ledger)).scalar_one())


class SqlAlchemyNotificationRepository(AbstractNotificationRepository):
    def __init__(self, conn: Connection) -> None:
        self.conn = conn

    def add(self, notification: Notification) -> None:
        exists = self.conn.execute(
            select(orm.notifications.c.id).where(
                orm.notifications.c.user_id == notification.user_id, orm.notifications.c.link == notification.link
            )
        ).first()
        if exists:
            return
        self.conn.execute(
            insert(orm.notifications).values(
                id=notification.id, user_id=notification.user_id, text=notification.text, link=notification.link,
                created_at=notification.created_at.isoformat(), read_at=_iso(notification.read_at),
            )
        )

    def add_many(self, notifications: Iterable[Notification]) -> None:
        """Toplu bildirim: aynı bağlantı için zaten bildirimi olanları atlar, kalanları tek seferde ekler."""
        by_link: dict[str, builtins.list[Notification]] = {}
        for n in notifications:
            by_link.setdefault(n.link, []).append(n)
        for link, items in by_link.items():
            have = {r.user_id for r in self.conn.execute(
                select(orm.notifications.c.user_id).where(orm.notifications.c.link == link))}
            rows = [{"id": n.id, "user_id": n.user_id, "text": n.text, "link": n.link,
                     "created_at": n.created_at.isoformat(), "read_at": _iso(n.read_at)}
                    for n in items if n.user_id not in have]
            if rows:
                self.conn.execute(insert(orm.notifications), rows)

    def for_user(self, user_id: str, limit: int = 30) -> builtins.list[Notification]:
        rows = self.conn.execute(
            select(orm.notifications).where(orm.notifications.c.user_id == user_id)
            .order_by(orm.notifications.c.created_at.desc()).limit(limit)
        )
        return [
            Notification(r.id, r.user_id, r.text, r.link, datetime.fromisoformat(r.created_at), _dt(r.read_at))
            for r in rows
        ]

    def unread_count(self, user_id: str) -> int:
        return int(
            self.conn.execute(
                select(func.count()).select_from(orm.notifications).where(
                    orm.notifications.c.user_id == user_id, orm.notifications.c.read_at.is_(None)
                )
            ).scalar_one()
        )

    def mark_all_read(self, user_id: str, now: datetime) -> None:
        self.conn.execute(
            update(orm.notifications)
            .where(orm.notifications.c.user_id == user_id, orm.notifications.c.read_at.is_(None))
            .values(read_at=now.isoformat())
        )


__all__ = [
    "AbstractRepository",
    "AbstractUserRepository",
    "AbstractTopicRepository",
    "AbstractProposalRepository",
    "AbstractOntologyRepository",
    "AbstractRegulationRepository",
    "AbstractLedgerRepository",
    "AbstractNotificationRepository",
    "date",
]
