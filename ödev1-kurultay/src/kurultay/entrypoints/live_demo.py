"""Canlı oylama gösterimi (tanıtım için).

Bu modül bir **istemcidir**: demo hesapları adına yalnızca komut gönderir (``ProposeTopic``, ``PostMessage``,
``ProposeMessageHiding``, ``ProposeRegulationChange``, ``CastVote``) ve bunları Protection Proxy'den geçirir.
Hiçbir kuralı kendisi uygulamaz; kim oy verebilir, oyun ağırlığı ne, sonuç ne zaman kesinleşir — hepsini
alan modeli belirler. Her oydan sonra Message Bus'ın işlediği komut ve olaylar kaydedilir; meclis sayfası
bunları "mimari akış" olarak gösterir.
"""

from __future__ import annotations

import random
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from kurultay.bootstrap import Application
from kurultay.domain import commands as c
from kurultay.domain import events as e
from kurultay.domain.eligibility import build_electorate
from kurultay.domain.exceptions import DomainError
from kurultay.domain.proposal import Proposal
from kurultay.domain.regulation import STRATEGY_LABELS, THRESHOLD_LABELS
from kurultay.domain.topic import Topic
from kurultay.domain.voting import Electorate, Tally, create_strategy


@dataclass(frozen=True)
class Scenario:
    key: str
    title: str
    pattern: str
    summary: str


SCENARIOS: dict[str, Scenario] = {
    "konu": Scenario(
        "konu", "Yeni konu açılsın mı?", "Basit çoğunluk · State: Oylamada → Aktif",
        "Bir üye “Kurultay hakkında” başlığında yeni bir konu önerir. Konu hemen açılmaz; o başlığı takip eden üyeler "
        "ve YZ ajanları oylar. Evetler yarıyı geçince konu kendiliğinden tartışmaya açılır.",
    ),
    "karesel": Scenario(
        "karesel", "Sert bir mesaj gizlensin mi?", "Karesel oylama (k oy = k² kredi) · 3/5",
        "Sert bir mesajın gizlenmesi teklif edilir. Çoğunluk “evet” der ama umursamadan, birer oyla. Mesajın "
        "kalmasını isteyen azınlık 3'er oy kullanır. Kişi sayısında kaybeden azınlık, karesel oylamada kazanır.",
    ),
    "yonetmelik": Scenario(
        "yonetmelik", "Kural değişikliği", "Karesel oylama · 3'te 2 · bütün üyeler",
        "Oylama süresini değiştirme teklifi. Kurallar herkesi ilgilendirdiği için binlerce üyenin hepsi seçmendir; "
        "kalabalık mecliste her koltuk birkaç üyeyi temsil eder. Kabul edilirse kuralların yeni sürümü oluşur.",
    ),
}

LAYER_OF: dict[str, str] = {
    "CastVote": "Entrypoint → AuthorizationProxy → MessageBus",
    "ProposeTopic": "Entrypoint → AuthorizationProxy → MessageBus",
    "PostMessage": "Entrypoint → AuthorizationProxy → MessageBus",
    "ProposeMessageHiding": "Entrypoint → AuthorizationProxy → MessageBus",
    "ProposeRegulationChange": "Entrypoint → AuthorizationProxy → MessageBus",
    "CloseDueProposals": "Zamanlayıcı → MessageBus",
    "VoteCast": "Domain: Proposal.cast (yetki zinciri onayladı)",
    "ProposalAccepted": "Domain: Proposal.try_close → karar",
    "ProposalRejected": "Domain: Proposal.try_close → karar",
    "ProposalOpened": "Domain: Proposal.open (yönetmelikten strateji)",
    "VotingStarted": "Observer: bildirim merkezi → üyeler ve YZ ajanları",
    "TopicStateChanged": "Domain: State deseni",
    "TopicProposed": "Domain: Composite ağaca yeni düğüm",
    "MessagePosted": "Domain: Composite yaprak (Message)",
    "ContentMasked": "Domain: maske — içerik silinmez",
    "RegulationChanged": "Domain: yönetmelik yeni sürüm",
    "ReputationChanged": "Domain: itibar",
}


@dataclass
class LogEntry:
    at: float
    kind: str  # komut | olay
    name: str
    detail: str
    layer: str


@dataclass
class LiveSession:
    scenario: Scenario
    proposal_id: str = ""
    running: bool = True
    error: str = ""
    log: list[LogEntry] = field(default_factory=list)
    started: float = field(default_factory=time.time)


class LiveDemo:
    # Bir gösterim yaklaşık bu kadar adımda tamamlanır; kalabalık mecliste her adımda birden çok oy düşer.
    STEPS = 48
    MAX_SEATS = 300

    def __init__(self, app: Application, delay: float = 0.6, sleep: Callable[[float], None] = time.sleep) -> None:
        self.app = app
        self.delay = delay
        self.sleep = sleep
        self.session: LiveSession | None = None
        self._lock = threading.Lock()
        self._runs = 0
        self._nicks: dict[str, tuple[str, bool]] = {}

    # ------------------------------------------------------------ yardımcılar

    def _who(self, user_id: str | None) -> tuple[str, bool]:
        """Takma ad ve YZ ajanı mı (yalnızca gerekenler, önbellekli)."""
        if not user_id:
            return ("?", False)
        if user_id not in self._nicks:
            with self.app.uow_factory() as uow:
                user = uow.users.get(user_id)
            self._nicks[user_id] = (str(user.nickname), user.is_agent) if user else ("?", False)
        return self._nicks[user_id]

    def _nick_of(self) -> Callable[[str | None], str]:
        return lambda user_id: self._who(user_id)[0]

    def _dispatch(self, session: LiveSession, command: c.Command) -> Any:
        start = len(self.app.bus.handled)
        result = self.app.gateway.dispatch(command)
        nick = self._nick_of()
        for message in self.app.bus.handled[start:]:
            name = type(message).__name__
            if name in ("UserRegistered", "InterestsChanged"):
                continue
            kind = "komut" if isinstance(message, c.Command) else "olay"
            session.log.append(LogEntry(time.time(), kind, name, self._describe(message, nick), LAYER_OF.get(name, "Service Layer")))
        session.log = session.log[-60:]
        return result

    @staticmethod
    def _describe(message: object, nick: Callable[[str | None], str]) -> str:
        if isinstance(message, c.CastVote):
            return f"@{nick(message.actor_id)} → {message.choice} ({message.intensity} oy)"
        if isinstance(message, e.VoteCast):
            who = "YZ ajanı " if message.is_agent else ""
            return f"{who}@{nick(message.voter_id)} oyu deftere işlendi"
        if isinstance(message, e.ProposalAccepted | e.ProposalRejected):
            return f"evet {message.yes:g} · hayır {message.no:g}"
        if isinstance(message, e.TopicStateChanged):
            return f"{message.old_state} → {message.new_state}"
        if isinstance(message, e.VotingStarted):
            return "ilgili üyelere bildirim, YZ ajanlarına inceleme"
        if isinstance(message, e.ReputationChanged):
            return f"@{nick(message.user_id)} {message.delta:+d} ({message.reason})"
        if isinstance(message, c.Command) and message.actor_id:
            return f"@{nick(message.actor_id)}"
        return ""

    def _user_id(self, nickname: str) -> str:
        with self.app.uow_factory() as uow:
            user = uow.users.get_by_nickname(nickname)
            if user is None:
                raise DomainError(f"Demo hesabı yok: {nickname}")
            return user.id

    # ------------------------------------------------------------ senaryolar

    def start(self, key: str) -> LiveSession:
        with self._lock:
            if self.session and self.session.running:
                return self.session
            scenario = SCENARIOS[key]
            session = LiveSession(scenario)
            self.session = session
            self._runs += 1
        try:
            session.proposal_id = str(getattr(self, f"_prepare_{key}")(session))
        except DomainError as exc:
            session.running, session.error = False, str(exc)
            return session
        threading.Thread(target=self._vote_loop, args=(session, key), daemon=True).start()
        return session

    def _prepare_konu(self, session: LiveSession) -> str:
        topic_id = self._dispatch(session, c.ProposeTopic(
            self._user_id("deniz_yazilim"),
            f"Kurultay oylamaları meclis görünümüyle canlı yayınlansın mı? (#{self._runs})",
            "Önemli oylamalar sonuçlanırken herkes meclis görünümünden izleyebilsin; oylar deftere işlendikçe koltuklar dolsun.",
            ("kurultay",),
        ))
        with self.app.uow_factory() as uow:
            return next(p.id for p in uow.proposals.list() if p.target_id == topic_id)

    def _prepare_karesel(self, session: LiveSession) -> str:
        with self.app.uow_factory() as uow:
            ontology = uow.ontology.get()
            candidates = [n for r in uow.topics.roots() for n in r.walk()
                          if isinstance(n, Topic) and n.state.can_discuss and n.state.can_be_changed]
            sehir = [t for t in candidates if t.concept_ids & ontology.neighbourhood(["sehir"])]
            topic = next(iter(sehir or candidates), None)
        if topic is None:
            raise DomainError("Tartışmaya açık konu yok.")
        message_id = self._dispatch(session, c.PostMessage(
            self._user_id("gul_esnaf"), topic.id,
            "Bisiklet yolu isteyenler bu şehrin gerçeklerinden tamamen kopuk; esnafı düşünen yok, hepsi hayal.",
        ))
        return str(self._dispatch(session, c.ProposeMessageHiding(
            self._user_id("burak_sehir"), str(message_id), "Mesaj, karşı görüştekileri küçümsüyor; tartışmayı zehirliyor.",
        )))

    def _prepare_yonetmelik(self, session: LiveSession) -> str:
        with self.app.uow_factory() as uow:
            current = uow.regulations.current().voting_days
        target = "5" if current != 5 else "3"
        return str(self._dispatch(session, c.ProposeRegulationChange(
            self._user_id("mehmet_iktisat"), "voting_days", target,
            "Kalabalık bir mecliste herkesin oy verebilmesi için süre yeniden ayarlanmalı.",
        )))

    # ------------------------------------------------------------ oy döngüsü

    def _plan(self, key: str, proposal: Proposal, voters: list[str]) -> list[tuple[str, str, int]]:
        rng = random.Random(len(voters) * 31 + self._runs)
        rng.shuffle(voters)
        plan = []
        for i, voter in enumerate(voters):
            if key == "konu":
                choice = "evet" if rng.random() < 0.66 else "hayir"
                plan.append((voter, choice, 1))
            elif key == "karesel":
                minority = i % 5 in (1, 3)  # her beş kişiden ikisi: azınlık, konuyu çok önemsiyor
                plan.append((voter, "hayir", 3) if minority else (voter, "evet", 1))
            else:
                yes = rng.random() < 0.8
                plan.append((voter, "evet" if yes else "hayir", rng.choice((1, 2, 3)) if yes else rng.choice((1, 2))))
        return plan

    def _vote_loop(self, session: LiveSession, key: str) -> None:
        try:
            with self.app.uow_factory() as uow:
                proposal = uow.proposals.get(session.proposal_id)
                assert proposal is not None and proposal.electorate is not None
                humans = [v.user_id for v in proposal.electorate.voters if not v.is_agent
                          and not proposal.has_voted(v.user_id) and v.user_id != proposal.target_id]
            plan = self._plan(key, proposal, humans)
            per_step = max(1, -(-len(plan) // self.STEPS))
            for start in range(0, len(plan), per_step):
                self.sleep(self.delay)
                with self.app.uow_factory() as uow:
                    current = uow.proposals.get(session.proposal_id)
                    if current is None or not current.is_open:
                        break
                for voter, choice, intensity in plan[start:start + per_step]:
                    for k in range(intensity, 0, -1):  # ek kredisi yetmeyen daha az oyla katılır
                        try:
                            self._dispatch(session, c.CastVote(voter, session.proposal_id, choice, k))
                            break
                        except DomainError:
                            continue
        except Exception as exc:  # noqa: BLE001 — gösterim hiçbir zaman uygulamayı düşürmesin
            session.error = str(exc)
        finally:
            session.running = False

    # ------------------------------------------------------------ meclis verisi

    def _seats(self, electorate: Electorate, tally: Tally) -> tuple[list[dict[str, Any]], int]:
        """Koltuklar. Seçmen sayısı fazlaysa her koltuk birkaç seçmeni temsil eder (sandalye dağılımı gibi)."""
        weights = {w.ballot.voter_id: w for w in tally.weighted}
        agents = [v.user_id for v in electorate.voters if v.is_agent]
        humans = [v.user_id for v in electorate.voters if not v.is_agent]
        if len(electorate) <= self.MAX_SEATS:
            seats = []
            for uid in agents + humans:
                w = weights.get(uid)
                seats.append({"nick": self._who(uid)[0], "agent": uid in agents,
                              "choice": w.ballot.choice.value if w else None,
                              "intensity": w.ballot.intensity if w else 0, "weight": w.weight if w else 0})
            return seats, 1
        per_seat = -(-len(humans) // (self.MAX_SEATS - len(agents)))
        yes = sum(1 for uid in humans if uid in weights and weights[uid].ballot.choice.value == "evet")
        no = sum(1 for uid in humans if uid in weights and weights[uid].ballot.choice.value == "hayir")
        total = -(-len(humans) // per_seat)
        yes_seats, no_seats = round(yes / per_seat), round(no / per_seat)
        seats = [{"nick": self._who(uid)[0], "agent": True,
                  "choice": weights[uid].ballot.choice.value if uid in weights else None,
                  "intensity": 0, "weight": weights[uid].weight if uid in weights else 0} for uid in agents]
        group = f"{per_seat} seçmen"
        seats += [{"nick": group, "agent": False, "choice": "evet", "intensity": 0, "weight": 0}] * yes_seats
        seats += [{"nick": group, "agent": False, "choice": "hayir", "intensity": 0, "weight": 0}] * no_seats
        seats += [{"nick": group, "agent": False, "choice": None, "intensity": 0, "weight": 0}] * max(0, total - yes_seats - no_seats)
        return seats, per_seat

    def snapshot(self, proposal_id: str) -> dict[str, Any] | None:
        app = self.app
        now = app.clock.now()
        with app.uow_factory() as uow:
            proposal = uow.proposals.get(proposal_id)
            if proposal is None:
                return None
            ontology, regulation = uow.ontology.get(), uow.regulations.current()
            electorate = build_electorate([] if proposal.electorate else uow.users.list(), proposal, ontology,
                                          regulation, now.date())
            strategy = create_strategy(proposal.strategy_name, regulation)
            tally = proposal.current_tally(strategy, electorate)
            seats, per_seat = self._seats(electorate, tally)
            topic_node = uow.topics.get_node(proposal.topic_id) if proposal.topic_id else None
            ledger_head = uow.ledger.head()
        possible = tally.cast + tally.remaining_max or 1
        num, den = (int(x) for x in proposal.threshold.split("/"))
        session = self.session if self.session and self.session.proposal_id == proposal_id else None
        return {
            "proposal": {
                "id": proposal.id, "title": proposal.title, "kind": proposal.kind.label, "kind_key": proposal.kind.value,
                "strategy": STRATEGY_LABELS.get(proposal.strategy_name, proposal.strategy_name),
                "strategy_key": proposal.strategy_name,
                "threshold": proposal.threshold, "threshold_label": THRESHOLD_LABELS.get(proposal.threshold, ""),
                "status": proposal.status.value, "status_label": proposal.status.label,
                "reason": proposal.result.reason if proposal.result else "",
                "topic_state": topic_node.state.label if isinstance(topic_node, Topic) else None,
                "topic_id": topic_node.id if isinstance(topic_node, Topic) else None,
            },
            "seats": seats,
            "per_seat": per_seat,
            "tally": {
                "yes": tally.yes, "no": tally.no, "remaining": tally.remaining_max, "eligible": tally.eligible,
                "voted": tally.voted,
                "yes_heads": sum(1 for w in tally.weighted if w.ballot.choice.value == "evet"),
                "no_heads": sum(1 for w in tally.weighted if w.ballot.choice.value == "hayir"),
                "yes_pct": round(100 * tally.yes / possible, 1), "no_pct": round(100 * tally.no / possible, 1),
                "threshold_pct": round(100 * num / den, 1),
            },
            "ledger": {"count": (ledger_head.index + 1) if ledger_head else 0, "head": ledger_head.hash[:16] if ledger_head else ""},
            "session": {
                "running": bool(session and session.running),
                "error": session.error if session else "",
                "scenario": session.scenario.key if session else None,
                "log": [vars(entry) for entry in (session.log[-14:] if session else [])],
            },
        }
