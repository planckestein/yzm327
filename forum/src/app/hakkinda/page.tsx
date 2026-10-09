import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { kuralDegeriYazi, kurallar } from "@/lib/kurallar";
import { TurDugmesi } from "@/components/tur/TurRehberi";
import { GosterimDugmesi } from "@/components/tur/CanliGosterim";
import { DersUyumu } from "./DersUyumu";
import { DersYontemi } from "./DersYontemi";
import { TasarimDili } from "./TasarimDili";

export const metadata: Metadata = { title: "Nasıl işliyor?" };

function Baslik({ ust, children }: { ust: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t pt-3">
      <span className="ust-etiket">{ust}</span>
      <h2 className="text-2xl font-semibold">{children}</h2>
    </div>
  );
}

export default function HakkindaSayfasi() {
  const k = kurallar();

  const KURUMLAR = [
    {
      ad: "Topluluk Oylaması",
      metin: `Bir bölümü takip eden herkes o bölümdeki kararlarda oy verir. Kabul için ${kuralDegeriYazi("cogunlukTuru", k.cogunlukTuru).toLocaleLowerCase("tr-TR")} gerekir. İstersen oyunu güvendiğin birine emanet edebilirsin.`,
    },
    {
      ad: "Yayın Kurulu",
      metin: `Her bölüm, takipçi sayısından bağımsız ${k.kategoridenTemsilci} kurul üyesi seçer. Küçük bölümler de büyükler kadar söz sahibidir. Kurul’da kabul için ${k.kurulKabulOrani} gerekir.`,
    },
    {
      ad: "Genel Yayın Yönetmeni",
      metin: `Yayın ilkelerindeki değişiklikleri onaylar ya da veto eder; hiçbir mesajı tek başına silemez. ${k.yoneticiSuresiGun} gün içinde karar vermezse öneri kendiliğinden kabul edilir. Veto ${k.vetoAsimOrani} ile aşılır.`,
    },
  ];

  const TURLER = [
    { ad: "Gündem ve alt başlık açmak", yol: ["Topluluk Oylaması"] },
    { ad: "Tartışmayı uzlaşmayla kapatmak", yol: ["Topluluk Oylaması"] },
    { ad: "Mesaj gizlemek, konu kaldırmak ya da düzenlemek (düzenlemeyi konuyu açan önerir)", yol: ["Topluluk Oylaması", "Yayın Kurulu"] },
    { ad: "Yayın ilkelerini değiştirmek", yol: ["Tüm topluluk", "Yayın Kurulu", "Genel Yayın Yönetmeni"] },
  ];

  const ILKELER = [
    { ad: "Sansür yok", metin: "Tehdit dışında hiçbir ifade engellenmez. Bakanlığa, yöneticiye, kurula sert eleştiri serbesttir; cevabı tartışmayla verilir." },
    { ad: "Silinmeyen kayıtlar", metin: "Mesajlar düzenlenemez ve silinemez. En fazla topluluk oylamasıyla gizlenir; kaydı yine de korunur." },
    { ad: "Azınlık görüşü", metin: "Uzlaşmaya katılmayanlar gerekçelerini yazar; bu görüşler kalıcıdır ve kurumlara uzlaşmayla birlikte iletilir." },
    { ad: "Oy emaneti", metin: `İsteğe bağlı. Oyunu bölüm bazında güvendiğin birine devredebilirsin; zincirler toplanır. Bir kişi en fazla ${k.maksimumOyAgirligi} oy taşır.` },
    { ad: "Açık Arşiv", metin: "Her olay bir hash zincirine (dağıtık defter) yazılır. Geçmişi kimse, yönetim bile, sessizce değiştiremez; herkes arşivi indirip doğrulayabilir." },
    { ad: "YZ Analist", metin: "Tartışmaları özetleyen, ortak noktaları bulan ve uzlaşma taslağı hazırlayan yapay zeka. Danışmandır; oy kullanmaz." },
  ];

  const ISTERLER: [string, string, string, string][] = [
    ["Giriş ekranı; ad soyad, adres, doğum tarihi, takma ad, şifre", "Kayıt ve giriş ekranı; şifreler bcrypt ile saklanır. Profilde ad soyad ve takma ad görünür, adres ve doğum tarihi yalnızca sahibine.", "/kayit", "Kayıt ol"],
    ["Herkes konu açabilir; kabul için çoğunluk", "Gündem önerisi Topluluk Oylaması’na çıkar; salt çoğunlukla kabul edilirse tartışmaya açılır.", "/konu/yeni", "Gündem öner"],
    ["Konuyu ilgilendirenler oylar", "Oy hakkı, konunun bölümünü (ya da üst bölümünü) takip edenlerindir.", "/kategoriler", "Bölümler"],
    ["Alt konular önerilebilir", "Açık her konuya herkes alt konu önerebilir; alt konular da oylanır.", "/", "Tartışmalar"],
    ["Silme ve düzenleme teklif edilebilir", "Konu kaldırmayı herkes, düzenlemeyi konuyu açan önerir; ikisi de Topluluk Oylaması ve Yayın Kurulu’ndan geçer.", "/kararlar", "Kararlar"],
    ["Tartışmalar silinmez; silme oylamaya çıkar", "Mesajlar düzenlenemez, silinemez; en fazla oylamayla gizlenir, kaydı arşivde kalır.", "/", "Tartışmalar"],
    ["Konu sonunda uzlaşma; farklı fikirler oylanır", "Yarışan uzlaşma önerileri; çoğunluğu ilk alan kazanır, katılmayanlar azınlık görüşü yazar.", "/etki", "Etki raporu"],
    ["Her şey oylamayla", "Konu, alt konu, gizleme, düzenleme, uzlaşma ve ilke değişikliği oylanır; görevliler de destek usulüyle seçilir.", "/kararlar", "Kararlar"],
    ["Yönetmelik, roller ve ontoloji", "Oylamayla değişen Yayın İlkeleri; roller: vatandaş, uzman, YZ, kurum, kurul üyesi, yönetmen. Bölüm ağacı ve 0–100 uygunluk puanı.", "/kararlar?s=kurallar", "Yayın ilkeleri"],
    ["Çoğunluk azınlığı ezmesin", `Yayın Kurulu’nda her bölüme eşit ${k.kategoridenTemsilci} koltuk, kabul için ${k.kurulKabulOrani}; kalıcı azınlık görüşleri; tehdit dışında sansür yok.`, "/topluluk", "Yayın Kurulu"],
    ["Bazıları daha eşit; oy hakkı havale edilebilir", `İsteğe bağlı oy emaneti, zincirleme toplanır; kişi başı en fazla ${k.maksimumOyAgirligi} oy. Uzman ve seçilmiş görevliler rozetle ayrılır.`, "/topluluk/graf?katman=devir", "Oy emaneti grafı"],
    ["Bilgili kullanıcılar; API ile bağlı yapay zeka", "Uzman rolü ve YZ Analist: özet, ortak kavramlar, uzlaşma taslağı. Kural tabanlı, ücretsiz; isteğe bağlı Ollama API’si.", "/profil/yz_bilirkisi", "YZ Analist"],
    ["İnsanları grafta tut", "Etkileşim, oy emaneti ve seçim desteği ağları kuvvet yönlü graf olarak çizilir.", "/topluluk/graf", "Üye grafı"],
    ["Dağıtık defter", "Her olay SHA-256 hash zincirine yazılır; zincir her açılışta doğrulanır, herkes indirip karşılaştırabilir.", "/topluluk/defter", "Açık Arşiv"],
    ["Uygulama + web sitesi, büyük kitleye hitap", "Aynı kod hem web sitesi hem telefona kurulan uygulama (PWA). Ülke gündemi, kurum hesapları ve etki takibi.", "/etki", "Etki raporu"],
  ];

  // [başlık, açıklama, karşıladığı istek]
  const SON_EKLENENLER: [string, string, string][] = [
    [
      "Kurultay: otağ ve kilim tasarımı",
      "Platformun adı ve görünümü eski Türk meclisinden (toy, kurultay) geliyor: keçe zemin, kilim şeritleri, dört yön renkleri, her bölüme bir kilim motifi, her üyeye takma adından üretilen bir tamga. Motifler dokuma ızgarasında ilmek ilmek çizildi. Açık ve gece teması, telefona uygun düzen.",
      "Büyük bir kitleye hitap etmeli",
    ],
    [
      "Dersin yöntemi: CRISP-ML(Q)",
      "Proje, Hafta 1’de verilen altı aşamalı, kalite güvenceli döngüyle yürütüldü: iş ve veriyi anlama, veri hazırlama, model, değerlendirme, dağıtım, izleme. Her aşamada ne yaptığımız ve nasıl kontrol ettiğimiz aşağıda; tanıtım turunda da ayrı bir adım.",
      "Ders: Hafta 1–2 yöntemi",
    ],
    [
      "Ders içeriğine uyum",
      "Tasarım desenleri dersinin yedi başlığı kodda karşılık buldu: karar aşamaları State, YZ Analist Facade ve Registry, uygunluk denetimi Chain of Responsibility. Hafta 2’ye uygun olarak kurallarımızı temel çizgilerle ölçtük ve 15 birim testi ekledik.",
      "Ders: tasarım desenleri · problem çerçeveleme",
    ],
    [
      "Canlı gösterim: oylama sonuçlanır, bakanlık yanıt verir",
      "Süren bir uzlaşma oylaması gözünüzün önünde eşiği aşar ve kabul edilir. Ardından ilgili bakanlık, uzlaşmayı gündemine aldığını resmî tepkiyle bildirir. Sonuç gerçekten kaydedilir. Gösterim her açılışta kendi oylamasını hazırlar, yani demo verisi yenilenmeden tekrar tekrar izlenebilir.",
      "Her şey oylamayla · uzlaşma · büyük kitle",
    ],
    [
      "Tanıtım turu",
      "9 adımda sayfa sayfa gezerek köşetaşı istekleri ve dersin yöntemine (CRISP-ML(Q), tasarım desenleri) uyumu ilgili yeri vurgulayarak gösterir, sonunda tüm isteklerin listesini verir: üstte hocanın cümlesi, altında çözümümüz. Pusula düğmesiyle yeniden başlatılabilir.",
      "Tüm istekler",
    ],
    [
      "Meclis yarım dairesi",
      "Her oylamada oy hakkı olanlar sandalye olarak çizilir (yeşil evet, kırmızı hayır, kesik çizgi eşik). Oy vermediğin oylama varsa üst çubuğun altında tek satırlık bir hatırlatma çıkar.",
      "Her şey oylamayla · ABD meclis modeli",
    ],
    [
      "Önerinin yolculuğu",
      "Her karar sayfasında önerinin Topluluk Oylaması → Yayın Kurulu → Genel Yayın Yönetmeni duraklarından hangisinde olduğu bir hat üzerinde gösterilir.",
      "ABD meclis modeli (tasarım kararımız)",
    ],
    [
      "Düzenlemeyi konuyu açan önerir",
      "Konunun kaldırılmasını herkes önerebilir, düzenlemesini ise yalnızca konuyu açan kişi. İki öneri de oylamaya çıkar; düzenlenen konunun eski hâli saklanır.",
      "Konu açan düzenleme teklif edebilir",
    ],
    [
      "Profilde yalnızca isim",
      "Profile tıklayan herkes ad soyadı ve takma adı görür. Adres ve doğum tarihi sistemde tutulur ama yalnızca hesabın sahibine gösterilir.",
      "Takma ad profilde görünsün",
    ],
    [
      "Kalabalık bir platform görünümü",
      "Demo verisinde yaklaşık 20 hesap var. Gerçek ölçekte bir platformu canlandırmak için oylama, üye, takipçi ve okunma sayıları sabit bir çarpanla binlere çevrilerek gösterilir. Oranlar ve eşik korunur; kararları her zaman gerçek oylar belirler.",
      "Büyük bir kitleye hitap etmeli",
    ],
    [
      "Telefondan erişim",
      "Aynı Wi-Fi’daki telefondan bilgisayarın adresiyle açılabilir; Cloudflare tüneliyle HTTPS üzerinden ana ekrana uygulama olarak eklenebilir (PWA).",
      "Uygulama + web sitesi",
    ],
  ];

  const ABD = [
    ["Temsilciler Meclisi", "Topluluk Oylaması"],
    ["Senato (eyalet başına 2 senatör)", "Yayın Kurulu (bölüm başına 2 kurul üyesi)"],
    ["Başkan: imza ya da veto", "Genel Yayın Yönetmeni: onay ya da veto"],
    ["Vetonun 2/3 ile aşılması", "Vetoyu aşma oylaması (2/3)"],
    ["Filibuster / 60 oy kuralı", "Yayın Kurulu’nda 3/5 şartı"],
    ["Basit karar · ortak karar · yasa", "Gündem önerisi · silme/düzenleme · ilke önerisi"],
    ["1. Değişiklik (tek istisna: gerçek tehdit)", "Tehdit dışında sansür yok"],
    ["Özgür basının denetim işlevi (“dördüncü güç”)", "Kurum hesapları ve Etki takibi"],
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
      <header className="border-b pb-6">
        <div className="ust-etiket">Nasıl işliyor?</div>
        <h1 className="mt-2 max-w-3xl text-[clamp(1.7rem,3vw,2.375rem)] leading-[1.15] font-semibold">
          Kimsenin sahibi olmadığı bir kamuoyu platformu
        </h1>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          Kurultay bağımsız bir medya kuruluşu gibi çalışır, ama editörü topluluğun kendisidir. Gündemi okurlar belirler, tartışmayı
          okurlar yürütür, sonucu okurlar oylar. Uzlaşılan fikirler bakanlıklara ve meclis komisyonlarına ulaşır; onların yanıtları da
          herkesin gözü önünde kayda geçer.
        </p>
      </header>

      <section id="istekler" className="flex scroll-mt-28 flex-col gap-5">
        <Baslik ust="Ders projesi">Hocamızın istekleri ve karşılıkları</Baslik>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Yazılım Mühendisliği için Yapay Zeka dersinde verilen forum ödevinin her maddesi aşağıda. Tanıtım turu bunları platformun
            içinde tek tek gösterir.
          </p>
          <TurDugmesi yazi="Tanıtım turunu başlat" />
        </div>
        <ol className="divide-y border-y">
          {ISTERLER.map(([ister, karsilik, href, yer], i) => (
            <li key={ister} className="grid gap-1 py-3 md:grid-cols-[2rem_minmax(0,0.9fr)_minmax(0,1.3fr)_8rem] md:gap-4">
              <span className="leading-6 text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="leading-6 font-semibold">{ister}</span>
              <span className="text-sm leading-6 text-muted-foreground">{karsilik}</span>
              <Link href={href} className="text-xs leading-6 font-semibold hover:underline md:text-right">
                {yer} →
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-2">
            <h3 className="text-xl font-semibold">Son eklediklerimiz</h3>
            <GosterimDugmesi />
          </div>
          <ul className="grid gap-x-10 gap-y-5 md:grid-cols-2">
            {SON_EKLENENLER.map(([baslik, metin, istek]) => (
              <li key={baslik} className="flex flex-col gap-1">
                <span className="ust-etiket">{istek}</span>
                <span className="leading-snug font-semibold">{baslik}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{metin}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="yontem" className="flex scroll-mt-28 flex-col gap-5">
        <Baslik ust="Dersin yöntemi">CRISP-ML(Q) döngüsüne uyduk</Baslik>
        <DersYontemi />
      </section>

      <section id="ders" data-tur="ders" className="flex scroll-mt-28 flex-col gap-5">
        <Baslik ust="Ders içeriği">Tasarım desenleri ve ölçüm</Baslik>
        <DersUyumu />
      </section>

      <section id="tasarim" className="flex scroll-mt-28 flex-col gap-5">
        <Baslik ust="Tasarım dili">Otağ ve kilim</Baslik>
        <TasarimDili />
      </section>

      <section className="flex flex-col gap-5">
        <Baslik ust="Denge">Kim karar verir?</Baslik>
        <ol className="grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x">
          {KURUMLAR.map(({ ad, metin }, i) => (
            <li key={ad} className="md:px-6 md:first:pl-0 md:last:pr-0">
              <span className="text-sm text-muted-foreground tabular-nums">{i + 1}.</span>
              <h3 className="mt-1 text-lg font-semibold">{ad}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{metin}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-5">
        <Baslik ust="Süreç">Bir önerinin yolculuğu</Baslik>
        <div className="divide-y border-y">
          {TURLER.map(({ ad, yol }) => (
            <div key={ad} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:gap-6">
              <span className="text-sm font-medium sm:w-80 sm:shrink-0">{ad}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                {yol.map((a, i) => (
                  <span key={a} className="inline-flex items-center gap-2">
                    {i > 0 && <span aria-hidden>→</span>}
                    {a}
                  </span>
                ))}
                <span aria-hidden>→</span>
                <span className="font-medium text-success">Kabul</span>
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Her oylama {k.oylamaSuresiGun} gün açık kalır; sonuç kesinleşirse daha erken kapanır. Oylar kesindir, değiştirilemez.
        </p>
      </section>

      <section className="flex flex-col gap-5">
        <Baslik ust="Etki">Karar vericiler burayı nasıl kullanır?</Baslik>
        <div className="grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:[&>div]:px-6 md:[&>div:first-child]:pl-0 md:[&>div:last-child]:pr-0">
          <div>
            <h3 className="text-lg font-semibold">Kurum hesapları</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Bakanlıklar ve meclis komisyonları doğrulanmış hesaplarla katılır, tartışmalara resmî açıklama yazar ve kamuoyuna danışmak
              için gündem önerir. <b className="text-foreground">Oy kullanamaz, kimseyi susturamaz, hiçbir mesajı gizleyemez.</b>
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Resmî tepki</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Uzlaşmayla kapanan her konu ilgili kurumlara iletilir. Kurumlar açık bir tutum bildirir: İnceleniyor, Gündeme alındı, Uygulandı
              ya da Gerekçeli ret. Bu tutum silinemez, değişirse geçmişiyle görünür.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Etki raporu</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Hangi fikrin hangi kurumun gündemine girdiği, hangisinin uygulandığı ve hangisine hiç yanıt verilmediği herkese açıktır.
              Yanıt vermemek de kayda geçer.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <Baslik ust="Değerler">Yayın ilkeleri</Baslik>
        <dl className="grid gap-x-10 sm:grid-cols-2">
          {ILKELER.map(({ ad, metin }) => (
            <div key={ad} className="border-t py-3">
              <dt className="font-medium">{ad}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{metin}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-5">
        <Baslik ust="Model">ABD yasama sistemiyle karşılaştırma</Baslik>
        <div className="overflow-x-auto border-y">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">ABD</th>
                <th className="py-2 font-medium">Kurultay</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ABD.map(([a, b]) => (
                <tr key={a}>
                  <td className="py-2.5 pr-4 text-muted-foreground">{a}</td>
                  <td className="py-2.5 font-medium">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-4">
        <Link href="/etki" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
          Etki raporu <ArrowRight className="size-4" />
        </Link>
        <Link href="/kararlar?s=kurallar" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
          Güncel yayın ilkeleri <ArrowRight className="size-4" />
        </Link>
        <Link href="/topluluk" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
          Yayın Kurulu <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
