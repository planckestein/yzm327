"""Okuma tarafı (CQRS'in "Q"su): arayüzün göstereceği verileri hazırlar.

Yazma tarafı Command → Message Bus üzerinden gider; okuma tarafı Unit of Work ile repository'leri okur ve
şablona sade sözlükler/veri sınıfları verir. Buradan dönen hiçbir şeyde kişisel veri yoktur: kullanıcılar
yalnızca takma adlarıyla görünür (profil sahibine özel görünüm ``ProfileAccessProxy`` üzerinden gelir).
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from kurultay.domain.eligibility import EligibilityContext, EligibilityDecision, build_electorate, build_voting_chain
from kurultay.domain.ledger import ConsensusReport, LedgerEntry, reach_consensus, verify_chain
from kurultay.domain.ontology import Ontology
from kurultay.domain.proposal import Proposal
from kurultay.domain.regulation import CHANGEABLE, KIND_LABELS, STRATEGY_LABELS, THRESHOLD_LABELS, Regulation
from kurultay.domain.topic import Message, Topic
from kurultay.domain.topic_states import LIFECYCLE_ORDER, STATES
from kurultay.domain.user import User
from kurultay.domain.voting import QuadraticVoting, Tally, create_strategy
from kurultay.service_layer.ports import LedgerReplica
from kurultay.service_layer.unit_of_work import AbstractUnitOfWork


@dataclass
class Directory:
    """Kimlik → takma ad sözlüğü (kişisel veri yok)."""

    users: dict[str, User]

    def nick(self, user_id: str | None) -> str:
        user = self.users.get(user_id or "")
        return str(user.nickname) if user else "?"

    def is_agent(self, user_id: str) -> bool:
        user = self.users.get(user_id)
        return bool(user and user.is_agent)


def directory(uow: AbstractUnitOfWork) -> Directory:
    return Directory({u.id: u for u in uow.users.list()})


# ---------------------------------------------------------------- teklifler


@dataclass
class ProposalCard:
    proposal: Proposal
    tally: Tally
    proposer: str
    strategy_label: str
    threshold_label: str
    concept_names: list[str]
    remaining: str
    yes_pct: float = 0.0
    no_pct: float = 0.0
    rest_pct: float = 0.0
    threshold_pct: float = 50.0
    cast_yes_pct: float = 0.0  # kullanılan oylar içinde evet payı
    turnout_pct: float = 0.0  # seçmen kütüğünün yüzde kaçı oy verdi
    quorum_pct: float = 0.0


def _remaining(deadline: datetime, now: datetime) -> str:
    delta = deadline - now
    if delta.total_seconds() <= 0:
        return "süre doldu"
    days, hours = delta.days, delta.seconds // 3600
    return f"{days} gün {hours} sa" if days else f"{hours} sa {delta.seconds % 3600 // 60} dk"


def proposal_card(p: Proposal, uow: AbstractUnitOfWork, d: Directory, ontology: Ontology, reg: Regulation, now: datetime) -> ProposalCard:
    electorate = build_electorate(list(d.users.values()), p, ontology, reg, now.date())
    strategy = create_strategy(p.strategy_name, reg)
    t = p.current_tally(strategy, electorate)
    possible = t.cast + t.remaining_max or 1
    num, den = (int(x) for x in p.threshold.split("/"))
    yes, no = (p.result.yes, p.result.no) if p.result else (t.yes, t.no)
    return ProposalCard(
        proposal=p,
        tally=t,
        proposer=d.nick(p.proposer_id),
        strategy_label=STRATEGY_LABELS.get(p.strategy_name, p.strategy_name),
        threshold_label=THRESHOLD_LABELS.get(p.threshold, p.threshold),
        concept_names=[c.name for cid in sorted(p.concept_ids) if (c := ontology.get(cid))],
        remaining=_remaining(p.deadline, now),
        yes_pct=round(100 * t.yes / possible, 1),
        no_pct=round(100 * t.no / possible, 1),
        rest_pct=round(100 * t.remaining_max / possible, 1),
        threshold_pct=round(100 * num / den, 1),
        cast_yes_pct=round(100 * yes / (yes + no), 1) if yes + no else 0.0,
        turnout_pct=round(100 * t.voted / t.eligible, 1) if t.eligible else 0.0,
        quorum_pct=float(reg.quorum_percent),
    )


def proposal_cards(uow: AbstractUnitOfWork, now: datetime, only_open: bool | None = None, limit: int = 100) -> list[ProposalCard]:
    d, ontology, reg = directory(uow), uow.ontology.get(), uow.regulations.current()
    proposals = uow.proposals.list()
    if only_open is True:
        proposals = [p for p in proposals if p.is_open]
    elif only_open is False:
        proposals = [p for p in proposals if not p.is_open]
    proposals.sort(key=lambda p: (not p.is_open, p.deadline if p.is_open else datetime.max - (p.closed_at or p.opened_at)))
    return [proposal_card(p, uow, d, ontology, reg, now) for p in proposals[:limit]]


@dataclass
class BallotRow:
    nickname: str
    choice: str
    intensity: int
    weight: float
    is_agent: bool
    rationale: str
    cast_at: datetime
    cost: int | None = None


@dataclass
class ProposalDetail:
    card: ProposalCard
    ballots: list[BallotRow]
    strategy_explanation: str
    my_decision: EligibilityDecision | None
    my_ballot: BallotRow | None
    chain_labels: list[str]
    quadratic: QuadraticVoting | None
    topic: Topic | None
    target_message: Message | None
    electorate_size: int
    agents_in_electorate: list[str]
    payload: dict[str, str] = field(default_factory=dict)
    ballots_total: int = 0
    credits_left: int = 0  # karesel: izleyicinin kalan ek kredisi


CHAIN_LABELS = ["Kimlik", "Oylama açık", "Rol", "Yönetmelik", "Ontolojik ilgi", "Tek oy", "Pusula kuralı"]


def proposal_detail(uow: AbstractUnitOfWork, proposal_id: str, viewer_id: str | None, now: datetime) -> ProposalDetail | None:
    p = uow.proposals.get(proposal_id)
    if p is None:
        return None
    d, ontology, reg = directory(uow), uow.ontology.get(), uow.regulations.current()
    card = proposal_card(p, uow, d, ontology, reg, now)
    strategy = create_strategy(p.strategy_name, reg)
    quadratic = strategy if isinstance(strategy, QuadraticVoting) else None
    rows = [
        BallotRow(
            d.nick(w.ballot.voter_id), w.ballot.choice.value, w.ballot.intensity, w.weight, w.ballot.is_agent,
            w.ballot.rationale, w.ballot.cast_at, quadratic.cost(w.ballot.intensity) if quadratic else None,
        )
        for w in card.tally.weighted
    ]
    viewer = d.users.get(viewer_id or "")
    decision = None
    credits_left = 0
    if quadratic is not None and viewer is not None:
        credits_left = max(0, quadratic.budget - uow.proposals.quadratic_extra_spent(viewer.id))
    if viewer_id is not None:
        decision = build_voting_chain().handle(EligibilityContext(viewer, p, ontology, reg, now.date(), strategy, 1))
    my_ballot = next((r for r in rows if viewer and r.nickname == str(viewer.nickname)), None)
    total = len(rows)
    # Yüzlerce oy olabilir: gerekçe yazılanlar ve YZ ajanları her zaman, diğerlerinden en yeni 40 oy gösterilir.
    notable = [r for r in rows if r.rationale or r.is_agent]
    recent = [r for r in reversed(rows) if not (r.rationale or r.is_agent)][:40]
    rows = notable + recent
    node = uow.topics.get_node(p.target_id) if p.target_id else None
    topic_node = uow.topics.get_node(p.topic_id) if p.topic_id else None
    electorate = build_electorate(list(d.users.values()), p, ontology, reg, now.date())
    return ProposalDetail(
        card=card,
        ballots=rows,
        strategy_explanation=strategy.explanation,
        my_decision=decision,
        my_ballot=my_ballot,
        chain_labels=CHAIN_LABELS,
        quadratic=quadratic,
        topic=topic_node if isinstance(topic_node, Topic) else None,
        target_message=node if isinstance(node, Message) else None,
        electorate_size=len(electorate),
        agents_in_electorate=[d.nick(v.user_id) for v in electorate.voters if v.is_agent],
        payload=p.payload,
        ballots_total=total,
        credits_left=credits_left,
    )


# ---------------------------------------------------------------- konular


@dataclass
class TopicRow:
    topic: Topic
    author: str
    concept_names: list[str]
    messages: int
    subtopics: int
    last_activity: datetime
    depth: int = 0


def topic_rows(uow: AbstractUnitOfWork, states: set[str] | None = None, concept: str | None = None) -> list[TopicRow]:
    d, ontology = directory(uow), uow.ontology.get()
    wanted = ontology.neighbourhood([concept]) | {c.id for c in ontology.children(concept)} if concept else None
    rows = []
    for root in uow.topics.roots():
        if states and root.state.name not in states:
            continue
        if wanted is not None and not root.concept_ids & wanted:
            continue
        rows.append(
            TopicRow(
                root, d.nick(root.author_id),
                [c.name for cid in sorted(root.concept_ids) if (c := ontology.get(cid))],
                root.visible_message_count(),
                sum(1 for n in root.walk() if isinstance(n, Topic) and n is not root),
                root.last_activity(),
            )
        )
    rows.sort(key=lambda r: r.last_activity, reverse=True)
    return rows


# ---------------------------------------------------------------- forum ana sayfası


@dataclass
class ForumRow:
    topic: Topic
    author: str
    category: str
    excerpt: str
    replies: int
    participants: list[str]
    last_author: str
    last_activity: datetime
    open_vote: bool = False


@dataclass
class Category:
    id: str
    name: str
    topics: int


def _tr_lower(text: str) -> str:
    return text.replace("I", "ı").replace("İ", "i").lower()


def _category_of(topic: Topic, ontology: Ontology) -> str:
    """Konunun kategorisi: ilk kavramının ana kavramı."""
    for cid in sorted(topic.concept_ids):
        chain = ontology.ancestors(cid)
        if chain:
            return chain[0].name
    return ""


def forum_rows(
    uow: AbstractUnitOfWork, sort: str = "son", concept: str | None = None, query: str = "",
    states: set[str] | None = None,
) -> list[ForumRow]:
    """Ana sayfadaki konu listesi: kim yazdı, kaç cevap var, son mesajı kim ne zaman yazdı."""
    d, ontology = directory(uow), uow.ontology.get()
    states = states or {"aktif", "silinme_oylamasinda", "arsivlendi"}
    wanted = ontology.neighbourhood([concept]) | {c.id for c in ontology.children(concept)} if concept else None
    q = _tr_lower(query.strip())
    open_targets = {p.target_id for p in uow.proposals.list_open()} | {p.topic_id for p in uow.proposals.list_open()}
    rows = []
    for root in uow.topics.roots():
        if root.state.name not in states or (wanted is not None and not root.concept_ids & wanted):
            continue
        messages = [m for n in root.walk() if isinstance(n, Message) and n.is_visible() for m in [n]]
        if q and q not in _tr_lower(root.title + " " + root.description) and not any(q in _tr_lower(m.text) for m in messages):
            continue
        messages.sort(key=lambda m: m.created_at)
        last = messages[-1] if messages else None
        people: list[str] = []
        for author_id in [root.author_id] + [m.author_id for m in reversed(messages)]:
            nick = d.nick(author_id)
            if nick not in people:
                people.append(nick)
        excerpt = root.description.strip().replace("\n", " ")
        rows.append(ForumRow(
            topic=root, author=d.nick(root.author_id), category=_category_of(root, ontology),
            excerpt=excerpt if len(excerpt) <= 150 else excerpt[:147].rsplit(" ", 1)[0] + "…",
            replies=len(messages), participants=people[:5],
            last_author=d.nick(last.author_id if last else root.author_id),
            last_activity=last.created_at if last else root.created_at,
            open_vote=root.id in open_targets,
        ))
    if sort == "yeni":
        rows.sort(key=lambda r: r.topic.created_at, reverse=True)
    elif sort == "populer":
        rows.sort(key=lambda r: (r.replies, r.last_activity), reverse=True)
    else:
        rows.sort(key=lambda r: r.last_activity, reverse=True)
    return rows


def categories(uow: AbstractUnitOfWork) -> list[Category]:
    ontology = uow.ontology.get()
    roots = [t for t in uow.topics.roots() if t.state.name in {"aktif", "silinme_oylamasinda", "arsivlendi"}]
    result = []
    for c in ontology.roots():
        ids = {c.id} | {k.id for k in ontology.children(c.id)}
        result.append(Category(c.id, c.name, sum(1 for t in roots if t.concept_ids & ids)))
    return [c for c in result if c.topics] + [c for c in result if not c.topics]


@dataclass
class MemberPost:
    topic: Topic
    message: Message


def member_activity(uow: AbstractUnitOfWork, user_id: str) -> tuple[list[MemberPost], list[Topic]]:
    """Profil için: üyenin son mesajları ve açtığı konular."""
    posts: list[MemberPost] = []
    opened: list[Topic] = []
    for root in uow.topics.roots():
        for node in root.walk():
            if isinstance(node, Message) and node.author_id == user_id and node.is_visible() and node.parent is not None:
                posts.append(MemberPost(node.parent, node))
            elif isinstance(node, Topic) and node.author_id == user_id and node.state.is_visible:
                opened.append(node)
    posts.sort(key=lambda p: p.message.created_at, reverse=True)
    opened.sort(key=lambda t: t.created_at, reverse=True)
    return posts, opened


@dataclass
class TopicPage:
    topic: Topic
    path: list[Topic]
    directory: Directory
    concept_names: list[str]
    proposals: list[ProposalCard]
    lifecycle: list[tuple[str, str, str]]  # (ad, etiket, durum: gecildi|simdi|bekliyor|dal)
    open_hide_targets: set[str]


def lifecycle_steps(topic: Topic) -> list[tuple[str, str, str]]:
    current = topic.state.name
    main = list(LIFECYCLE_ORDER)
    if current == "reddedildi":
        main = ["onerildi", "oylamada", "reddedildi"]
    order_index = main.index(current) if current in main else -1
    steps = []
    for i, name in enumerate(main):
        if name == "arsivlendi" and current == "gizlendi" or name == "gizlendi" and current == "arsivlendi":
            status = "dal"
        elif name == "silinme_oylamasinda" and current == "arsivlendi":
            status = "dal"
        elif i < order_index:
            status = "gecildi"
        elif i == order_index:
            status = "simdi"
        else:
            status = "bekliyor"
        steps.append((name, STATES[name].label, status))
    return steps


def topic_page(uow: AbstractUnitOfWork, topic_id: str, now: datetime) -> TopicPage | None:
    node = uow.topics.get_node(topic_id)
    if not isinstance(node, Topic):
        return None
    d, ontology, reg = directory(uow), uow.ontology.get(), uow.regulations.current()
    ids = {n.id for n in node.walk()}
    related = [p for p in uow.proposals.list() if p.topic_id in ids or p.target_id in ids]
    related.sort(key=lambda p: (not p.is_open, p.opened_at), reverse=False)
    return TopicPage(
        topic=node,
        path=node.path(),
        directory=d,
        concept_names=[c.name for cid in sorted(node.concept_ids) if (c := ontology.get(cid))],
        proposals=[proposal_card(p, uow, d, ontology, reg, now) for p in related],
        lifecycle=lifecycle_steps(node),
        open_hide_targets={p.target_id or "" for p in related if p.is_open and p.kind.value == "mesaj_gizleme"},
    )


# ---------------------------------------------------------------- ontoloji


@dataclass
class ConceptNode:
    id: str
    name: str
    description: str
    parent_id: str | None
    x: float
    y: float
    followers: int
    experts: list[str]
    agents: list[str]
    topics: int
    following: bool
    lx: float = 0.0
    ly: float = 0.0
    anchor: str = "middle"


def ontology_graph(uow: AbstractUnitOfWork, viewer_id: str | None) -> tuple[list[ConceptNode], list[tuple[str, str, str]]]:
    """Kavram ağının dairesel yerleşimi: ana kavramlar iç çemberde, alt kavramlar dış çemberde."""
    import math

    ontology = uow.ontology.get()
    users = uow.users.list()
    viewer = next((u for u in users if u.id == viewer_id), None)
    topic_counts: Counter[str] = Counter()
    for topic_root in uow.topics.roots():
        for n in topic_root.walk():
            if isinstance(n, Topic) and n.state.is_visible:
                topic_counts.update(n.concept_ids)
    roots = ontology.roots()
    nodes: list[ConceptNode] = []
    cx, cy, r1, r2 = 550, 410, 190, 335
    weights = [1.5 + 0.9 * len(ontology.children(r.id)) for r in roots]
    total, cursor = sum(weights), -math.pi / 2
    for concept_root, weight in zip(roots, weights):
        sector = 2 * math.pi * weight / total
        angle = cursor + sector / 2
        cursor += sector
        positions = [(concept_root, r1, angle)]
        kids = ontology.children(concept_root.id)
        for j, kid in enumerate(kids):
            positions.append((kid, r2, angle + (j - (len(kids) - 1) / 2) * sector / max(2, len(kids) + 0.6)))
        for concept, radius, a in positions:
            cos_a, sin_a = math.cos(a), math.sin(a)
            label_r = radius + (22 if concept.parent_id else 24)
            anchor = "start" if cos_a > 0.35 else "end" if cos_a < -0.35 else "middle"
            nodes.append(
                ConceptNode(
                    concept.id, concept.name, concept.description, concept.parent_id,
                    round(cx + radius * math.cos(a), 1), round(cy + radius * math.sin(a), 1),
                    sum(1 for u in users if concept.id in u.interests and not u.is_agent),
                    [str(u.nickname) for u in users if any(e.concept_id == concept.id for e in u.expertise)],
                    [str(u.nickname) for u in users if u.is_agent and concept.id in u.interests],
                    topic_counts[concept.id],
                    bool(viewer and concept.id in viewer.interests),
                    round(cx + label_r * cos_a, 1),
                    round(cy + label_r * sin_a + (4 if abs(sin_a) < 0.5 else 10 if sin_a > 0 else -4), 1),
                    anchor,
                )
            )
    edges = [(n.parent_id, n.id, "agac") for n in nodes if n.parent_id]
    edges += [(r.source, r.target, "ilgili") for r in ontology.relations]
    return nodes, edges


# ---------------------------------------------------------------- defter


@dataclass
class LedgerView:
    entries: list[LedgerEntry]
    total: int
    primary_valid: bool
    broken_index: int | None
    consensus: ConsensusReport
    kinds: Counter[str]


LedgerChecks = dict[tuple[object, ...], tuple[Any, ConsensusReport, Counter[str]]]


def _replica_signature(replica: LedgerReplica) -> object:
    signature = getattr(replica, "signature", None)
    return signature() if callable(signature) else (replica.name, len(replica.entries()))


def ledger_view(
    uow: AbstractUnitOfWork, replicas: Sequence[LedgerReplica], limit: int = 60, memo: LedgerChecks | None = None
) -> LedgerView:
    """Zincir doğrulaması on binlerce kaydı okur. Çağıran bir ``memo`` verirse, defter ya da bir düğüm
    değişmedikçe sonuç yeniden kullanılır (anahtar: kayıt sayısı + uç özet + düğüm imzaları)."""
    memo = {} if memo is None else memo
    head = uow.ledger.head()
    total = uow.ledger.count()
    key = (total, head.hash if head else "", tuple(_replica_signature(r) for r in replicas))
    checks = memo.get(key)
    if checks is None:
        entries = uow.ledger.all()
        primary = verify_chain(entries)
        reports = {"Ana defter (veritabanı)": primary}
        for replica in replicas:
            reports[f"Düğüm {replica.name}"] = verify_chain(list(replica.entries()))
        checks = (primary, reach_consensus(reports), Counter(e.kind for e in entries))
        memo.clear()
        memo[key] = checks
    primary, consensus, kinds = checks
    return LedgerView(
        entries=uow.ledger.recent(limit),
        total=total,
        primary_valid=primary.valid,
        broken_index=primary.broken_index,
        consensus=consensus,
        kinds=kinds,
    )


# ---------------------------------------------------------------- yönetmelik


def regulation_view(uow: AbstractUnitOfWork) -> dict[str, Any]:
    reg = uow.regulations.current()
    general = [(k, rule.label, reg.current_value(k), rule) for k, rule in CHANGEABLE.items() if not k.startswith(("strateji_", "esik_"))]
    per_kind = [
        (kind, label, reg.strategy_for(kind), reg.threshold_for(kind))
        for kind, label in KIND_LABELS.items()
    ]
    return {
        "regulation": reg,
        "general": general,
        "per_kind": per_kind,
        "history": uow.regulations.history(),
        "strategy_labels": STRATEGY_LABELS,
        "threshold_labels": THRESHOLD_LABELS,
        "changeable": CHANGEABLE,
    }


# ---------------------------------------------------------------- özet sayılar


def dashboard_stats(uow: AbstractUnitOfWork) -> dict[str, int]:
    roots = uow.topics.roots()
    nodes = [n for r in roots for n in r.walk()]
    topics = [n for n in nodes if isinstance(n, Topic)]
    return {
        "aktif": sum(1 for t in topics if t.state.can_discuss),
        "konu": len(topics),
        "mesaj": sum(1 for n in nodes if isinstance(n, Message) and n.is_visible()),
        "acik_oylama": len(uow.proposals.list_open()),
        "uye": uow.users.count(agents=False),
        "ajan": uow.users.count(agents=True),
        "defter": uow.ledger.count(),
        "oy": sum(len(p.ballots) for p in uow.proposals.list()),
    }
