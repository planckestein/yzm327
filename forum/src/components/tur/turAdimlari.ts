/*
 * Tanıtım turu: hocamızın ödevde verdiği isterlerin her birini, platformda
 * nerede ve nasıl karşıladığımızı sayfa sayfa gösterir.
 * Her adımda "ister" ödev metnindeki cümledir, "metin" bizim çözümümüz.
 */

export type TurVerisi = {
  konuId: number | null;
  kararId: number | null;
  profil: string | null;
  kurulOrani: string;
  vetoOrani: string;
  koltuk: number;
  maksOy: number;
};

export type TurAdimi = {
  sayfa: string;
  /** Vurgulanacak öğe(ler): data-tur değerleri, ilk bulunan kullanılır. Yoksa kart ortada açılır. */
  hedef?: string[];
  /** Ödevdeki ister (null: giriş / kapanış adımı) */
  ister: string | null;
  /** İster hocadan değil de bizim tasarım kararımızsa */
  bizim?: boolean;
  baslik: string;
  metin: string;
  /** Kapanış adımındaki kontrol listesi */
  liste?: string[];
};

export const ISTER_LISTESI = [
  "Giriş ekranı; ad soyad, adres, doğum tarihi, takma ad, şifre",
  "Herkes konu açabilir, konular oylamayla kabul edilir",
  "Konuyu ilgilendirenler oylamaya katılır",
  "Alt konular önerilebilir",
  "Silme ve düzenleme teklif edilebilir",
  "Tartışmalar silinmez; silme oylamaya çıkar",
  "Konu sonunda uzlaşma; farklı fikirler oylanır",
  "Yönetmelik, roller ve ontoloji (uygunluk ölçümü)",
  "Çoğunluk azınlığı ezmesin",
  "Bazıları daha eşit; oy hakkı havale edilebilir",
  "Bilgili kullanıcılar; API ile bağlı yapay zeka",
  "İnsanları grafta tut",
  "Dağıtık defter",
  "Uygulama + web sitesi, büyük kitleye hitap",
];

export function turAdimlari(v: TurVerisi): TurAdimi[] {
  const konu = v.konuId ? `/konu/${v.konuId}` : "/";

  return [
    {
      sayfa: "/",
      ister: null,
      baslik: "Hocamızın isteklerini nasıl karşıladık?",
      metin:
        "Yazılım Mühendisliği için Yapay Zeka dersinde bizden oylamayla yönetilen bir forum istendi. Bu tur, ödevdeki her isteği platformda nerede ve nasıl karşıladığımızı sırayla gösterir. Model olarak ABD yasama sistemini (Temsilciler Meclisi, Senato, Başkan) örnek aldık.",
    },
    {
      sayfa: "/",
      hedef: ["meclis", "tartismalar"],
      ister: "Herkes konu açabilir. Konunun kabul edilmesi için çoğunluğun kabul etmesi gerekir. Konuyu ilgilendirenler oylamaya katılır.",
      baslik: "Gündem önerisi → Topluluk Oylaması",
      metin:
        "Herkes gündem önerebilir, ama öneri hemen tartışmaya açılmaz: o bölümü takip eden üyeler oylar. Kabul için salt çoğunluk gerekir (oy hakkı olanların tamamının yarısından fazlası), yani sessiz kalanlar da hesaba katılır. Yarım dairede her oy hakkı bir sandalyedir; kesik çizgi kabul eşiğidir. Gizleme, düzenleme, uzlaşma, ilke değişikliği: her şey böyle oylanır.",
    },
    {
      sayfa: konu,
      hedef: ["tartisma"],
      ister: "Konuların tartışmalarındaki mesajlar silinemeyecek, silinmek istenirse oylamaya çıkacak.",
      baslik: "Silinmeyen tartışma",
      metin:
        "Mesajlar düzenlenemez ve silinemez; yazan kişi bile silemez. Bir mesaj için yalnızca “Gizlenmesini öner” denebilir: öneri Topluluk Oylaması’ndan ve Yayın Kurulu’ndan geçerse mesaj gizlenir, yine de kaydı ve özeti arşivde kalır. Sansür yoktur; tek yasak tehdittir.",
    },
    {
      sayfa: konu,
      hedef: ["oylamalar", "tartisma"],
      ister: "Konuların bitişlerinde bir fikir uzlaşmasına varılması hedeflenecek; farklı fikirler oylanır.",
      baslik: "Yarışan uzlaşma önerileri",
      metin:
        "Tartışmanın sonunda herkes bir “uzlaşma metni” önerebilir; aynı anda birden çok öneri yarışır ve ilgili üyelerin çoğunluğunu ilk alan kazanır. Konu bu uzlaşmayla kapanır ve kurumlara iletilir. Katılmayanlar kalıcı bir azınlık görüşü yazabilir.",
    },
    {
      sayfa: "/topluluk",
      hedef: ["kurul"],
      ister: "Çoğunluk azınlığı ezebilir; bunu engellemek için ne yapılabilir? Azınlıkları koruma yapacağız.",
      baslik: "Azınlığı koruyan Yayın Kurulu",
      metin: `ABD modelini örnek aldık: Topluluk Oylaması = Temsilciler Meclisi, Yayın Kurulu = Senato, Genel Yayın Yönetmeni = Başkan. Senato’da her eyaletin 2 senatörü olması gibi, her bölüm büyüklüğünden bağımsız olarak ${v.koltuk} kurul üyesi seçer. Kurulda kabul için ${v.kurulOrani} gerekir (filibuster’ın 60 oy kuralı gibi), yani güçlü bir azınlık kararı durdurabilir. Azınlık görüşleri kalıcıdır.`,
    },
    {
      sayfa: "/topluluk/graf?katman=devir",
      hedef: ["graf"],
      ister: "Bazı insanlar diğerlerinden daha eşit olacak. Bazı insanlara oy hakkını havale edebiliyorsun. İnsanları grafta tut.",
      baslik: "Oy emaneti ve üye grafı",
      metin: `İstersen oyunu bir bölümde güvendiğin birine emanet edersin; zincirler toplanır (A→B→C ise C üç oy taşır). Güç birikmesin diye bir kişi en fazla ${v.maksOy} oy taşıyabilir. Bu graf oy emanetlerini gösterir; üstteki sekmelerden yanıtlaşma ve seçim desteği ağlarına da geçilebilir.`,
    },
    {
      sayfa: "/hakkinda",
      hedef: ["ders"],
      ister: "Öğrenci desenleri bir ML/veri problemine uygular, bir kod tabanında desen ve anti-desen tespit eder.",
      baslik: "Ders içeriğine uyum",
      metin:
        "Tasarım desenleri dersinin yedi başlığının her biri platformda bir karşılık buldu. Hafta 2’ye uygun olarak da “YZ gerekli mi?” sorusunu sorduk, kurallarımızı temel çizgilerle ölçtük; tablolar bu bölümde.",
      liste: [
        "Desen kavramı: desenler kodda adıyla",
        "SOLID: yeni öneri türü = yeni kayıt",
        "Yaratımsal: Singleton, Registry",
        "Yapısal: Facade, Adapter, Proxy",
        "Davranışsal: State, Strategy, Chain",
        "YZ’ye özgü: Cascade, temel çizgi",
        "Anti-desenler: God Object bölündü",
      ],
    },
    {
      sayfa: "/",
      ister: null,
      baslik: "Bütün istekler karşılandı",
      metin:
        "Turda köşetaşlarını gördük; aşağıdaki listedeki her istek platformda çalışır durumda (ayrıntılar “Nasıl işliyor?” sayfasında). Şimdi bunu canlı görelim: süren bir uzlaşma oylaması gözünüzün önünde sonuçlanacak, ardından ilgili bakanlık resmî yanıtını verecek.",
      liste: ISTER_LISTESI,
    },
  ];
}
