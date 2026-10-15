import type { SekilVerisi } from "@/components/uml/Sekil";
import { GUNDEM_TARTISMA, KARAR_OY } from "./kullanimDurumlari";
import { ALAN_KARAR, ALAN_KONU, DENETIM_YZ, KARAR_MOTORU } from "./sinifDiyagramlari";
import { ILKE_VETO, KAYIT, KONU_ONER, MESAJ_GIZLE, OY_SAYIM, OY_VER, YZ_OZETI } from "./siraDiyagramlari";

/*
 * Diyagramlar sayfasındaki bütün şekiller, sırasıyla. Tam boyut sayfası (/diyagramlar/[kod]) da buradan okur.
 */

export const KULLANIM_SEKILLERI: SekilVerisi[] = [
  {
    kod: "kd-gundem",
    no: "1.1",
    tur: "kullanim",
    baslik: "Üyelik, gündem ve tartışma",
    aciklama:
      "Kurultay’ı kimlerin, ne için kullandığı. Ziyaretçi okur ve arşivi doğrular; üye gündem önerir, tartışır, değişiklik önerir. Kurum hesapları açıklama ve resmî tepki yazar; YZ Analist özet çıkarır.",
    okuma: [
      "Çöp adam insan aktördür; «actor» yazan kutu insan olmayan aktördür (YZ Analist, yerel model).",
      "Düz çizgi aktörün o işi yaptığını gösterir. Üçgen uçlu ok genellemedir: Üye bir Ziyaretçi’dir, Uzman bir Üye’dir.",
      "«include» her seferinde çalışan zorunlu adımdır: her gündem önerisi uygunluk ve tehdit denetiminden geçer.",
      "Tek içerik kısıtı gerçek tehdittir (ABD 1. Değişiklik). Hakaret, tekrar ya da kısa metin engellenmez, yalnızca not düşülür.",
      "«extend» yalnızca bir koşulda devreye girer: bilgisayarda yerel model kuruluysa özet onunla yazılır.",
    ],
    kaynak: ["src/app/actions/hesap.ts · konu.ts · tartisma.ts · yz.ts · etki.ts", "src/lib/uygunluk.ts · tehdit.ts · yz.ts"],
    veri: GUNDEM_TARTISMA,
  },
  {
    kod: "kd-karar",
    no: "1.2",
    tur: "kullanim",
    baslik: "Karar, oy ve seçim",
    aciklama:
      "Her şeyin oylamayla yürüdüğü kısım: oy verme, oy emaneti, ilke değişikliği, Yönetmen’in onayı ya da vetosu ve görevlilerin seçimi. Zaman da bir aktördür: süresi dolan oylamaları o kapatır.",
    okuma: [
      "Yayın Kurulu Üyesi ve Genel Yayın Yönetmeni birer Üye’dir (genelleme); ek olarak kendi işlerini yaparlar.",
      "“Kurul oylamasında oy ver”, “Oy ver”in özel bir hâlidir: kullanım durumları arasında da genelleme olur.",
      "Oylamayı sonuçlandır iki yerden dahil edilir: her oy verildiğinde ve süre dolduğunda.",
      "Vetoyu aşma oylaması yalnızca veto edilirse başlar (extend).",
    ],
    kaynak: ["src/app/actions/oylama.ts · kural.ts · secim.ts", "src/lib/oylama.ts · devir.ts · surec.ts · secim.ts"],
    veri: KARAR_OY,
  },
];

export const SINIF_SEKILLERI: SekilVerisi[] = [
  {
    kod: "sn-alan-konu",
    no: "2.1",
    tur: "sinif",
    baslik: "Alan modeli I: üyeler, bölümler, konular ve tartışma",
    aciklama:
      "Veritabanındaki tabloların sınıf olarak gösterimi. Kodda class yok; sınıflar SQLite tablolarından ve TypeScript tiplerinden, metotlar o veriyi işleyen modül fonksiyonlarından çıkarıldı.",
    okuma: [
      "Kutunun üç bölmesi: ad, nitelikler, metotlar. + dışa açık (export edilen) demektir.",
      "Dolu elmas bileşimdir: parça bütünsüz var olamaz (mesaj konusuz, oturum kullanıcısız olmaz).",
      "Boş elmas toplamadır: alt bölümler bir üst bölüme bağlıdır ama ondan bağımsız da tanımlanabilir (Composite).",
      "Çizgi uçlarındaki sayılar çokluktur: 1 tam bir, 0..1 en fazla bir, 0..* sıfır ya da daha çok.",
      "Konu kendine bağlıdır (alt konu), mesaj da kendine (yanıt): kendine dönen ilişki.",
    ],
    kaynak: ["src/lib/db.ts (şema)", "src/lib/auth.ts · kullanicilar.ts · ontoloji.ts", "src/lib/konular.ts · tartisma.ts · etki.ts"],
    veri: ALAN_KONU,
  },
  {
    kod: "sn-alan-karar",
    no: "2.2",
    tur: "sinif",
    baslik: "Alan modeli II: karar, oy, emanet, seçim ve Açık Arşiv",
    aciklama:
      "Her öneri bir Surec kaydıdır; yolundaki her aşama için bir Oylama açılır, her oy ayrı bir satırdır. Oy emaneti, adaylık ve destekler kullanıcılar arasındaki ilişkilerdir. Açık Arşiv kayıtları birbirine hash ile zincirlenir.",
    okuma: [
      "Kullanici iki kez Oy’a bağlıdır: oy sahibi ve (emanetle kullanıldıysa) vekil.",
      "Devir de iki kez Kullanici’ya bağlıdır: oyu veren ve alan.",
      "Surec’in hedefi bir Konu ya da Mesaj olabilir; ilke önerisinde hedef yoktur, kapsam (bölüm) boşsa bütün üyeler oy verir.",
      "DefterKaydi kendinden önceki kaydın hash’ini taşır; biri değişirse zincir kırılır.",
    ],
    kaynak: ["src/lib/db.ts (şema)", "src/lib/surec.ts · oylama.ts · devir.ts", "src/lib/secim.ts · defter.ts · kurallar.ts"],
    veri: ALAN_KARAR,
  },
  {
    kod: "sn-motor",
    no: "2.3",
    tur: "sinif",
    baslik: "Tasarım: karar motoru (State, Registry, Strategy, Command)",
    aciklama:
      "Karar sürecini yürüten modüller ve tasarım desenleri. Her aşama ortak bir arayüzü gerçekleştirir; süreç bir sonraki adımı aşamaya sorar. Öneri türleri bir kayıt tablosundan okunur, eşikler birer hesap stratejisidir.",
    okuma: [
      "Kesikli çizgi ve içi boş üçgen gerçekleştirmedir (realization): beş aşama da AsamaDurumu arayüzünü uygular.",
      "Kesikli açık ok bağımlılıktır: oylama.ts sonuç kesinleşince surec.ts’teki asamaSonucu’nu çağırır.",
      "«module» bir TypeScript dosyasıdır; − ile başlayanlar dosyanın dışına açılmaz.",
      "Yeni bir öneri türü eklemek SUREC_TURLERI’ne yeni bir kayıt eklemektir; mevcut kod değişmez (Açık/Kapalı ilkesi).",
    ],
    kaynak: ["src/lib/surec.ts", "src/lib/oylama.ts · devir.ts · kurallar.ts · defter.ts"],
    veri: KARAR_MOTORU,
  },
  {
    kod: "sn-denetim",
    no: "2.4",
    tur: "sinif",
    baslik: "Tasarım: uygunluk zinciri, tehdit denetimi ve YZ Analist",
    aciklama:
      "Önerileri denetleyen zincir (Chain of Responsibility), ortak Türkçe ön işleme hattı (Pipeline) ve YZ Analist’in katmanları: dışarıya tek kapı (Facade), yerel model için uyarlayıcı (Adapter) ve sırayla denenen özetleyiciler (Cascade).",
    okuma: [
      "Altı halka sırayla aynı bağlam nesnesine yazar; yalnızca boş başlık ve tehdit engeldir.",
      "metin.ts tehdit denetimi, uygunluk ve YZ Analist’in ortak ön işleme hattıdır; Türkçe I/İ küçültmesi tek yerde yapılır.",
      "Kesikli kenarlı kutu dış sistemdir: Ollama isteğe bağlıdır, yoksa kural tabanlı özet kullanılır.",
      "db, bütün modüllerin kullandığı tek veritabanı bağlantısıdır (Singleton); ilk kullanımda açılır (Proxy).",
    ],
    kaynak: ["src/lib/uygunluk.ts · tehdit.ts · metin.ts", "src/lib/yz.ts · db.ts"],
    veri: DENETIM_YZ,
  },
];

export const SIRA_SEKILLERI: SekilVerisi[] = [
  {
    kod: "sd-kayit",
    no: "3.1",
    tur: "sira",
    baslik: "Kayıt ol",
    aciklama:
      "Ödevin ilk isteği olan kayıt ekranının arkasında olanlar. Form bir server action’a gider; doğrulama ve şifre özeti lib katmanında yapılır, ardından oturum çerezi açılır.",
    okuma: [
      "Dolu uçlu düz ok eşzamanlı çağrıdır, kesikli ok dönüş değeridir.",
      "İç içe iki alt çerçevesi iki hata yolunu ve başarılı yolu ayırır.",
      "Yaşam çizgisi üstündeki ince kutular (etkinlik çubuğu), nesnenin o anda çalıştığı süredir.",
      "Adres ve doğum tarihi deftere yazılmaz; Açık Arşiv’e yalnızca takma ad girer.",
    ],
    kaynak: ["src/app/actions/hesap.ts", "src/lib/kullanicilar.ts", "src/lib/auth.ts", "src/lib/defter.ts"],
    veri: KAYIT,
  },
  {
    kod: "sd-konu",
    no: "3.2",
    tur: "sira",
    baslik: "Gündem önerisi ve oylamanın açılması",
    aciklama:
      "Bir üyenin yeni gündem ya da alt konu önermesi. Öneri önce uygunluk zincirinden geçer; geçerse kaydedilir, öneren bölümü takip etmeye başlar ve Topluluk Oylaması açılır.",
    okuma: [
      "loop çerçevesi zincirin altı halkasını, içindeki opt yalnızca tehdit halkasının yaptığı çağrıyı gösterir (Chain of Responsibility).",
      "Tek engel tehdittir: tehdit içermeyen öneri, uygunluk puanı düşük olsa da oylamaya çıkar.",
      "surecBaslat karar sürecini kurar; ilk aşama (uyeler) girişte kendi oylamasını açar (State).",
    ],
    kaynak: ["src/app/actions/konu.ts", "src/lib/konular.ts", "src/lib/uygunluk.ts", "src/lib/tehdit.ts", "src/lib/surec.ts"],
    veri: KONU_ONER,
  },
  {
    kod: "sd-oy",
    no: "3.3",
    tur: "sira",
    baslik: "Oy verme ve oy emaneti",
    aciklama:
      "Bir üyenin oy vermesi. Önce oy hakkı denetlenir, sonra ona emanet edilmiş oylar zincir boyunca toplanır; hepsi tek bir işlemde (transaction) yazılır ve Açık Arşiv’e girer.",
    okuma: [
      "break çerçevesi: koşul doğruysa içindeki adımlar yapılır ve senaryo orada biter.",
      "Emanet, emanet grafında oy verenden geriye doğru genişlik öncelikli aramayla toplanır; döngüler ziyaret kümesiyle kesilir.",
      "Kişi başı en fazla 5 oy taşınır (kendi oyu + 4). Taşınamayan oylar sahiplerinde kalır, kendileri kullanabilir.",
      "Oy kaydedildikten sonra sonucun kesinleşip kesinleşmediğine bakılır (Şekil 3.4).",
    ],
    kaynak: ["src/app/actions/oylama.ts", "src/lib/oylama.ts · devir.ts · defter.ts"],
    veri: OY_VER,
  },
  {
    kod: "sd-sayim",
    no: "3.4",
    tur: "sira",
    baslik: "Sayım, eşik ve aşama geçişi",
    aciklama:
      "Her oydan sonra ve süre dolunca çalışan sonuç denetimi. Eşik hesaplanır; sonuç kesinleştiyse oylama süre dolmadan kapanır ve süreç, bulunduğu aşamanın kararıyla bir sonraki aşamaya geçer ya da biter.",
    okuma: [
      "Eşik bir Strategy’dir: salt = ⌊n/2⌋ + 1, 3/5 = ⌈3n/5⌉, 2/3 = ⌈2n/3⌉. n, oy verenler değil konuyla ilgili bütün üyelerdir.",
      "Kabul artık imkânsızsa (kalan oylar yetse bile eşiğe ulaşılamıyorsa) oylama hemen reddedilir.",
      "Sonraki adımı süreç değil, bulunduğu aşama seçer (State): yoldaIlerle ya da veto yolu.",
      "Son aşama kabul edilince öneri türünün kabulde() işlevi çalışır: konu açılır, mesaj gizlenir, ilke değişir.",
    ],
    kaynak: ["src/lib/oylama.ts · kurallar.ts · surec.ts · defter.ts"],
    veri: OY_SAYIM,
  },
  {
    kod: "sd-ilke",
    no: "3.5",
    tur: "sira",
    baslik: "İlke değişikliği: Kurul, veto ve vetonun aşılması",
    aciklama:
      "Yayın ilkelerini değiştirme önerisi, ABD’de bir yasa tasarısının yolunu izler: iki meclis, başkanın onayı ya da vetosu, vetonun iki mecliste de 2/3 ile aşılması. Bu diyagram iş düzeyindedir; oy veren gruplar aktör olarak çizildi.",
    okuma: [
      "Topluluk ve Yayın Kurulu birer aktördür: tek bir kişiyi değil, oy veren grubu temsil eder.",
      "Zaman da bir aktördür: Yönetmen 3 gün içinde karar vermezse öneri kendiliğinden kabul edilir (sessiz onay).",
      "veto kolundaki break yalnızca alt çerçevesinden çıkar; ardından öneren sonuçla bilgilendirilir.",
      "Yayın Kurulu henüz seçilmemişse kurul aşaması atlanır (kurulOylamasiAc).",
    ],
    kaynak: ["src/app/actions/kural.ts", "src/lib/surec.ts", "src/lib/oylama.ts", "src/lib/kurallar.ts"],
    veri: ILKE_VETO,
  },
  {
    kod: "sd-yz",
    no: "3.6",
    tur: "sira",
    baslik: "YZ Analist’ten tartışma özeti",
    aciklama:
      "YZ Analist’in tartışma özeti. yz.ts dışarıya tek bir kapı açar (Facade). Bilgisayarda yerel dil modeli kuruluysa önce o denenir, olmazsa kural tabanlı özete düşülür (Cascade). Ücretli servis yoktur.",
    okuma: [
      "opt, koşulu doğruysa çalışan tek kollu çerçevedir: ilki Ollama kuruluysa, ikincisi özet hâlâ boşsa çalışır.",
      "Ollama özetleyici, Ollama’nın HTTP arayüzünü projedeki Ozetleyici arayüzüne uyarlar (Adapter).",
      "Özet, tartışmaya YZ Analist hesabıyla ve “hatalı olabilir” notuyla yazılır; tehdit denetiminden geçer, deftere girer.",
    ],
    kaynak: ["src/app/actions/yz.ts", "src/lib/yz.ts", "src/lib/tartisma.ts"],
    veri: YZ_OZETI,
  },
  {
    kod: "sd-gizle",
    no: "3.7",
    tur: "sira",
    baslik: "Mesaj gizleme önerisi: tartışmalar silinmez",
    aciklama:
      "Ödevin “tartışmalar silinmez, silme oylamaya çıkar” isteği. Bir mesaj ancak oylamayla kaldırılabilir; kabul edilse bile satır silinmez, yalnızca gizlenir.",
    okuma: [
      "Mesaj gizleme önerisi ORTAK yoldan gider: önce Topluluk Oylaması, ardından Yayın Kurulu (3/5).",
      "Kabulde yalnızca gizleyen_surec_id alanı dolar; metin veritabanında, hash’i Açık Arşiv’de kalır.",
      "Kurum hesapları bu öneriyi yapamaz; içerik üzerinde söz hakları yoktur.",
    ],
    kaynak: ["src/app/actions/tartisma.ts", "src/lib/tartisma.ts", "src/lib/surec.ts"],
    veri: MESAJ_GIZLE,
  },
];

export const TUM_SEKILLER: SekilVerisi[] = [...KULLANIM_SEKILLERI, ...SINIF_SEKILLERI, ...SIRA_SEKILLERI];

export const sekilBul = (kod: string) => TUM_SEKILLER.find((s) => s.kod === kod);
