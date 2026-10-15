/*
 * Diyagramlar sayfasının ve teknik raporun UML bölümünün ortak metinleri:
 * kullanım durumu senaryoları ve diyagramlarla ilgili sık sorulan sorular.
 */

export type Senaryo = {
  ad: string;
  sekil: string;
  aktorler: string;
  onKosul: string;
  akis: string[];
  alternatif: string[];
  sonKosul: string;
  kod: string;
};

export const SENARYOLAR: Senaryo[] = [
  {
    ad: "Gündem ya da alt konu öner",
    sekil: "1.1 · 3.2",
    aktorler: "Üye (birincil), Kurum Hesabı",
    onKosul: "Kullanıcı giriş yapmış. Alt konu için üst konu tartışmaya açık.",
    akis: [
      "Üye bölümü, başlığı ve açıklamayı girer.",
      "Sistem uygunluk zincirini çalıştırır: boş başlık, tehdit, benzer konu, bölüm uygunluğu (0–100 puan), üst konuyla ilişki, daha uygun bölüm.",
      "Engel yoksa konu “oylamada” durumuyla kaydedilir; öneren bölümü takip etmeye başlar.",
      "Konu önerisi süreci başlar ve Topluluk Oylaması açılır (salt çoğunluk, 3 gün).",
      "Olay Açık Arşiv’e yazılır; üye konu sayfasına yönlendirilir.",
    ],
    alternatif: [
      "2a. Başlık boş ya da metin tehdit içeriyor: öneri kaydedilmez, engel gösterilir; üye düzeltip yeniden gönderir.",
      "2b. Benzer konu var ya da daha uygun bir bölüm bulundu: yalnızca not düşülür, öneri yine gönderilir.",
    ],
    sonKosul: "Konu oylamada. Oylama kabul ederse tartışmaya açılır, reddederse “reddedildi” olur.",
    kod: "actions/konu.ts → lib/konular.ts, uygunluk.ts, surec.ts",
  },
  {
    ad: "Oy ver",
    sekil: "1.2 · 3.3 · 3.4",
    aktorler: "Üye (birincil); kurul aşamasında Yayın Kurulu Üyesi",
    onKosul: "Oylama açık. Topluluk Oylamasında üye konunun bölümünü (ya da üst bölümünü) takip ediyor; kurul aşamasında Yayın Kurulu üyesi.",
    akis: [
      "Üye karar sayfasında Evet ya da Hayır’a basar.",
      "Sistem oy hakkını denetler.",
      "Üyeye emanet edilmiş, henüz kullanılmamış oylar zincir boyunca toplanır (kişi başı en fazla 5 oy).",
      "Oylar tek bir işlemde yazılır ve Açık Arşiv’e girer.",
      "Sayım yapılır; sonuç kesinleştiyse oylama süre dolmadan kapanır ve süreç bir sonraki aşamaya geçer.",
    ],
    alternatif: [
      "2a. Oylama kapanmış, üye ilgisiz, zaten oy vermiş ya da emanetçisi onun adına oy vermiş: hata gösterilir, oy yazılmaz.",
      "3a. Kurul aşamasında emanet kullanılmaz; temsilcinin oyu kişiseldir.",
      "5a. Sonuç belli değilse oylama açık kalır; süre dolunca sistem (Zaman) sonuçlandırır.",
    ],
    sonKosul: "Oy kesindir ve değiştirilemez; kaydı Açık Arşiv’dedir.",
    kod: "actions/oylama.ts → lib/oylama.ts, devir.ts, kurallar.ts, surec.ts",
  },
  {
    ad: "İlke değişikliği öner",
    sekil: "1.2 · 3.5",
    aktorler: "Üye (öneren); Topluluk, Yayın Kurulu, Genel Yayın Yönetmeni, Zaman",
    onKosul: "Kullanıcı giriş yapmış ve kurum hesabı değil.",
    akis: [
      "Üye oylamayla değiştirilebilen bir ilkeyi, yeni değerini ve gerekçesini seçer.",
      "Sistem değeri doğrular, gerekçede tehdit arar.",
      "İlke önerisi süreci başlar: Topluluk Oylaması (bütün üyeler, salt çoğunluk).",
      "Kabul edilirse Yayın Kurulu oylaması (3/5).",
      "Kabul edilirse Genel Yayın Yönetmeni’nin onayına sunulur (3 gün).",
      "Onaylanırsa yeni değer yürürlüğe girer.",
    ],
    alternatif: [
      "3a / 4a. Oylama reddederse öneri düşer.",
      "4b. Yayın Kurulu henüz seçilmemişse kurul aşaması atlanır.",
      "5a. Veto: vetoyu aşma oylamaları başlar (Topluluk ve Kurul, ikisinde de 2/3). İkisi de geçerse ilke değişir, biri geçmezse veto geçerlidir.",
      "5b. Yönetmen 3 gün içinde karar vermezse öneri kendiliğinden kabul edilir.",
    ],
    sonKosul: "İlke değişti ya da değişmedi; bütün adımlar sürecin geçmişinde ve Açık Arşiv’de.",
    kod: "actions/kural.ts → lib/surec.ts, oylama.ts, kurallar.ts",
  },
];

export const SORULAR: [string, string][] = [
  [
    "Aktör nedir; neden YZ Analist, Ollama ve Zaman da aktör?",
    "Aktör, sistemin dışında kalıp onunla etkileşen her şeydir; insan olması gerekmez. YZ Analist özeti yazan hesaptır, Ollama bilgisayardaki ayrı bir programdır. Zaman, süresi dolan oylamaları kapatır ve 3 gün sessiz kalan Yönetmen’in yerine öneriyi kabul ettirir.",
  ],
  [
    "«include» ile «extend» arasındaki fark ne?",
    "include, temel kullanım durumunun her seferinde çalıştırdığı adımdır: gündem önerisi her zaman uygunluk ve tehdit denetiminden geçer; ok dahil edilene doğrudur. extend yalnızca bir koşulda devreye girer: kendisine oy emanet edilmişse, veto edilirse, yerel model kuruluysa; ok temel kullanım durumuna doğrudur.",
  ],
  [
    "Aktörler arasındaki üçgen uçlu ok ne demek?",
    "Genelleme. Üye bir Ziyaretçi’dir; Uzman, Yayın Kurulu Üyesi ve Genel Yayın Yönetmeni birer Üye’dir. Alt aktör, üst aktörün bütün kullanım durumlarını yapar, ek olarak kendi işlerini yapar.",
  ],
  [
    "Kodda class yok; sınıf diyagramı nereden çıktı?",
    "TypeScript’te sınıf yerine tip ve modül kullandım. Alan modelindeki her sınıf veritabanındaki bir tablodur: 17 tablonun 16’sı sınıf, takipler ise Kullanici ile Kategori arasındaki ilişkidir. Nitelikler sütunlar, metotlar o tabloyu işleyen modül fonksiyonlarıdır. Tasarım diyagramlarında modüller «module», fonksiyon tipleri «interface» olarak gösterildi.",
  ],
  [
    "Bileşim ile toplama arasındaki fark ne, nerede kullandın?",
    "Bileşimde (dolu elmas) parça bütünsüz var olamaz: oylama süreçsiz, oy oylamasız, mesaj konusuz, oturum kullanıcısız olmaz. Toplamada (boş elmas) parça bağımsız da tanımlanabilir: alt bölümler üst bölüme bağlanır ama kendi başına da birer bölümdür.",
  ],
  [
    "Çokluklar nasıl okunur?",
    "1 tam bir, 0..1 en fazla bir, 0..* sıfır ya da daha çok, 1..* en az bir. Örneğin her süreçte en az bir oylama vardır (1..*), bir kullanıcının en fazla bir adaylığı olur (0..1).",
  ],
  ["+ ve − işaretleri ne anlatıyor?", "+ dışa açık (export edilen fonksiyon ya da alan), − yalnızca modülün içinde kullanılan."],
  [
    "Sıralama diyagramındaki oklar ve kutular ne?",
    "Dolu uçlu düz ok çağrı, kesikli ok dönüş değeridir; kendine dönen ok, modülün kendi fonksiyonunu çağırmasıdır. Yaşam çizgisi üstündeki ince kutu etkinlik çubuğudur. alt = if/else, opt = yalnızca if, loop = döngü, break = koşul doğruysa senaryo orada biter.",
  ],
  [
    "Hangi tasarım desenleri diyagramlarda görünüyor?",
    "State (karar aşamaları) ve Registry ile Command (öneri türleri ve süreç kaydı) Şekil 2.3’te; Strategy (eşikler) Şekil 2.3 ve 3.4’te; Chain of Responsibility (uygunluk denetimi), Pipeline (Türkçe ön işleme), Facade, Adapter ve Cascade (YZ Analist), Singleton ve Proxy (veritabanı bağlantısı) Şekil 2.4’te. Composite (bölüm ağacı) ve Memento (konu sürümleri) Şekil 2.1’de.",
  ],
  [
    "ABD modeli diyagramların neresinde?",
    "Şekil 3.5’te. Topluluk Oylaması Temsilciler Meclisi, Yayın Kurulu Senato, Genel Yayın Yönetmeni Başkan gibi çalışır; veto iki meclisin de 2/3’üyle aşılır. Yönetmen 3 gün içinde karar vermezse öneri kabul edilir.",
  ],
  [
    "Tehdit denetimi neden ayrı bir kullanım durumu?",
    "Hem gündem önerisi hem mesaj yazma onu her seferinde çalıştırır. Aynı adım iki yerden dahil edildiği için ayrı bir kullanım durumu olarak çizildi; kodda da tek bir fonksiyondur (tehditBul).",
  ],
  [
    "Diyagramlar kodla tutarlı mı, nasıl çizildi?",
    "Hepsi kaynak koddan çıkarıldı: tablolar ve sütunlar lib/db.ts’ten, mesajlar gerçek fonksiyon çağrılarından, aynı sırayla. Her şeklin altında dayandığı dosyalar yazıyor. Diyagramlar uygulamanın içinde SVG olarak çiziliyor (src/components/uml), verileri src/app/diyagramlar altında; ayrı bir çizim programı kullanılmadı. YZ kullanım beyanında yazdığım gibi Claude Code yardımıyla hazırlandı.",
  ],
];
