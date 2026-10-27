# Kurultay — YZM327, 1. ödev

[← Dersin bütün ödevleri](../README.md) · 📄 [Teknik rapor](RAPOR.md) · 📐 [UML diyagramları](docs/diyagramlar/README.md)

Herkesin konu açabildiği, her kararın oylandığı bir tartışma platformu. Fikir serbest, tek yasak tehdit.
Dersin mimari şartlarına göre **Cosmic Python** ile yazıldı: dört katman, Repository + Unit of Work + Message Bus,
istenen bütün GoF desenleri, ontolojiyle sınırlanan oylama, YZ uzman ajanları ve hash zincirli dağıtık defter.

- **149 pytest testi** (birim testler Fake bileşenlerle, entegrasyon testleri gerçek SQLite ile, uçtan uca testler web arayüzüyle)
- **Domain katmanı `mypy --strict` temiz**; dış kütüphane bağımlılığı yok (mimari testlerle korunur)
- **14 UML diyagramı** (8 sınıf, 1 durum, 5 sıralama) Mermaid kaynaklarıyla
- **Tanıtım** (`/tanitim`): her şart, karşılığı ve kodda yeri; **Meclis** (`/canli`): oylar düştükçe dolan yarım daire meclis
- **Demo topluluğu**: 40 günlük geçmiş, 3.000 üye, ~8.000 oy, 25 tartışmalı konu; sağdan soldan herkes yazıyor. Hepsi gerçek komutlarla üretilir.
- **Ücretsiz**: dış API yok. YZ ajanları kural tabanlı modelle çalışır; bilgisayarda [Ollama](https://ollama.com) varsa yerel modeli kullanır.

> 16 Ekim'de sunulan ilk sürüm (Next.js) `../arşiv/odev1-kurultay-yedek-2026-10-26.zip` içinde ve git geçmişinde duruyor.

## Açmak

Masaüstündeki **Kurultay** simgesine çift tıkla (ya da bu klasördeki **`Kurultay.cmd`**'ye).

- Kurultay hazır olunca varsayılan tarayıcında (Brave, Chrome…) kendi penceresinde açılır; arkadaki konsol penceresi açık kaldıkça çalışır, kapatınca Kurultay da kapanır.
- **İlk açılışta** taşınabilir Python'u (python.org, ~11 MB) ve paketleri bu klasördeki `araclar/python` içine kurar,
  demo verisini gerçek komutlarla oluşturur ve masaüstü simgesini bu klasöre bağlar. Bilgisayardaki başka hiçbir şeye
  dokunmaz; internet yalnızca ilk açılışta gerekir.
- İlk açılışta demo topluluğu kurulur (bilgisayara göre yarım dakika ile bir dakika). Demo hesaplarının şifresi `demo1234`; giriş sayfasından tek tıkla girilir.
- Demoyu sıfırlamak: `Kurultay (demo verisini yenile).cmd` · Testler: `Testleri calistir.cmd` (pytest + mypy)
- Sayfanın altındaki **⏩ Saati 1 gün ileri al** düğmesi, oylama sürelerinin dolmasını beklemeden sonucu gösterir.

### Hocaya tanıtım için

1. Üst menüden **▶ Tanıtım**: 14 slayt. Her slaytta hocanın şartı, Kurultay'daki karşılığı, dosya yolları ve diyagram.
2. Son slayttan (ya da **Meclis** menüsünden) bir senaryo başlat:
   - **Yeni konu açılsın mı?** Basit çoğunluk; kabul edilince konu *Oylamada → Tartışmaya açık* olur (State).
   - **Sert bir mesaj gizlensin mi?** Karesel oylama: kişi sayısında çoğunluk "evet" der ama azınlığın 3'er oyu kazanır.
   - **Kural değişikliği** Bütün üyeler oylar (binlerce kişi; her koltuk birkaç üyeyi temsil eder), 2/3 ile kabul, kuralların yeni sürümü oluşur.
3. Sağdaki panel her oyun mimari yolunu ve Message Bus günlüğünü canlı gösterir. Ardından **Defter** sayfasında
   "Bir düğümü kurcala" ile hash zincirinin kurcalamayı yakaladığını göster.

Komut satırından (Python 3.11+):

```bash
pip install -r requirements-test.txt
set PYTHONPATH=src            # Linux/macOS: export PYTHONPATH=src
python -m kurultay            # sunucu + tarayıcı (http://127.0.0.1:8000)
python -m pytest              # 149 test
python -m mypy                # domain katmanı, strict (python -m mypy src: bütün kaynak)
python -m kurultay.evaluation # tehdit kuralı ve kavram önerisi: temel çizgi merdiveni
```

## Klasör yapısı

```
Kurultay.cmd            Çift tıkla aç (masaüstü simgesi bunu çalıştırır)
araclar/                Başlatıcı (baslat.ps1) ve otağ simgesi; taşınabilir Python buraya kurulur
src/kurultay/
  domain/               1 · Alan modeli — saf Python, ORM/çerçeve bilmez
    value_objects.py      Nickname, PersonalInfo, ContentHash, Expertise, Mask, TopicRevision (frozen dataclass)
    user.py               User + PublicProfile / PrivateProfile (PII yalnızca sahibine)
    ontology.py           Kavram ağı: ağaç + "ilişkili" kenarlar, seçmen kısıtı
    topic.py              Composite: TopicComponent ← Topic (bileşik) / Message (yaprak)
    topic_states.py       State: Önerildi → Oylamada → Aktif → Silinme Oylamasında → Arşivlendi / Gizlendi
    proposal.py           Proposal aggregate (her şey bir teklif)
    voting.py             Strategy: basit, karesel, uzman ağırlıklı, itibar tabanlı + sayım/karar
    eligibility.py        Chain of Responsibility: oy hakkı zinciri
    content_policy.py     Chain of Responsibility: içerik denetimi (tek engel: tehdit)
    regulation.py         Yönetmelik (oylamayla değişir, sürümlüdür)
    ledger.py             Hash zinciri, doğrulama, düğümler arası uzlaşma
    commands.py, events.py
  service_layer/        2 · Orkestrasyon
    messagebus.py         Message Bus
    unit_of_work.py       AbstractUnitOfWork (context manager) + SqlAlchemyUnitOfWork
    handlers.py           Komut ve olay işleyicileri
    proxies.py            Protection Proxy: AuthorizationProxy, ProfileAccessProxy
    notifications.py      Observer: VotingNotificationCenter + gözlemciler
    agents.py             YZ uzman ajanı + ExpertModelRegistry (Factory/Registry)
    ports.py              Clock, PasswordHasher, ExpertModel, LedgerReplica
    views.py              Okuma tarafı (CQRS)
  adapters/             3 · Altyapı
    orm.py                SQLAlchemy Core şeması + append-only tetikleyiciler
    repository.py         Abstract*Repository + SqlAlchemy*Repository (silme metodu yok)
    llm/                  Adapter: rule_based.py, ollama.py (+ FallbackExpertModel)
    ledger_nodes.py       Defter düğümleri (JSON Lines kopyaları)
  entrypoints/          4 · Arayüz
    web/app.py            FastAPI + Jinja2 (templates/, static/)
    live_demo.py          Canlı meclis senaryoları (yalnızca komut gönderir)
    demo.py               Demo geçmişi: 40 günlük simülasyon (gerçek komutlarla)
    demo_uyeler.py        Tartışan 45 üye ve binlerce sessiz üye
    demo_konular.py       Konular, mesajlar ve teklifler
  bootstrap.py          Kompozisyon kökü (bağımlılık enjeksiyonu)
tests/                  unit/ (Fake bileşenler) · integration/ (SQLite) · e2e/ (web + canlı meclis) · fakes.py
docs/diyagramlar/       Mermaid kaynakları (.mmd), çizimler (.svg), README.md
veri/                   Çalışma verisi (ilk açılışta oluşur)
```

## Teknolojiler

Python 3.12 (taşınabilir) · FastAPI · Jinja2 · SQLAlchemy 2 (Core) · SQLite · pytest · mypy · Mermaid
