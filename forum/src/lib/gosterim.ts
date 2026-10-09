import "server-only";
import { db } from "./db";
import { sayi } from "./bicim";
import { DEMO_TAKMA_ADLARI } from "./demoHesaplari";
import { kurumAdlari, tepkiBildir } from "./etki";
import { acikOylama, gorunenSayim, oyDurumu, oyKullan, oylamaGetir, sayim, secmenler, type Oylama, type Sayim } from "./oylama";
import { acikSurecVarMi, surecGetir } from "./surec";
import { uzlasmaOner } from "./tartisma";
import { tartismayiAnalizEt } from "./yz";

/*
 * CANLI GÖSTERİM (tanıtım turunun sonunda)
 * Süren bir uzlaşma oylaması gözün önünde sonuçlanır, ardından ilgili kurum resmî tepki bildirir.
 * Her şey gerçek iş kurallarıyla olur: oyları demo hesapları kullanır (kendi açtığın hesaplara dokunulmaz),
 * oylama eşik aşılınca kendiliğinden kapanır, konu uzlaşmayla kapanır, tepki Açık Arşiv’e yazılır.
 * Gösterime uygun oylama kalmadıysa sıradaki senaryonun konusunda yeni bir uzlaşma önerisi açılır;
 * böylece gösterim demo verisi yenilenmeden tekrar tekrar yapılabilir.
 */

export type GosterimHedefi = {
  surecId: number;
  konuId: number;
  konuBaslik: string;
  uzlasma: string;
  kurumAd: string;
  baslangic: Sayim;
};

type Aday = { surecId: number; konuId: number; baslik: string; kategoriId: number };

/** Gösterim için hazır senaryolar: tartışması bir ortak metne varmaya uygun, ilgili kurumu belli demo konuları. */
const SENARYOLAR: { baslik: string; kurum: string; metin: string }[] = [
  {
    baslik: "Merkezi sınavlar kaldırılsın, yerine okul içi değerlendirme mi gelsin?",
    kurum: "egitim_bakanligi",
    metin:
      "Merkezi sınavların ağırlığı kademeli olarak %30’a düşürülmeli; kalan %70 okul içi, süreç odaklı değerlendirmeyle belirlenmelidir. Not şişirmesine karşı okul notları örnekleme usulüyle dış denetimden geçmeli ve okul bazında not ortalamaları kamuya açıklanmalıdır.",
  },
  {
    baslik: "Dört günlük çalışma haftası kamuda pilot olarak denensin",
    kurum: "calisma_bakanligi",
    metin:
      "Dört günlük çalışma haftası, vatandaşa hizmet saatleri kısalmadan önce gönüllü kurumlarda bir yıllık pilot olarak denenmeli; verimlilik, maliyet ve vatandaş memnuniyeti sonuçları yayımlanmadan genele yayılmamalıdır.",
  },
  {
    baslik: "Kamu kurumlarının sosyal medyada vatandaşları engellemesi yasaklansın",
    kurum: "dijital_komisyon",
    metin:
      "Kamu kurumlarının resmî hesapları vatandaşları yalnızca tehdit içeren mesajlar nedeniyle ve gerekçesini kayda geçirerek engelleyebilmeli; diğer engellemeler kaldırılmalı, engelleme sayıları her yıl kamuya açıklanmalıdır.",
  },
  {
    baslik: "Çocuk psikiyatrisine randevu üç ayı geçmesin",
    kurum: "saglik_bakanligi",
    metin:
      "Çocuk psikiyatrisinde ilk randevu en geç üç ay içinde verilmeli; bunun için okul rehberlik servisleri ile aile sağlığı merkezleri ön görüşme yapmalı ve acil vakalar ayrı bir hızlı hatla yönlendirilmelidir.",
  },
  {
    baslik: "Maden izinlerindeki çevre raporları tümüyle halka açık olsun",
    kurum: "cevre_bakanligi",
    metin:
      "Maden ve enerji projelerinin çevre etki değerlendirme raporları, ekleri ve uzman görüşleriyle birlikte karar verilmeden en az otuz gün önce internette yayımlanmalı; yöre halkının itirazları yanıtlanmadan izin verilmemelidir.",
  },
  {
    baslik: "İlkokulda ev ödevi haftada iki saati geçmesin",
    kurum: "egitim_bakanligi",
    metin:
      "İlkokulda ev ödevi haftalık toplam iki saati geçmemeli; ödevler okulda yapılamayan okuma ve gözlem çalışmalarıyla sınırlı tutulmalı, aileden yardım gerektiren proje ödevleri verilmemelidir.",
  },
  {
    baslik: "Kamu uygulamaları reklamsız ve izleyicisiz olsun",
    kurum: "dijital_komisyon",
    metin:
      "Kamu kurumlarının mobil uygulamaları ve internet siteleri reklam ve üçüncü taraf izleyici içermemeli; kullanılan analiz araçları ve toplanan veriler her uygulamanın gizlilik sayfasında açıkça listelenmelidir.",
  },
  {
    baslik: "Sağlık çalışanlarına 24 saatlik nöbet sonrası zorunlu dinlenme",
    kurum: "saglik_bakanligi",
    metin:
      "24 saatlik nöbetin ardından sağlık çalışanına en az 24 saat kesintisiz dinlenme hakkı tanınmalı; bu süre izin günlerinden düşülmemeli ve nöbet çizelgeleri hastane panolarında herkese açık olmalıdır.",
  },
];

/** Senaryosu olmayan konularda uzlaşmayı hangi kurum yanıtlar: ana bölüme göre. Eşi olmayan bölümler gösterime alınmaz. */
const BOLUM_KURUMU: Record<string, string> = {
  "Eğitim": "egitim_bakanligi",
  "Ekonomi ve Çalışma Hayatı": "calisma_bakanligi",
  "Sağlık": "saglik_bakanligi",
  "Çevre ve Enerji": "cevre_bakanligi",
  "Dijital Haklar ve Teknoloji": "dijital_komisyon",
  "İfade Özgürlüğü ve Basın": "dijital_komisyon",
};

/** Konunun uzlaşmasını yanıtlayacak kurum: senaryodaki kurum, yoksa ana bölümün kurumu. */
function ilgiliKurum(konuId: number, baslik: string): { id: number; takma_ad: string } | undefined {
  const anaBolum = (
    db
      .prepare(
        `SELECT COALESCE(u.ad, c.ad) AS ad FROM konular k JOIN kategoriler c ON c.id = k.kategori_id
         LEFT JOIN kategoriler u ON u.id = c.ust_id WHERE k.id = ?`,
      )
      .get(konuId) as { ad: string }
  ).ad;
  const takma = SENARYOLAR.find((s) => s.baslik === baslik)?.kurum ?? BOLUM_KURUMU[anaBolum];
  if (!takma) return undefined;
  return db.prepare("SELECT id, takma_ad FROM kullanicilar WHERE takma_ad = ? AND rol = 'resmi'").get(takma) as
    | { id: number; takma_ad: string }
    | undefined;
}

function hedefBul(): (Aday & { kurumId: number; kurumTakma: string }) | null {
  const adaylar = db
    .prepare(
      `SELECT s.id AS surecId, k.id AS konuId, k.baslik, k.kategori_id AS kategoriId FROM surecler s
       JOIN konular k ON k.id = s.hedef_id
       WHERE s.tur = 'konu_kapat' AND s.durum = 'suruyor' AND s.asama = 'uyeler' AND k.durum = 'aktif'
       ORDER BY s.id`,
    )
    .all() as Aday[];
  for (const a of adaylar) {
    const oylama = acikOylama(a.surecId);
    if (!oylama || !demoOylariYeter(oylama)) continue;
    const kurum = ilgiliKurum(a.konuId, a.baslik);
    if (!kurum) continue;
    return { ...a, kurumId: kurum.id, kurumTakma: kurum.takma_ad };
  }
  return null;
}

/** Oy hakkı olan ve henüz oy vermemiş demo hesaplarının hepsi "evet" derse eşik aşılıyor mu? */
function demoOylariYeter(oylama: Oylama): boolean {
  const s = sayim(oylama);
  if (s.gereken === null) return false;
  const demo = new Set(DEMO_TAKMA_ADLARI);
  const uyeler = db.prepare("SELECT id, takma_ad FROM kullanicilar").all() as { id: number; takma_ad: string }[];
  const secmen = secmenler(oylama);
  const temsil = new Set<string>(); // kendi oyu ve taşıdığı emanetler; bir kişi iki kez sayılmasın
  for (const u of uyeler) {
    if (!demo.has(u.takma_ad) || !secmen.has(u.id)) continue;
    const d = oyDurumu(oylama, u.id);
    if (d.tur !== "oy_verebilir") continue;
    temsil.add(u.takma_ad);
    d.temsilEdilecekler.forEach((t) => temsil.add(t));
  }
  return s.evet + temsil.size >= s.gereken;
}

/** Konuya yazmış (yoksa konuyu açmış) ilk demo üyesi: uzlaşmayı o önerir. */
function onerenBul(konuId: number): number | null {
  const demo = new Set(DEMO_TAKMA_ADLARI);
  const adaylar = db
    .prepare(
      `SELECT u.id, u.takma_ad FROM mesajlar m JOIN kullanicilar u ON u.id = m.yazan_id
       WHERE m.konu_id = ? AND u.rol IN ('uye', 'bilirkisi') ORDER BY m.id`,
    )
    .all(konuId) as { id: number; takma_ad: string }[];
  const acan = db
    .prepare("SELECT u.id, u.takma_ad FROM konular k JOIN kullanicilar u ON u.id = k.acan_id WHERE k.id = ? AND u.rol IN ('uye', 'bilirkisi')")
    .get(konuId) as { id: number; takma_ad: string } | undefined;
  return [...adaylar, ...(acan ? [acan] : [])].find((u) => demo.has(u.takma_ad))?.id ?? null;
}

/**
 * Gösterime uygun süren oylama yoksa sıradaki senaryonun konusunda uzlaşma önerisi açar.
 * Öneren ve iki demo üyesi "evet" der; böylece oylama gösterimde yarıdan başlar.
 */
function senaryoKur(): void {
  const demo = new Set(DEMO_TAKMA_ADLARI);
  // Senaryolar bitince: tartışması olan diğer açık konular, metni YZ Analist'in öne çıkardığı görüşlerden
  const yedekler = (
    db
      .prepare(
        `SELECT k.id, k.baslik FROM konular k WHERE k.durum = 'aktif'
         AND (SELECT COUNT(*) FROM mesajlar m WHERE m.konu_id = k.id) >= 3 ORDER BY k.id`,
      )
      .all() as { id: number; baslik: string }[]
  ).flatMap((k) => {
    if (!ilgiliKurum(k.id, k.baslik)) return [];
    const a = tartismayiAnalizEt(k.id);
    if (!a || a.oneCikanlar.length < 2) return [];
    const metin = "Tartışmada öne çıkan görüşler ortak metinde birleşti: " + a.oneCikanlar.map((o) => o.cumle.replace(/[.!?]+$/, "")).join("; ") + ".";
    return [{ baslik: k.baslik, metin }];
  });
  for (const s of [...SENARYOLAR, ...yedekler]) {
    const konu = db.prepare("SELECT id FROM konular WHERE baslik = ? AND durum = 'aktif'").get(s.baslik) as { id: number } | undefined;
    if (!konu || acikSurecVarMi("konu_kapat", konu.id)) continue;
    const oneren = onerenBul(konu.id);
    if (oneren === null) continue;
    const r = uzlasmaOner(konu.id, oneren, s.metin);
    if ("hata" in r) continue;
    const oylama = acikOylama(r.id);
    if (!oylama) continue;
    const uyeler = db.prepare("SELECT id, takma_ad FROM kullanicilar ORDER BY id").all() as { id: number; takma_ad: string }[];
    const secmen = secmenler(oylama);
    let verilen = 0;
    for (const u of [uyeler.find((x) => x.id === oneren)!, ...uyeler]) {
      if (verilen >= 3 || oylamaGetir(oylama.id)!.durum !== "acik") break;
      if (!demo.has(u.takma_ad) || !secmen.has(u.id) || oyDurumu(oylama, u.id).tur !== "oy_verebilir") continue;
      if (!oyKullan(oylama.id, u.id, "evet")) verilen++;
    }
    if (oylamaGetir(oylama.id)!.durum === "acik" && demoOylariYeter(oylama)) return;
  }
}

export function gosterimHedefi(): GosterimHedefi | null {
  let h = hedefBul();
  if (!h) {
    senaryoKur();
    h = hedefBul();
  }
  if (!h) return null;
  const s = surecGetir(h.surecId)!;
  return {
    surecId: h.surecId,
    konuId: h.konuId,
    konuBaslik: h.baslik,
    uzlasma: (JSON.parse(s.veri) as { metin: string }).metin,
    kurumAd: kurumAdlari().get(h.kurumTakma) ?? h.kurumTakma,
    baslangic: gorunenSayim(acikOylama(h.surecId)!),
  };
}

const kisalt = (s: string, n: number) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);

export function gosterimiOynat(surecId: number): { hata: string } | { bitis: Sayim; tepki: string; konuId: number } {
  const h = hedefBul();
  if (!h || h.surecId !== surecId) return { hata: "Bu oylama artık gösterime uygun değil." };
  const oylama = acikOylama(surecId)!;

  // Oy hakkı olan ve henüz oy vermemiş demo hesapları sırayla "evet" der; eşik aşılınca oylama kendiliğinden kapanır
  const demo = new Set(DEMO_TAKMA_ADLARI);
  const secmen = secmenler(oylama);
  const uyeler = db.prepare("SELECT id, takma_ad FROM kullanicilar").all() as { id: number; takma_ad: string }[];
  for (const u of uyeler) {
    if (oylamaGetir(oylama.id)!.durum !== "acik") break;
    if (!demo.has(u.takma_ad) || !secmen.has(u.id)) continue;
    if (oyDurumu(oylama, u.id).tur !== "oy_verebilir") continue;
    oyKullan(oylama.id, u.id, "evet");
  }
  const son = oylamaGetir(oylama.id)!;
  if (son.durum !== "kabul") return { hata: "Demo hesaplarının oyu bu oylamayı sonuçlandırmaya yetmedi." };

  const bitis = gorunenSayim(son);
  const metin = (JSON.parse(surecGetir(surecId)!.veri) as { metin: string }).metin;
  const tepki =
    `Kurultay’da ${sayi(bitis.evet)} vatandaşın oyuyla kabul edilen “${kisalt(metin, 110)}” uzlaşmasını çalışma gündemimize aldık ` +
    `ve uygulamaya koyacağız. Bu amaçla bir çalışma grubu kuruldu; ilk adım olarak önümüzdeki dönemde pilot uygulama başlatılacak. ` +
    `Uygulamanın her aşamasını bu platformda kamuoyuyla paylaşacağız.`;
  const sonuc = tepkiBildir(h.konuId, h.kurumId, "gundemde", tepki);
  if ("hata" in sonuc) return { hata: sonuc.hata };
  return { bitis, tepki, konuId: h.konuId };
}
