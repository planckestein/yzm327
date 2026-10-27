"""Giriş noktası (Entrypoint): FastAPI + Jinja2 web arayüzü.

Bu katman yalnızca üç iş yapar: HTTP isteğini bir **komuta** çevirip Protection Proxy'ye (``app.gateway``)
vermek, **okuma** için ``views`` fonksiyonlarını çağırmak ve sonucu şablona basmak. İş kuralı yoktur.
"""

from __future__ import annotations

import json
import os
from collections.abc import Callable
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from kurultay.adapters import veri_klasoru
from kurultay.adapters.clock import SystemClock
from kurultay.adapters.ledger_nodes import JsonLinesLedgerNode
from kurultay.adapters.security import SessionSigner
from kurultay.bootstrap import Application, bootstrap, sqlite_engine
from kurultay.domain import commands as cmd
from kurultay.domain.exceptions import DomainError, NotFound
from kurultay.domain.regulation import CHANGEABLE, KIND_LABELS, STRATEGY_LABELS, THRESHOLD_LABELS
from kurultay.domain.topic import Message, Topic
from kurultay.domain.user import User
from kurultay.entrypoints.live_demo import SCENARIOS, LiveDemo
from kurultay.reference_data import ensure_reference_data
from kurultay.service_layer import views

HERE = Path(__file__).parent
PROJECT_ROOT = HERE.parents[3]
SESSION_COOKIE = "kurultay_oturum"
FLASH_COOKIE = "kurultay_bildirim"
DEMO_PASSWORD = "demo1234"

TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]


def tr_date(value: datetime | str | None, with_time: bool = True) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    text = f"{value.day} {TR_MONTHS[value.month - 1]} {value.year}"
    return f"{text} · {value:%H:%M}" if with_time else text


def relative_time(value: datetime | None, now: datetime) -> str:
    """Forumlardaki gibi: "az önce", "12 dk", "3 sa", "dün", "4 gün", sonra tarih."""
    if value is None:
        return ""
    seconds = (now - value).total_seconds()
    if seconds < 60:
        return "az önce"
    if seconds < 3600:
        return f"{int(seconds // 60)} dk önce"
    if seconds < 86400:
        return f"{int(seconds // 3600)} sa önce"
    days = (now.date() - value.date()).days
    if days <= 1:
        return "dün"
    if days < 7:
        return f"{days} gün önce"
    text = f"{value.day} {TR_MONTHS[value.month - 1]}"
    return text if value.year == now.year else f"{text} {value.year}"


PALETTE = ("#b4432c", "#34478f", "#3d7c56", "#2c8597", "#6e3f6c", "#cf7637", "#8a6a2f")


def nickname_color(nickname: str) -> str:
    """Her takma ada sabit bir tamga rengi (kişisel veri kullanılmaz)."""
    return PALETTE[sum(ord(ch) * (i + 1) for i, ch in enumerate(nickname)) % len(PALETTE)]


def build_runtime(root: Path) -> tuple[Application, SessionSigner, list[JsonLinesLedgerNode]]:
    root.mkdir(parents=True, exist_ok=True)
    data_dir = veri_klasoru.etkin(root)
    engine = sqlite_engine(f"sqlite:///{(data_dir / 'kurultay.db').as_posix()}")
    nodes = [JsonLinesLedgerNode(name, data_dir / "defter-dugumleri" / f"dugum-{name}.jsonl") for name in ("A", "B", "C")]
    application = bootstrap(engine=engine, clock=SystemClock(), replicas=nodes)
    ensure_reference_data(application.uow_factory, application.clock.now())
    with application.uow_factory() as uow:
        entries = uow.ledger.all()
    for node in nodes:
        node.sync(entries)
    return application, SessionSigner.from_file(root / "oturum.key"), nodes


def create_app(data_dir: Path | None = None, demo_mode: bool = True) -> FastAPI:
    data_dir = data_dir or Path(os.environ.get("KURULTAY_VERI", PROJECT_ROOT / "veri"))
    application, signer, nodes = build_runtime(data_dir)
    ledger_checks: views.LedgerChecks = {}  # doğrulama sonucu, defter değişene kadar yeniden kullanılır
    web = FastAPI(title="Kurultay", docs_url="/api/belgeler", redoc_url=None)
    web.state.app = application
    live = LiveDemo(application)
    web.state.live = live
    web.mount("/static", StaticFiles(directory=HERE / "static"), name="static")
    templates = Jinja2Templates(directory=HERE / "templates")
    templates.env.filters["tarih"] = tr_date
    templates.env.filters["gun"] = lambda v: tr_date(v, with_time=False)
    templates.env.filters["renk"] = nickname_color
    templates.env.filters["once"] = lambda v: relative_time(v, application.clock.now())
    templates.env.globals.update(
        KIND_LABELS=KIND_LABELS, STRATEGY_LABELS=STRATEGY_LABELS, THRESHOLD_LABELS=THRESHOLD_LABELS,
        Message=Message, Topic=Topic, demo_mode=demo_mode,
        # Stil dosyası değişince tarayıcı eski kopyayı önbellekten kullanmasın
        css_surum=int((HERE / "static" / "kurultay.css").stat().st_mtime),
    )

    # ------------------------------------------------------------ yardımcılar

    def current_user(request: Request) -> User | None:
        user_id = signer.unsign(request.cookies.get(SESSION_COOKIE))
        if not user_id:
            return None
        with application.uow_factory() as uow:
            return uow.users.get(user_id)

    def render(request: Request, template: str, status_code: int = 200, **context: Any) -> HTMLResponse:
        user = current_user(request)
        unread = 0
        if user is not None:
            with application.uow_factory() as uow:
                unread = uow.notifications.unread_count(user.id)
        flash = None
        raw = request.cookies.get(FLASH_COOKIE)
        if raw:
            kind, _, text = unquote(raw).partition("|")
            flash = {"kind": kind, "text": text}
        response = templates.TemplateResponse(
            request, template,
            {"me": user, "unread": unread, "flash": flash, "now": application.clock.now(), "path": request.url.path, **context},
            status_code=status_code,
        )
        if raw:
            response.delete_cookie(FLASH_COOKIE)
        return response

    def redirect(url: str, message: str | None = None, kind: str = "basari") -> RedirectResponse:
        response = RedirectResponse(url, status_code=303)
        if message:
            response.set_cookie(FLASH_COOKIE, quote(f"{kind}|{message}"), max_age=30)
        return response

    def back(request: Request) -> str:
        referer = request.headers.get("referer", "/")
        return referer if referer.startswith(str(request.base_url)) else "/"

    def act(request: Request, build: Callable[[str | None], cmd.Command], success: str,
            then: Callable[[Any], str] | None = None) -> RedirectResponse:
        user = current_user(request)
        try:
            result = application.gateway.dispatch(build(user.id if user else None))
        except DomainError as exc:
            return redirect(back(request), str(exc), "hata")
        return redirect(then(result) if then else back(request), success)

    def not_found(request: Request, text: str = "Aradığın sayfa bulunamadı.") -> HTMLResponse:
        return render(request, "error.html", status_code=404, text=text)

    @web.middleware("http")
    async def close_due(request: Request, call_next):  # type: ignore[no-untyped-def]
        if request.method == "GET" and not request.url.path.startswith(("/static", "/api")):
            application.bus.handle(cmd.CloseDueProposals(None))
        return await call_next(request)

    # ------------------------------------------------------------ gündem

    @web.get("/", response_class=HTMLResponse)
    def index(request: Request, sira: str = "son", kavram: str | None = None, q: str = "",
              durum: str = "") -> HTMLResponse:
        states = {"oylamada": {"oylamada"}, "gizli": {"gizlendi", "reddedildi"}}.get(durum)
        now = application.clock.now()
        with application.uow_factory() as uow:
            ontology = uow.ontology.get()
            selected = ontology.get(kavram) if kavram else None
            concept = selected.id if selected else None
            rows = views.forum_rows(uow, sira, concept, q, states)
            open_cards = views.proposal_cards(uow, now, only_open=True, limit=6)
            cats = views.categories(uow)
            waiting = sum(1 for t in uow.topics.roots() if t.state.name == "oylamada")
        return render(request, "index.html", rows=rows, open_cards=open_cards, categories=cats, sira=sira,
                      kavram=concept, kavram_adi=selected.name if selected else "", q=q, durum=durum,
                      waiting=waiting)

    # ------------------------------------------------------------ konular

    @web.get("/konu/{topic_id}", response_class=HTMLResponse)
    def topic_detail(request: Request, topic_id: str) -> HTMLResponse:
        with application.uow_factory() as uow:
            page = views.topic_page(uow, topic_id, application.clock.now())
            ontology = uow.ontology.get()
        if page is None:
            return not_found(request, "Konu bulunamadı.")
        return render(request, "topic.html", page=page, ontology=ontology)

    @web.get("/yeni-konu", response_class=HTMLResponse)
    def new_topic_form(request: Request, ust: str | None = None) -> HTMLResponse:
        with application.uow_factory() as uow:
            ontology = uow.ontology.get()
            parent = uow.topics.get_node(ust) if ust else None
        return render(request, "new_topic.html", ontology=ontology, parent=parent if isinstance(parent, Topic) else None)

    @web.post("/yeni-konu")
    async def new_topic(request: Request) -> RedirectResponse:
        form = await request.form()
        concepts = tuple(str(v) for v in form.getlist("kavram"))
        parent = str(form.get("ust") or "") or None
        return act(
            request,
            lambda actor: cmd.ProposeTopic(actor, str(form.get("baslik", "")), str(form.get("aciklama", "")), concepts, parent),
            "Önerin oylamaya çıktı. İlgili üyelere ve YZ ajanlarına haber verildi.",
            then=lambda topic_id: f"/konu/{topic_id}",
        )

    @web.post("/konu/{topic_id}/mesaj")
    def post_message(request: Request, topic_id: str, metin: str = Form(""), yanit: str = Form("")) -> RedirectResponse:
        return act(request, lambda a: cmd.PostMessage(a, topic_id, metin, yanit or None), "Mesajın deftere işlendi.")

    @web.post("/konu/{topic_id}/duzenle")
    def propose_edit(request: Request, topic_id: str, baslik: str = Form(""), aciklama: str = Form(""),
                     gerekce: str = Form("")) -> RedirectResponse:
        return act(request, lambda a: cmd.ProposeTopicEdit(a, topic_id, baslik, aciklama, gerekce),
                   "Düzenleme teklifin oylamaya çıktı.", then=lambda pid: f"/teklif/{pid}")

    @web.post("/konu/{topic_id}/sil")
    def propose_delete(request: Request, topic_id: str, gerekce: str = Form("")) -> RedirectResponse:
        return act(request, lambda a: cmd.ProposeTopicDeletion(a, topic_id, gerekce),
                   "Gizleme teklifi oylamaya çıktı; konu “Silinme oylamasında” durumuna geçti.",
                   then=lambda pid: f"/teklif/{pid}")

    @web.post("/konu/{topic_id}/uzlasma")
    def propose_consensus(request: Request, topic_id: str, metin: str = Form("")) -> RedirectResponse:
        return act(request, lambda a: cmd.ProposeConsensus(a, topic_id, metin), "Uzlaşma teklifin oylamaya çıktı.",
                   then=lambda pid: f"/teklif/{pid}")

    @web.post("/mesaj/{message_id}/gizle")
    def propose_hide(request: Request, message_id: str, gerekce: str = Form("")) -> RedirectResponse:
        return act(request, lambda a: cmd.ProposeMessageHiding(a, message_id, gerekce),
                   "Gizleme teklifi oylamaya çıktı. Mesaj, oylama kabul edilmedikçe görünür kalır.",
                   then=lambda pid: f"/teklif/{pid}")

    # ------------------------------------------------------------ teklifler ve oy

    @web.get("/teklifler", response_class=HTMLResponse)
    def proposals(request: Request, durum: str = "acik") -> HTMLResponse:
        only_open = {"acik": True, "kapali": False}.get(durum)
        with application.uow_factory() as uow:
            cards = views.proposal_cards(uow, application.clock.now(), only_open=only_open)
        return render(request, "proposals.html", cards=cards, durum=durum)

    @web.get("/teklif/{proposal_id}", response_class=HTMLResponse)
    def proposal_detail(request: Request, proposal_id: str) -> HTMLResponse:
        user = current_user(request)
        with application.uow_factory() as uow:
            detail = views.proposal_detail(uow, proposal_id, user.id if user else None, application.clock.now())
        if detail is None:
            return not_found(request, "Teklif bulunamadı.")
        return render(request, "proposal.html", d=detail)

    @web.post("/teklif/{proposal_id}/oy")
    def vote(request: Request, proposal_id: str, secim: str = Form(...), yogunluk: int = Form(1),
             gerekce: str = Form("")) -> RedirectResponse:
        return act(request, lambda a: cmd.CastVote(a, proposal_id, secim, yogunluk, gerekce), "Oyun deftere işlendi.")

    # ------------------------------------------------------------ ontoloji

    @web.get("/ontoloji", response_class=HTMLResponse)
    def ontology(request: Request) -> HTMLResponse:
        user = current_user(request)
        with application.uow_factory() as uow:
            nodes_, edges = views.ontology_graph(uow, user.id if user else None)
        by_id = {n.id: n for n in nodes_}
        return render(request, "ontology.html", nodes=nodes_, edges=edges, by_id=by_id)

    @web.post("/ontoloji/{concept_id}/takip")
    def follow(request: Request, concept_id: str, takip: str = Form("1")) -> RedirectResponse:
        following = takip == "1"
        return act(request, lambda a: cmd.SetInterest(a, concept_id, following),
                   "İlgi alanların güncellendi." if following else "Kavram ilgi alanlarından çıkarıldı.")

    @web.post("/uzmanlik")
    def propose_expertise(request: Request, kavram: str = Form(...), duzey: int = Form(1),
                          gerekce: str = Form("")) -> RedirectResponse:
        return act(request, lambda a: cmd.ProposeExpertise(a, kavram, duzey, gerekce),
                   "Uzmanlık teklifin o kavramın topluluğuna sunuldu.", then=lambda pid: f"/teklif/{pid}")

    # ------------------------------------------------------------ yönetmelik

    @web.get("/yonetmelik", response_class=HTMLResponse)
    def regulation(request: Request) -> HTMLResponse:
        with application.uow_factory() as uow:
            data = views.regulation_view(uow)
        return render(request, "regulation.html", **data)

    @web.post("/yonetmelik")
    def propose_regulation(request: Request, anahtar: str = Form(...), deger: str = Form(...),
                           gerekce: str = Form("")) -> RedirectResponse:
        return act(request, lambda a: cmd.ProposeRegulationChange(a, anahtar, deger, gerekce),
                   "Yönetmelik değişikliği oylamaya çıktı.", then=lambda pid: f"/teklif/{pid}")

    # ------------------------------------------------------------ defter

    @web.get("/defter", response_class=HTMLResponse)
    def ledger(request: Request) -> HTMLResponse:
        with application.uow_factory() as uow:
            view = views.ledger_view(uow, nodes, memo=ledger_checks)
        return render(request, "ledger.html", ledger=view, nodes=nodes)

    @web.get("/defter/indir")
    def ledger_download() -> Response:
        with application.uow_factory() as uow:
            entries = [e.__dict__ for e in uow.ledger.all()]
        return Response(
            json.dumps(entries, ensure_ascii=False, indent=1), media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=kurultay-defter.json"},
        )

    @web.post("/defter/kurcala")
    def ledger_tamper(request: Request) -> RedirectResponse:
        if not demo_mode:
            return redirect("/defter")
        node = nodes[-1]
        entries = node.entries()
        if entries:
            node.tamper(len(entries) // 2, '{"not":"birisi bu kaydı sessizce değiştirdi"}')
        return redirect("/defter", f"Düğüm {node.name} içindeki bir kayıt değiştirildi. Uzlaşma raporuna bak.", "uyari")

    @web.post("/defter/onar")
    def ledger_repair(request: Request) -> RedirectResponse:
        with application.uow_factory() as uow:
            entries = uow.ledger.all()
        for node in nodes:
            node.reset_from(entries)
        return redirect("/defter", "Düğümler çoğunluğun zincirinden yeniden kopyalandı.")

    # ------------------------------------------------------------ üyeler, profil, bildirim

    @web.get("/uyeler")
    def members(request: Request) -> RedirectResponse:
        return redirect("/")  # üye listesi yok; profillere takma adlardan ulaşılır

    @web.get("/profil/{nickname}", response_class=HTMLResponse)
    def profile(request: Request, nickname: str) -> HTMLResponse:
        viewer = current_user(request)
        try:
            prof = application.profiles.profile(nickname, viewer.id if viewer else None)  # Protection Proxy
        except NotFound:
            return not_found(request, "Üye bulunamadı.")
        with application.uow_factory() as uow:
            ontology = uow.ontology.get()
            proposals = [p for p in uow.proposals.list() if p.proposer_id == prof.user_id][:8]
            votes = sum(1 for p in uow.proposals.list() if p.has_voted(prof.user_id))
            posts, topics = views.member_activity(uow, prof.user_id)
            registry_keys = application.model_registry.keys
        return render(request, "profile.html", prof=prof, ontology=ontology, proposals=proposals, votes=votes,
                      topics=topics, posts=posts, registry_keys=registry_keys)

    @web.get("/bildirimler", response_class=HTMLResponse)
    def notifications(request: Request) -> HTMLResponse:
        user = current_user(request)
        if user is None:
            return redirect("/giris", "Bildirimlerini görmek için giriş yap.", "uyari")  # type: ignore[return-value]
        with application.uow_factory() as uow:
            items = uow.notifications.for_user(user.id, 50)
        response = render(request, "notifications.html", items=items)
        application.gateway.dispatch(cmd.MarkNotificationsRead(user.id))
        return response

    # ------------------------------------------------------------ mimari

    @web.get("/mimari", response_class=HTMLResponse)
    def architecture(request: Request) -> HTMLResponse:
        diagrams_dir = HERE / "static" / "diyagramlar"
        diagrams = []
        index_file = diagrams_dir / "dizin.json"
        if index_file.exists():
            diagrams = json.loads(index_file.read_text(encoding="utf-8"))
        test_report = PROJECT_ROOT / "docs" / "test-ozeti.json"
        tests = json.loads(test_report.read_text(encoding="utf-8")) if test_report.exists() else None
        olcum_file = PROJECT_ROOT / "docs" / "olcum.json"
        olcum = json.loads(olcum_file.read_text(encoding="utf-8")) if olcum_file.exists() else None
        return render(request, "architecture.html", diagrams=diagrams, tests=tests, olcum=olcum, observers=application.notification_center.observers,
                      registry_keys=application.model_registry.keys)

    # ------------------------------------------------------------ hesap

    @web.get("/giris", response_class=HTMLResponse)
    def login_form(request: Request) -> HTMLResponse:
        with application.uow_factory() as uow:
            demo_users = [u.public_profile() for u in uow.users.list() if not u.is_agent][:10] if demo_mode else []
        return render(request, "login.html", demo_users=demo_users, demo_password=DEMO_PASSWORD)

    @web.post("/giris")
    def login(request: Request, takma_ad: str = Form(...), sifre: str = Form(...)) -> RedirectResponse:
        with application.uow_factory() as uow:
            user = uow.users.get_by_nickname(takma_ad.strip())
        if user is None or user.is_agent or not application.hasher.verify(sifre, user.password_hash.value):
            return redirect("/giris", "Takma ad ya da şifre hatalı.", "hata")
        response = redirect("/", f"Hoş geldin, @{user.nickname}.")
        response.set_cookie(SESSION_COOKIE, signer.sign(user.id), httponly=True, samesite="lax", max_age=30 * 86400)
        return response

    @web.post("/cikis")
    def logout() -> RedirectResponse:
        response = redirect("/", "Çıkış yaptın.")
        response.delete_cookie(SESSION_COOKIE)
        return response

    @web.get("/kayit", response_class=HTMLResponse)
    def register_form(request: Request) -> HTMLResponse:
        with application.uow_factory() as uow:
            ontology = uow.ontology.get()
        return render(request, "register.html", ontology=ontology)

    @web.post("/kayit")
    async def register(request: Request) -> RedirectResponse:
        form = await request.form()
        try:
            birth = date.fromisoformat(str(form.get("dogum_tarihi", "")))
        except ValueError:
            return redirect("/kayit", "Geçerli bir doğum tarihi gir.", "hata")
        try:
            user_id = application.gateway.dispatch(
                cmd.RegisterUser(
                    None, str(form.get("takma_ad", "")), str(form.get("ad", "")), str(form.get("soyad", "")), birth,
                    str(form.get("adres", "")), str(form.get("sifre", "")),
                    interests=tuple(str(v) for v in form.getlist("ilgi")),
                )
            )
        except DomainError as exc:
            return redirect("/kayit", str(exc), "hata")
        response = redirect("/ontoloji", "Kaydın tamam. Kişisel bilgilerin yalnızca sana görünür; herkes seni takma adınla tanır.")
        response.set_cookie(SESSION_COOKIE, signer.sign(user_id), httponly=True, samesite="lax", max_age=30 * 86400)
        return response

    # ------------------------------------------------------------ canlı oylama (meclis)

    @web.get("/canli", response_class=HTMLResponse)
    def live_page(request: Request, teklif: str | None = None) -> HTMLResponse:
        proposal_id = teklif or (live.session.proposal_id if live.session else None)
        with application.uow_factory() as uow:
            open_ids = [p.id for p in uow.proposals.list_open()]
            if proposal_id is None and open_ids:
                proposal_id = open_ids[0]
        return render(request, "canli.html", proposal_id=proposal_id, scenarios=SCENARIOS.values(),
                      running=bool(live.session and live.session.running))

    @web.post("/canli/baslat")
    def live_start(request: Request, senaryo: str = Form("konu")) -> RedirectResponse:
        if not demo_mode or senaryo not in SCENARIOS:
            return redirect("/canli")
        session = live.start(senaryo)
        if session.error and not session.proposal_id:
            return redirect("/canli", session.error, "hata")
        return redirect(f"/canli?teklif={session.proposal_id}")

    @web.get("/api/canli/{proposal_id}")
    def live_data(proposal_id: str) -> JSONResponse:
        data = live.snapshot(proposal_id)
        if data is None:
            return JSONResponse({"hata": "Teklif bulunamadı"}, status_code=404)
        return JSONResponse(data)

    @web.get("/tanitim", response_class=HTMLResponse)
    def presentation(request: Request) -> HTMLResponse:
        test_report = PROJECT_ROOT / "docs" / "test-ozeti.json"
        tests = json.loads(test_report.read_text(encoding="utf-8")) if test_report.exists() else None
        with application.uow_factory() as uow:
            stats = views.dashboard_stats(uow)
        return render(request, "tanitim.html", tests=tests, stats=stats, scenarios=SCENARIOS.values())

    # ------------------------------------------------------------ demo

    @web.post("/demo/zaman")
    def advance_time(request: Request, gun: int = Form(1)) -> RedirectResponse:
        if not demo_mode or not isinstance(application.clock, SystemClock):
            return redirect(back(request))
        application.clock.advance(timedelta(days=gun))
        closed = application.bus.handle(cmd.CloseDueProposals(None))
        return redirect(back(request), f"Saat {gun} gün ileri alındı; süresi dolan {closed} oylama sonuçlandı.", "uyari")

    @web.get("/api/durum")
    def api_status() -> JSONResponse:
        with application.uow_factory() as uow:
            stats = views.dashboard_stats(uow)
            view = views.ledger_view(uow, nodes, limit=1, memo=ledger_checks)
        return JSONResponse({"istatistik": stats, "defter_gecerli": view.primary_valid, "uzlasma": view.consensus.healthy})

    return web


__all__ = ["create_app", "CHANGEABLE"]
