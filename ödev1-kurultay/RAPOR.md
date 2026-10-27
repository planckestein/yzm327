# Kurultay — Teknik Rapor

YZM327 · Yazılım Mühendisliği için Yapay Zekâ · 2026–2027 Güz · 1. ödev

Hazırlayan: Seyyid A. Bozkurt · 24290381

> Diyagramlı, ölçümlü ve ekran görüntülü ayrıntılı sürüm: **`Kurultay_Teknik_Rapor.pdf`** (36 sayfa). Bu dosya onun kısa özetidir.

## 1. Özet

16 Ekim'de sunduğum ilk Kurultay sürümü, dersin mimari kurallarına göre **Python'da yeniden kuruldu**.
İlk sürüm (Next.js + TypeScript) iş kurallarını doğru uyguluyordu ama mimarisi bu kurallara uymuyordu: her iş
modülü veritabanını doğrudan çağırıp kendi SQL'ini yazıyordu; alan modeli, Repository, Unit of Work ve olay yoktu.
Bu sürümde algoritmalar (eşikler, aşama geçişleri, tehdit kuralı, Türkçe metin hattı, hash zinciri) korundu,
**yapı tamamen değişti**.

| | İlk sürüm (16 Ekim) | Mimari sürüm |
|---|---|---|
| Dil / çerçeve | TypeScript, Next.js | Python 3.11+, FastAPI, SQLAlchemy Core |
| Katmanlar | `src/lib` (iş + SQL karışık) | Domain · Service Layer · Adapters · Entrypoints |
| Veri erişimi | Modüllerde doğrudan SQL | Repository (soyut + SQLite + Fake), Unit of Work |
| Durum değişikliği | Fonksiyon çağrıları | Command → Message Bus → işleyici → Domain Event |
| Konu yaşam döngüsü | `durum` metin sütunu | State deseni; **Silinme Oylamasında** durumu eklendi |
| Oylama | Kişi başı 1 oy + eşikler | Strategy: basit, **karesel**, **uzman ağırlıklı**, **itibar tabanlı** |
| Seçmen kısıtı | Tek SQL sorgusu | 7 halkalı Chain of Responsibility, nedeni kullanıcıya gösterilir |
| Ontoloji | Kategori ağacı | Kavram ağı (ağaç + ilişkili kenarlar), uzmanlık oylamayla tanınır |
| YZ | Yalnızca özetleyici, oy kullanamaz | **Bilgili kullanıcı**: bildirim alır, gerekçeli oy verir (Adapter + Factory/Registry) |
| PII | Ad-soyad herkese görünüyordu | Yalnızca takma ad; PII Protection Proxy ile yalnızca sahibine |
| Düzenleme teklifi | Yalnızca konuyu açan | Herkes |
| Değişmezlik | Konular üzerine yazılıyordu | Append-only: sürümler, maskeler; DB tetikleyicileri UPDATE/DELETE'i engeller |
| Dağıtık defter | Tek zincir | Zincir + 3 düğüm kopyası + çoğunluk uzlaşması, kurcalama tespiti |
| Testler | 15 test, gerçek veritabanı | **149 pytest testi**, Fake bileşenlerle |
| Açılış | Masaüstü simgesi (Node.js gerekir) | Aynı masaüstü simgesi; taşınabilir Python'u kendisi kurar |
| Tanıtım | Tanıtım turu | Şart şart tanıtım (`/tanitim`) + canlı meclis oylaması (`/canli`) |
| Demo verisi | Elle yazılmış birkaç kayıt | 40 günlük geçmiş, **3.000 üye**, ~8.000 oy; hepsi gerçek komutlarla üretilir |
| UML | React bileşenleri | **14 Mermaid diyagramı** (sınıf, durum, sıralama) |

## 2. Mimari

Dört katman, bağımlılıklar yalnızca içe doğru (bkz. `docs/diyagramlar/01-katmanlar`):

1. **Domain** — aggregate'ler (`User`, `Topic` ağacı, `Proposal`), değer nesneleri (`@dataclass(frozen=True)`),
   desenler ve iş kuralları. Yalnızca Python standart kütüphanesini kullanır. `mypy --strict` temizdir.
   `tests/unit/test_architecture.py` bu kuralı her test koşusunda denetler (domain'de SQLAlchemy, FastAPI, HTTP
   kütüphanesi ya da başka bir katmanın import'u varsa test kırılır).
2. **Service Layer** — Message Bus, komut/olay işleyicileri, Unit of Work, Observer, Protection Proxy, YZ ajanları,
   portlar (`Clock`, `PasswordHasher`, `ExpertModel`, `LedgerReplica`) ve okuma görünümleri (CQRS).
3. **Adapters** — SQLite şeması ve repository'ler, YZ model adaptörleri, defter düğümleri, PBKDF2, saat.
4. **Entrypoints** — FastAPI + Jinja2. İstek → komut → `AuthorizationProxy` → Message Bus. İş kuralı yoktur.

`bootstrap.py` kompozisyon köküdür: işleyiciler bağımlılıklarını parametre adlarıyla ister, `inject` onları doldurur.
Testler aynı fonksiyona sahte bağımlılıklar verir.

**Kalıcılıktan bağımsızlık.** Eşleme, SQLAlchemy Core tabloları ile repository içindeki açık veri eşleyicileri
(Data Mapper) arasında yapılır. Kitaptaki *imperative mapping* yerine bunu seçmemin nedeni: değer nesneleri
`frozen` kalabiliyor ve append-only kurallar (mesaj, oy, maske, sürüm yalnızca INSERT) repository'de açıkça
yazılabiliyor. Alan modeli iki durumda da ORM'i hiç tanımaz.

### Komutlar ve olaylar

Komutlar (13): `RegisterUser`, `SetInterest`, `ProposeTopic`, `PostMessage`, `ProposeTopicEdit`,
`ProposeTopicDeletion`, `ProposeMessageHiding`, `ProposeConsensus`, `ProposeRegulationChange`, `ProposeExpertise`,
`CastVote`, `CloseDueProposals`, `MarkNotificationsRead`.

Olaylar (15): `UserRegistered`, `InterestsChanged`, `ExpertiseGranted`, `ReputationChanged`, `TopicProposed`,
`TopicStateChanged`, `TopicRevised`, `MessagePosted`, `ContentMasked`, `ProposalOpened`, `VotingStarted`, `VoteCast`,
`ProposalAccepted`, `ProposalRejected`, `RegulationChanged`.

Her olay `record_in_ledger` işleyicisiyle hash zincirine yazılır. Olay işleyicileri yeni komut döndürebilir
(ör. YZ ajanının oyu); bunlar kuyruğa eklenir, iç içe çağrı olmaz. Bir olay işleyicisinin hatası diğerlerini
durdurmaz (testle korunur).

## 3. Tasarım desenleri

| Desen | Yer | Neden |
|---|---|---|
| Repository | `adapters/repository.py`, `tests/fakes.py` | Her aggregate için soyut sözleşme; SQLite ve bellek içi (Fake) uygulama. Silme metodu yok (testle korunur). |
| Unit of Work | `service_layer/unit_of_work.py` | `with uow:` bloğu atomiktir; commit edilmeyen her şey geri alınır. Olayları aggregate'lerden toplar. |
| Command / Event / Message Bus | `domain/commands.py`, `domain/events.py`, `service_layer/messagebus.py` | Bütün durum değişiklikleri tek kapıdan geçer ve kayıt altına alınır. |
| Composite | `domain/topic.py` | `TopicComponent` ← `Topic` (bileşik) / `Message` (yaprak). Mesaj sayımı, gizleme, kavram toplama, gezinti tek arayüzle bütün ağaçta çalışır. Bir konu gizlenince alt ağacı da görünmez olur. |
| State | `domain/topic_states.py` | Yedi durum sınıfı; her biri yalnızca kendisinden mümkün geçişleri bilir. Geçersiz geçiş `InvalidTransition` fırlatır. Her geçiş bir olaydır. |
| Strategy (Protocol) | `domain/voting.py` | Dört oylama algoritması aynı `VotingStrategy` Protocol'ünü uygular; sayım ve karar stratejiden bağımsızdır. |
| Registry / Factory | `voting.STRATEGIES`, `agents.ExpertModelRegistry`, `ExpertAgentFactory`, `Proposal.open` | Yeni strateji ya da model eklemek mevcut kodu değiştirmez (Açık/Kapalı). |
| Chain of Responsibility | `domain/eligibility.py`, `domain/content_policy.py` | Oy hakkı: Kimlik → Oylama açık → Rol → Yönetmelik → Ontolojik ilgi → Tek oy → Pusula kuralı. Hangi halkada takıldığı arayüzde gösterilir. |
| Protection Proxy | `service_layer/proxies.py` | `AuthorizationProxy` komutları role göre süzer (YZ ajanı teklif açamaz). `ProfileAccessProxy` kişisel verileri yalnızca hesap sahibine geçirir. |
| Observer | `service_layer/notifications.py` | Oylama başlayınca `VotingNotificationCenter` gözlemcilerine haber verir: ilgili üyelere bildirim, ilgili YZ ajanlarına inceleme. |
| Adapter | `adapters/llm/` | Ollama'nın HTTP arayüzü ve kural tabanlı model aynı `ExpertModel` arayüzüne uyarlanır. `FallbackExpertModel` yerel model yoksa kurala düşer (Cascade). |
| Memento | `Topic.revisions` | Konu düzenlemeleri yeni sürüm olarak eklenir, eskisi kaybolmaz. |

SOLID karşılıkları: Tek Sorumluluk (yetki proxy'de, kural domain'de, kalıcılık adapter'da), Açık/Kapalı (registry'ler,
zincir halkaları), Liskov (Fake ve SQLite repository'leri aynı testlerden geçer), Arayüz Ayrımı (küçük portlar),
Bağımlılığın Tersine Çevrilmesi (servis katmanı yalnızca portları bilir).

## 4. İş kurallarının karşılıkları

**Kullanıcı profili ve gizlilik.** Ad, soyad, doğum tarihi, adres ve şifre özeti (PBKDF2) `PersonalInfo` ve
`PasswordHash` değer nesnelerinde tutulur; ikisinin de `repr`'i içeriği yazmaz. `PublicProfile` sınıfında kişisel
veri alanı **yoktur**; arayüze yalnızca bu gider. Sahibi kendi profiline baktığında `ProfileAccessProxy`
`PrivateProfile` döndürür. Deftere ve olaylara kişisel veri yazılmaz. Uçtan uca testler başka bir kullanıcının
soyadının profil, üye listesi ve indirilen defterde görünmediğini doğrular.

**Tam oylama yönetişimi.** Konu, alt konu, düzenleme, silme (gizleme), mesaj gizleme, uzlaşma, yönetmelik
değişikliği ve uzmanlık tanınması — sekizi de bir `Proposal`'dır. Hiçbiri doğrudan olmaz; kabul edilince etkisi
`ACCEPT_EFFECTS` kaydındaki işleyiciyle uygulanır.

**Ontoloji ve seçmen kısıtı.** 19 kavramlık ağaç (11 ana + 8 alt) ve 7 "ilişkili" kenar. Bir teklifi yalnızca
kavramının kendisini, bir üst kavramını ya da ilişkili bir kavramını takip eden (ya da orada uzmanlığı olan)
kullanıcılar ve YZ ajanları oylayabilir. Kavramı olmayan teklifler (yönetmelik) herkesi ilgilendirir.
Uzmanlık beyanla verilmez; o kavramın topluluğu uzman ağırlıklı oylamayla tanır, kişi kendi teklifine oy veremez.

**Seçmen kütüğü.** Bir teklifin seçmenleri oylama açıldığı an belirlenir ve teklifle birlikte saklanır
(`Proposal.freeze_electorate`, `electorate_voters` tablosu, append-only). Oylama sürerken üye olan ya da ilgi
alanını sonradan ekleyen kişi o teklifte oy veremez; zincirin "Ontolojik ilgi" halkası bunu nedeniyle birlikte
söyler. Bu hem bir koruma (süren bir oylamaya dışarıdan kalabalık taşınamaz) hem de ölçek için gerekli: her oyda
binlerce üyeyi yeniden süzmek yerine dondurulmuş kütük kullanılır.

**Değişmezlik ve dağıtık defter.** Mesajlar düzenlenemez ve silinemez; oylamayla gizlenen mesaj ya da konunun
yalnızca üzerine bir `Mask` kaydı düşülür. SQLite tetikleyicileri `messages`, `masks`, `ballots`,
`topic_revisions`, `regulations` ve `ledger` tablolarında UPDATE ve DELETE'i; `topics`, `proposals`, `users`
tablolarında DELETE'i reddeder (entegrasyon testleri dokuz ayrı ihlali dener). Her olay
`SHA-256(sıra | zaman | tür | veri | önceki_hash)` zincirine eklenir ve üç düğüme (A, B, C) çoğaltılır.
Defter sayfası bütün kopyaları doğrular, çoğunluğun uç özetini bulur ve ayrılan düğümü "kurcalanmış" işaretler;
demo düğmesiyle bu canlı gösterilebilir.

## 5. Çoğunluk azınlığı ezemez

Teklif türlerine göre varsayılan yönetmelik:

| Teklif | Strateji | Eşik |
|---|---|---|
| Yeni konu, alt konu | Basit çoğunluk | yarıdan fazla |
| Düzenleme, uzmanlık | Uzman ağırlıklı (oy = 1 + uzmanlık düzeyi) | yarıdan fazla |
| Uzlaşma | İtibar tabanlı (1 + log₂(1 + itibar/10), en fazla 3) | yarıdan fazla |
| Konu silme, mesaj gizleme | Karesel (k oy = k² kredi; ilk oy bedava, 8 ek kredi açık oylamalar arasında paylaşılır) | 3/5 |
| Yönetmelik değişikliği | Karesel | 2/3 |

Örnek (testte de var): beş kişilik bir toplulukta üç kişi az önemseyerek "evet", iki kişi konuyu çok önemseyerek
"hayır" diyor. Basit çoğunlukta 3–2 "evet" kazanır. Karesel oylamada azınlık 3'er oy (9'ar kredi) kullanınca sonuç
3–6 "hayır" olur. Demo verisinde de göç ve sokak köpekleri tartışmalarındaki sert mesajları gizleme teklifleri
böyle düşer; gizlenen tek mesaj reklamdır.

Kıtlık kuralı: kredi her teklif için ayrı verilseydi herkes her oylamada 3 oy kullanır, yöntem basit çoğunluğa
dönerdi. Bu yüzden ilk oy bedavadır, 2 ya da 3 oyun ek bedeli (k² − 1 = 3 ya da 8) seçmenin 8 kredilik bütçesinden
düşer ve bu bütçe o an açık bütün karesel oylamalar arasında paylaşılır; oylama kapanınca kredi geri gelir.

Ek korumalar: erken karar yalnızca sonuç kesinleştiğinde verilir (kalan bütün oylar aleyhte olsa bile eşik
aşılıyorsa); süre dolduğunda yeter sayı aranır (başlangıçta %30; demo topluluğu bunu oylamayla %15'e indirdi); itibar ağırlığının tavanı vardır; YZ ajanlarının oyu yarım
sayılır. Bunların hepsi yönetmeliktedir ve oylamayla değişir; süren oylamanın kuralları ise açıldığı andaki
yönetmelikle sabitlenir.

## 6. YZ uzman ajanları

Ajanlar `yz_ajan` rolüyle kayıtlı kullanıcılardır: ilgi alanları ontolojiye bağlıdır. Oylama başladığında Observer
onları uyandırır; ajan `ExpertModelRegistry`'den aldığı modelle teklifi değerlendirir ve **gerekçeli** oy verir.
Gerekçe arayüzde oy tablosunda görünür.

- `kural`: kural tabanlı model; internetsiz, açıklanabilir, ücretsiz. Tehdit varsa reddeder; mesaj gizlemede
  ifade özgürlüğünü korur (sert görüş ve hakaret dahil hiçbir görüşün gizlenmesini desteklemez, yalnızca reklama
  evet der); eşiği salt çoğunluğa indiren ya da
  yeter sayıyı %20'nin altına düşüren yönetmelik değişikliklerine karşı çıkar.
- `ollama:<model>` — yerel dil modeli adaptörü (`POST /api/generate`). Model `KARAR: EVET/HAYIR` ve `GEREKÇE:`
  satırlarıyla yanıt verir. Ollama kurulu değilse `FallbackExpertModel` kural tabanlı modele düşer.

Ücretli hiçbir servis yoktur. Yeni bir model (ör. başka bir yerel model) eklemek `registry.register(...)` ile
tek satırdır.

## 7. Testler

`python -m pytest` → **149 test**, hepsi geçiyor.

| Klasör | Test | Kapsam |
|---|---|---|
| `tests/unit` | 118 | Değer nesneleri, Türkçe metin ve tehdit, PII, ontoloji, Composite, State (bütün geçerli ve geçersiz geçişler), dört strateji ve karar kuralları, Proposal, oy hakkı zincirinin her halkası, defter ve uzlaşma, yönetmelik; servis katmanında bütün komutlar uçtan uca **FakeUnitOfWork + FakeRepository + FakeExpertModel** ile; Message Bus, Observer, Adapter/Registry, Protection Proxy; dondurulmuş seçmen kütüğü; mimari kurallar |
| `tests/integration` | 20 | Gerçek SQLite ile repository gidiş-dönüşleri, Unit of Work geri alma, append-only tetikleyici ihlalleri, seçmen kütüğü ve oyların yeniden yüklenmesi, değişmeyen kaydın yeniden yazılmaması, defter düğümleri |
| `tests/e2e` | 11 | Web arayüzü: kayıt, konu önerisi, oylama, mesaj, PII'nin başkasına görünmemesi, tehdit engeli, defter kurcalama demosu, üye arama ve konu filtresi; canlı meclisin üç senaryosu (kabul, karesel oylamada azınlığın kazanması, yönetmelik sürümü) |

`python -m mypy` domain katmanını `strict` modda denetler.

## 8. UML diyagramları

`docs/diyagramlar/` — her biri Mermaid kaynağı (`.mmd`) ve çizimi (`.svg`) ile; `README.md` hepsini bir arada
gösterir; uygulamanın **Mimari** sayfasında da açılır.

Sınıf: 01 katmanlar ve DIP · 02 alan modeli · 03 Composite + State · 05 Strategy · 06 Chain of Responsibility +
Protection Proxy · 07 Observer + Adapter + Factory/Registry · 08 Repository + UoW + Message Bus · 09 dağıtık defter.
Durum: 04 konu yaşam döngüsü. Sıralama: 10 konu önerisi · 11 oy verme · 12 mesaj gizleme · 13 profil (PII) ·
14 defter kaydı ve doğrulama.

## 9. Bilerek dışarıda bırakılanlar

İlk sürümün bazı özellikleri dersin mimari kurallarıyla çeliştiği ya da odağı dağıttığı için taşınmadı:

- **Yayın Kurulu, Genel Yayın Yönetmeni, veto ve seçimler** — ABD yasama modeli. Bu sürümde azınlık koruması
  oylama stratejileriyle (karesel, uzman, itibar) ve süper çoğunluk eşikleriyle sağlanıyor; ikisi birden
  karmaşıklığı ikiye katlardı.
- **Oy emaneti (devir)** — yeni kurallarda yok; uzman ağırlıklı oylama benzer ihtiyacı karşılıyor.
- **"YZ oy kullanamaz" kuralı** — yeni kural tam tersini istiyor: ilgili YZ ajanları oylamaya katılır
  (ağırlığı yönetmelikle sınırlı).
- **Görünen kalabalık** (oy sayılarını ekranda 180–600 katına büyüten gösterim) — şeffaflık ve defter ilkesiyle
  çelişir.
- Kurum hesapları ve etki takibi, üye grafı, PWA ve telefon tüneli — mimari şartların konusu dışında.

## 10. Tanıtım ve canlı meclis

- **`/tanitim`** — 14 slayt. Her slaytta hocanın şartı, Kurultay'daki karşılığı, kodda yeri ve ilgili UML diyagramı.
  Son slayt canlı oylamayı başlatır.
- **`/canli`** — meclis (yarım daire) görünümü. Her koltuk, yetki zincirinden geçen bir seçmendir; YZ ajanları
  kesikli çerçeveyle gösterilir. Senaryo başlatılınca demo hesapları **gerçek komutlarla** oy verir; koltuklar dolar,
  sağdaki panel her oyun mimari yolunu (Entrypoint → Proxy → Message Bus → Zincir → Domain → UoW → Defter) ve Message
  Bus günlüğünü gösterir. Üç senaryo: yeni konu (basit çoğunluk, State geçişi), mesaj gizleme (karesel oylamada
  azınlığın kazanması), yönetmelik değişikliği (2/3, yeni sürüm). Herhangi bir teklif de meclis görünümünde açılabilir.

## 11. Demo topluluğu ve ölçek

Demo verisi `entrypoints/demo.py` içinde küçük bir ayrık olay simülasyonuyla üretilir: 40 günlük bir zaman
çizelgesinde 3.000 üye gün gün katılır, 25 konu önerilir, üyeler seçmen kütüğündeki eğilimlerine göre oy verir,
tartışmalar sürer, uzlaşma, gizleme, silme, düzenleme, yönetmelik ve uzmanlık teklifleri açılıp kapanır. Hiçbir
satır veritabanına elle yazılmaz; her adım Message Bus'tan geçen bir komuttur (~11.000 defter kaydı).

Konular bilerek tartışmalıdır ve yelpazenin her yerinden ses vardır (göç, servet vergisi, ölüm cezası, din dersi,
bedelli askerlik, kamulaştırma, sokak köpekleri…). Tartışan 45 üyenin mesajları elle yazıldı; geri kalan binlerce
üye yalnızca oy verir. Üyelerin siyasi eğilimi yalnızca demo üretiminde kullanılır, sistemde böyle bir alan yoktur.

Bu ölçek için yapılan değişiklikler: dondurulmuş seçmen kütüğü; kütük ve oylar append-only olduğu için süreç içi
önbellek (oylar için yalnızca yeni satırlar okunur); sayımda "kalan en yüksek ağırlık" kütük başına bir kez
hesaplanır; repository'lerde kimlik haritası ve yalnızca değişen kayıtların güncellenmesi; toplu bildirim;
defter doğrulamasının sonucu defter değişene kadar saklanır. Simülasyon bellek içi SQLite'ta koşar ve sonunda
dosyaya yedeklenir; ilk açılışta bilgisayarda yaklaşık yarım dakika ile bir dakika arası sürer.

## 12. Çalıştırma

Masaüstündeki **Kurultay** simgesine (ya da klasördeki `Kurultay.cmd`'ye) çift tıkla. İlk açılışta taşınabilir
Python'u (python.org, ücretsiz) ve paketleri bu klasöre kurar, demo verisini gerçek komutlarla oluşturur ve Kurultay'ı
varsayılan tarayıcıda kendi penceresinde açar. Ayrıntılar `README.md`'de.

## YZ kullanım beyanı

Bu ödevde kod, test, diyagram ve rapor taslağı için Claude (Anthropic) yardımcı olarak kullanılmıştır. Mimari ve
tasarım kararları bana aittir; üretilen her şey çalıştırılarak, 149 testle ve tip denetimiyle kontrol edilmiştir.
