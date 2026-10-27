"""Demo verisi: kırk günlük, üç bin üyeli bir Kurultay geçmişini **gerçek komutlarla** canlandırır.

Hiçbir kayıt veritabanına elle yazılmaz: her kayıt, her konu, her mesaj ve her oy bir komuttur ve Message Bus'tan
geçer. Böylece defterdeki her kayıt, YZ ajanlarının her oyu ve her bildirim gerçek iş kurallarının ürünüdür.

Geçmiş, zamana göre sıralı bir olay kuyruğuyla (basit bir ayrık olay simülasyonu) oynatılır: üyeler günlere
yayılarak katılır, konular önerilir, seçmen kütüğündeki üyeler eğilimlerine göre oy verir, tartışmalar sürer.
Hız için simülasyon bellek içi bir SQLite veritabanında koşar ve sonunda dosyaya yedeklenir. Bütün demo
hesaplarının şifresi ``demo1234``.

    python -m kurultay.entrypoints.demo            # veri/ klasörünü sıfırlar ve doldurur
"""

from __future__ import annotations

import heapq
import itertools
import os
import random
import sqlite3
import time
from collections import Counter
from functools import partial
from collections.abc import Callable
from datetime import date, datetime, timedelta
from pathlib import Path

from kurultay.adapters import veri_klasoru
from kurultay.adapters.clock import ManualClock
from kurultay.adapters.ledger_nodes import InMemoryLedgerNode, JsonLinesLedgerNode
from kurultay.adapters.security import Pbkdf2PasswordHasher
from kurultay.bootstrap import Application, bootstrap, sqlite_engine
from kurultay.domain import commands as c
from kurultay.domain.exceptions import DomainError
from kurultay.entrypoints.demo_konular import KONULAR, UZMANLIK, YONETMELIK, Ek, Konu, Mesaj, Oy
from kurultay.entrypoints.demo_uyeler import KONUSANLAR, YZ_AJANLARI, Uye, sessiz_cogunluk
from kurultay.reference_data import ensure_reference_data

PASSWORD = "demo1234"
GUN_SAYISI = 40
UYE_SAYISI = 3000
TARTISMA_BASLAR = 3.15
HATA = object()  # konu önerildikten kaç gün sonra tartışma açık olur (oylama süresi + kapanış)


class DemoHasher:
    """Demo hesapları aynı şifreyi kullanır; binlerce kez PBKDF2 hesaplamamak için özet bir kez hesaplanır.

    Doğrulama gerçek PBKDF2 ile yapılır; demo dışındaki her şifre normal şekilde özetlenir.
    """

    def __init__(self) -> None:
        self.real = Pbkdf2PasswordHasher()
        self._demo = self.real.hash(PASSWORD)

    def hash(self, password: str) -> str:
        return self._demo if password == PASSWORD else self.real.hash(password)

    def verify(self, password: str, hashed: str) -> bool:
        return self.real.verify(password, hashed)


class Simulasyon:
    def __init__(self, app: Application, clock: ManualClock, start: datetime, rng: random.Random) -> None:
        self.app, self.clock, self.start, self.rng = app, clock, start, rng
        self._kuyruk: list[tuple[datetime, int, Callable[[], None]]] = []
        self._sira = itertools.count()
        self.ids: dict[str, str] = {}
        self.egilim: dict[str, str] = {}  # kullanıcı kimliği → eğilim
        self.konusan: set[str] = set()
        self.konular: dict[str, str] = {}
        self.mesajlar: dict[str, list[str]] = {}
        self.sayac: Counter[str] = Counter()
        self.hatalar: list[str] = []

    # ------------------------------------------------------------ zamanlama

    def zaman(self, gun: float) -> datetime:
        return self.start + timedelta(days=gun)

    def planla(self, when: datetime, is_: Callable[[], None]) -> None:
        heapq.heappush(self._kuyruk, (when, next(self._sira), is_))

    def calistir(self, bitis: datetime, ilerleme: Callable[[str], None]) -> None:
        toplam, son = len(self._kuyruk), -1
        while self._kuyruk and self._kuyruk[0][0] <= bitis:
            when, _, is_ = heapq.heappop(self._kuyruk)
            if when > self.clock.now():
                self.clock.advance(when - self.clock.now())
            is_()
            toplam = max(toplam, self.sayac["adim"] + len(self._kuyruk))
            self.sayac["adim"] += 1
            yuzde = min(99, int(100 * (when - self.start) / (bitis - self.start)))
            if yuzde // 10 != son // 10:
                son = yuzde
                ilerleme(f"  %{yuzde:>2}  {self.sayac['uye']:>5} üye · {self.sayac['oy']:>5} oy · "
                         f"{self.sayac['mesaj']:>4} mesaj · {self.sayac['teklif']:>3} teklif")
        if bitis > self.clock.now():
            self.clock.advance(bitis - self.clock.now())

    def komut(self, command: c.Command, ne: str = "") -> object:
        """Komutu gönderir; iş kuralı reddederse (ör. oylama erken kapandı) ``HATA`` döner."""
        try:
            return self.app.gateway.dispatch(command)
        except DomainError as exc:
            if ne:
                self.hatalar.append(f"{ne}: {exc}")
            return HATA

    # ------------------------------------------------------------ üyeler

    def kaydet(self, uye: Uye, konusan: bool) -> None:
        def is_() -> None:
            uid = self.komut(c.RegisterUser(None, uye.nick, uye.ad, uye.soyad, uye.dogum, uye.adres, PASSWORD, "uye",
                                            uye.ilgi), f"kayıt {uye.nick}")
            if uid is not HATA:
                self.ids[uye.nick] = str(uid)
                self.egilim[str(uid)] = uye.egilim
                self.sayac["uye"] += 1
                if konusan:
                    self.konusan.add(str(uid))
        self.planla(self.zaman(uye.gun), is_)

    def ajanlari_kaydet(self) -> None:
        def is_() -> None:
            for nick, ilgi, model in YZ_AJANLARI:  # YZ ajanlarını sistem kaydeder (arayüzden kaydedilemez)
                self.ids[nick] = str(self.app.bus.handle(c.RegisterUser(
                    None, nick, "Yapay Zekâ", nick.split("_")[1].capitalize(), date(2026, 1, 1), "Yerel sunucu",
                    PASSWORD + "-ajan", "yz_ajan", ilgi, model)))
        self.planla(self.zaman(0.02), is_)

    # ------------------------------------------------------------ oylar

    def _secmenler(self, proposal_id: str) -> tuple[list[str], datetime, datetime, str]:
        with self.app.uow_factory() as uow:
            p = uow.proposals.get(proposal_id)
            assert p is not None and p.electorate is not None
            insanlar = [v.user_id for v in p.electorate.voters if not v.is_agent]
            return insanlar, p.opened_at, p.deadline, p.strategy_name

    def oylat(self, proposal_id: str, oy: Oy, katilim: float, yogun: dict[str, int] | None = None,
              ozel: dict[str, tuple[str, int, str]] | None = None, haric: frozenset[str] = frozenset()) -> None:
        """Teklifin dondurulmuş seçmen kütüğünden, eğilimlere göre oy verecek üyeleri seçip zamana yayar."""
        secmenler, acilis, bitis, strateji = self._secmenler(proposal_id)
        ozel_ids = {self.ids[n]: v for n, v in (ozel or {}).items() if n in self.ids}
        sure = (bitis - acilis).total_seconds() * 0.93
        for uid in secmenler:
            if uid in haric:
                continue
            if uid in ozel_ids:
                secim, yogunluk, neden = ozel_ids[uid]
            else:
                if self.rng.random() > (0.7 if uid in self.konusan else katilim):
                    continue
                egilim = self.egilim.get(uid, "merkez")
                secim = "evet" if self.rng.random() < oy.get(egilim, 0.5) else "hayir"
                neden = ""
                yogunluk = 1
                if strateji == "karesel":
                    tavan = (yogun or {}).get(egilim, 2)
                    yogunluk = self.rng.choices((1, 2, 3)[:tavan], weights=(2, 3, 4)[:tavan])[0]
            if strateji != "karesel":
                yogunluk = 1
            ne_zaman = acilis + timedelta(seconds=sure * self.rng.random() ** 1.7 + 60)

            def is_(uid: str = uid, secim: str = secim, yogunluk: int = yogunluk, neden: str = neden) -> None:
                for k in range(yogunluk, 0, -1):  # ek kredisi yetmeyen seçmen daha az oyla katılır
                    if self.komut(c.CastVote(uid, proposal_id, secim, k, neden)) is not HATA:
                        self.sayac["oy"] += 1
                        return
            self.planla(ne_zaman, is_)

    def _teklif_kimligi(self, hedef: str, turler: tuple[str, ...]) -> str | None:
        with self.app.uow_factory() as uow:
            return next((p.id for p in uow.proposals.list_open() if p.target_id == hedef and p.kind.value in turler), None)

    # ------------------------------------------------------------ konular

    def konu(self, k: Konu) -> None:
        def is_() -> None:
            parent = self.konular.get(k.ust) if k.ust else None
            tid = self.komut(c.ProposeTopic(self.ids[k.yazar], k.baslik, k.metin, k.kavramlar, parent), f"konu {k.anahtar}")
            if tid is HATA:
                return
            self.konular[k.anahtar] = str(tid)
            self.sayac["teklif"] += 1
            pid = self._teklif_kimligi(str(tid), ("yeni_konu", "alt_konu"))
            if pid:
                self.oylat(pid, k.oy, k.katilim, ozel=k.ozel, haric=frozenset({self.ids[k.yazar]}))
                self.komut(c.CastVote(self.ids[k.yazar], pid, "evet", 1, ""))
            self._tartisma(k, str(tid))
            for ek in k.ekler:
                if ek.tur != "gizle":
                    self.planla(self.zaman(k.gun + TARTISMA_BASLAR + ek.gun), partial(self._ek, k, ek))
        self.planla(self.zaman(k.gun), is_)

    def _tartisma(self, k: Konu, tid: str) -> None:
        self.mesajlar[k.anahtar] = []
        n = len(k.mesajlar)
        basla = k.gun + TARTISMA_BASLAR
        # Son konuların tartışması bugüne kadar sürer (forum canlı görünsün); mesaj metinleri değişmez.
        yayilim = min(k.yayilim, max(1.0, GUN_SAYISI - 0.06 - basla)) if basla + k.yayilim > GUN_SAYISI - 0.06 else k.yayilim
        anlar = sorted(basla + yayilim * ((i + 1) / max(1, n)) ** 1.35 - self.rng.uniform(0, 0.05) for i in range(n))
        gizlenecek = {ek.hedef: ek for ek in k.ekler if ek.tur == "gizle"}
        for i, (mesaj, an) in enumerate(zip(k.mesajlar, anlar)):
            def is_(i: int = i, mesaj: Mesaj = mesaj, an: float = an) -> None:
                nick, metin = mesaj[0], mesaj[1]
                cevap = self.mesajlar[k.anahtar][int(mesaj[2])] if len(mesaj) > 2 and int(mesaj[2]) < len(self.mesajlar[k.anahtar]) else None
                mid = self.komut(c.PostMessage(self.ids[nick], tid, metin, cevap or None), f"mesaj {k.anahtar}#{i}")
                self.mesajlar[k.anahtar].append("" if mid is HATA else str(mid))
                if mid is not HATA:
                    self.sayac["mesaj"] += 1
                if i in gizlenecek and mid is not HATA:
                    ek = gizlenecek[i]
                    self.planla(self.zaman(an + ek.gun), partial(self._gizle, k, ek, str(mid)))
            self.planla(self.zaman(an), is_)

    def _gizle(self, k: Konu, ek: Ek, message_id: str) -> None:
        pid = self.komut(c.ProposeMessageHiding(self.ids[ek.kim], message_id, ek.metin), f"gizleme {k.anahtar}")
        if pid is not HATA:
            self.sayac["teklif"] += 1
            self.oylat(str(pid), ek.oy, ek.katilim, ek.yogun, ek.ozel)

    def _ek(self, k: Konu, ek: Ek) -> None:
        tid, kim = self.konular.get(k.anahtar), self.ids[ek.kim]
        if tid is None:
            return
        komutlar: dict[str, c.Command] = {
            "uzlasma": c.ProposeConsensus(kim, tid, ek.metin),
            "sil": c.ProposeTopicDeletion(kim, tid, ek.metin),
            "duzenle": c.ProposeTopicEdit(kim, tid, ek.baslik, ek.aciklama, ek.metin),
        }
        pid = self.komut(komutlar[ek.tur], f"{ek.tur} {k.anahtar}")
        if pid is not HATA:
            self.sayac["teklif"] += 1
            self.oylat(str(pid), ek.oy, ek.katilim, ek.yogun, ek.ozel, haric=frozenset({kim}))
            self.komut(c.CastVote(kim, str(pid), "evet", 2 if ek.tur == "sil" else 1, ""))

    # ------------------------------------------------------------ yönetmelik ve uzmanlık

    def yonetmelik(self, gun: float, kim: str, kural: str, deger: str, neden: str, oy: Oy, katilim: float) -> None:
        def is_() -> None:
            pid = self.komut(c.ProposeRegulationChange(self.ids[kim], kural, deger, neden), f"yönetmelik {kural}")
            if pid is not HATA:
                self.sayac["teklif"] += 1
                self.oylat(str(pid), oy, katilim, {"asiri_sol": 3, "sol": 2, "merkez": 2, "sag": 2, "asiri_sag": 3})
        self.planla(self.zaman(gun), is_)

    def uzmanlik(self, gun: float, kim: str, kavram: str, duzey: int, neden: str, oy: Oy, katilim: float) -> None:
        def is_() -> None:
            pid = self.komut(c.ProposeExpertise(self.ids[kim], kavram, duzey, neden), f"uzmanlık {kim}")
            if pid is not HATA:
                self.sayac["teklif"] += 1
                self.oylat(str(pid), oy, katilim, haric=frozenset({self.ids[kim]}))
        self.planla(self.zaman(gun), is_)

    def kapanislar(self, gun_sayisi: float) -> None:
        for saat in range(2, int(gun_sayisi * 24), 2):
            self.planla(self.zaman(saat / 24), self._kapat)

    def _kapat(self) -> None:
        self.komut(c.CloseDueProposals(None))


def build_demo(data_dir: Path, gun_sayisi: int = GUN_SAYISI, uye_sayisi: int = UYE_SAYISI,
               ilerleme: Callable[[str], None] = print) -> None:
    """Demo veritabanını ve üç defter düğümünü ``data_dir`` altında yeni bir klasöre kurar ve onu etkinleştirir.

    Eski kurulum silinmeye çalışılmaz; kilitli olsa bile yeni kurulum engellenmez (bkz. ``veri_klasoru``).
    """
    baslangic = time.time()
    kok, data_dir = data_dir, veri_klasoru.yeni(data_dir)
    os.environ.setdefault("OLLAMA_URL", "http://127.0.0.1:9")  # demo, yerel modele bağlanmaya çalışıp beklemesin

    engine = sqlite_engine("sqlite:///:memory:")
    nodes = [InMemoryLedgerNode(n) for n in ("A", "B", "C")]
    simdi = datetime.now().replace(second=0, microsecond=0)
    start = simdi - timedelta(days=gun_sayisi)
    clock = ManualClock(start)
    app = bootstrap(engine=engine, clock=clock, replicas=nodes, hasher=DemoHasher())
    ensure_reference_data(app.uow_factory, clock.now())

    sim = Simulasyon(app, clock, start, random.Random(1923))
    gerekli: dict[str, float] = {}  # konuşan üye, ilk konuştuğu günden önce katılmış olmalı
    for k in KONULAR:
        for nick in [k.yazar, *(m[0] for m in k.mesajlar), *(e.kim for e in k.ekler)]:
            gerekli[nick] = min(gerekli.get(nick, 99.0), k.gun - 0.3)
    for kayit in [*YONETMELIK, *UZMANLIK]:
        gerekli[kayit[1]] = min(gerekli.get(kayit[1], 99.0), kayit[0] - 0.3)
    for i, uye in enumerate(KONUSANLAR):
        gun = uye.gun if uye.gun else 0.01 + i * 0.008
        sim.kaydet(Uye(**{**uye.__dict__, "gun": max(0.01, min(gun, gerekli.get(uye.nick, gun)))}), konusan=True)
    for uye in sessiz_cogunluk(uye_sayisi - len(KONUSANLAR), gun_sayisi - 0.5):
        sim.kaydet(uye, konusan=False)
    sim.ajanlari_kaydet()
    sim.kapanislar(gun_sayisi)
    for konu in KONULAR:
        sim.konu(konu)
    for gun, kim, kural, deger, neden, oy, katilim in YONETMELIK:
        sim.yonetmelik(gun, kim, kural, deger, neden, oy, katilim)
    for gun, kim, kavram, duzey, neden, oy, katilim in UZMANLIK:
        sim.uzmanlik(gun, kim, kavram, duzey, neden, oy, katilim)

    ilerleme(f"Demo topluluğu kuruluyor: {uye_sayisi} üye, {len(KONULAR)} konu, {gun_sayisi} günlük geçmiş (bir kez yapılır)...")
    sim.calistir(simdi, ilerleme)

    # bellek içi veritabanını dosyaya yedekle, defter düğümlerini yaz
    hedef = sqlite3.connect(data_dir / "kurultay.db")
    raw = engine.raw_connection()
    try:
        raw.driver_connection.backup(hedef)  # type: ignore[union-attr]
        hedef.execute("PRAGMA journal_mode=WAL")
    finally:
        hedef.close()
        raw.close()
    for node in nodes:
        JsonLinesLedgerNode(node.name, data_dir / "defter-dugumleri" / f"dugum-{node.name}.jsonl").write_all(node.entries())
    veri_klasoru.etkinlestir(kok, data_dir)
    for hata in sim.hatalar:
        if os.environ.get("KURULTAY_DEMO_AYRINTI"):
            ilerleme(f"  ! {hata}")
    ilerleme(f"Demo hazır: {sim.sayac['uye']} üye, {len(YZ_AJANLARI)} YZ ajanı, {sim.sayac['oy']} oy, "
             f"{sim.sayac['mesaj']} mesaj ({time.time() - baslangic:.0f} sn).")


def main() -> None:
    from kurultay.entrypoints.web.app import PROJECT_ROOT

    data_dir = Path(os.environ.get("KURULTAY_VERI", PROJECT_ROOT / "veri"))
    build_demo(data_dir)


if __name__ == "__main__":
    main()
