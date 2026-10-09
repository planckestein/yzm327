/*
 * Demo için ek gündem başlıkları. Her biri gerçek kurallardan geçer (öneri → oylama → tartışma → uzlaşma → kurum tepkisi).
 * sonuc:  aktif     = tartışmaya açık
 *         kapandi   = uzlaşmayla kapanır (isteğe bağlı kurum tepkisi)
 *         red       = topluluk oylamada reddeder
 *         oylamada  = öneri hâlâ oylamada
 * Öneren kişi, konunun ana bölümünü zaten takip eden biridir (böylece başka oylamaların eşikleri değişmez).
 */

export type EkMesaj = [kim: string, metin: string, yanit?: number];
export type EkKonu = {
  gun: number;
  saat: number;
  kim: string;
  bolum: string;
  baslik: string;
  aciklama: string;
  sonuc: "aktif" | "kapandi" | "red" | "oylamada";
  mesajlar?: EkMesaj[];
  uzlasma?: [kim: string, metin: string];
  /** Uzlaşmaya "hayır" diyenler (geri kalan herkes "evet" der) */
  uzlasmaHayir?: string[];
  /** Uzlaşmadan sonra yazılan azınlık görüşleri */
  serhler?: [kim: string, metin: string][];
  tepki?: [kurum: string, durum: "inceleniyor" | "gundemde" | "uygulandi" | "reddedildi", aciklama: string];
  /** Bir mesaj için gizleme önerisi; oylamada REDDEDİLİR (sansür yok). `mesaj`: mesajlar dizisindeki sıra. */
  gizleme?: {
    mesaj: number;
    kim: string;
    gerekce: string;
    oylar: [kim: string, secim: "evet" | "hayir"][];
    ardindan?: [kim: string, metin: string][];
  };
};

export const EK_KONULAR: EkKonu[] = [
  {
    gun: 11, saat: 11, kim: "selin_kurt", bolum: "Temel Haklar", sonuc: "aktif",
    baslik: "Tüm kamu binaları iki yıl içinde engelliler için erişilebilir olsun",
    aciklama: "Rampası olmayan adliyeler, asansörü çalışmayan hastaneler, dokunsal yüzeyi olmayan metro istasyonları… Erişilebilirlik bir lütuf değil, anayasal eşitliğin gereği. Tüm kamu binaları için iki yıllık bağlayıcı bir takvim ve takvime uymayan kurumlar için yaptırım öneriyorum.",
    mesajlar: [
      ["selin_kurt", "Geçen hafta tekerlekli sandalye kullanan bir müvekkilim duruşmaya kucakta taşınarak çıkarıldı. Bu bir adalet binasında oldu."],
      ["ipek_yildiz", "Emekli bir öğretmen olarak söyleyeyim: okulların çoğunda engelli tuvaleti depo olarak kullanılıyor.", 0],
      ["prof_leyla", "Yaptırım kısmı önemli. Takvim konup yaptırım konmazsa bu, önceki yönetmelikler gibi kâğıt üzerinde kalır."],
    ],
  },
  {
    gun: 11, saat: 15, kim: "dr_murat", bolum: "Ekonomi ve Çalışma Hayatı", sonuc: "aktif",
    baslik: "Kira artışlarına bölgesel tavan konsun mu?",
    aciklama: "Büyükşehirlerde kiralar maaşların çok üzerinde artıyor. Bölgesel ortalama kiraya göre belirlenen bir artış tavanı mı, yoksa kiracıya doğrudan kira yardımı mı daha etkili olur?",
    mesajlar: [
      ["dr_murat", "Tavan kısa vadede kiracıyı korur ama uzun vadede kiralık konut arzını düşürebilir. Kira yardımıyla birlikte düşünülmeli."],
      ["can_ozturk", "Öğrenciyim; üç kişi bir odada kalıyoruz ve yine bursumun tamamı kiraya gidiyor. 'Uzun vade' dediğiniz şey bizim için mezuniyetten sonrası.", 0],
      ["burak_sahin", "Ben hem kiracıyım hem küçük bir dükkân kiralıyorum. İş yeri kiraları da unutulmasın, esnaf kapanıyor."],
      ["hakan_ay", "Gebze'de fabrika işçileri artık iş yerine iki saat uzaktan gelip gidiyor. Kira meselesi aslında ulaşım ve iş meselesi de."],
    ],
  },
  {
    gun: 12, saat: 11, kim: "zeynep_k", bolum: "İfade Özgürlüğü ve Basın", sonuc: "aktif",
    baslik: "Basın kartını hükümet değil, mesleki kuruluşlar versin",
    aciklama: "Basın kartı, gazetecinin haber kaynağına erişimini belirleyen bir belge. Bu kartın kime verileceğine yürütmenin karar vermesi, eleştirel gazetecilerin kartsız kalmasına yol açıyor. Kartların bağımsız meslek örgütlerinden oluşan bir kurulca verilmesini öneriyorum.",
    mesajlar: [
      ["zeynep_k", "On iki yıldır gazeteciyim, kartım üç yıldır 'değerlendirmede'. Meclis koridoruna giremiyorum."],
      ["onur_polat", "Kart zaten ne işe yarıyor ki, telefonla her şeyi çekiyoruz 😏"],
      ["deniz_arslan", "@onur_polat telefonla çekebilirsin ama bakanlık toplantısına giremezsin. Mesele erişim.", 1],
      ["prof_leyla", "Karşılaştırmalı hukukta bu yetki çoğunlukla meslek örgütlerindedir. Devletin rolü kurulun tarafsızlığını güvenceye almakla sınırlı kalmalı."],
    ],
  },
  {
    gun: 12, saat: 16, kim: "ipek_yildiz", bolum: "Eğitim", sonuc: "kapandi",
    baslik: "Tüm devlet okullarında ücretsiz öğle yemeği",
    aciklama: "Aç karnına ders dinlenmez. Birçok çocuk okula kahvaltı etmeden geliyor, öğle arasında da beslenme çantası boş. Tüm devlet okullarında ücretsiz, yerel üreticiden alınan sıcak öğle yemeği öneriyorum.",
    mesajlar: [
      ["ipek_yildiz", "Otuz beş yıllık öğretmenliğimde en çok yardım ettiğim şey ders değil, simitti. Bu gerçeği görelim."],
      ["gizem_tas", "Veli olarak destekliyorum. Yemek yerel üreticiden alınırsa köydeki çiftçiye de iş çıkar."],
      ["emre_celik", "Çiftçi olarak buna evet! Aracı olmadan okula sebze vermek isteriz.", 1],
      ["elif_demir", "Bizim okulda denendi; devamsızlık belirgin şekilde düştü."],
    ],
    uzlasma: ["ipek_yildiz", "Tüm devlet okullarında ücretsiz sıcak öğle yemeği verilmeli; malzemelerin önemli bir kısmı yerel üreticiden, aracısız alınmalıdır. Menüler beslenme uzmanlarınca hazırlanıp velilere açık olmalıdır."],
    tepki: ["egitim_bakanligi", "gundemde", "Ücretsiz okul yemeği önerisi, önümüzdeki eğitim yılı bütçe çalışmalarının gündemine alınmıştır. İlk aşamada dezavantajlı bölgelerdeki okullarda başlanması planlanmaktadır."],
  },
  {
    gun: 13, saat: 10, kim: "mert_yilmaz", bolum: "Ücretler ve İstihdam", sonuc: "aktif",
    baslik: "Pazartesi sabahları resmî olarak öğlen başlasın",
    aciklama: "Bilimsel olarak kanıtlanmamış ama herkesçe bilinen bir gerçek: pazartesi sabahı kimse verimli değil. Haftanın ilk iş gününün öğlen 12'de başlamasını öneriyorum. Kaybedilen saatler cuma öğleden sonraya eklenebilir (kimse o saatlerde de çalışmıyor zaten).",
    mesajlar: [
      ["mert_yilmaz", "Önerim tamamen ciddi. Pazartesi 09.00 toplantısında alınan tek karar 'bir sonraki toplantının tarihi' oluyor."],
      ["hakan_ay", "Fabrikada pazartesi sabahı makineler bile geç ısınıyor, kimse bana inanmıyor.", 0],
      ["dr_murat", "Şakası bir yana, esnek çalışma saatlerinin verimliliği artırdığına dair ciddi çalışmalar var. Belki mesele pazartesi değil, herkesin aynı saatte başlamak zorunda olması."],
      ["calisma_bakanligi", "Bakanlığımızın takvimden pazartesi gününü kaldırma yetkisi bulunmamaktadır. Ancak bu tartışmada öne çıkan esnek çalışma saatleri önerisi not alınmıştır. İyi haftalar dileriz."],
      ["burak_sahin", "Bakanlık da espri yapıyormuş, bu platform gerçekten bir şeyleri değiştiriyor 😄", 3],
    ],
  },
  {
    gun: 13, saat: 15, kim: "gizem_tas", bolum: "Sağlık", sonuc: "aktif",
    baslik: "Çocuk psikiyatrisine randevu üç ayı geçmesin",
    aciklama: "Kaygı bozukluğu olan kızım için en yakın çocuk psikiyatristi randevusu dört ay sonraya verildi. Çocuk ve ergen ruh sağlığı için en geç bir ay içinde randevu garantisi ve okul rehberlik servisleriyle ortak bir sevk sistemi öneriyorum.",
    mesajlar: [
      ["gizem_tas", "Dört ay bir çocuk için bir okul dönemi demek. O sürede her şey daha da kötüleşebilir."],
      ["ayse_aydin", "Hemşire olarak gözlemim: acile gelen ergen vakaları son yıllarda gözle görülür arttı. Erken müdahale acil yükünü de azaltır."],
      ["elif_demir", "Okul rehber öğretmenleri 500 öğrenciye bir kişi. Sevk sistemi ancak rehberlik kadrosu artarsa işler."],
    ],
  },
  {
    gun: 14, saat: 11, kim: "prof_leyla", bolum: "Anayasa ve Hukuk", sonuc: "kapandi",
    baslik: "Seçim barajı yüzde 3'e düşürülsün",
    aciklama: "Yüksek seçim barajı, oy veren milyonlarca seçmenin meclise yansımamasına yol açıyor. Temsilde adalet ile yönetimde istikrar arasındaki dengenin yüzde 3'lük bir barajla daha iyi kurulacağını düşünüyorum. Tartışalım.",
    mesajlar: [
      ["prof_leyla", "Karşılaştırmalı verilere göre yüzde 3-5 aralığındaki barajlar, parçalı olmayan ama temsili güçlü meclisler üretiyor."],
      ["selin_kurt", "Genç seçmenlerin önemli bir kısmının oyu meclise yansımıyor. Bu, siyasete olan güveni de aşındırıyor.", 0],
      ["zeynep_k", "Baraj düşerse koalisyon hükümetleri korkusu dile getiriliyor ama koalisyon, uzlaşmayı öğrenmek demek. Tıpkı burada yaptığımız gibi."],
      ["levent_aksoy", "Baraj düşsün, ama hükümet kurulamazsa kısa sürede seçimin yenilenmesi kuralı da gelsin. Temsil kadar istikrar da önemli; ikisini birlikte düşünelim.", 2],
    ],
    uzlasma: ["prof_leyla", "Seçim barajı yüzde 3'e düşürülmeli; barajın altında kalan oyların meclise yansıması için ittifak düzenlemeleri de şeffaflaştırılmalıdır."],
  },
  {
    gun: 14, saat: 16, kim: "doc_nese", bolum: "Çevre ve Enerji", sonuc: "aktif",
    baslik: "Kuraklığa karşı tarımda vahşi sulama yasaklansın",
    aciklama: "Barajlar kurudu, yeraltı suları hızla çekiliyor. Tarımda salma (vahşi) sulamanın kademeli olarak yasaklanmasını, damla sulamaya geçen çiftçiye ekipman desteği verilmesini öneriyorum.",
    mesajlar: [
      ["doc_nese", "Tarım, tatlı su tüketiminin dörtte üçünden fazlasını oluşturuyor. Sulama yöntemini değiştirmeden kuraklıkla mücadele edemeyiz."],
      ["emre_celik", "Yasaklamak kolay, ama damla sulama sistemi bir çiftçinin bütün yıllık kazancı kadar. Destek gelmeden yasak gelirse tarlayı bırakırız.", 0],
      ["doc_nese", "@emre_celik çok haklısınız. Önce destek, sonra yasak; en az üç yıllık geçiş süresi öneriyorum.", 1],
    ],
  },
  {
    gun: 15, saat: 11, kim: "can_ozturk", bolum: "Yükseköğretim", sonuc: "aktif",
    baslik: "Üniversite öğrencileri için yurt krizi: kapasite ve kira yardımı",
    aciklama: "Her eylülde binlerce öğrenci yurt bulamıyor, bulamayanlar sahte ilanlara ve fahiş kiralara mahkûm kalıyor. Kamu yurt kapasitesinin artırılmasını ve yurda yerleşemeyen öğrencilere kira yardımı yapılmasını öneriyorum.",
    mesajlar: [
      ["can_ozturk", "Geçen eylül iki hafta arkadaşımın koltuğunda yattım. Yurt listesinde 3.400. sıradaydım."],
      ["kaan_dogan", "Bizim şehirde bir yatak için iki kişi sıraya giriyor. Bazı özel yurtlar kantin fiyatlarını bile kiraya ekliyor."],
      ["mert_yilmaz", "İnşaat mühendisi olarak: kamu arazilerinde prefabrik ama kaliteli yurtlar bir yılda kurulabilir. Teknik engel yok, öncelik meselesi.", 0],
    ],
  },
  {
    gun: 15, saat: 16, kim: "kaan_dogan", bolum: "Şehirler ve Ulaşım", sonuc: "kapandi",
    baslik: "Sokak kedilerine belediye meclisinde gözlemci statüsü verilsin",
    aciklama: "Belediye meclislerinin en düzenli katılımcıları zaten binanın önündeki kediler. Kendilerine resmî gözlemci statüsü verilmesini, oturumlarda önlerine su kabı konmasını öneriyorum. (Evet, biraz şaka; ama sokak hayvanlarının bakımı gerçekten kimsenin sorumluluğunda değil.)",
    mesajlar: [
      ["kaan_dogan", "Bizim belediyedeki sarman her oturuma katılıyor, hiç devamsızlığı yok. Bazı meclis üyelerinden daha istikrarlı."],
      ["hakan_ay", "Kediler oy kullanırsa en azından rüşvet mama olur, ucuza gelir 😄", 0],
      ["burak_sahin", "Dükkânımın önündeki üç kediye ben bakıyorum. Gözlemci olsunlar ama mama masrafına da belediye ortak olsun."],
      ["deniz_arslan", "Ciddi tarafına gelirsek: mahalle bazında gönüllü bakım ağı ve belediyenin kısırlaştırma kapasitesini artırması gerekiyor.", 2],
      ["mert_yilmaz", "Önerinin şaka kısmına evet, ciddi kısmına da evet. Nadir görülen bir oy birliği."],
    ],
    uzlasma: ["deniz_arslan", "Kediler gözlemci olmasa da sokak hayvanlarının bakımı belediyenin sorumluluğu sayılmalı: her mahallede gönüllü bakım ağı kurulmalı, kısırlaştırma ve veteriner kapasitesi artırılmalı, mama ve su noktaları belediye bütçesinden karşılanmalıdır. (Kedilere teşekkür notu meclis tutanağına geçirilsin.)"],
  },
  {
    gun: 16, saat: 11, kim: "ayse_aydin", bolum: "Ücretler ve İstihdam", sonuc: "kapandi",
    baslik: "Gece vardiyasında çalışanlara ek yıllık izin hakkı",
    aciklama: "Gece çalışması uykuyu, sağlığı ve aile hayatını doğrudan etkiliyor. Düzenli gece vardiyasında çalışanlara yılda en az beş gün ek ücretli izin hakkı tanınmasını öneriyorum.",
    mesajlar: [
      ["ayse_aydin", "Ayda on iki gece nöbeti tutuyorum. Yıllık iznim gündüz çalışanla aynı. Bu adil değil."],
      ["hakan_ay", "Fabrikada da aynı. Gece vardiyası yapan arkadaşlarımızın çoğunda mide ve uyku sorunları var."],
      ["dr_murat", "Maliyet açısından ek izin, gece çalışmasından kaynaklanan iş kazası ve hastalık maliyetlerinin yanında küçük kalıyor."],
    ],
    uzlasma: ["ayse_aydin", "Düzenli olarak gece vardiyasında çalışanlara yılda en az beş gün ek ücretli izin hakkı tanınmalı ve gece çalışanların yıllık sağlık taraması işveren tarafından karşılanmalıdır."],
    tepki: ["calisma_bakanligi", "inceleniyor", "Gece çalışanlarına ek izin önerisi, iş sağlığı ve güvenliği mevzuatı kapsamında değerlendirilmek üzere ilgili birimimize iletilmiştir."],
  },
  {
    gun: 16, saat: 15, kim: "deniz_arslan", bolum: "Veri Gizliliği", sonuc: "kapandi",
    baslik: "Veri sızıntılarında 72 saatte bildirim ve kişiye tazminat zorunlu olsun",
    aciklama: "Kişisel verilerimiz sızdırıldığında çoğu zaman aylar sonra haberlerden öğreniyoruz. Sızıntıların 72 saat içinde etkilenen herkese bildirilmesini ve kişi başına asgari bir tazminat ödenmesini öneriyorum.",
    mesajlar: [
      ["deniz_arslan", "Geçen yıl kimlik ve telefon bilgilerimiz bir e-ticaret sitesinden sızdı. Sitenin tek açıklaması 'sistemlerimiz güvende' oldu."],
      ["selin_kurt", "Tazminat için kişinin zararını ispat etmesi şartı kaldırılmalı; sızıntının kendisi zarar sayılmalı.", 0],
      ["mert_yilmaz", "Şirketler güvenliğe ancak sızıntı pahalıya patlarsa yatırım yapar. Bu öneri tam olarak bunu sağlıyor."],
    ],
    uzlasma: ["deniz_arslan", "Kişisel veri sızıntıları 72 saat içinde etkilenen herkese ve kamuya bildirilmeli; ispat şartı aranmaksızın kişi başına asgari bir tazminat ödenmeli ve bildirimi geciktiren kuruluşlara ağırlaştırılmış ceza uygulanmalıdır."],
    tepki: ["dijital_komisyon", "gundemde", "72 saatte bildirim yükümlülüğü, kişisel verilerin korunması mevzuatına ilişkin değişiklik taslağına eklenmiştir. Tazminat kısmı Komisyonumuzda ayrıca görüşülecektir."],
  },
  {
    gun: 17, saat: 11, kim: "deniz_arslan", bolum: "İfade Özgürlüğü ve Basın", sonuc: "kapandi",
    baslik: "Sosyal medyaya kimlik doğrulama zorunluluğu getirilmesin",
    aciklama: "Sosyal medya hesaplarının kimlikle doğrulanması zorunluluğu gündeme geldi. Bu, muhbirlerin, gazetecilerin ve şiddet mağdurlarının anonim konuşabilme imkânını ortadan kaldırır. Zorunluluk getirilmemesini öneriyorum.",
    mesajlar: [
      ["deniz_arslan", "Anonimlik bazen tek güvenlik önlemi. Şiddet gören bir kadının, eski eşinin bulabileceği bir hesapla yazmasını bekleyemeyiz."],
      ["zeynep_k", "Haberlerimin yarısı anonim kaynaklardan gelir. Kimlik zorunluluğu, yolsuzluğu ihbar edecek memuru susturur.", 0],
      ["onur_polat", "Ama troller de anonim. Ben de biraz trolüm, itiraf ediyorum."],
      ["prof_leyla", "Suç işlenmesi hâlinde hâkim kararıyla kimlik tespiti zaten mümkün. Herkesi baştan kimliklendirmek ölçülülük ilkesine aykırı."],
    ],
    uzlasma: ["deniz_arslan", "Sosyal medyaya genel kimlik doğrulama zorunluluğu getirilmemelidir. Suç şüphesi hâlinde kimlik tespiti yalnızca hâkim kararıyla ve kişiye bildirilerek yapılabilmelidir."],
    tepki: ["dijital_komisyon", "inceleniyor", "Önerinin, gündemdeki sosyal medya düzenlemesi taslağıyla birlikte değerlendirilmesi Komisyonumuzca kararlaştırılmıştır."],
  },
  {
    gun: 17, saat: 16, kim: "kaan_dogan", bolum: "Kurultay Hakkında", sonuc: "aktif",
    baslik: "Platformda karanlık tema varsayılan olsun (gece nöbetçilerinin gözleri yandı)",
    aciklama: "Gece nöbetten, vardiyadan, sınavdan dönen herkes burada tartışıyor. Açık tema gece üçte bir güneş gibi. Karanlık temanın varsayılan olmasını öneriyorum.",
    mesajlar: [
      ["kaan_dogan", "Dün gece telefonu açtım, oda aydınlandı, kedim korktu."],
      ["zeynep_k", "Bilginize: sağ üstteki ay simgesine basınca karanlık tema açılıyor 🌙 Ama önerinin oylanmasını da isterim; varsayılanı topluluk seçsin.", 0],
      ["ayse_aydin", "Gece nöbetçisi olarak destekliyorum. Ay simgesini de bugün öğrendim, teşekkürler!", 1],
      ["mert_yilmaz", "Ben açık temadan yanayım ama sistem ayarına göre açılması en adili olur."],
    ],
  },
  {
    gun: 18, saat: 11, kim: "elif_demir", bolum: "Sağlık", sonuc: "kapandi",
    baslik: "Her okula tam zamanlı okul hemşiresi",
    aciklama: "Okulda bir çocuk bayıldığında ya da alerji krizi geçirdiğinde yanında sağlıkçı değil öğretmen oluyor. Her okulda tam zamanlı bir okul hemşiresi bulunmasını öneriyorum.",
    mesajlar: [
      ["elif_demir", "Geçen dönem bir öğrencim sınıfta nöbet geçirdi. Ambulans gelene kadar ne yapacağımızı internetten okuduk."],
      ["ayse_aydin", "Okul hemşiresi sadece acil müdahale değil; aşı takibi, beslenme ve ergen sağlığı eğitimi de yapar.", 0],
      ["gizem_tas", "Alerjisi olan bir çocuğun annesi olarak her sabah endişeyle bırakıyorum. Bu öneri benim için çok değerli."],
    ],
    uzlasma: ["elif_demir", "Her okulda tam zamanlı bir okul hemşiresi görevlendirilmeli; küçük okullarda en az yarı zamanlı ortak hemşire uygulaması yapılmalı ve öğretmenlere yılda bir kez ilk yardım eğitimi verilmelidir."],
    tepki: ["saglik_bakanligi", "inceleniyor", "Okul sağlığı hizmetlerinin güçlendirilmesine ilişkin öneri, Milli Eğitim ile ortak çalışma grubunun gündemine sunulmak üzere incelenmektedir."],
  },
  {
    gun: 19, saat: 11, kim: "zeynep_k", bolum: "Yargı Bağımsızlığı", sonuc: "aktif",
    baslik: "Tutukluluk süresine sert sınır: kovuşturmada bir yılı geçmesin",
    aciklama: "Tutukluluk bir tedbir olması gerekirken fiilen cezaya dönüşüyor. Yıllarca tutuklu yargılanıp beraat eden insanlar var. Kovuşturma aşamasında tutukluluğun bir yılı geçmemesini öneriyorum.",
    mesajlar: [
      ["zeynep_k", "Tanıdığım bir meslektaşım iki buçuk yıl tutuklu kaldı, sonra beraat etti. Geri alınamayan iki buçuk yıl."],
      ["selin_kurt", "Adli kontrol tedbirleri (yurt dışı yasağı, imza, elektronik kelepçe) zaten var. Tutuklama son çare olmalı.", 0],
      ["prof_leyla", "Avrupa İnsan Hakları Mahkemesi içtihadı da tutukluluğun makul süreyi aşmamasını ve her uzatmanın somut gerekçeye dayanmasını istiyor."],
    ],
  },
  {
    gun: 19, saat: 16, kim: "mert_yilmaz", bolum: "Şehirler ve Ulaşım", sonuc: "aktif",
    baslik: "Deprem riskli binalarda kiracıya kira yardımlı kentsel dönüşüm",
    aciklama: "Riskli binaların dönüşümü, kiracılar ve yaşlı ev sahipleri yüzünden sürüncemede kalıyor. Dönüşüm süresince kira yardımını devletin karşılamasını ve kiracılara dönüşüm sonrası öncelikli kiralama hakkı verilmesini öneriyorum.",
    mesajlar: [
      ["mert_yilmaz", "İnşaat mühendisi olarak: bildiğimiz riskli binaların içinde oturmaya devam ediyoruz. Teknik değil, finansal bir düğüm bu."],
      ["hakan_ay", "Oturduğum bina 1980'lerden. Kiracıyım, dönüşüm olursa nereye gideceğimi bilmiyorum.", 0],
      ["burak_sahin", "Dükkânım da riskli bir binanın altında. Dönüşüm süresince esnafın da taşınma desteği alması lazım."],
    ],
  },
  {
    gun: 20, saat: 11, kim: "kaan_dogan", bolum: "Eğitim", sonuc: "kapandi",
    baslik: "Lise müfredatına zorunlu finansal okuryazarlık dersi",
    aciklama: "Kredi kartı borcu, faiz, enflasyon, vergi… Liseden mezun olan gençlerin çoğu bunları hiç öğrenmeden hayata atılıyor. Lise müfredatına haftada bir saat zorunlu finansal okuryazarlık dersi eklenmesini öneriyorum.",
    mesajlar: [
      ["kaan_dogan", "Üniversiteye başladığım ilk ay kredi kartı taksitlerini anlamadan borca girdim. Kimse öğretmemişti."],
      ["dr_murat", "Dersin içeriği tüketici haklarını ve bütçe okuryazarlığını da kapsamalı. Finansal okuryazarlık aynı zamanda demokratik okuryazarlıktır."],
      ["elif_demir", "Öğretmen olarak destekliyorum, ama öğretmenlerin de bu konuda eğitim alması şart.", 0],
    ],
    uzlasma: ["kaan_dogan", "Lise müfredatına haftada bir saat zorunlu finansal okuryazarlık dersi eklenmeli; ders bütçe, borç, faiz, vergi ve tüketici haklarını kapsamalı, öğretmenlere de hizmet içi eğitim verilmelidir."],
    tepki: ["egitim_bakanligi", "gundemde", "Finansal okuryazarlık dersi, yeni müfredat taslağı çalışmalarına dahil edilmiştir. Taslak kamuoyuyla ayrıca paylaşılacaktır."],
  },
  {
    gun: 21, saat: 11, kim: "can_ozturk", bolum: "Çevre ve Enerji", sonuc: "kapandi",
    baslik: "Plastik ambalajlara depozito sistemi gelsin",
    aciklama: "Plastik şişeler ve kutular dereleri, kıyıları dolduruyor. Birçok ülkede uygulanan depozito sisteminin (içecek ambalajına küçük bir ücret eklenip iade edilince geri verilmesi) getirilmesini öneriyorum.",
    mesajlar: [
      ["can_ozturk", "Geçen yaz gönüllü sahil temizliğinde iki saatte 40 çuval plastik topladık. Çoğu içecek şişesiydi."],
      ["doc_nese", "Depozito uygulayan ülkelerde içecek ambalajlarının geri toplanma oranı çok yüksek seviyelere çıkıyor. Kanıtlanmış bir sistem."],
      ["burak_sahin", "Market sahibi olarak: iade makinesinin maliyeti bize kalmasın. Ama sistemi destekliyorum.", 1],
    ],
    uzlasma: ["can_ozturk", "Plastik ve cam içecek ambalajlarına depozito sistemi getirilmeli; iade makinelerinin maliyeti küçük işletmelere destekle karşılanmalı ve toplanan ambalajların geri dönüşüm oranları her yıl kamuya açıklanmalıdır."],
    tepki: ["cevre_bakanligi", "gundemde", "Depozito yönetim sistemi uygulamasına ilişkin yönetmelik taslağı hazırlanmaktadır. Küçük işletmelere yönelik destek mekanizması da taslakta yer alacaktır."],
  },
  {
    gun: 22, saat: 11, kim: "burak_sahin", bolum: "Vergi ve Bütçe", sonuc: "kapandi",
    baslik: "Yeni açılan küçük esnafa ilk iki yıl vergi muafiyeti",
    aciklama: "Yeni açılan küçük işletmelerin çoğu ilk iki yılda kapanıyor. İlk iki yılında cirosu belli bir sınırın altındaki küçük esnafa gelir vergisi muafiyeti tanınmasını öneriyorum.",
    mesajlar: [
      ["burak_sahin", "Dükkânımı açtığım ilk yıl kazandığımın neredeyse tamamı kira ve vergiye gitti. Ayakta kalmam mucize."],
      ["dr_murat", "Ciro sınırı iyi belirlenirse vergi kaybı sınırlı kalır; kayıt dışılığı azaltma etkisi bile olabilir.", 0],
      ["hakan_ay", "Fabrikadan çıkıp kendi işini kurmak isteyen çok arkadaşım var. Bu destek onlara cesaret verir."],
    ],
    uzlasma: ["burak_sahin", "Yıllık cirosu belirli bir sınırın altındaki yeni kurulan küçük işletmeler, ilk iki yıl gelir vergisinden muaf tutulmalı; muafiyetten yararlananların listesi kötüye kullanımı önlemek için kamuya açık olmalıdır."],
  },
  {
    gun: 23, saat: 11, kim: "kaan_dogan", bolum: "Dijital Haklar ve Teknoloji", sonuc: "aktif",
    baslik: "Kamu uygulamaları reklamsız ve izleyicisiz olsun",
    aciklama: "Devletin mobil uygulamaları ve web siteleri, ziyaretçileri üçüncü taraf reklam ve analiz şirketlerine izletiyor. Kamu dijital hizmetlerinde reklam ve üçüncü taraf izleyici kullanılmasının yasaklanmasını öneriyorum.",
    mesajlar: [
      ["kaan_dogan", "Bir kamu sağlık uygulamasının trafiğini inceledim: açılışta dört farklı yabancı analiz şirketine veri gönderiyor."],
      ["deniz_arslan", "Doğrulayabilirim. Açık kaynak ve denetlenebilir kamu yazılımı olmadan bu sorunlar bitmez.", 0],
      ["selin_kurt", "Vatandaş bu hizmetleri kullanmak zorunda; zorunlu hizmetin karşılığında veri toplamak rıza değil, dayatmadır."],
    ],
  },
  {
    gun: 24, saat: 11, kim: "ipek_yildiz", bolum: "İfade Özgürlüğü ve Basın", sonuc: "aktif",
    baslik: "Okul kütüphanelerinden kitap toplatılması kurallara bağlansın",
    aciklama: "Son yıllarda bazı okul kütüphanelerinden gerekçe gösterilmeden kitaplar toplatıldı. Kitap çıkarma kararlarının yazılı gerekçeyle, öğretmen ve veli temsilcilerinin katıldığı bir kurulca verilmesini öneriyorum.",
    mesajlar: [
      ["ipek_yildiz", "Emekli olduğum okulda, yıllarca öğrencilere önerdiğim bir klasik raftan kaldırıldı. Kimse nedenini söyleyemedi."],
      ["zeynep_k", "Kitap toplatmak sessiz bir sansürdür; gürültüsü olmadığı için daha tehlikelidir.", 0],
      ["gizem_tas", "Veli olarak hangi kitabın neden kaldırıldığını bilmek isterim. Belki katılırım da, ama bilmek hakkım."],
    ],
  },
  {
    gun: 25, saat: 11, kim: "ayse_aydin", bolum: "Sağlık", sonuc: "aktif",
    baslik: "Sağlık çalışanlarına 24 saatlik nöbet sonrası zorunlu dinlenme",
    aciklama: "24 saatlik nöbetin ardından ertesi gün mesaiye devam etmemiz isteniyor. Yorgun bir sağlık çalışanı hasta güvenliği için risk. 24 saatlik nöbet sonrası en az 24 saat zorunlu dinlenme öneriyorum.",
    mesajlar: [
      ["ayse_aydin", "Otuzuncu saatimde ilaç dozunu iki kez kontrol etmek zorunda kaldım. Hatayı yakaladım ama her zaman yakalanmayabilir."],
      ["gizem_tas", "Hasta yakını olarak söylüyorum: bizi tedavi edenin dinlenmiş olmasını isterim.", 0],
      ["dr_murat", "Hasta güvenliği maliyetleri hesaba katıldığında ek personel istihdamı uzun vadede daha ucuz çıkıyor."],
    ],
  },
  {
    gun: 26, saat: 11, kim: "gizem_tas", bolum: "Eğitim", sonuc: "aktif",
    baslik: "İlkokulda ev ödevi haftada iki saati geçmesin",
    aciklama: "Yedi yaşındaki oğlum okuldan sonra iki saat ödev yapıyor, oyun oynamaya zamanı kalmıyor. İlkokulda toplam ev ödevinin haftada iki saatle sınırlandırılmasını öneriyorum.",
    mesajlar: [
      ["gizem_tas", "Aslında ödevleri ben yapıyorum. Geçen hafta 'volkan maketi' yaptım, öğretmen çok beğendi, oğlum hâlâ volkanın ne olduğunu bilmiyor 🌋"],
      ["elif_demir", "Öğretmen olarak itiraf: velinin yaptığı ödevi anlıyoruz. Maket yerine oyun ve kitap okuma önermek daha doğru.", 0],
      ["ipek_yildiz", "Araştırmalar ilkokulda ödevin başarıya etkisinin çok düşük olduğunu söylüyor. Çocuk oynayarak öğrenir."],
      ["kaan_dogan", "Ben de ilkokulda ödevlerimi babama yaptırırdım, babam da amcama. Aile boyu ödev zinciri 😅"],
    ],
  },
  {
    gun: 27, saat: 11, kim: "selin_kurt", bolum: "Temel Haklar", sonuc: "aktif",
    baslik: "Barışçıl gösterilerde biber gazı kullanımına sıkı sınır",
    aciklama: "Barışçıl toplantılarda biber gazının kapalı alanlarda, çocukların ve yaşlıların bulunduğu yerlerde ve doğrudan yüze sıkılarak kullanılması ciddi yaralanmalara yol açıyor. Kullanımın yasa ile sıkı biçimde sınırlandırılmasını ve her kullanımın kayıt altına alınmasını öneriyorum.",
    mesajlar: [
      ["selin_kurt", "Toplanma hakkı, en sessiz ve en rahatsız edici fikirler için de geçerlidir. Güvenlik, hakkı ortadan kaldırmamalı."],
      ["prof_leyla", "Orantılılık ilkesi burada da temel ölçüt. Her kullanımın kayıt altına alınması hem kolluğu hem vatandaşı korur.", 0],
      ["mert_yilmaz", "Kayıt ve kamera kısmına tamamen katılıyorum; şeffaflık iki taraf için de iyi."],
      ["oguz_karaca", "Barışçıl gösteriye kimsenin itirazı yok. Ama taş atan, iş yerlerinin camını indiren grup barışçıl değildir. Polisin elini kolunu bağlarsak esnafı kim koruyacak? Sınır olsun ama kolluğu da caydırıcılıktan yoksun bırakmayalım.", 0],
    ],
  },
  {
    gun: 28, saat: 11, kim: "emre_celik", bolum: "Çevre ve Enerji", sonuc: "aktif",
    baslik: "Maden izinlerindeki çevre raporları tümüyle halka açık olsun",
    aciklama: "Köyümüzün yanında maden açılacağını iş makineleri gelince öğrendik. Çevresel etki değerlendirme raporlarının ve halkın katılımı toplantılarının tamamen açık, kayıtlı ve erişilebilir olmasını öneriyorum.",
    mesajlar: [
      ["emre_celik", "Halkın katılımı toplantısı bir düğün salonunda, iş saatinde yapıldı. Çiftçilerin hiçbiri gelemedi."],
      ["doc_nese", "Raporların bağımsız bilim insanlarınca incelenebilmesi için ham verilerin de yayımlanması şart.", 0],
      ["can_ozturk", "Toplantıların çevrim içi de yayınlanması ve sorulara yazılı cevap verilmesi zorunlu olmalı."],
    ],
  },
  {
    gun: 29, saat: 11, kim: "onur_polat", bolum: "Ekonomi ve Çalışma Hayatı", sonuc: "red",
    baslik: "Resmî enflasyon yerine 'Simit-Çay Endeksi' kullanılsın",
    aciklama: "Resmî enflasyona kimse inanmıyor. Her sabah aldığım simit ve çayın fiyatındaki artışı resmî enflasyon kabul edelim. Hem hesaplaması kolay, hem herkes anlıyor. Maaş zamları da buna göre yapılsın.",
  },
  {
    gun: 30, saat: 11, kim: "mert_yilmaz", bolum: "Yapay Zeka Düzenlemesi", sonuc: "aktif",
    baslik: "Yapay zekayla üretilmiş siyasi reklamlar açıkça etiketlensin",
    aciklama: "Seçim dönemlerinde yapay zekayla üretilmiş sahte ses ve görüntüler yayılıyor. Yapay zekayla üretilmiş ya da değiştirilmiş tüm siyasi reklam ve içeriklerin açıkça etiketlenmesini öneriyorum.",
    mesajlar: [
      ["mert_yilmaz", "Geçen hafta bir bakanın hiç söylemediği bir sözü söylediği video milyonlarca kez izlendi. Yalanlama yüz binde kaldı."],
      ["deniz_arslan", "Etiketin yanında, platformların bu içerikleri kaydedip seçim kurullarına bildirmesi de zorunlu olmalı.", 0],
      ["prof_leyla", "Etiketleme ifade özgürlüğünü kısıtlamaz, aksine seçmenin doğru bilgi alma hakkını korur."],
    ],
  },
  {
    gun: 31, saat: 11, kim: "hakan_ay", bolum: "Ücretler ve İstihdam", sonuc: "aktif",
    baslik: "Dört günlük çalışma haftası kamuda pilot olarak denensin",
    aciklama: "Bazı ülkelerde maaş kesintisi olmadan dört günlük çalışma haftası denendi ve verimlilik düşmedi. Kamuda belirli birimlerde bir yıllık pilot uygulama öneriyorum.",
    mesajlar: [
      ["hakan_ay", "Fabrikada 6 gün çalışıyoruz. 4 gün hayal gibi, ama kamuda denenirse özel sektör de takip eder."],
      ["dr_murat", "Pilot uygulamanın ölçülebilir hedeflerle (hizmet süresi, hata oranı, hastalık izni) yapılması şart; yoksa sonuç ideolojik tartışmaya döner.", 0],
      ["mert_yilmaz", "Pazartesi önerimin daha ciddi bir versiyonu. Destekliyorum 😄"],
      ["burak_sahin", "Kamu dört gün çalışırsa esnafın işlemleri beş gün mü bekleyecek? Hizmet saatleri korunmalı.", 1],
    ],
  },
  {
    gun: 32, saat: 11, kim: "can_ozturk", bolum: "İfade Özgürlüğü ve Basın", sonuc: "aktif",
    baslik: "Kamu kurumlarının sosyal medyada vatandaşları engellemesi yasaklansın",
    aciklama: "Bazı bakanlık ve belediye hesapları eleştiri yazan vatandaşları engelliyor. Kamu kurumlarının resmî hesapları kamusal alandır; vatandaşları engellemeleri yasaklanmalı.",
    mesajlar: [
      ["can_ozturk", "Bir belediyenin hesabı beni engelledi. Suçum: otobüs durağının fotoğrafını 'bu durakta otobüs hiç durmuyor' diye paylaşmak."],
      ["kaan_dogan", "Beni de bir kurum hesabı sadece 🤔 emojisi attığım için engelledi. Emojiyle eleştiri artık suç mu?", 0],
      ["dijital_komisyon", "Komisyonumuz olarak bu platformda hiçbir vatandaşı engellemediğimizi ve engelleyemeyeceğimizi hatırlatmak isteriz. Kamu hesaplarının sosyal medya ilkelerine ilişkin önerileri not alıyoruz."],
      ["zeynep_k", "Burada engelleme düğmesi olmadığı için kurumlar da bize buradan cevap veriyor. Belki çözüm tam olarak bu.", 2],
    ],
  },
  {
    gun: 33, saat: 16, kim: "elif_demir", bolum: "Yükseköğretim", sonuc: "aktif",
    baslik: "Akademisyenler görüş bildirdiği için soruşturulmasın",
    aciklama: "Bilimsel görüşünü açıkladığı için soruşturma geçiren akademisyenlerin sayısı artıyor. Akademik ifade özgürlüğünün yasal güvenceye alınmasını ve görüş açıklaması nedeniyle disiplin soruşturması açılamamasını öneriyorum.",
    mesajlar: [
      ["elif_demir", "Üniversitede okuyan öğrencilerim, hocalarının derste bazı konulara hiç girmediğini söylüyor. Bu korku öğrencilere de geçiyor."],
      ["prof_leyla", "Bilim, yanlışlanabilir fikirlerin serbestçe tartışılmasıyla ilerler. Soruşturma tehdidi bilimi değil, sessizliği üretir.", 0],
      ["can_ozturk", "Öğrenci olarak en iyi derslerim, hocanın bize tartışmalı bir konuyu açıkça tartıştırdığı derslerdi."],
    ],
  },
  {
    gun: 34, saat: 11, kim: "emre_celik", bolum: "Ekonomi ve Çalışma Hayatı", sonuc: "aktif",
    baslik: "Tarlada 5 lira, markette 50 lira: aracısız üretici pazarları kurulsun",
    aciklama: "Domatesi tarlada kilosu 5 liraya satıyoruz, şehirde 50 liraya alınıyor. Her ilçede belediyelerin ücretsiz yer verdiği, aracısız üretici pazarları ve çiftçiye mazot-gübre desteğinin doğrudan verilmesini öneriyorum.",
    mesajlar: [
      ["emre_celik", "Bu yıl domatesin bir kısmını tarlada bıraktım. Toplatmak, satacağım fiyattan pahalıya geliyor."],
      ["burak_sahin", "Esnaf olarak aracı zincirinin ne kadar uzun olduğunu biliyorum; en az dört el değiştiriyor.", 0],
      ["dr_murat", "Fiyat farkının önemli kısmı lojistik ve depolamadan geliyor. Kooperatif soğuk hava depoları da önerinin parçası olmalı."],
    ],
  },
  {
    gun: 35, saat: 16, kim: "doc_nese", bolum: "Çevre ve Enerji", sonuc: "kapandi",
    baslik: "Çatı güneş paneline bürokrasisiz izin",
    aciklama: "Evinin çatısına güneş paneli kurmak isteyen vatandaş aylarca izin bekliyor. Belirli bir gücün altındaki çatı sistemleri için başvurunun çevrim içi ve bildirim usulüyle, 15 gün içinde sonuçlandırılmasını öneriyorum.",
    mesajlar: [
      ["doc_nese", "Komşum panel başvurusu için 11 ayrı belge topladı ve 7 ay bekledi. Güneş o sürede her gün doğdu."],
      ["mert_yilmaz", "Teknik olarak basit bir iş; statik uygunluğu mühendis raporu ile belgelemek yeterli.", 0],
      ["emre_celik", "Tarladaki sulama pompasını güneşle çalıştırabilsek mazot masrafımız yarıya iner."],
    ],
    uzlasma: ["doc_nese", "Belirli bir gücün altındaki çatı ve tarımsal güneş sistemleri için izin süreci tamamen çevrim içi ve bildirim usulüne geçmeli, başvurular en geç 15 günde sonuçlandırılmalıdır."],
    tepki: ["cevre_bakanligi", "uygulandi", "Küçük ölçekli çatı ve tarımsal güneş sistemleri için çevrim içi bildirim usulü devreye alınmıştır. Başvurular artık ortalama 12 günde sonuçlanmaktadır."],
  },
  {
    gun: 36, saat: 11, kim: "hakan_ay", bolum: "Şehirler ve Ulaşım", sonuc: "aktif",
    baslik: "Gece vardiyası çalışanları için 24 saat toplu taşıma",
    aciklama: "Gece vardiyasına giden ya da gece yarısı çıkan işçiler, hemşireler, güvenlik görevlileri pahalı taksiye mahkûm. Ana hatlarda 24 saat, seyrek aralıklı toplu taşıma öneriyorum.",
    mesajlar: [
      ["hakan_ay", "Vardiyam 00.00'da bitiyor, son otobüs 23.30'da. Her gece yarım saat yürüyüp sonra taksi."],
      ["ayse_aydin", "Nöbetten sabah 08.00'de çıkıyorum ama gece acile gelen meslektaşlarım için aynı sorun var.", 0],
      ["kaan_dogan", "Öğrenciler de kütüphaneden geç çıkıyor. Ücretsiz ulaşım konusuyla birleştirilebilir."],
    ],
  },
  {
    gun: 38, saat: 11, kim: "dr_murat", bolum: "Vergi ve Bütçe", sonuc: "oylamada",
    baslik: "Çok büyük servetlere yıllık küçük bir servet vergisi",
    aciklama: "Gelir vergisinin yükü ücretlilerin üzerinde. Belirli bir eşiğin üzerindeki çok büyük servetlere yıllık düşük oranlı bir servet vergisi getirilmesini ve gelirinin eğitim ve sağlığa ayrılmasını öneriyorum.",
  },
  {
    gun: 39, saat: 15, kim: "gizem_tas", bolum: "Sağlık", sonuc: "oylamada",
    baslik: "İlaç kıtlığına karşı eczane stoklarının açık takibi",
    aciklama: "Çocuğumun ilacını bulmak için dört eczane gezdim. İlaç stoklarının anlık ve herkese açık bir sistemde görüntülenmesini, kıtlık riski olan ilaçların önceden duyurulmasını öneriyorum.",
  },
  {
    gun: 40, saat: 16, kim: "emre_celik", bolum: "Eğitim", sonuc: "oylamada",
    baslik: "Köy okulları kapatılmasın, taşımalı eğitim yeniden değerlendirilsin",
    aciklama: "Köyümüzün okulu kapatıldı, çocuklar her gün bir saat yol gidiyor. Öğrenci sayısı az diye köy okullarının kapatılmasının durdurulmasını ve taşımalı eğitimin çocuklar üzerindeki etkisinin bağımsız olarak değerlendirilmesini öneriyorum.",
  },

  // ---------------- Farklı siyasi görüşlerden, çatışmalı gündemler ----------------
  {
    gun: 9, saat: 11, kim: "oguz_karaca", bolum: "Güvenlik ve Göç", sonuc: "aktif",
    baslik: "Düzensiz göçe karşı sınırda fiziki güvenlik hattı ve hızlı geri gönderme",
    aciklama: "Sınırlarımızdan her yıl on binlerce kişi kayıt dışı giriyor; kimin kim olduğunu bilmiyoruz. Sınır boyunca fiziki güvenlik hattı (duvar, kamera, termal gözetleme) kurulmasını, sığınma başvurularının altı ay içinde sonuçlandırılmasını ve reddedilenlerin hızla geri gönderilmesini öneriyorum. Kapısını kontrol edemeyen devlet, evini de koruyamaz.",
    mesajlar: [
      ["oguz_karaca", "Yirmi sekiz yıl sınır birliklerinde görev yaptım. Gece karakola gelen grupların içinde kimin ailesiyle kaçtığını, kimin kaçakçı olduğunu çoğu zaman ayırt edemezdik. Bu bir insanlık meselesi olduğu kadar bir devlet meselesi."],
      ["hakan_ay", "Fabrikada sigortasız çalıştırılan göçmenler yüzünden yevmiyeler eridi. Suçlu o insanlar değil, onları kayıt dışı çalıştıran patron; ama sorunu görmezden gelmek de çözüm değil."],
      ["selin_kurt", "Hukukun ilk kuralı şu: hayatı tehlikede olan kimse geri gönderilemez. Süreç hızlı olsun ama adil olsun; aksi hâlde mahkemeler kararları iptal eder ve hiçbir şey hızlanmaz.", 0],
      ["oguz_karaca", "Selin Hanım, hukuku biliyoruz. Kapıları sonuna kadar açıp sonra kendi mahallesinde tek bir göçmen görmeyenlerin bize insanlık dersi vermesini kabul etmiyoruz. Bu göç politikası, bu ülkenin işsiz gençlerine yapılmış bir ihanettir.", 2],
      ["deniz_arslan", "“İhanet” gibi kelimeler kullanıldıkça insanlar birer sayıya dönüşüyor. Rakamla konuşalım: kayıt dışı istihdam bitmeden ne duvar işe yarar ne de geri gönderme.", 3],
      ["levent_aksoy", "İki taraf da yarı haklı. Sınır kontrolü de şart, başvuruların gerçekten altı ayda sonuçlanması da. Bugün dosyalar yıllarca bekliyor; ne geri gönderebiliyoruz ne de entegre edebiliyoruz. En kötüsü bu belirsizlik."],
      ["serdar_gunay", "İşveren olarak söyleyeyim: nitelikli göçe kapıyı açalım, kayıt dışı göçe kapatalım. Puan sistemli bir çalışma vizesi hem güvenliği hem ekonomiyi rahatlatır."],
    ],
    gizleme: {
      mesaj: 3,
      kim: "deniz_arslan",
      gerekce: "Bir görüşü savunanları topluca ihanetle suçluyor; tartışmayı zehirliyor.",
      oylar: [
        ["deniz_arslan", "evet"],
        ["selin_kurt", "hayir"], ["zeynep_k", "hayir"], ["prof_leyla", "hayir"], ["levent_aksoy", "hayir"], ["serdar_gunay", "hayir"],
      ],
      ardindan: [
        ["selin_kurt", "Oğuz Bey'in mesajına katılmıyorum, ama gizlenmesine de hayır dedim. Kırıcı bir söz bir fikri yanlış yapabilir, yasak yapmaz; burada tek yasak tehdit. Cevabımı sözle veriyorum: geri göndermede yargı denetimi şart."],
        ["oguz_karaca", "Selin Hanım, ilk kez bir konuda anlaştık: sansür yok. Gerisini tartışmaya devam ederiz."],
      ],
    },
  },
  {
    gun: 10, saat: 15, kim: "fatma_yalcin", bolum: "Aile ve Toplum", sonuc: "kapandi",
    baslik: "Üçüncü çocuktan itibaren ailelere aylık “aile maaşı” verilsin",
    aciklama: "Nüfusumuz hızla yaşlanıyor, gençler evlenmeyi ve çocuk sahibi olmayı erteliyor. Üçüncü çocuktan itibaren her çocuk için 18 yaşına kadar düzenli bir aylık aile desteği verilmesini, çok çocuklu annelere emeklilikte prim desteği sağlanmasını öneriyorum. Aile, toplumun temelidir.",
    mesajlar: [
      ["fatma_yalcin", "Üç çocuk annesiyim. Eşim tek maaşla çalışıyor; okul masrafı, kira, kıyafet… Çocuk sevgisi var ama imkân yok. Devlet nüfus diyor, destek konusunda sessiz."],
      ["gizem_tas", "Fatma Hanım'ın derdini çok iyi anlıyorum ama benim ihtiyacım para değil, kreş. Kreş bulamadığı için işten ayrılan kadınları görüyorum. Destek, kadını eve kapatan bir teşvike dönüşmemeli.", 0],
      ["oguz_karaca", "Nüfus bir milli güvenlik meselesidir. Doğurganlığı düşen milletler birkaç kuşak içinde başkalarının işgücüne muhtaç kalıyor."],
      ["dr_murat", "Veriler şunu söylüyor: tek başına nakit desteğin doğurganlığa etkisi sınırlı ve geçici. Kreş, esnek çalışma ve konut desteğiyle birlikte verildiğinde etki belirgin biçimde artıyor."],
      ["nur_ozcan", "Belediyede çalışıyorum; mahallemizde tek bir kamu kreşi var, bekleme listesinde 400 çocuk. İki ayaklı bir paket herkesin derdine çare olur: doğrudan destek artı kreş."],
      ["ipek_yildiz", "Gizem Hanım'a da Fatma Hanım'a da aynı anda katılıyorum. Seçim yapmak zorunda değiliz.", 1],
    ],
    uzlasma: ["nur_ozcan", "Aile desteği iki ayaklı olmalı: ikinci çocuktan itibaren gelire göre kademelendirilmiş aylık destek verilmeli ve her mahallede ücretsiz ya da düşük ücretli kamu kreşi açılmalıdır. Çok çocuklu ebeveynlere emeklilikte prim desteği sağlanmalıdır."],
    uzlasmaHayir: ["oguz_karaca"],
    serhler: [
      ["oguz_karaca", "Destek gelire bağlanınca orta gelirli aileler yine dışarıda kalıyor. Nüfus politikası sosyal yardım değildir; desteğin her aileye eşit verilmesi gerektiğini düşünüyorum."],
    ],
    tepki: ["calisma_bakanligi", "inceleniyor", "Aile desteği ve kamu kreşi önerisi, Bakanlığımızın aile ve nüfus politikaları çalışma grubuna iletilmiştir. Gelire göre kademelendirme seçeneğinin bütçe etkisi hesaplanmaktadır."],
  },
  {
    gun: 12, saat: 15, kim: "oguz_karaca", bolum: "Güvenlik ve Göç", sonuc: "aktif",
    baslik: "Bedelli askerlik kaldırılsın: zengin de yoksul da aynı şartlarda askerlik yapsın",
    aciklama: "Bugün parası olan askerliği birkaç haftalık eğitimle geçiştiriyor, parası olmayan aylarca sınırda nöbet tutuyor. Vatan hepimizin; bedelli askerliğin kaldırılmasını ve askerlik yükünün herkese eşit dağıtılmasını öneriyorum.",
    mesajlar: [
      ["oguz_karaca", "Komutam altındaki erlerin neredeyse hepsi işçi, çiftçi, esnaf çocuğuydu. Bedelli ödeyenlerin çocuklarını kışlada pek görmedik."],
      ["hakan_ay", "Hayatımda ilk kez Oğuz Bey'le aynı yerdeyim. Bu bir sınıf meselesi: işçinin oğlu askerlik yapar, zenginin oğlu parasını öder.", 0],
      ["can_ozturk", "Bedelli adaletsiz, bunda anlaşıyoruz. Ama çözüm herkesi zorla askere almak değil; profesyonel orduya geçip zorunlu askerliği kaldırmak."],
      ["serdar_gunay", "Can'a katılıyorum. Bir yetişkinin bir yılına devletin el koyması özgürlükle bağdaşmıyor. Profesyonel ordu hem daha etkin hem daha adil.", 2],
      ["oguz_karaca", "Profesyonel ordu, vatan savunmasını bir maaş işine çevirir. Milletin ordusu milletin kendisi olmalı.", 3],
      ["levent_aksoy", "Orta yol: bedelli kalsın ama bedeli gelire göre çok kademeli olsun ve toplanan para doğrudan erlerin harçlığına aktarılsın. Hem adalet hem gerçekçilik."],
      ["kaan_dogan", "Askerlik yaşına iki yıl kaldı, bu tartışmayı en çok biz izliyoruz. Karar verirken bizim fikrimizi de sorun 😅"],
    ],
  },
  {
    gun: 14, saat: 16, kim: "fatma_yalcin", bolum: "Eğitim", sonuc: "aktif",
    baslik: "Din kültürü dersi zorunlu kalsın, ahlak eğitimi güçlendirilsin",
    aciklama: "Çocuklarımız internetten her şeyi öğreniyor ama değerlerimizi öğrenemiyor. Din kültürü ve ahlak bilgisi dersinin zorunlu kalmasını, ders saatinin artırılmasını ve içeriğin ailelerin görüşü alınarak belirlenmesini öneriyorum.",
    mesajlar: [
      ["fatma_yalcin", "Komşunun çocuğu bayram namazının ne olduğunu bilmiyordu. Okul ahlakı ve değerleri öğretmeyecekse kim öğretecek?"],
      ["ipek_yildiz", "Fatma Hanım, din eğitimi ailenin hakkı, buna saygı duyuyorum. Ama zorunlu ders, farklı inançtaki ya da inançsız ailelerin vicdan özgürlüğünü çiğner. Seçmeli olmalı.", 0],
      ["prof_leyla", "Avrupa İnsan Hakları Mahkemesi, zorunlu bir din dersinin ancak nesnel, eleştirel ve çoğulcu biçimde verilirse meşru olabileceğine hükmetti. Mesele zorunluluk kadar içerik meselesi."],
      ["oguz_karaca", "Bu topraklarda bin yıllık bir medeniyet var. Çocuğuna kendi tarihini ve inancını öğretmekten çekinen bir ülke olmayalım."],
      ["nur_ozcan", "Orta yol mümkün: zorunlu ders “dinler, ahlak ve etik” olsun, bütün inançları tanıtsın; belirli bir inancın ibadet eğitimi isteyen aileler için seçmeli verilsin."],
      ["kaan_dogan", "Lisede bu dersten aklımda kalan tek şey, öğretmenin “soru sormayın” demesiydi. İçerik ne olursa olsun, soru sorulabilen bir ders istiyoruz."],
      ["elif_demir", "Öğretmen olarak Nur Hanım'ın önerisini uygulanabilir buluyorum. Asıl sorun, farklı inançtan çocukların sınıfta kendini dışlanmış hissetmesi.", 4],
    ],
  },
  {
    gun: 17, saat: 11, kim: "oguz_karaca", bolum: "Anayasa ve Hukuk", sonuc: "aktif",
    baslik: "Çocuk istismarı ve kasten öldürme suçlarında idam cezası referanduma götürülsün",
    aciklama: "Çocuklara yönelik istismar ve vahşi cinayetlerde verilen cezalar, iyi hâl ve infaz indirimleriyle yıllar içinde eriyor. Bu suçlarda idam cezasının geri getirilip getirilmemesini halkın oyuna sunmayı öneriyorum. Karar milletindir.",
    mesajlar: [
      ["oguz_karaca", "Bir çocuğun hayatını karartan, birkaç yıl sonra iyi hâl indirimiyle sokakta. Mağdurun ailesine “adalet” ne demek, bir de onlara sorun."],
      ["fatma_yalcin", "Anne olarak bu haberleri okuyamıyorum artık. Referandum olsa evet derim; en azından halka sorulsun.", 0],
      ["prof_leyla", "Hukukçu olarak iki itirazım var. Birincisi, yargı hatası geri alınamaz; dünyada infazdan sonra masum olduğu anlaşılan çok sayıda insan var. İkincisi, temel haklar çoğunluğun oyuna sunulamaz; anayasanın varlık sebebi tam olarak budur."],
      ["burak_sahin", "Ben esnafım, hukukçu değilim. Ama halka sorulmasından neden korkulduğunu anlamıyorum."],
      ["selin_kurt", "Burak Bey, korkulan halk değil; geri dönüşü olmayan bir hata. Müvekkillerim arasında yıllar sonra beraat eden insanlar var.", 3],
      ["levent_aksoy", "Bence ortak zemin şu: ağırlaştırılmış müebbet gerçekten ömür boyu olsun, bu suçlarda infaz indirimi ve iyi hâl uygulanmasın. İdam tartışmasından çok daha hızlı sonuç alırız."],
      ["oguz_karaca", "Levent Bey'in önerisi en azından bir adım. İnfaz indirimi kalkarsa ben de buna razıyım.", 5],
    ],
  },
  {
    gun: 20, saat: 15, kim: "serdar_gunay", bolum: "Vergi ve Bütçe", sonuc: "aktif",
    baslik: "Devlet küçülsün: gelir vergisi tek oran %15, kamuya beş yıl yeni kadro açılmasın",
    aciklama: "Devlet her yıl büyüyor, vergi yükü ise çalışanın ve üretenin sırtında. Gelir vergisinin %15 tek orana indirilmesini, kamu personel sayısının beş yıl dondurulmasını ve tasarrufun vergi indirimine aktarılmasını öneriyorum. Paranızı devletten daha iyi siz harcarsınız.",
    mesajlar: [
      ["serdar_gunay", "Yirmi kişilik bir yazılım şirketim var. Kazandığımız her liranın neredeyse yarısı bir şekilde devlete gidiyor; karşılığında aldığımız hizmet ortada."],
      ["hakan_ay", "Tek oranlı vergi, asgari ücretliyle milyarderi aynı orandan vergilendirmek demek. Bu adalet değil, zengine indirim.", 0],
      ["dr_murat", "Tek oranlı vergiyi deneyen ülkelerde sonuçlar karışık: tahsilat kolaylaşıyor ama gelir dağılımı genellikle bozuluyor. Kadro dondurma ise sağlıkta ve eğitimde hizmetin çökmesine yol açabilir."],
      ["ayse_aydin", "Serviste bir hemşireye 18 hasta düşüyor. Kadro dondurulursa hastanede kimse kalmaz.", 0],
      ["burak_sahin", "Vergi indirimine evet derim ama kadro dondurmak yerine liyakat sınavı ve performans denetimi daha mantıklı. Gereksiz kadro da var, gerekli kadro da."],
      ["levent_aksoy", "Burak Bey'e katılıyorum. “Devlet küçülsün” yerine “devlet verimli olsun” diyelim; ölçülebilir hedefi olmayan birimler birleştirilsin.", 4],
      ["serdar_gunay", "Hakan Bey, istisnaları kaldırırsak tek oran zengine indirim olmaz; bugün zenginler zaten istisnalarla az ödüyor. Asgari ücret tümüyle vergi dışı kalsın, bunu da öneriye ekleyelim.", 1],
    ],
  },
  {
    gun: 23, saat: 15, kim: "serdar_gunay", bolum: "Çevre ve Enerji", sonuc: "aktif",
    baslik: "İklim hedefleri için nükleer şart: üç yeni nükleer santral kurulsun",
    aciklama: "Kömürü kapatalım diyoruz ama güneş ve rüzgâr gece ve rüzgârsız günlerde yetmiyor. Karbonsuz ve kesintisiz tek büyük kaynak nükleer. 2040'a kadar üç yeni nükleer santral kurulmasını öneriyorum.",
    mesajlar: [
      ["serdar_gunay", "Kömür tartışmasında herkes kapatmaktan bahsetti, yerine ne koyacağımızdan kimse bahsetmedi. Nükleeri konuşmadan 2035 hedefi hayal."],
      ["doc_nese", "Nükleer düşük karbonlu, bu doğru. Ama maliyeti ve yapım süresi yüksek, deprem kuşağındayız ve atık sorunu hâlâ çözülmedi. Aynı parayla depolama ve şebeke yatırımı daha hızlı sonuç verir.", 0],
      ["emre_celik", "Santral yeri hep köylünün yanına seçiliyor. Önce deprem ve su raporları herkese açık olsun, sonra konuşalım."],
      ["oguz_karaca", "Enerjide dışa bağımlı bir ülke, siyasette de bağımsız olamaz. Nükleer bir enerji meselesi değil, egemenlik meselesidir."],
      ["nur_ozcan", "Orta yol: tek dev santral yerine önce küçük modüler reaktörlerle bir pilot uygulama ve bağımsız bir güvenlik kurulu."],
      ["can_ozturk", "Egemenlik diyorsunuz ama yakıtı da teknolojiyi de yurt dışından alacağız. Güneş bizim, rüzgâr bizim.", 3],
    ],
  },
  {
    gun: 25, saat: 11, kim: "levent_aksoy", bolum: "Dijital Haklar ve Teknoloji", sonuc: "kapandi",
    baslik: "16 yaş altına sosyal medya yasaklansın mı?",
    aciklama: "Çocuklarımız günde saatlerce ekranda; kaygı, uyku sorunu ve zorbalık artıyor. Bazı ülkeler 16 yaş altına sosyal medya hesabını yasakladı. Biz ne yapmalıyız: yasak mı, sınır mı, ailenin kararı mı?",
    mesajlar: [
      ["levent_aksoy", "Torunum on iki yaşında, gece ikide bildirim sesine uyanıyor. Yasakçı biri değilim ama bir şey yapılmalı."],
      ["fatma_yalcin", "Yasaklansın. Çocuğumun o videolarda gördüklerini anlatırken utanıyorum. Devlet sigarayı çocuklara yasaklıyorsa bunu da yasaklayabilir.", 0],
      ["deniz_arslan", "Yasağın tek uygulanma yolu herkesin kimlik göstermesi. Birkaç hafta önce kimlik zorunluluğunu hep birlikte reddettik; çocukları koruyalım derken herkesi kimliklendirmeyelim."],
      ["serdar_gunay", "Devlet ebeveynin yerine geçmemeli. Aileye güçlü kontrol araçları verilsin, karar ailenin olsun.", 1],
      ["kaan_dogan", "On altıya yeni girdim. Yasak olsa da arkadaşlarımın hepsi annesinin hesabıyla girerdi. Ama algoritmanın gece beni uyutmadığı doğru."],
      ["gizem_tas", "Veli olarak: yasak değil, platformlara “varsayılan çocuk hesabı” zorunluluğu getirilsin. Gece bildirimleri kapalı, öneri algoritması kapalı."],
    ],
    uzlasma: ["levent_aksoy", "16 yaş altına genel yasak yerine platformlara varsayılan çocuk hesabı zorunluluğu getirilmelidir: 22.00-07.00 arası bildirimler kapalı, kişiselleştirilmiş öneri algoritması kapalı ve ebeveyn kontrolü kolay olmalıdır. Yaş doğrulaması genel kimlik toplama yoluyla yapılmamalıdır."],
    uzlasmaHayir: ["fatma_yalcin", "serdar_gunay"],
    serhler: [
      ["fatma_yalcin", "Bu metin çok yumuşak. Bildirimleri kapatmak bağımlılığı bitirmez; 16 yaş altı için gerçek bir yasak gerekir. Azınlıkta kaldım ama görüşüm kayıtta dursun."],
      ["serdar_gunay", "Platformlara yeni zorunluluk getirmek küçük girişimleri bitirir, büyükler zaten uyum sağlar. Karar tümüyle ailenin olmalıydı."],
    ],
    tepki: ["dijital_komisyon", "inceleniyor", "Varsayılan çocuk hesabı önerisi, çocukların çevrim içi korunmasına ilişkin çalışma taslağımızda değerlendirilmektedir. Genel kimlik doğrulama yoluna gidilmemesi yönündeki görüş not alınmıştır."],
  },
  {
    gun: 27, saat: 16, kim: "oguz_karaca", bolum: "Kurultay Hakkında", sonuc: "aktif",
    baslik: "Bu platform tek bir yöne mi kaydı? Her görüşe gerçekten yer açalım",
    aciklama: "Birkaç haftadır burayı okuyorum: manşetlerin, uzlaşmaların ve kurul üyelerinin neredeyse hepsi aynı siyasi çizgiden. Muhafazakâr ya da milliyetçi bir öneri yazarken “acaba gizlenir mi” diye düşünüyoruz. Yayın Kurulu'na farklı görüşlerden aday çıkmasını ve manşetin nasıl seçildiğinin açıkça yazılmasını öneriyorum. Sansürsüz diyorsak, rahatsız eden fikre de yer olmalı.",
    mesajlar: [
      ["oguz_karaca", "Göç başlığında yazdığım bir mesaj için gizleme önerildi. Oylamada reddedildi, hakkını vereyim. Ama o oylama bitene kadar içimden “burası da diğerleri gibi” dedim."],
      ["zeynep_k", "Oğuz Bey, eleştiriniz yerinde. Manşeti ben seçmiyorum; en çok okunan ve tartışılan konu kendiliğinden öne çıkıyor. Ama farklı seslerin az olması bizim de eksiğimiz. Kurul'a aday olun; Güvenlik ve Göç bölümünde ilk desteği ben vereceğim.", 0],
      ["levent_aksoy", "Ne sağcıyım ne solcuyum, emekli bir bankacıyım. Bu platformun en iyi yanı, Oğuz Bey'le Hakan Bey'in bedelli askerlikte aynı yerde durabilmesi. Bunu kaybetmeyelim."],
      ["selin_kurt", "Gizleme önerisine hayır diyenlerden biriyim. Katılmadığım bir fikri savunmak zorunda değilim; ama söylenebilmesini savunmak zorundayım.", 0],
      ["fatma_yalcin", "Ben de ilk geldiğimde çekinerek yazdım. Aile maaşı önerim tartışıldı, kabul edilen metinde emeğimiz var. Çekinmeyin, yazın."],
      ["onur_polat", "Sağcısı solcusu hepiniz aynı şeyi söylüyorsunuz: “biz haklıyız ama siz de konuşun” 😏 Ben bunu bile beğendim."],
    ],
  },
  {
    gun: 29, saat: 15, kim: "kaan_dogan", bolum: "Şehirler ve Ulaşım", sonuc: "red",
    baslik: "Boş tutulan ikinci konutlar kamulaştırılıp öğrencilere verilsin",
    aciklama: "Şehirde binlerce konut boş dururken öğrenciler koltuklarda yatıyor. İkinci ya da üçüncü evini boş tutanların konutlarının belediyelerce kamulaştırılmasını ve öğrenci yurdu olarak kullanılmasını öneriyorum.",
  },
  {
    gun: 30, saat: 16, kim: "oguz_karaca", bolum: "Şehirler ve Ulaşım", sonuc: "red",
    baslik: "Tabelalarda yabancı kelime yasaklansın, uymayan iş yerine ceza verilsin",
    aciklama: "Çarşıya çıkınca hangi ülkede olduğumuzu bilemiyoruz: “Coffee”, “Center”, “Outlet”… Dilimiz kimliğimizdir. Tabelalarda yabancı kelime kullanılmasının yasaklanmasını ve uymayan iş yerlerine ceza verilmesini öneriyorum.",
  },
  {
    gun: 39, saat: 11, kim: "fatma_yalcin", bolum: "Aile ve Toplum", sonuc: "oylamada",
    baslik: "Boşanma davasından önce ücretsiz ve zorunlu aile arabuluculuğu",
    aciklama: "Boşanmaların önemli bir kısmı konuşularak çözülebilecek anlaşmazlıklarla başlıyor ve en çok çocuklar zarar görüyor. Şiddet içeren durumlar hariç, boşanma davası açılmadan önce ücretsiz ve zorunlu bir aile arabuluculuğu görüşmesi yapılmasını öneriyorum.",
  },
  {
    gun: 40, saat: 11, kim: "levent_aksoy", bolum: "Güvenlik ve Göç", sonuc: "oylamada",
    baslik: "Suç oranı yüksek mahallelerde toplum destekli polislik",
    aciklama: "Bazı mahallelerde gece sokağa çıkmaya çekiniyoruz; ama çözüm her köşeye zırhlı araç koymak da değil. Mahalle sakinleriyle düzenli toplantı yapan, aynı ekiple uzun süre görev yapan toplum destekli polislik modelinin suç oranı yüksek mahallelerde yaygınlaştırılmasını öneriyorum.",
  },
];
