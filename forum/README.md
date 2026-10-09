# Kurultay — Bağımsız kamuoyu platformu

**Kamuoyunun sansürsüz sesi.** Kurultay, bağımsız bir medya kuruluşu gibi çalışan ama editörü topluluğun kendisi olan bir tartışma platformudur. Gündemi vatandaşlar belirler, tartışmayı vatandaşlar yürütür, sonucu vatandaşlar oylar. Uzlaşılan fikirler bakanlıkların ve meclis komisyonlarının masasına gider; kurumların verdiği yanıtlar da herkesin gözü önünde, silinmeden kayda geçer.

Karar düzeni **ABD yasama sistemi** örnek alınarak kuruldu. Web sitesi olarak çalışır, telefona uygulama gibi kurulabilir (PWA). Tamamen ücretsizdir: dış API, ücretli servis ya da veritabanı sunucusu yok. Demodaki ülke kurgusaldır; gerçek kişi, parti ya da kurum adı kullanılmaz.

---

## Çalıştırma

Gereken tek şey [Node.js](https://nodejs.org) (LTS). En kolayı: proje klasöründeki **`Kurultay.cmd`**'ye (ya da ilk açılıştan sonra masaüstündeki **Kurultay** simgesine) çift tıklamak. Başlatıcı (`scripts/baslat.mjs`) gerekirse paketleri kurar ve uygulamayı derler, veritabanı boşsa demo verisini kurar, sunucuyu açar, telefon için ücretsiz Cloudflare tüneli kurar ve Kurultay'ı tarayıcı çubuğu olmayan kendi penceresinde açar. Seçenekler: `--demo` (demo verisini baştan kur), `--derle`, `--tunelsiz`, `--pencere-yok`.

Geliştirme için:

```bash
npm install        # ilk seferde
npm run demo       # 6 haftalık örnek platform verisi: 50 konu (kendi hesabın korunur; sunucu açıkken de çalışır)
npm run dev        # http://localhost:3000
npm test           # birim testleri (geçici bir veritabanında çalışır)
npm run olcum      # tehdit denetimi ve bölüm önerisinin temel çizgilerle ölçümü
```

Komutlar hem `forum/` klasöründe hem de bir üstteki proje klasöründe çalışır (üst klasördeki `package.json` komutları `forum/`'a yönlendirir).

**Kendi hesabın:** `/kayit` sayfasından kendi hesabını aç. `npm run demo` yeniden çalıştırılsa bile demo listesinde olmayan hesaplar (seninki) oturumları ve takip ettiği bölümlerle birlikte korunur; yalnızca yazdığın içerikler sıfırlanır.

**Demo hesapları:** Giriş ekranındaki "Demo hesapları" panelinden tek tıkla girilir; menüdeki "Hesap değiştir" ile hesaplar arasında geçilir. Hepsinin şifresi `demo1234`:

| Hesap | Rolü |
|---|---|
| `zeynep_k` | Genel Yayın Yönetmeni (ilke önerilerini onaylar / veto eder) |
| `elif_demir` | Öğretmen, Yayın Kurulu üyesi (Eğitim) |
| `egitim_bakanligi` | **Kurum hesabı** (resmî açıklama ve resmî tepki verir, oy kullanamaz) |
| `dijital_komisyon` | Kurum hesabı (Meclis Dijital Haklar Komisyonu) |
| `prof_leyla`, `dr_murat`, `doc_nese` | Uzmanlar (anayasa hukukçusu, ekonomist, iklim bilimci) |
| `burak_sahin`, `emre_celik` | Sık sık azınlıkta kalan vatandaşlar (azınlık görüşü yazmış) |
| `oguz_karaca`, `fatma_yalcin` | Sağ görüş: milliyetçi-muhafazakâr emekli astsubay ve dindar-muhafazakâr anne (göç, idam, din dersi, aile maaşı önerileri; Yayın Kurulu üyeleri) |
| `serdar_gunay` | Serbest piyasa yanlısı girişimci (tek oranlı vergi, nükleer, profesyonel ordu) |
| `levent_aksoy`, `nur_ozcan` | Merkez: iki taraf arasında ortak zemin arayan üyeler (Yayın Kurulu üyeleri) |
| `yz_bilirkisi` | YZ Analist (giriş yapılamaz) |

> Demodaki süren oylamalar kurulumdan sonra birkaç gün açık kalır; göstermeden kısa süre önce `Kurultay (demo verisini yenile).cmd` ile demoyu tazeleyin.

**Tanıtım turu:** Site ilk açıldığında 9 adımlık bir tur başlar. Tur sayfa sayfa gezerek ödevin köşetaşı isteklerini ve dersin yöntemine (CRISP-ML(Q) döngüsü, tasarım desenleri) uyumu ("Hocanın isteği") ve platformda nasıl karşılandığını ("Nasıl karşıladık") ilgili yeri vurgulayarak gösterir; son adımda tüm isteklerin listesi ve canlı gösterim vardır. Üst çubuktaki pusula düğmesiyle, telefonda menüden ya da "Nasıl işliyor?" sayfasından yeniden başlatılabilir. Aynı sayfada tüm isteklerin tablosu da vardır (`/hakkinda#istekler`).

"Nasıl işliyor?" sayfasında isteklerin altında **"Son eklediklerimiz"** bölümü vardır (Kurultay tasarımı, ders içeriğine uyum, canlı gösterim, tanıtım turu, meclis yarım dairesi, önerinin yolculuğu, düzenleme kuralı, profil gizliliği, kalabalık görünümü, telefondan erişim); canlı gösterim oradan da başlatılabilir.

**Canlı gösterim:** Turun son adımındaki "Canlı gösterimi başlat" düğmesi, süren bir uzlaşma oylamasını gözün önünde sonuçlandırır (oyları demo hesapları kullanır). Ardından ilgili bakanlık resmî tepkisini ("Gündeme alındı, uygulayacağız") bildirir. Değişiklikler gerçekten kaydedilir. Gösterim her açılışta kendi oylamasını hazırlar (`src/lib/gosterim.ts`): süren uygun bir oylama yoksa sıradaki hazır senaryonun konusunda bir uzlaşma önerisi açar ve ilgili kurumu bölüme göre seçer; böylece demo yenilenmeden art arda yapılabilir.

**Görünen kalabalık:** Demo verisinde ~20 üye var. Arayüz, Topluluk Oylaması sayılarını, üye, takipçi ve okunma sayılarını her kayda özgü sabit bir çarpanla binlere çevirerek gösterir (`src/lib/kalabalik.ts`). Oranlar ve kabul eşiği korunur; oylama kuralları her zaman gerçek oylarla çalışır. Yayın Kurulu küçük bir heyet olduğu için gerçek sayısıyla gösterilir.

---

## İstekler ve karşılıkları

| İstek | Nasıl karşılandı |
|---|---|
| Giriş ekranı; ad soyad, adres, doğum tarihi, takma ad, şifre | `/kayit`, `/giris`. Şifreler bcrypt ile saklanır. Adres ve doğum tarihi yalnızca sahibine görünür. |
| Herkes konu açabilir; konu oylamayla kabul edilir | Gündem önerisi → **Topluluk Oylaması** (bölümü takip edenler, salt çoğunluk) → kabul edilirse tartışmaya açılır. |
| Konuyla ilgilenenler oylar | Oy hakkı, konunun bölümünü (ya da üst bölümünü) takip edenlere aittir. |
| Alt konular önerilebilir | Tartışmaya açık her konuya herkes alt başlık önerebilir; alt başlıklar da oylanır. |
| Kurallar ve uygunluk ölçümü (ontoloji) | 11 ana, 8 alt bölümlük ontoloji + **Uygunluk raporu** (önerinin bölüme uyumu 0–100, daha uygun bölüm önerisi). Engellemez, bilgi verir. |
| Yönetmelik, herkesin rolü | **Yayın İlkeleri** oylamayla değişir. Roller: Vatandaş, Uzman, YZ Analist, Kurum hesabı, Yayın Kurulu üyesi, Genel Yayın Yönetmeni. |
| Silme / düzenleme teklif edilebilir | Mesaj gizleme ve konu kaldırmayı herkes, konu düzenlemeyi **konuyu açan** önerir; hepsi **Topluluk Oylaması + Yayın Kurulu**’ndan geçmelidir. |
| Tartışmalar silinmez | Mesajlar düzenlenemez / silinemez; kabul edilen gizleme önerisinde bile kaydı ve özeti arşivde kalır. |
| Konu sonunda uzlaşma, farklı fikirler oylanır | Uzlaşma önerileri yarışır; çoğunluğu ilk alan kazanır. Katılmayanlar **azınlık görüşü** yazar. |
| Çoğunluk azınlığı ezmesin | Yayın Kurulu’nda her bölüm eşit temsil edilir ve kabul için 3/5 gerekir; azınlık görüşleri kalıcıdır; tehdit dışında sansür yoktur. |
| Bazıları daha eşit; oy hakkı havale edilebilir | İsteğe bağlı **oy emaneti** (bölüm bazında, zincirleme toplanır, kişi başı en fazla 5 oy). Uzmanlar ve seçilmiş görevliler rozetle görünür. |
| Bilgili kullanıcılar API ile bağlı YZ olabilir | **YZ Analist**: tartışmayı özetler, ortak kavramları ve uzlaşma taslağını çıkarır. Kural tabanlı (ücretsiz); isteğe bağlı yerel dil modeli (Ollama API). Oy kullanmaz. |
| Her şey oylamayla | Konu, alt konu, gizleme, düzenleme, uzlaşma, ilke değişikliği; görevliler de destek usulüyle seçilir. |
| Dağıtık defter | **Açık Arşiv** (`/topluluk/defter`): her olay SHA-256 hash zincirine yazılır, zincir her açılışta doğrulanır, herkes indirip doğrulayabilir. |
| İnsanları grafta tut | **Topluluk › Graf**: etkileşim, oy emaneti ve seçim desteği ağları. |
| Uygulama + web sitesi | PWA: aynı kod hem web sitesi hem telefona kurulabilen uygulama. |
| Geniş kitleye hitap | Ülke gündemi (hukuk, ekonomi, eğitim, sağlık, çevre, dijital haklar, şehirler), kurum hesapları ve **Etki raporu** (`/etki`): fikirlerin karar vericilere ulaşıp ulaşmadığı. |

---

## ABD yasama sistemi ↔ Kurultay

| ABD | Kurultay |
|---|---|
| Temsilciler Meclisi | **Topluluk Oylaması** |
| Senato (eyalet başına 2) | **Yayın Kurulu** (bölüm başına 2 kurul üyesi) |
| Başkan (imza / veto) | **Genel Yayın Yönetmeni** (onay / veto; süre dolarsa kendiliğinden kabul) |
| Vetonun 2/3 ile aşılması | Vetoyu aşma oylaması (2/3) |
| Filibuster / 60 oy kuralı | Yayın Kurulu’nda 3/5 şartı |
| Basit karar · ortak karar · yasa | Gündem önerisi · gizleme/düzenleme · ilke önerisi |
| 1. Değişiklik (tek istisna: gerçek tehdit) | Tehdit dışında sansür yok |
| Özgür basının denetim işlevi | Kurum hesapları ve Etki takibi |

---

## Kurum hesapları ve etki takibi

- Bakanlıklar ve meclis komisyonları doğrulanmış **kurum hesaplarıyla** katılır: tartışmalara resmî açıklama yazar, kamuoyuna danışmak için gündem önerebilir.
- Kurum hesapları **oy kullanamaz, aday olamaz, oy emaneti alamaz, hiçbir içeriğin gizlenmesini / kaldırılmasını / düzenlenmesini öneremez.**
- Uzlaşmayla kapanan her konuya kurumlar **resmî tepki** bildirir: *İnceleniyor · Gündeme alındı · Uygulandı · Gerekçeli ret*. Tepkiler silinmez; tutum değişirse geçmişiyle görünür ve arşive yazılır.

---

## Telefona kurma (PWA)

Telefonun uygulamayı kurabilmesi için site **HTTPS** üzerinden açılmalıdır. Başlatıcı bunu ücretsiz, hesapsız Cloudflare tüneliyle kendiliğinden yapar: tünel aracı (`cloudflared`, ~60 MB) ilk açılışta `forum/.araclar/` klasörüne arka planda iner (yarım kalırsa sonraki açılışta kaldığı yerden sürer), ardından `https://….trycloudflare.com` adresi açılır. Uygulamadaki **Telefonda aç** sayfası (`/telefon`) bu adresin ve aynı Wi-Fi için yerel adresin karekodunu gösterir. Karekodu okut → *Ana ekrana ekle*.

Tünel açıkken adres herkese açıktır (rastgele ve geçici); Kurultay'ın konsol penceresi kapanınca tünel de kapanır. İlk açılışta Windows Güvenlik Duvarı izin isterse, telefonun aynı Wi-Fi'dan bağlanabilmesi için *Özel ağlar*'a izin verin.

---

## İsteğe bağlı: yerel dil modeli (ücretsiz)

YZ Analist varsayılan olarak kural tabanlıdır. [Ollama](https://ollama.com) kuruluysa `ollama pull llama3.2` çalıştırıp `forum/.env.local` dosyasına `OLLAMA_MODEL=llama3.2` yazın. Model yanıt vermezse kural tabanlı özete dönülür.

---

## Teknik yapı

- **Next.js 16** (App Router, Server Actions) + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** + **Lucide** ikonları · açık/karanlık tema · yerel Geist ve Source Serif 4 yazı tipleri (internet gerekmez)
- **SQLite** (Node’un yerleşik `node:sqlite` modülü) — `veri/forum.db` tek dosya

```
src/lib/
  kurallar.ts    Yayın ilkeleri ve eşikler (oylamayla değişebilir)
  oylama.ts      Karar süreci motoru: aşamalar, eşikler, veto, oy emaneti
  secim.ts       Yayın Kurulu ve Genel Yayın Yönetmeni seçimi (destek usulü)
  konular.ts     Gündem önerme ve sorgular
  tartisma.ts    Mesajlar, gizleme/düzenleme/uzlaşma önerileri, azınlık görüşü
  etki.ts        Kurum tepkileri ve etki istatistikleri
  uygunluk.ts    Ontoloji uygunluk raporu
  tehdit.ts      Tek içerik kısıtı: tehdit tespiti
  defter.ts      Açık Arşiv (dağıtık defter, hash zinciri)
  yz.ts          YZ Analist (özetleme, uzlaşma taslağı)
  graf.ts        Üye grafı ve kuvvet yönlü yerleşim
  akis.ts        Arayüz için hazır veri
src/app/          Sayfalar: / (gündem), /konu, /kararlar, /karar, /etki, /topluluk, /hakkinda, /ara, /profil
src/components/   ortak/ kabuk/ konu/ karar/ topluluk/ profil/ ve ui/ (shadcn)
scripts/demo.ts          Demo verisi (saati geri alıp 6 haftalık platformu canlandırır)
scripts/demoEkKonular.ts Ek 37 gündem başlığı (birkaçı mizahi)
```
