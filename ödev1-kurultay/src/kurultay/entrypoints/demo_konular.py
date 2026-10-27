"""Demo gündemi: kırk günlük bir Kurultay geçmişinin konuları, mesajları ve teklifleri.

Konular bilerek tartışmalıdır ve yelpazenin her yerinden ses vardır. Kurultay'ın kuralı basit: fikir yüzünden
kimse susturulmaz, tek yasak tehdittir. Sert mesajları gizleme teklifleri bu yüzden çoğunlukla reddedilir;
gizlenenler reklam ve konuyla ilgisiz içeriktir.

Gün değerleri demo başlangıcından itibarendir (0 = kırk gün önce). Oylama eğilimleri ``oy`` sözlükleriyle
verilir: {eğilim: evet olasılığı}. Konuşan üyeler kendi eğilimlerine göre oy verir; ``ozel`` ile gerekçeli oy yazılır.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from kurultay.entrypoints.demo_uyeler import ASIRI_SAG, ASIRI_SOL, MERKEZ, SAG, SOL

Oy = dict[str, float]
Mesaj = tuple[str, str] | tuple[str, str, int]  # (nick, metin) ya da (nick, metin, yanıtlanan mesajın sırası)
HERKES_ACSIN: Oy = {ASIRI_SOL: 0.78, SOL: 0.84, MERKEZ: 0.86, SAG: 0.82, ASIRI_SAG: 0.76}


def acilis(**degisen: float) -> Oy:
    """Konunun tartışmaya açılması için eğilim; çoğu kişi katılmasa da konuşulmasından yanadır."""
    return {**HERKES_ACSIN, **degisen}


@dataclass
class Ek:
    """Konu açıldıktan sonra gelen teklif: uzlaşma, gizleme, silme, düzenleme."""

    tur: str  # uzlasma | gizle | sil | duzenle
    gun: float  # konunun açılış gününe göre
    kim: str
    metin: str  # uzlaşma metni ya da gerekçe
    oy: Oy
    katilim: float = 0.22
    hedef: int = -1  # gizle: mesaj sırası
    baslik: str = ""  # duzenle
    aciklama: str = ""  # duzenle
    yogun: dict[str, int] = field(default_factory=dict)  # karesel: eğilimin kullandığı en yüksek oy
    ozel: dict[str, tuple[str, int, str]] = field(default_factory=dict)  # nick → (seçim, yoğunluk, gerekçe)


@dataclass
class Konu:
    anahtar: str
    gun: float
    yazar: str
    baslik: str
    metin: str
    kavramlar: tuple[str, ...]
    oy: Oy = field(default_factory=lambda: dict(HERKES_ACSIN))
    katilim: float = 0.24
    mesajlar: list[Mesaj] = field(default_factory=list)
    ust: str | None = None
    ekler: list[Ek] = field(default_factory=list)
    ozel: dict[str, tuple[str, int, str]] = field(default_factory=dict)
    yayilim: float = 6.0  # mesajların kaç güne yayıldığı


KONULAR: list[Konu] = [
    # ------------------------------------------------------------------ ilk günler
    Konu(
        "algoritma", 2.0, "deniz_yazilim", "Kamuda kullanılan algoritmalar açıklanmalı mı?",
        "Sosyal yardım başvuruları, trafik cezaları, sınav yerleştirme... Kamuda kararların bir kısmını artık "
        "yazılımlar veriyor. Bu sistemlerin karar kuralları açıklanmalı mı, itiraz edince kim bakıyor?",
        ("yz-duzenleme",),
        mesajlar=[
            ("deniz_yazilim", "Kodun tamamı açılsın demiyorum. Ama sosyal yardımım neden reddedildi sorusuna 'sistem öyle verdi' cevabı kabul edilemez. Kural neyse yazsınlar."),
            ("zeynep_veri", "Kodun açılması bazen gerçekten güvenlik açığı yaratır. Bağımsız bir denetim kurulu ve yılda bir etki raporu daha uygulanabilir bence.", 0),
            ("emre_ogrenci", "yerleştirmede hangi verinin kullanıldığını bilmiyoruz. bilmediğimiz bir şeye güvenmemiz bekleniyor"),
            ("girisimci_ipek", "Özel sektörde kredi skorlamasında bile itiraz hakkı var, kamuda olmaması garip. İnsan incelemesi şart."),
            ("serbest_piyasaci", "Denetim kurulu dediğiniz yeni bir bürokrasi demek. Sonra kurulu kim denetleyecek?", 1),
            ("zeynep_veri", "Haklı bir soru. Kurulun raporları herkese açık olursa denetimi biraz da kamuoyu yapar.", 4),
            ("elif_iklim", "İtiraz yine bir algoritmaya gidiyorsa itiraz hakkı yok demektir. En azından itirazı insan okusun."),
            ("deniz_yazilim", "Toparlarsam: karar kuralları açık, itiraz insanda, etki raporu herkese açık. Kaynak kod konusunda anlaşamadık, sorun değil."),
            ("yz_teknolog", "Tartışmadan çıkan üç ortak nokta: açıklanmış karar kuralları, bağımsız denetim, insanın baktığı itiraz. Kaynak kodun açılması konusunda görüşler ayrık."),
        ],
        ekler=[
            Ek("duzenle", 33.15, "ayse_hukuk", "Başlık tartışmanın vardığı noktayı yansıtsın.",
               {ASIRI_SOL: 0.6, SOL: 0.7, MERKEZ: 0.72, SAG: 0.6, ASIRI_SAG: 0.5}, katilim=0.12,
               baslik="Kamuda algoritmalar: şeffaflık ve itiraz hakkı",
               aciklama="Sosyal yardım, trafik cezası, sınav yerleştirme gibi kararları veren yazılımların karar kuralları "
                        "açıklanmalı mı, itirazlara kim bakmalı, bağımsız denetim nasıl olmalı?"),
        ],
    ),
    Konu(
        "yuz_tanima", 6.5, "zeynep_veri", "Belediyelerin yüz tanıma kameraları",
        "Bazı belediyeler meydanlara yüz tanıma özellikli kamera kuruyor. Görüntüler ne kadar saklanıyor, kimlerle "
        "paylaşılıyor, kim denetliyor? Kanuni dayanağı ne?",
        ("veri-gizliligi",), ust="algoritma",
        mesajlar=[
            ("zeynep_veri", "KVKK açık rıza ister. Meydandaki herkesten rıza almak mümkün değil, o zaman özel bir kanuni dayanak lazım. Şu an yok."),
            ("polis_emeklisi", "Otuz yıl sahada çalıştım. Kamera olan sokakta kapkaç yarı yarıya düşer. Güvenlik isteyen buna karşı çıkmaz."),
            ("ozgur_soz", "Kapkaç düşer ama meydana miting için çıkan da azalır. İzlendiğini bilen insan davranışını değiştirir.", 1),
            ("polis_emeklisi", "Suç işlemeyenin neden korkacağını anlamıyorum açıkçası.", 2),
            ("akademisyen_nur", "Mesele korku değil, verinin kimde ve ne kadar süre kaldığı. Bugün güvendiğiniz kurum yarın başkasının elinde olabilir."),
            ("avukat_kaan", "Ben kameradan yanayım ama 30 gün saklama sınırı ve mahkeme kararıyla erişim şartı konulursa. Sınırsız saklama olmaz."),
            ("sancak_murat", "Bu ülkede terör gerçeği varken kamera tartışması lüks. Avrupa başkentleri kamerayla dolu."),
            ("zeynep_veri", "Londra örneği hep verilir ama orada da bağımsız denetçi ve yayımlanan raporlar var. Ben de kamerayı kaldıralım demiyorum, kuralsız olmasın diyorum.", 6),
        ],
        ekler=[
            Ek("uzlasma", 27.75, "avukat_kaan",
               "Yüz tanıma kameraları kanuni dayanakla, 30 günlük saklama sınırıyla ve bağımsız denetimle kullanılabilmeli; "
               "kayıtlara erişim mahkeme kararına bağlı olmalı.",
               {ASIRI_SOL: 0.35, SOL: 0.6, MERKEZ: 0.78, SAG: 0.72, ASIRI_SAG: 0.5}, katilim=0.2),
        ],
    ),
    Konu(
        "asgari_ucret", 3.0, "mehmet_iktisat", "Asgari ücret yılda iki kez güncellensin",
        "Enflasyon bu kadar yüksekken yılda bir kez yapılan zam birkaç ayda eriyor. Asgari ücret altı ayda bir, "
        "enflasyona endeksli olarak güncellenmeli mi?",
        ("ucretler",),
        mesajlar=[
            ("mehmet_iktisat", "Zamla enflasyon arasındaki fark ilk altı ayda kapanıyor, ikinci yarı tamamen kayıp. Formül belli olursa her yıl aynı pazarlığı yapmak zorunda kalmayız."),
            ("gul_esnaf", "Çalışanımın maaşı artsın isterim ama benim kiram, elektriğim de artıyor. Altı ayda bir zam gelecekse küçük esnafa vergi indirimi de gelsin."),
            ("sinif_bilinci", "Altı ay da az. Asgari ücret yoksulluk sınırının altında. Endeks değil, insanca yaşanacak ücret istiyoruz."),
            ("serbest_piyasaci", "Asgari ücreti ne kadar yukarı iterseniz kayıt dışı o kadar büyür. İşveren sigortasız çalıştırmaya başlar.", 2),
            ("sinif_bilinci", "Kayıt dışını büyüten ücret değil denetimsizlik. İşvereni denetleyin.", 3),
            ("kurye_baris", "Ben paket servisteyim, bizim ücret parça başı. Asgari ücret artınca bizim taban da biraz kıpırdıyor, o yüzden önemli."),
            ("emre_ogrenci", "kira yurt yemek her ay artıyor, yarı zamanlı çalışan öğrenci için de aynı dert"),
            ("anadolu_tuccari", "Kayseri'de 12 kişi çalıştırıyorum. İki zam olursa ikisini de veririm ama SGK primi desteği şart. Yoksa iki kişiyi çıkarırım, bu da gerçek."),
            ("mehmet_iktisat", "Uzlaşma metni önereceğim: altı ayda bir endeksli güncelleme + küçük işletmeye geçiş döneminde prim desteği."),
        ],
        ekler=[
            Ek("uzlasma", 7.5, "mehmet_iktisat",
               "Asgari ücret enflasyona endeksli olarak altı ayda bir güncellenmeli; küçük işletmelere geçiş döneminde SGK prim desteği verilmeli.",
               {ASIRI_SOL: 0.55, SOL: 0.86, MERKEZ: 0.8, SAG: 0.7, ASIRI_SAG: 0.72}, katilim=0.28,
               ozel={"sinif_bilinci": ("evet", 1, "Yetmez ama bugünkünden iyi."),
                     "serbest_piyasaci": ("hayir", 1, "Endeksleme enflasyonu kalıcı hale getirir.")}),
        ],
    ),
    Konu(
        "moderasyon", 4.5, "akademisyen_nur", "Kurultay'da moderasyon olmalı mı?",
        "Burada tehdit dışında her şey yazılabiliyor. Bu bir özgürlük alanı mı, yoksa zamanla en yüksek sesle "
        "bağıranların meydanı mı olur? Hakaretin gizlenmesi için ayrı bir kural gerekir mi?",
        ("kurultay",),
        mesajlar=[
            ("akademisyen_nur", "Açık söyleyeyim, ben de emin değilim. Ama başka platformlarda gördüğüm şu: kural yoksa kadınlar ve azınlıklar bir süre sonra yazmayı bırakıyor."),
            ("ozgur_soz", "Kuralı kim koyacak? Bugün hakaret dediğiniz yarın 'hükümeti eleştirmek' olur. Tehdit net bir çizgi, hakaret değil.", 0),
            ("kara_tolga", "Buraya gelme sebebim bu zaten. Başka yerde iki cümle yazınca hesap kapatılıyor."),
            ("mor_dayanisma", "Özgürlük güzel ama hedef gösterme ne olacak? Birinin adını soyadını yazıp üstüne gitmek tehdit sayılmıyor ama sonucu aynı."),
            ("ayse_hukuk", "Kişisel bilgilerin paylaşılması zaten sistemde mümkün değil, herkes takma adla görünüyor. Bu bence önemli bir koruma.", 3),
            ("devrimci_okan", "Mesaj gizleme teklifi karesel oylamayla yapılıyor ve 3/5 lazım. Yani çoğunluk canı istediği mesajı gizleyemiyor. Bu kurala güveniyorum."),
            ("tarihci_selim", "Osmanlı'daki meşveret meclislerinde bile kimin konuşacağı belirlenirdi. Tamamen kuralsız bir meclis tarihte pek görülmedi :)"),
            ("ozgur_soz", "Kural var: tehdit yasak, gerisini topluluk oyluyor. Bu bir kural yokluğu değil, kuralın kendisi.", 6),
            ("uzay_cocugu", "bence herkes biraz sakin olsa moderasyona gerek kalmaz ama olmuyor işte"),
        ],
    ),
    Konu(
        "goc", 5.0, "sancak_murat", "Suriyeliler için geri dönüş takvimi açıklanmalı",
        "Geçici koruma artık geçici değil. Kaç kişinin, hangi süre içinde, hangi bütçeyle döneceği belli olmadan "
        "bu mesele çözülmez. Gönüllü ya da zorunlu ayrımını konuşalım ama takvimsiz olmaz.",
        ("guvenlik",), oy=acilis(asiri_sol=0.55, sol=0.7), katilim=0.27,
        mesajlar=[
            ("sancak_murat", "Konuyu açınca faşist denecek, biliyorum. Ama göç politikası konuşulmadan ne ekonomi ne güvenlik tartışılabilir. Takvim istiyorum, o kadar."),
            ("komun_zehra", "Faşist demeyeceğim ama soruyu yanlış soruyorsun. Savaşın sürdüğü bir yere kimse zorla gönderilemez. Asıl soru: bu insanları sigortasız, yarı fiyata çalıştıranlar kim?", 0),
            ("kara_tolga", "Avrupa kendi sınırında botları geri itiyor, kimse uluslararası hukuktan bahsetmiyor. Bütün yük neden bizde?"),
            ("mehmet_iktisat", "Kayıt dışı istihdam en çok tekstil, inşaat ve tarımda. Ücretleri aşağı çeken şey sadece göçmen emeği değil, denetimsizlik. Denetim artarsa iki tarafın da sorunu küçülür."),
            ("turkmen_kizi", "Irkçılık yapmıyorum. Ama Adana'da bazı mahallelerde kültürel uyum diye bir şey kalmadı ve bunu söyleyince hemen etiketleniyorsun."),
            ("ozgur_soz", "Bu konunun burada açık açık konuşulabilmesi iyi. Başka yerde ya silinir ya linç olur. Herkes yazsın, oylama ne kabul göreceğini gösterir."),
            ("avukat_kaan", "Hukuken yapılabilecek olan: geçici koruma yenilemesini sıkılaştırmak, suç işleyenlerin sınır dışı işlemini hızlandırmak, gönüllü dönüşü teşvik etmek. 'Hepsi gitsin' ne hukuken ne pratikte mümkün."),
            ("kara_tolga", "Pratikte mümkün olmayan şey yok, siyasi irade yok.", 6),
            ("laik_nesrin", "Bu meseleyi on yıl önce siyasi malzeme yapanlar şimdi çözüm arıyor gibi yapıyor. Hafızamız bu kadar kısa olmasın."),
            ("omer_faruk_k", "İnsanları düşman ilan etmek de yanlış, her şeyi 'kardeşlik' deyip geçiştirmek de. Okulda dil ve uyum dersi zorunlu olsun, işyerleri denetlensin, dönmek isteyene destek verilsin."),
            ("sinif_bilinci", "Patron sesini çıkarmayan, sendikaya girmeyen işçi istiyor. Yerli işçiyle göçmen işçiyi birbirine düşürmek en çok onların işine yarıyor."),
            ("emekli_hasan", "Antep'te ev bulamıyoruz derken kimse uydurmuyor. Kiralar arttıysa bunun bir sebebi de göç."),
            ("mehmet_iktisat", "Antep için etkisi var, katılıyorum. Ama ülke genelinde kira artışının ana sebebi para politikası ve depremde kaybedilen konutlar.", 11),
            ("sert_yorumcu", "Bu başlıkta insan hakları diye ağlayanların hiçbiri o mahallelerde oturmuyor. Gelin bir hafta Esenyurt'ta yaşayın sonra konuşun."),
            ("sancak_murat", "Ben insanları düşman ilan edelim demedim. Takvim dedim: kaç yıl, kaç kişi, hangi bütçe. Bunu söylemeyen herkes konuyu dağıtıyor."),
            ("devrimci_okan", "Açılış oylamasında hayır verdim ama tartışılmasında haklıymışsınız. Kimse kimseyi ikna etmedi ama en azından küfürleşmeden konuştuk."),
            ("yz_hukukcu", "Ortak noktalar: kayıt dışı istihdamın denetlenmesi, suç işleyenler için hızlı işlem, gönüllü dönüşe destek. Zorunlu dönüş ve bağlayıcı takvim konusunda görüşler ayrık."),
        ],
        ekler=[
            Ek("gizle", 2.5, "komun_zehra", "Karşı görüştekileri aşağılıyor, tartışmaya bir şey katmıyor.",
               {ASIRI_SOL: 0.7, SOL: 0.4, MERKEZ: 0.18, SAG: 0.08, ASIRI_SAG: 0.04}, katilim=0.2, hedef=13,
               yogun={ASIRI_SOL: 3, SOL: 2, MERKEZ: 2, SAG: 3, ASIRI_SAG: 3},
               ozel={"komun_zehra": ("evet", 3, "Aşağılama tartışma değildir."),
                     "ozgur_soz": ("hayir", 3, "Sert ama bir görüş. Tehdit yok, gizlenmemeli."),
                     "devrimci_okan": ("hayir", 2, "Katılmıyorum ama görüş görüştür.")}),
            Ek("uzlasma", 29.45, "avukat_kaan",
               "Kayıt dışı istihdam sıkı denetlenmeli; suç işleyen yabancılar için sınır dışı işlemleri hızlanmalı; gönüllü "
               "geri dönüş desteklenmeli. Zorunlu takvim konusunda uzlaşma yoktur, ayrı bir oylamada tartışılmalı.",
               {ASIRI_SOL: 0.3, SOL: 0.55, MERKEZ: 0.8, SAG: 0.75, ASIRI_SAG: 0.35}, katilim=0.18),
        ],
    ),
    Konu(
        "servet_vergisi", 7.0, "sinif_bilinci", "En zengin yüzde bire servet vergisi gelsin",
        "Asgari ücretli maaşından vergiyi kaynakta ödüyor, büyük servetler ise neredeyse hiç vergilendirilmiyor. "
        "Belli bir eşiğin üstündeki servete yıllık küçük bir vergi konmalı mı?",
        ("vergi",), oy=acilis(sag=0.7, asiri_sag=0.7),
        mesajlar=[
            ("sinif_bilinci", "Gebze'de fabrikada çalışıyorum. Benim vergim maaş bordromdan kesiliyor, kaçırma şansım yok. Holding sahibi ise yatı şirket üstüne alıp gideri yazıyor."),
            ("serbest_piyasaci", "Servet vergisi deneyen ülkelerin çoğu kaldırdı. Fransa'yı araştırın, sermaye çıktı, toplanan vergi beklenenin çok altında kaldı."),
            ("komun_zehra", "Vergi az bile. Fabrikalar, enerji, madenler kamunun olmalı. Vergiyle yoksulluğu yönetirsiniz, çözemezsiniz.", 1),
            ("anadolu_tuccari", "Ben zengin değilim ama dükkânımın, depomun değeri arttı diye her yıl vergi mi ödeyeceğim? Nakit yok ki ödeyeyim."),
            ("mehmet_iktisat", "Eşik önemli. Gerçekten çok büyük servetler için, mesela nüfusun binde biri. Esnafın dükkânı bunun içine girmez.", 3),
            ("gul_esnaf", "Önce vergi kaçıranları yakalasınlar. Sokağımızdaki kafelerin yarısı fiş kesmiyor."),
            ("girisimci_ipek", "Startup'ta hissemin kağıt üzerinde değeri var ama elimde nakit yok. Bu tip varlıklar için ne yapılacak? Önce bu çözülmeli."),
            ("sendikaci_gonul", "Her vergi önerisinde 'sermaye kaçar' korkusu. Sermaye zaten düşük ücret için burada, vergi için gitmez."),
            ("serbest_piyasaci", "Kaçar Gönül hanım, kaçıyor da. Son on yılda kaç şirket merkezini Hollanda'ya taşıdı bir bakın.", 7),
            ("emekli_hasan", "Bana yüzde bir faiz verip kalanını enflasyona yediren devlet zenginden ne alacak, onu da merak ediyorum."),
            ("sinif_bilinci", "Hiç değilse konuşabiliyoruz. Açılış oylamasında sağdan da evet veren çok kişi var, teşekkürler."),
        ],
        ekler=[
            Ek("uzlasma", 8.0, "mehmet_iktisat",
               "Çok yüksek eşikli (nüfusun binde biri) ve düşük oranlı bir servet vergisi pilot olarak denenmeli; önce vergi "
               "kaçağına karşı fiş ve kayıt denetimi güçlendirilmeli.",
               {ASIRI_SOL: 0.6, SOL: 0.78, MERKEZ: 0.55, SAG: 0.34, ASIRI_SAG: 0.42}, katilim=0.22,
               ozel={"serbest_piyasaci": ("hayir", 1, "Pilot bile olsa sermayeye yanlış sinyal."),
                     "komun_zehra": ("evet", 1, "Az ama bir başlangıç.")}),
        ],
    ),
    Konu(
        "erisim_engeli", 8.5, "ozgur_soz", "Erişim engeli kararları yalnızca mahkemeden çıksın",
        "Bir haberin, bir hesabın, bazen bir sitenin tamamının erişime kapatılması idari kararla saatler içinde "
        "oluyor. Bu yetki yalnızca mahkemelerde olmalı mı?",
        ("basin",),
        mesajlar=[
            ("ozgur_soz", "Geçen ay bir yerel haber sitesi belediye ihalesiyle ilgili haber yüzünden kapatıldı. Mahkeme kararı yok, idari karar. Bu kabul edilebilir mi?"),
            ("polis_emeklisi", "Terör propagandası yapan hesaplar için mahkeme beklenirse iş işten geçer. Acil durumlarda idari tedbir şart."),
            ("ayse_hukuk", "Acil tedbir olabilir ama 24 saat içinde hâkim onayına gitmeli, onaylanmazsa kendiliğinden kalkmalı. Şu anki uygulamada bu denetim çok zayıf.", 1),
            ("kara_tolga", "İlk defa liberallerle aynı fikirdeyim. Benim hesabım iki kez kapatıldı, sebebi bile söylenmedi."),
            ("akademisyen_nur", "Dezenformasyon gerçek bir sorun ama çözüm yasak değil. Yasaklanan haber daha çok yayılıyor zaten."),
            ("avukat_kaan", "Hâkim onayı şartı mantıklı. Ama mahkemelerin iş yükü ortada, bir yıl sonra karar çıkarsa ne olacak?"),
            ("indirim_dunyasi", "SÜPER FIRSAT!! Tüm elektronik ürünlerde %70 indirim, kapıda ödeme, ücretsiz kargo. Hemen sipariş verin!!!"),
            ("ayse_hukuk", "Sulh ceza hâkimliklerinde nöbetçi hâkim var zaten. 24 saatte onay mümkün, istenmiyor sadece.", 5),
            ("ulkucu_emre", "Devletin güvenliğini ilgilendiren konularda hakim beklenmez. Ama yerel bir haber sitesini kapatmak da güvenlik meselesi değil, katılıyorum."),
        ],
        ekler=[
            Ek("gizle", 0.8, "ozgur_soz", "Reklam. Konuyla ilgisi yok; bu bir görüş değil, satış ilanı.",
               {ASIRI_SOL: 0.92, SOL: 0.94, MERKEZ: 0.95, SAG: 0.93, ASIRI_SAG: 0.9}, katilim=0.22, hedef=6,
               yogun={ASIRI_SOL: 2, SOL: 2, MERKEZ: 2, SAG: 2, ASIRI_SAG: 2},
               ozel={"ozgur_soz": ("evet", 3, "Reklam ifade özgürlüğünün konusu değil.")}),
            Ek("uzlasma", 6.0, "ayse_hukuk",
               "İdari erişim engeli yalnızca acil durumlarda verilebilmeli ve 24 saat içinde hâkim onayına sunulmalı; onaylanmayan "
               "karar kendiliğinden kalkmalı. Bir sitenin tamamı değil, yalnızca ilgili içerik engellenmeli.",
               {ASIRI_SOL: 0.85, SOL: 0.88, MERKEZ: 0.82, SAG: 0.6, ASIRI_SAG: 0.48}, katilim=0.24),
        ],
    ),
    Konu(
        "olum_cezasi", 10.0, "polis_emeklisi", "Çocuklara yönelik ağır suçlarda ölüm cezası tartışılmalı",
        "Her ağır suçtan sonra aynı tartışma yapılıyor ve hiçbir şey değişmiyor. Çocuklara yönelik en ağır suçlarda "
        "ölüm cezasının geri gelmesini konuşmak istiyorum.",
        ("hukuk",), oy=acilis(asiri_sol=0.5, sol=0.62), katilim=0.26,
        mesajlar=[
            ("polis_emeklisi", "Meslekte bu dosyaları gördüm. Ailelerin yüzüne bakıp 'iyi hal indirimi' anlatmak zorunda kaldım. Bu adalet değil."),
            ("akademisyen_nur", "Ölüm cezasının caydırıcı olduğuna dair güçlü bir veri yok. ABD'de idam olan eyaletlerle olmayanlar arasında anlamlı fark çıkmıyor."),
            ("hilal_dmr", "Veri bilmem. Benim iki kızım var. Bu suçları işleyenin bir gün dışarı çıkma ihtimali bile kabul edilemez."),
            ("ayse_hukuk", "Ben de dışarı çıkmasınlar diyorum. Ağırlaştırılmış müebbet, infaz indirimi yok, şartlı tahliye yok. Bu hem anayasal hem geri dönüşü olan bir ceza.", 2),
            ("ulkucu_emre", "Geri dönüşü olsun diye uğraşacağımız insanlar değil bunlar."),
            ("laik_nesrin", "Yanlış kişiyi astığınızda geri dönüş olmuyor. Tarihte bunun örnekleri var, bu ülkede de var."),
            ("tarihci_selim", "Türkiye'de son infaz 1984'te. 2004'te tamamen kaldırıldı. Kaldırılırken neredeyse bütün partiler evet demişti, ilginç bir uzlaşmaydı."),
            ("omer_faruk_k", "Dinimizde kısas var ama şartları çok ağır ve ispatı neredeyse imkânsız. Bu bile bize bir şey söylemeli."),
            ("avukat_kaan", "AİHS'ten çıkmadan ölüm cezası mümkün değil. AİHS'ten çıkmak da çok başka sonuçlar doğurur. Gerçekçi olan infaz indirimlerinin kaldırılması."),
            ("sert_yorumcu", "Avrupa ne der diye kendi çocuğunu koruyamayan bir ülke olduk. Utanç verici."),
            ("doktor_baran", "Adli tıpta çalışan arkadaşlarım en çok kanıt toplamadaki eksikliklerden şikâyet ediyor. Ceza ne olursa olsun önce suçlu yakalanmalı."),
            ("polis_emeklisi", "Doktor bey haklı, soruşturma tarafı da çok zayıf. Ama bu cezanın hafif olmasını haklı çıkarmaz.", 10),
        ],
        ekler=[
            Ek("sil", 3.0, "akademisyen_nur", "Anayasaya ve uluslararası sözleşmelere aykırı bir talep; linç kültürünü besliyor.",
               {ASIRI_SOL: 0.42, SOL: 0.2, MERKEZ: 0.07, SAG: 0.04, ASIRI_SAG: 0.02}, katilim=0.22,
               yogun={ASIRI_SOL: 3, SOL: 2, MERKEZ: 2, SAG: 3, ASIRI_SAG: 3},
               ozel={"ayse_hukuk": ("hayir", 3, "Talebe karşıyım ama konuşulmasına değil."),
                     "ozgur_soz": ("hayir", 3, "Anayasaya aykırı bir fikri savunmak da ifade özgürlüğü."),
                     "akademisyen_nur": ("evet", 3, "Bu tür tartışmalar linç iklimini besliyor.")}),
            Ek("uzlasma", 8.0, "ayse_hukuk",
               "Çocuklara yönelik ağır suçlarda infaz indirimi ve şartlı tahliye kaldırılmalı; soruşturma ve adli tıp kapasitesi "
               "artırılmalı. Ölüm cezası konusunda uzlaşma yoktur.",
               {ASIRI_SOL: 0.3, SOL: 0.5, MERKEZ: 0.55, SAG: 0.32, ASIRI_SAG: 0.12}, katilim=0.22,
               ozel={"polis_emeklisi": ("hayir", 1, "Ölüm cezası tartışmasını kapatmak için erken."),
                     "akademisyen_nur": ("hayir", 1, "İnfaz indirimini kaldırmak da sorunlu.")}),
        ],
    ),
    # ------------------------------------------------------------------ ikinci hafta
    Konu(
        "yurt", 11.0, "emre_ogrenci", "Üniversite yurt ücretleri",
        "Devlet yurtlarında yer yok, özel yurtlar bursun iki katı.",
        ("yuksekogretim",),
        mesajlar=[
            ("emre_ogrenci", "bursum özel yurdun yarısını bile karşılamıyor. ailesinden destek alamayan iki arkadaşım okulu dondurdu"),
            ("can_ogretmen", "Kampüslerde boş duran binalar var. En hızlı ve ucuz çözüm onları yurda çevirmek."),
            ("devrimci_okan", "Barınma bir hak. Ankara'da 6 kişi 2+1'de kalan arkadaşlarım var."),
            ("girisimci_ipek", "Özel yurtlara vergi indirimi verilip fiyat sınırı konabilir. Devlet her şeyi kendisi yapmak zorunda değil."),
            ("selin_hekim", "Hastanede kalabalık evde yaşayan öğrencilerde çok fazla depresyon ve beslenme sorunu görüyorum. Bu sadece para meselesi değil."),
            ("yusuf_hoca", "Vakıf yurtları da önemli bir boşluğu dolduruyor, kimin işlettiğine bakmadan denetlenmeli ama kapıları da kapatılmamalı."),
        ],
        ekler=[
            Ek("duzenle", 2.5, "can_ogretmen", "Başlık tartışmanın kapsamını (barınma) yansıtmıyordu.",
               {ASIRI_SOL: 0.8, SOL: 0.85, MERKEZ: 0.82, SAG: 0.75, ASIRI_SAG: 0.7}, katilim=0.2,
               baslik="Üniversite yurt ücretleri ve barınma krizi",
               aciklama="Devlet yurtlarında kontenjan yetersiz, özel yurtlar bursun iki katı. Kampüslerdeki boş binaların yurda "
                        "çevrilmesi, kira desteği ve burs artışı birlikte tartışılmalı."),
        ],
    ),
    Konu(
        "din_dersi", 13.0, "laik_nesrin", "Din kültürü dersi seçmeli olsun",
        "Zorunlu din kültürü ve ahlak bilgisi dersi yıllardır tartışılıyor. Ders seçmeli olsun mu, yoksa içeriği "
        "değişsin mi?",
        ("egitim", "temel-haklar"), oy=acilis(sag=0.66, asiri_sag=0.58), katilim=0.25,
        mesajlar=[
            ("laik_nesrin", "Kırk yıl öğretmenlik yaptım. Bu ders bir dinin bir mezhebini anlatıyor. Alevi öğrencimin derste yaşadığını unutamam."),
            ("omer_faruk_k", "Bu ders bir kültür dersi. Dinini bilmeyen bir nesil yetişirse onu başkaları kötü şekilde öğretir. Bunu istemeyiz."),
            ("yusuf_hoca", "Ben de seçmeli olmasına sıcak bakmıyorum ama Alevi, Hristiyan öğrenciler için muafiyet hakkı kolaylaşmalı.", 0),
            ("akademisyen_nur", "AİHM bu konuda Türkiye aleyhine birden fazla karar verdi. Seçmeli yapmak hukuken de en temiz çözüm."),
            ("turkmen_kizi", "Avrupa'nın her istediğini yapacak değiliz. Bu toplumun değerleri belli."),
            ("tarihci_selim", "Ders 1982 Anayasası ile zorunlu hale geldi. Öncesinde de vardı ama seçmeliydi. Tarihçe bilinirse tartışma daha sakin olur."),
            ("can_ogretmen", "Önerim: dinler tarihi ve felsefe ağırlıklı zorunlu bir ders + isteyene seçmeli din eğitimi."),
            ("hilal_dmr", "Çocuğum din dersinde ne öğreniyor biliyorum ve memnunum. Memnun olmayan muaf olsun ama dersi herkesten almayın."),
            ("devrimci_okan", "Laik bir devlette devlet okulunda zorunlu din eğitimi olmaz, bu kadar basit."),
            ("omer_faruk_k", "Laiklik dine düşmanlık değildir Okan. Fransa laikliği ile Amerika laikliği aynı değil.", 8),
        ],
        ekler=[
            Ek("uzlasma", 7.0, "can_ogretmen",
               "Din kültürü dersi dinler tarihi ve etik ağırlıklı olarak yeniden yazılmalı; muafiyet başvurusu herkes için "
               "kolaylaştırılmalı; isteyene ayrıca seçmeli din eğitimi verilmeli.",
               {ASIRI_SOL: 0.4, SOL: 0.72, MERKEZ: 0.7, SAG: 0.45, ASIRI_SAG: 0.3}, katilim=0.2),
        ],
    ),
    Konu(
        "kopekler", 15.0, "guvenli_sokak", "Sahipsiz köpekler toplanmalı mı?",
        "Mahallemizde çocuklar okula giderken köpek sürüsünden korkuyor. Geçen ay komşumun oğlu ısırıldı. "
        "Sahipsiz köpekler barınaklara toplanmalı mı?",
        ("sehir", "toplum"), katilim=0.3,
        mesajlar=[
            ("guvenli_sokak", "Hayvan düşmanı değilim, evde kedim var. Ama oğlumu okula her sabah ben götürüyorum çünkü sokağın başında altı köpek var."),
            ("pati_dostu", "Toplamak dediğiniz şey barınakta ölüme terk etmek. Kısırlaştır-aşıla-geri bırak dışında bilimsel bir yöntem yok."),
            ("veteriner_ece", "Kısırlaştırma işe yarar ama nüfusun %70'inden fazlası kısırlaştırılırsa. Belediyelerin kapasitesi bunun çok altında, bu yüzden sayı artıyor.", 1),
            ("emekli_hasan", "Bizim zamanımızda sokaklarda bu kadar köpek yoktu. Ne değişti?"),
            ("pati_dostu", "Değişen şu: insanlar cins köpek alıp sokağa atıyor. Sorun köpek değil sahiplenip terk eden.", 3),
            ("guvenli_sokak", "Sebebi ne olursa olsun, çocuğum ısırılırsa bunun hesabını kim verecek?"),
            ("sert_yorumcu", "Hayvanseverler kendi bahçelerine alsın o zaman. Bizim çocuklarımız deneme tahtası değil."),
            ("pati_dostu", "Köpekleri öldürmek isteyen sizin gibi vicdansızlar yüzünden bu ülkede hayvan olmak cehennem. Utanın."),
            ("muhendis_kerem", "İzmir'de mahalle bazında kısırlaştırma kampanyası yapılan yerlerde iki yılda sayı belirgin azaldı. Veriler belediyenin sitesinde var."),
            ("hilal_dmr", "Okul çevreleri ve parklar köpeksiz bölge olsun, köpekler oralardan alınıp başka yerde bakılsın. Orta yol bu olabilir."),
            ("veteriner_ece", "Hilal hanımın önerisi uygulanabilir. Bir de kuduz aşısı takibi şart, şu an kayıt yok."),
            ("kara_tolga", "Avrupa'da sokakta başıboş köpek göremezsiniz. Orada hayvanlara zulüm mü yapılıyor?"),
            ("pati_dostu", "Avrupa'da barınaklar devlet bütçesiyle çalışıyor ve sahiplendirme oranı çok yüksek. Bizde barınak dediğiniz yer çoğu zaman bir çukur.", 11),
            ("yz_teknolog", "İki taraf da çocukların güvenliğinin ve hayvanlara kötü muameleden kaçınmanın önemli olduğunu kabul ediyor. Ayrışma yöntemde: toplama mı, yerinde kısırlaştırma mı."),
        ],
        ekler=[
            Ek("gizle", 1.5, "guvenli_sokak", "Karşı görüşteki herkesi vicdansız ilan ediyor, tartışmayı zehirliyor.",
               {ASIRI_SOL: 0.18, SOL: 0.22, MERKEZ: 0.32, SAG: 0.52, ASIRI_SAG: 0.62}, katilim=0.24, hedef=7,
               yogun={ASIRI_SOL: 3, SOL: 3, MERKEZ: 2, SAG: 2, ASIRI_SAG: 2},
               ozel={"guvenli_sokak": ("evet", 2, "Bana vicdansız denmesini kabul etmiyorum."),
                     "ozgur_soz": ("hayir", 3, "Kırıcı ama tehdit değil. Cevap yazılır, gizlenmez."),
                     "veteriner_ece": ("hayir", 1, "Sert bir duygusal tepki, gizlemeye gerek yok.")}),
            Ek("uzlasma", 19.2, "veteriner_ece",
               "Okul çevreleri, parklar ve hastane bahçeleri köpeksiz bölge olmalı; bu alanlardaki köpekler belediye bakımevlerine "
               "alınmalı. Diğer bölgelerde kısırlaştırma kapasitesi iki katına çıkarılmalı ve aşı takibi kayıt altına alınmalı.",
               {ASIRI_SOL: 0.5, SOL: 0.58, MERKEZ: 0.82, SAG: 0.78, ASIRI_SAG: 0.6}, katilim=0.25,
               ozel={"pati_dostu": ("hayir", 1, "Bakımevi dediğiniz yerlerin denetimi yok."),
                     "guvenli_sokak": ("evet", 1, "Okul çevresi için yeterli.")}),
        ],
    ),
    Konu(
        "lgs", 16.0, "can_ogretmen", "LGS tamamen kaldırılmalı",
        "Merkezi sınav ortaokul öğrencilerini dershaneye ve teste mahkûm ediyor. Yerleştirme okul puanıyla yapılmalı.",
        ("sinav",), oy={ASIRI_SOL: 0.62, SOL: 0.48, MERKEZ: 0.3, SAG: 0.32, ASIRI_SAG: 0.25}, katilim=0.3,
        ozel={"selin_hekim": ("hayir", 1, "Okul puanları okullar arasında karşılaştırılamaz; önce bu çözülmeli."),
              "emre_ogrenci": ("hayir", 1, "Sınav kalkınca torpil başlar.")},
    ),
    # ------------------------------------------------------------------ üçüncü hafta
    Konu(
        "nukleer", 17.5, "muhendis_kerem", "Yeni nükleer santraller kurulmalı mı?",
        "Enerjide dışa bağımlılık ve iklim hedefleri bir yanda, deprem riski ve atık sorunu bir yanda. İkinci ve "
        "üçüncü nükleer santral projeleri konuşuluyor.",
        ("cevre", "ekonomi"),
        mesajlar=[
            ("muhendis_kerem", "Mühendis olarak söyleyeyim: modern santraller deprem tasarımıyla yapılabiliyor. Asıl sorulması gereken kimin işlettiği ve denetimin ne kadar bağımsız olduğu."),
            ("yesil_baris", "Aynı paraya güneş ve rüzgârdan daha fazla enerji alınıyor ve inşaat süresi on yıl değil iki yıl. Nükleer artık pahalı bir tercih."),
            ("anadolu_tuccari", "Sanayici olarak bize kesintisiz enerji lazım. Güneş gece yok, rüzgâr her zaman yok."),
            ("yesil_baris", "Depolama teknolojisi her yıl ucuzluyor. On yıl sonra açılacak santrali bugünün koşullarına göre değerlendiriyorsunuz.", 2),
            ("ulkucu_emre", "Enerjide bağımsızlık milli güvenlik meselesi. Kendi santralimizi kendimiz yapmalıyız ama, yabancı şirkete teslim değil."),
            ("elif_iklim", "Atıkları ne yapacağımızı hâlâ bilmiyoruz. 'Sonra bakarız' bir enerji politikası değil."),
            ("serbest_piyasaci", "Alım garantili fiyatlar halkın sırtına yük. Nükleer olsun ama piyasa fiyatıyla, devlet garantisi olmadan."),
            ("ciftci_ramazan", "Bizim köyün yanına biri güneş paneli tarlası kurdu, verimli tarlanın üstüne. Yenilenebilir de bedava değil yani."),
        ],
    ),
    Konu(
        "kentsel_donusum", 19.0, "muhendis_kerem", "Riskli binalarda kentsel dönüşüm zorunlu olsun",
        "Depremden sonra herkes 'binam sağlam mı' diye soruyor ama dönüşüm, kat maliklerinin anlaşamaması yüzünden "
        "yıllarca sürüyor. Riskli raporu alan binalarda dönüşüm zorunlu olmalı mı?",
        ("sehir",), katilim=0.26,
        mesajlar=[
            ("muhendis_kerem", "Bayraklı'da incelediğimiz binaların önemli kısmı 1999 öncesi. Kat malikleri anlaşamadığı için hiçbir şey yapılmıyor. Deprem anlaşma beklemiyor."),
            ("emekli_hasan", "Zorunlu dediğiniz şey yaşlı insanın evini elinden almak. Müteahhit iki daireyi alıp bize yarım daire veriyor."),
            ("muhendis_kerem", "Haklısınız, o yüzden dönüşümü müteahhide değil kamuya ve kooperatiflere yaptırmak lazım. Zorunluluk ile adil paylaşım birlikte olmalı.", 1),
            ("komun_zehra", "Kentsel dönüşüm yoksul mahalleleri boşaltıp rant alanı açmanın adı oldu. Deprem bahane."),
            ("burak_sehir", "Bahane değil Zehra, binaların gerçekten çürük olduğu ortada. Ama rant tarafı da var, ikisi birden doğru."),
            ("guvenli_sokak", "Keçiören'de bizim bina riskli çıktı. Beş yıldır dava sürüyor. Bu sürede deprem olsa ne olacak?"),
            ("girisimci_ipek", "Sigorta sistemi zorunlu hale getirilse, riskli binanın primi çok yüksek olur ve insanlar kendiliğinden dönüşüme gider."),
            ("muhendis_kerem", "Uzlaşma önereceğim: riskli binalarda zorunlu dönüşüm ama kamu ya da kooperatif eliyle, hak sahibine aynı metrekare garantisiyle."),
        ],
        ekler=[
            Ek("uzlasma", 5.0, "muhendis_kerem",
               "Riskli raporu kesinleşen binalarda dönüşüm iki yıl içinde zorunlu olmalı; dönüşüm kamu ya da kooperatif eliyle "
               "yapılmalı, hak sahiplerine aynı metrekare garantisi verilmeli.",
               {ASIRI_SOL: 0.55, SOL: 0.72, MERKEZ: 0.84, SAG: 0.7, ASIRI_SAG: 0.66}, katilim=0.24),
        ],
    ),
    Konu(
        "bedelli", 21.0, "kara_tolga", "Bedelli askerlik kaldırılsın",
        "Parası olan bedelli öder, parası olmayan on iki ay askerlik yapar. Vatan borcunun fiyatı olmaz.",
        ("guvenlik",), katilim=0.25,
        mesajlar=[
            ("kara_tolga", "Ben askerliğimi yaptım, arkadaşlarımın yarısı bedelli ödedi. Aynı ülkenin vatandaşıyız, aynı yükü taşımalıyız."),
            ("sinif_bilinci", "Tolga'yla aynı fikirde olacağımı düşünmezdim ama bedelli zengine ayrıcalık. Kalksın."),
            ("serbest_piyasaci", "Bence tam tersi: zorunlu askerlik kalksın, profesyonel ordu kurulsun. Bedelli bunun yarım yamalak hali."),
            ("ulkucu_emre", "Profesyonel ordu dediğiniz paralı asker demek. Bu milletin ordusu milletin kendisidir.", 2),
            ("devrimci_okan", "Vicdani ret hakkı tanınmadıkça bu tartışma eksik. Silah taşımak istemeyen biri neden cezalandırılsın?"),
            ("sancak_murat", "Vicdani ret diyen gençlere bir gün sınırda nöbet tutmalarını isterdim. Kimse kimseyi cezalandırmıyor, herkes görevini yapıyor.", 4),
            ("emekli_hasan", "Bedelliden gelen para bütçede ciddi bir kalem. Kaldırırsanız yerine ne koyacaksınız?"),
            ("tarihci_selim", "Bedelli ilk kez 1987'de geldi, o zaman da 'bir kerelik' denmişti. Bir kerelik olan bir şey otuz yıldır sürüyor."),
        ],
    ),
    Konu(
        "kamulastirma", 23.0, "komun_zehra", "Elektrik dağıtımı yeniden kamulaştırılsın",
        "Elektrik dağıtımı özelleştirildikten sonra faturalar katlandı, kayıp-kaçak bedelini dürüst aboneler ödüyor. "
        "Dağıtım şirketleri kamuya geri alınmalı mı?",
        ("ekonomi",), oy=acilis(sag=0.72, asiri_sag=0.74),
        mesajlar=[
            ("komun_zehra", "Faturada enerji bedeli bir kalem, gerisi dağıtım, kayıp-kaçak, iletim. Özel şirket kâr etsin diye halk ödüyor."),
            ("serbest_piyasaci", "Kamu döneminde kayıp-kaçak oranları bugünkünün iki katıydı. Kamu işletmesi verimsizdir, bunu yaşadık."),
            ("sancak_murat", "Stratejik sektörler kamuda olmalı. Bu konuda solcularla aynı yerdeyim, şaşırmayın."),
            ("anadolu_tuccari", "Kamulaştırma tazminatını kim ödeyecek? Yine vergi veren."),
            ("sinif_bilinci", "Özelleştirme bedelinin kaç katı kâr transfer edildi önce ona bakalım.", 3),
            ("mehmet_iktisat", "Ara yol: dağıtım özel kalsın ama tarife ve kayıp-kaçak hedefleri bağımsız ve şeffaf bir kurumca belirlensin. Şu an bu kurum da tam bağımsız değil."),
            ("emekli_hasan", "Kim işletirse işletsin, emekliye fatura desteği gelsin yeter."),
        ],
    ),
    Konu(
        "dogum", 25.0, "hilal_dmr", "Nüfus düşüyor, doğum teşvikleri artırılsın",
        "Doğum oranı nüfusun kendini yenileme seviyesinin altına indi. Doğum yardımları, vergi indirimleri ve kreş "
        "desteği artırılmalı mı?",
        ("toplum",), katilim=0.25,
        mesajlar=[
            ("hilal_dmr", "İkinci çocuğu düşünüyoruz ama hesap tutmuyor. Bir çocuk için bile kreş ücreti kiradan pahalı."),
            ("mor_dayanisma", "Kadınlara 'doğurun' demeden önce iş yerinde doğum izninden sonra işten çıkarılmayı engelleyin. Teşvik değil güvence lazım."),
            ("omer_faruk_k", "Aile toplumun temeli. Evlenen gençlere konut desteği verilsin, gerisi gelir."),
            ("serbest_piyasaci", "Devletin kimin kaç çocuk yapacağına karışması doğru değil. Ekonomi düzelirse insanlar kendiliğinden çocuk yapar."),
            ("hemsire_ayten", "Doğum servisinde çalışıyorum. Kadınların çoğu ikinci çocuğu istiyor ama işini kaybetmekten korkuyor."),
            ("mor_dayanisma", "Ayten hanım tam olarak bunu söylüyorum. Ücretli ebeveyn izni babalara da verilsin.", 4),
            ("turkmen_kizi", "Nüfus meselesi bir beka meselesi. Ama bunu söyleyince yine bir şeyle suçlanıyorsunuz."),
            ("selin_hekim", "Doğurganlık tedavisine erişim de konuşulmalı. Pahalı ve sigorta çok az kapsıyor."),
        ],
        ekler=[
            Ek("uzlasma", 5.5, "hemsire_ayten",
               "Doğum teşviki nakit yardımla sınırlı kalmamalı: ücretsiz ya da düşük ücretli kreş, doğum sonrası işten çıkarmaya "
               "karşı güvence ve babalara da tanınan ücretli ebeveyn izni birlikte sağlanmalı.",
               {ASIRI_SOL: 0.72, SOL: 0.88, MERKEZ: 0.75, SAG: 0.66, ASIRI_SAG: 0.55}, katilim=0.22),
        ],
    ),
    Konu(
        "spam", 26.0, "indirim_dunyasi", "İndirimli ürünler burada!",
        "Mağazamızda bu hafta büyük indirim, herkesi bekleriz. Kapıda ödeme, ücretsiz kargo.",
        ("saglik",), oy={ASIRI_SOL: 0.55, SOL: 0.6, MERKEZ: 0.58, SAG: 0.56, ASIRI_SAG: 0.52}, katilim=0.2,
        ozel={"selin_hekim": ("evet", 1, "Önce açılsın, topluluk kendisi karar versin.")},
        ekler=[
            Ek("sil", 0.5, "selin_hekim", "Reklam; sağlık konusuyla ilgisi yok.",
               {ASIRI_SOL: 0.93, SOL: 0.95, MERKEZ: 0.96, SAG: 0.94, ASIRI_SAG: 0.9}, katilim=0.22,
               yogun={ASIRI_SOL: 2, SOL: 2, MERKEZ: 3, SAG: 2, ASIRI_SAG: 2}),
        ],
    ),
    Konu(
        "maden", 27.5, "ciftci_ramazan", "Tarım arazilerine maden izni verilmesin",
        "Konya'da verimli ovanın yanına maden ruhsatı verildi. Yeraltı suyu zaten azalmışken madenler suyu daha da "
        "kirletir. Tarım arazilerinde maden izni yasaklanmalı mı?",
        ("cevre",),
        mesajlar=[
            ("ciftci_ramazan", "Babam bu tarlayı ekti, dedem ekti. Kuyumuz her yıl daha derine iniyor. Bir de maden gelirse biz göç ederiz."),
            ("yesil_baris", "Ramazan abiyle aynı yerdeyim. Kaz Dağları'nda, Artvin'de aynı şey oldu."),
            ("anadolu_tuccari", "Madencilik olmadan sanayi olmaz. Ama çevre etki raporu göstermelik olmasın, bu doğru."),
            ("ciftci_ramazan", "Ben solcu değilim, hayatımda yeşilci bir partiye oy vermedim. Ama su meselesi sağ sol meselesi değil.", 1),
            ("muhendis_kerem", "Su havzalarında ve birinci sınıf tarım arazisinde yasak, diğer yerlerde gerçek bir ÇED. Bu dengeli olur."),
            ("ulkucu_emre", "Toprağımız satılık değil. Yabancı maden şirketlerine ruhsat verilmemeli."),
        ],
        ekler=[
            Ek("uzlasma", 4.0, "muhendis_kerem",
               "Birinci sınıf tarım arazilerinde ve su havzalarında maden ruhsatı verilmemeli; diğer alanlarda çevresel etki "
               "değerlendirmesi bağımsız kurullarca yapılmalı ve halka açık olmalı.",
               {ASIRI_SOL: 0.86, SOL: 0.9, MERKEZ: 0.82, SAG: 0.72, ASIRI_SAG: 0.74}, katilim=0.24),
        ],
    ),
    Konu(
        "toplu_tasima", 29.0, "kurye_baris", "Öğrencilere ve emeklilere toplu taşıma ücretsiz olsun",
        "Öğrenci ve emekliler için toplu taşıma ücretsiz olmalı mı? Belediye bütçeleri bunu kaldırır mı?",
        ("sehir",),
        mesajlar=[
            ("kurye_baris", "Bağcılar'dan Levent'e gidip geliyorum. Ayda ulaşıma verdiğim para maaşımın yedide biri."),
            ("gul_esnaf", "Her şey bedava olunca kim ödeyecek? Belediye borçlanırsa yine biz ödüyoruz."),
            ("elif_iklim", "Ücretsiz toplu taşıma araba kullanımını azaltır. Tallinn'de denendi, sonuçlar karışık ama trafiği rahatlattı."),
            ("emekli_hasan", "65 yaş üstü zaten ücretsiz. Asıl dert 60-65 arası emekliler."),
            ("burak_sehir", "Ücretsiz yerine kademeli tarife daha adil: gelire göre indirim. Ama bunun için gelir verisini paylaşmak lazım, o da ayrı dert."),
        ],
    ),
    Konu(
        "emekli", 31.0, "emekli_hasan", "En düşük emekli aylığı asgari ücrete eşitlensin",
        "Kırk yıl çalışan emekli asgari ücretin altında maaş alıyor. En düşük emekli aylığı asgari ücrete eşitlenmeli mi?",
        ("ucretler",),
        mesajlar=[
            ("emekli_hasan", "Kırk yıl çalıştım, aldığım maaş kiramı karşılamıyor. Torunuma harçlık veremeyen dede oldum."),
            ("sendikaci_gonul", "Emekli sandığına yıllarca prim yatırıldı, o paralar başka yerlere aktarıldı. Bu bir hak meselesi."),
            ("serbest_piyasaci", "Sistemin açığı her yıl büyüyor. Eşitleme yapılırsa ya vergi artar ya enflasyon."),
            ("hemsire_ayten", "Emekli olduktan sonra çalışmaya devam eden çok meslektaşım var. Bu normal değil."),
            ("anadolu_tuccari", "Emekliye hak ettiğini verelim ama önce kayıt dışını bitirelim ki sisteme para girsin."),
        ],
    ),
    # ------------------------------------------------------------------ son günler: oylamalar sürüyor
    Konu(
        "kitaplar", 29.0, "can_ogretmen", "Ders kitapları tamamen dijitalleşsin mi?",
        "Basılı ders kitabı yerine tablet ve dijital içerik: maliyet, erişim eşitliği ve göz sağlığı.",
        ("egitim",),
        mesajlar=[
            ("selin_hekim", "Ekran süresi zaten çok yüksek. İlkokulda basılı kitap kalmalı."),
            ("emre_ogrenci", "her öğrencinin tableti interneti yok, eşitsizliği büyütür"),
            ("uzay_cocugu", "okulda dağıtılan tablet bir dönemde bozuldu, şarj aleti bile vermediler"),
            ("can_ogretmen", "Karma model: basılı temel kitap, dijital ek içerik. En mantıklısı bu."),
            ("yusuf_hoca", "Kitap kokusunu bilmeyen bir nesil yetişiyor. Basılı kitabı kaldırmayalım."),
        ],
        ekler=[
            Ek("sil", 1.2, "emre_ogrenci", "Benzer bir konu geçen dönem tartışıldı, tekrar.",
               {ASIRI_SOL: 0.15, SOL: 0.12, MERKEZ: 0.18, SAG: 0.2, ASIRI_SAG: 0.22}, katilim=0.14,
               yogun={ASIRI_SOL: 2, SOL: 2, MERKEZ: 2, SAG: 2, ASIRI_SAG: 2}),
        ],
    ),
    Konu(
        "kripto", 37.5, "girisimci_ipek", "Kripto paralar tamamen yasaklanmalı mı?",
        "Kripto borsalarındaki dolandırıcılıklardan sonra tam yasak mı, sıkı düzenleme mi? Vergi ve şeffaflık boyutu.",
        ("ekonomi",), katilim=0.16,
        ozel={"gul_esnaf": ("hayir", 1, "Yasak değil düzenleme gerekir; konu ise tartışılmalı.")},
    ),
    Konu(
        "kimlikle_giris", 38.6, "polis_emeklisi", "Sosyal medyaya kimlikle giriş zorunlu olsun mu?",
        "Sahte hesaplar, dolandırıcılık ve hakaret davalarında failin bulunamaması... Sosyal medya hesapları kimlik "
        "doğrulamasıyla açılmalı mı?",
        ("dijital", "basin"), katilim=0.14,
        ozel={"ozgur_soz": ("evet", 1, "Bu fikre karşıyım ama tartışılsın, açılmasından yanayım."),
              "zeynep_veri": ("evet", 1, "Konuşalım; veri güvenliği tarafı mutlaka tartışılmalı.")},
    ),
    Konu(
        "oy_yasi", 39.1, "devrimci_okan", "Yerel seçimlerde 16 yaş oy kullanabilsin",
        "Avusturya, Malta gibi ülkelerde 16 yaşındakiler oy kullanabiliyor. Belediye seçimlerinde oy yaşı 16'ya inmeli mi?",
        ("hukuk",), katilim=0.12,
    ),
]

# Konuşmalar dışındaki teklifler (yönetmelik, uzmanlık). gun = demo başlangıcından itibaren.
YONETMELIK = [
    # (gün, kim, kural, değer, gerekçe, eğilim, katılım); son günlerde açılanların oylaması sürüyor
    (1.0, "mehmet_iktisat", "quorum_percent", "15",
     "Üye sayısı hızla artıyor; konusu dar olan teklifler %30 katılıma ulaşamıyor. Yeter sayı %15 olsun.",
     {ASIRI_SOL: 0.7, SOL: 0.78, MERKEZ: 0.85, SAG: 0.8, ASIRI_SAG: 0.75}, 0.42),
    (22.0, "ozgur_soz", "strateji_mesaj_gizleme", "basit",
     "Karesel oylama tartışmalı mesajları korumak için iyi ama karmaşık; herkes anlasın diye basit çoğunluğa dönülsün.",
     {ASIRI_SOL: 0.25, SOL: 0.22, MERKEZ: 0.2, SAG: 0.3, ASIRI_SAG: 0.35}, 0.2),
    (30.0, "burak_sehir", "voting_days", "7",
     "Üye sayısı üç bine yaklaştı; herkesin oylamaları görüp karar verebilmesi için üç gün kısa kalıyor.",
     {ASIRI_SOL: 0.78, SOL: 0.82, MERKEZ: 0.86, SAG: 0.84, ASIRI_SAG: 0.8}, 0.3),
    (38.0, "deniz_yazilim", "agent_weight_percent", "75",
     "YZ ajanları her teklifi okuyup gerekçe yazıyor; oyları daha çok sayılmalı.",
     {ASIRI_SOL: 0.2, SOL: 0.3, MERKEZ: 0.45, SAG: 0.3, ASIRI_SAG: 0.2}, 0.1),
]

UZMANLIK = [
    # (gün, kim, kavram, düzey, gerekçe, eğilim, katılım)
    (9.0, "ayse_hukuk", "hukuk", 2, "On iki yıldır insan hakları avukatıyım; Kurultay'da hukuk tartışmalarına düzenli katkı veriyorum.",
     {ASIRI_SOL: 0.7, SOL: 0.85, MERKEZ: 0.8, SAG: 0.62, ASIRI_SAG: 0.45}, 0.2),
    (20.0, "muhendis_kerem", "sehir", 2, "İnşaat mühendisiyim, yirmi yıldır deprem dayanımı üzerine çalışıyorum.",
     {ASIRI_SOL: 0.75, SOL: 0.82, MERKEZ: 0.88, SAG: 0.84, ASIRI_SAG: 0.8}, 0.18),
    (24.0, "veteriner_ece", "saglik", 1, "Veteriner hekimim; zoonoz hastalıklar ve kuduz konusunda saha deneyimim var.",
     {ASIRI_SOL: 0.6, SOL: 0.66, MERKEZ: 0.7, SAG: 0.62, ASIRI_SAG: 0.55}, 0.16),
    (38.8, "zeynep_veri", "veri-gizliligi", 2, "Veri koruma alanında çalışıyorum; KVKK uyum projeleri yürüttüm.",
     {ASIRI_SOL: 0.7, SOL: 0.75, MERKEZ: 0.82, SAG: 0.7, ASIRI_SAG: 0.6}, 0.12),
]
