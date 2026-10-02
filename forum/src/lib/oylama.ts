import "server-only";
import { db } from "./db";
import { gerekenEvet, kurallar, kuralUygula, type Oran } from "./kurallar";
import { ataZinciri } from "./ontoloji";
import { forumYoneticisi, temsilciIdleri } from "./secim";
import { deftereYaz } from "./defter";
import { gunSonra, suan, suanIso } from "./saat";
import { buyut, carpan } from "./kalabalik";

/*
 * KARAR SÜRECİ — ABD yasama sürecinin forumdaki karşılığı
 *
 *   Konu önerisi  (ABD: basit karar)   → Topluluk Oylaması
 *   İlke önerisi (ABD: yasa tasarısı) → Topluluk Oylaması → Yayın Kurulu → Genel Yayın Yönetmeni
 *                                          └ veto → Vetoyu aşma: Topluluk Oylaması (2/3) → Yayın Kurulu (2/3)
 *
 * Topluluk Oylaması  : konuyla ilgili üyeler (kategoriyi/üstünü takip edenler; forum geneli için tüm üyeler).
 *                 Oy devri kullanılabilir. Varsayılan salt çoğunluk.
 * Yayın Kurulu: her ana kategoriden eşit sayıda temsilci; kişisel oy (devir yok). Varsayılan 3/5.
 * Genel Yayın Yönetmeni : süre içinde onaylar ya da veto eder; karar vermezse öneri kendiliğinden yürürlüğe girer.
 *
 * Oylar kesindir; sonuç kesinleşince oylama süre beklenmeden kapanır.
 */

export type SurecTuru = "konu_ac" | "konu_kapat" | "mesaj_sil" | "konu_sil" | "konu_duzenle" | "kural_degistir";
export type Asama = "uyeler" | "temsilciler" | "yonetici" | "veto_uyeler" | "veto_temsilciler" | "bitti";
export type Secim = "evet" | "hayir";

// ABD'deki karşılıkları: basit karar (tek meclis) · ortak karar (iki meclis) · yasa (iki meclis + başkan)
const BASIT: Asama[] = ["uyeler"];
const ORTAK: Asama[] = ["uyeler", "temsilciler"];
const YASA: Asama[] = ["uyeler", "temsilciler", "yonetici"];

export const SUREC_TURLERI: Record<SurecTuru, { ad: string; yol: Asama[] }> = {
  konu_ac: { ad: "Konu önerisi", yol: BASIT },
  konu_kapat: { ad: "Uzlaşma önerisi", yol: BASIT },
  mesaj_sil: { ad: "Mesaj silme önerisi", yol: ORTAK },
  konu_sil: { ad: "Konu silme önerisi", yol: ORTAK },
  konu_duzenle: { ad: "Konu düzenleme önerisi", yol: ORTAK },
  kural_degistir: { ad: "İlke önerisi", yol: YASA },
};

export const ASAMA_ADLARI: Record<Asama, string> = {
  uyeler: "Topluluk Oylaması",
  temsilciler: "Yayın Kurulu",
  yonetici: "Genel Yayın Yönetmeni",
  veto_uyeler: "Vetoyu aşma: Topluluk Oylaması",
  veto_temsilciler: "Vetoyu aşma: Yayın Kurulu",
  bitti: "Sonuç",
};

export type Surec = {
  id: number;
  tur: SurecTuru;
  hedef_id: number | null;
  kategori_id: number | null;
  oneren_id: number;
  veri: string;
  asama: Asama;
  durum: "suruyor" | "kabul" | "red";
  olusturma: string;
  kapanis: string | null;
  yonetici_bitis: string | null;
  gecmis: string;
};

export type Oylama = {
  id: number;
  surec_id: number;
  asama: Asama;
  esik: "salt" | "basit" | Oran;
  kategori_id: number | null;
  baslangic: string;
  bitis: string;
  durum: "acik" | "kabul" | "red";
  kapanis: string | null;
};

const simdi = suanIso;

// ---------------- Süreç ----------------

export function surecGetir(id: number): Surec | undefined {
  return db.prepare("SELECT * FROM surecler WHERE id = ?").get(id) as Surec | undefined;
}

export function hedefSureci(tur: SurecTuru, hedefId: number): Surec | undefined {
  return db
    .prepare("SELECT * FROM surecler WHERE tur = ? AND hedef_id = ? ORDER BY id DESC LIMIT 1")
    .get(tur, hedefId) as Surec | undefined;
}

export function turSurecleri(tur: SurecTuru): (Surec & { oneren: string })[] {
  return db
    .prepare(
      `SELECT s.*, u.takma_ad AS oneren FROM surecler s JOIN kullanicilar u ON u.id = s.oneren_id
       WHERE s.tur = ? ORDER BY s.durum = 'suruyor' DESC, s.id DESC`,
    )
    .all(tur) as (Surec & { oneren: string })[];
}

export function surecOylamalari(surecId: number): Oylama[] {
  return db.prepare("SELECT * FROM oylamalar WHERE surec_id = ? ORDER BY id").all(surecId) as Oylama[];
}

export function acikOylama(surecId: number): Oylama | undefined {
  return db.prepare("SELECT * FROM oylamalar WHERE surec_id = ? AND durum = 'acik'").get(surecId) as Oylama | undefined;
}

export function surecGecmisi(surec: Surec): { zaman: string; olay: string }[] {
  return JSON.parse(surec.gecmis);
}

/** Süreç kaydına ve dağıtık deftere yazar. */
function gecmiseEkle(surecId: number, olay: string) {
  const s = surecGetir(surecId)!;
  const g = [...surecGecmisi(s), { zaman: simdi(), olay }];
  db.prepare("UPDATE surecler SET gecmis = ? WHERE id = ?").run(JSON.stringify(g), surecId);
  deftereYaz("surec", { surec_id: surecId, tur: s.tur, olay });
}

/** Bir konuya bağlı süreçler (konu kapatma/silme/düzenleme + konudaki mesajların silme önerileri). */
export function konuSurecleri(konuId: number): (Surec & { oneren: string })[] {
  return db
    .prepare(
      `SELECT s.*, u.takma_ad AS oneren FROM surecler s JOIN kullanicilar u ON u.id = s.oneren_id
       WHERE (s.tur IN ('konu_kapat','konu_sil','konu_duzenle') AND s.hedef_id = ?)
          OR (s.tur = 'mesaj_sil' AND s.hedef_id IN (SELECT id FROM mesajlar WHERE konu_id = ?))
       ORDER BY s.durum = 'suruyor' DESC, s.id DESC`,
    )
    .all(konuId, konuId) as (Surec & { oneren: string })[];
}

export function acikSurecVarMi(tur: SurecTuru, hedefId: number): boolean {
  return !!db.prepare("SELECT 1 FROM surecler WHERE tur = ? AND hedef_id = ? AND durum = 'suruyor'").get(tur, hedefId);
}

export function surecBaslat(
  tur: SurecTuru,
  hedefId: number | null,
  kategoriId: number | null,
  onerenId: number,
  veri: object = {},
): number {
  const ilk = SUREC_TURLERI[tur].yol[0];
  const r = db
    .prepare(
      `INSERT INTO surecler (tur, hedef_id, kategori_id, oneren_id, veri, asama, olusturma)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(tur, hedefId, kategoriId, onerenId, JSON.stringify(veri), ilk, simdi());
  const id = Number(r.lastInsertRowid);
  gecmiseEkle(id, `${SUREC_TURLERI[tur].ad} sunuldu.`);
  asamayaGec(surecGetir(id)!, ilk);
  return id;
}

function asamayaGec(surec: Surec, asama: Asama): void {
  const k = kurallar();
  db.prepare("UPDATE surecler SET asama = ? WHERE id = ?").run(asama, surec.id);

  const oylamaAc = (esik: Oylama["esik"], kategoriId: number | null) => {
    db.prepare(
      `INSERT INTO oylamalar (surec_id, asama, esik, kategori_id, baslangic, bitis) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(surec.id, asama, esik, kategoriId, simdi(), gunSonra(k.oylamaSuresiGun));
    gecmiseEkle(surec.id, `${ASAMA_ADLARI[asama]} başladı.`);
  };

  switch (asama) {
    case "uyeler":
      return oylamaAc(k.cogunlukTuru, surec.kategori_id);
    case "veto_uyeler":
      return oylamaAc(k.vetoAsimOrani, surec.kategori_id);
    case "temsilciler":
    case "veto_temsilciler":
      if (temsilciIdleri().size === 0) {
        gecmiseEkle(surec.id, "Yayın Kurulu henüz oluşmadığı için bu aşama atlandı.");
        return asamaSonucu(surecGetir(surec.id)!, "kabul");
      }
      return oylamaAc(asama === "temsilciler" ? k.kurulKabulOrani : k.vetoAsimOrani, null);
    case "yonetici":
      if (!forumYoneticisi()) {
        gecmiseEkle(surec.id, "Genel Yayın Yönetmeni olmadığı için öneri onaya gerek kalmadan kabul edildi.");
        return bitir(surecGetir(surec.id)!, "kabul");
      }
      db.prepare("UPDATE surecler SET yonetici_bitis = ? WHERE id = ?").run(gunSonra(k.yoneticiSuresiGun), surec.id);
      gecmiseEkle(surec.id, "Öneri Genel Yayın Yönetmeni'nin onayına sunuldu.");
      return;
  }
}

/** Bir aşama bittiğinde sürecin sonraki adımını belirler. */
function asamaSonucu(surec: Surec, sonuc: "kabul" | "red"): void {
  if (surec.asama === "veto_uyeler" || surec.asama === "veto_temsilciler") {
    if (sonuc === "red") {
      gecmiseEkle(surec.id, "Veto aşılamadı; veto geçerli.");
      return bitir(surec, "red");
    }
    if (surec.asama === "veto_uyeler") return asamayaGec(surec, "veto_temsilciler");
    gecmiseEkle(surec.id, "Veto aşıldı.");
    return bitir(surec, "kabul");
  }

  if (sonuc === "red") return bitir(surec, "red");
  const yol = SUREC_TURLERI[surec.tur].yol;
  const sonraki = yol[yol.indexOf(surec.asama) + 1];
  return sonraki ? asamayaGec(surec, sonraki) : bitir(surec, "kabul");
}

function bitir(surec: Surec, sonuc: "kabul" | "red"): void {
  db.prepare("UPDATE surecler SET asama = 'bitti', durum = ?, kapanis = ? WHERE id = ? AND durum = 'suruyor'").run(
    sonuc,
    simdi(),
    surec.id,
  );
  gecmiseEkle(surec.id, sonuc === "kabul" ? "Öneri kabul edildi ✓" : "Öneri reddedildi.");

  // Sonucun etkisi
  if (surec.tur === "konu_ac" && surec.hedef_id)
    db.prepare("UPDATE konular SET durum = ? WHERE id = ?").run(sonuc === "kabul" ? "aktif" : "reddedildi", surec.hedef_id);
  if (sonuc !== "kabul") return;

  const v = JSON.parse(surec.veri) as Record<string, string>;
  switch (surec.tur) {
    case "kural_degistir":
      kuralUygula(v.anahtar, v.deger);
      break;
    case "mesaj_sil": // mesaj silinmez, gizlenir; metnin hash'i defterde kalır
      db.prepare("UPDATE mesajlar SET gizleyen_surec_id = ? WHERE id = ?").run(surec.id, surec.hedef_id);
      break;
    case "konu_sil":
      db.prepare("UPDATE konular SET durum = 'silindi' WHERE id = ?").run(surec.hedef_id);
      break;
    case "konu_duzenle": {
      const eski = db.prepare("SELECT baslik, aciklama FROM konular WHERE id = ?").get(surec.hedef_id) as {
        baslik: string;
        aciklama: string;
      };
      db.prepare("INSERT INTO konu_surumleri (konu_id, baslik, aciklama, bitis, surec_id) VALUES (?, ?, ?, ?, ?)").run(
        surec.hedef_id,
        eski.baslik,
        eski.aciklama,
        simdi(),
        surec.id,
      );
      db.prepare("UPDATE konular SET baslik = ?, aciklama = ? WHERE id = ?").run(v.baslik, v.aciklama, surec.hedef_id);
      break;
    }
    case "konu_kapat": {
      db.prepare("UPDATE konular SET durum = 'kapandi' WHERE id = ?").run(surec.hedef_id);
      // Aynı konuda yarışan diğer uzlaşma önerileri sona erer
      const digerleri = db
        .prepare("SELECT * FROM surecler WHERE tur = 'konu_kapat' AND hedef_id = ? AND durum = 'suruyor' AND id != ?")
        .all(surec.hedef_id, surec.id) as Surec[];
      for (const d of digerleri) {
        db.prepare("UPDATE oylamalar SET durum = 'red', kapanis = ? WHERE surec_id = ? AND durum = 'acik'").run(simdi(), d.id);
        gecmiseEkle(d.id, `Konu başka bir uzlaşma önerisiyle (#${surec.id}) kapandı.`);
        bitir(d, "red");
      }
      break;
    }
  }
}

/** Uzlaşmayla kapanan konunun kazanan uzlaşma süreci. */
export function konuUzlasmasi(konuId: number): Surec | undefined {
  return db
    .prepare("SELECT * FROM surecler WHERE tur = 'konu_kapat' AND hedef_id = ? AND durum = 'kabul'")
    .get(konuId) as Surec | undefined;
}

/** Genel Yayın Yönetmeni'nin kararı. */
export function yoneticiKarari(surecId: number, kullaniciId: number, karar: "onay" | "veto", gerekce: string): string | null {
  const s = surecGetir(surecId);
  if (!s || s.durum !== "suruyor" || s.asama !== "yonetici") return "Bu öneri yönetici onayı beklemiyor.";
  if (forumYoneticisi()?.id !== kullaniciId) return "Bu kararı yalnızca Genel Yayın Yönetmeni verebilir.";

  if (karar === "onay") {
    gecmiseEkle(s.id, "Genel Yayın Yönetmeni onayladı.");
    bitir(s, "kabul");
  } else {
    gecmiseEkle(s.id, `Genel Yayın Yönetmeni veto etti.${gerekce ? ` Gerekçe: “${gerekce}”` : ""}`);
    asamayaGec(s, "veto_uyeler");
  }
  return null;
}

// ---------------- Oylama ----------------

export function oylamaGetir(id: number): Oylama | undefined {
  return db.prepare("SELECT * FROM oylamalar WHERE id = ?").get(id) as Oylama | undefined;
}

const temsilciAsamasi = (o: Oylama) => o.asama === "temsilciler" || o.asama === "veto_temsilciler";

/** Bu oylamada oy hakkı olanlar. */
export function secmenler(oylama: Oylama): Set<number> {
  if (temsilciAsamasi(oylama)) return temsilciIdleri();
  if (oylama.kategori_id === null)
    return new Set((db.prepare("SELECT id FROM kullanicilar WHERE rol NOT IN ('yz','resmi')").all() as { id: number }[]).map((r) => r.id));
  const idler = ataZinciri(oylama.kategori_id).map((k) => k.id);
  const satirlar = db
    .prepare(`SELECT DISTINCT t.kullanici_id FROM takipler t JOIN kullanicilar u ON u.id = t.kullanici_id
       WHERE u.rol NOT IN ('yz','resmi') AND t.kategori_id IN (${idler.map(() => "?").join(",")})`)
    .all(...idler) as { kullanici_id: number }[];
  return new Set(satirlar.map((s) => s.kullanici_id));
}

export type Sayim = { evet: number; hayir: number; secmen: number; gereken: number | null };

export function sayim(oylama: Oylama): Sayim {
  const secmen = secmenler(oylama);
  const oylar = db.prepare("SELECT kullanici_id, secim FROM oylar WHERE oylama_id = ?").all(oylama.id) as {
    kullanici_id: number;
    secim: Secim;
  }[];
  const gecerli = oylar.filter((o) => secmen.has(o.kullanici_id));
  return {
    evet: gecerli.filter((o) => o.secim === "evet").length,
    hayir: gecerli.filter((o) => o.secim === "hayir").length,
    secmen: secmen.size,
    gereken: oylama.esik === "basit" ? null : gerekenEvet(oylama.esik, secmen.size),
  };
}

/**
 * Arayüzde gösterilecek sayım. Topluluk Oylaması binlerce kişilik bir kalabalık gibi gösterilir
 * (bkz. kalabalik.ts); Yayın Kurulu küçük bir heyet olduğu için gerçek sayısıyla kalır.
 * Karar mantığı her zaman sayim() ile gerçek sayıları kullanır.
 */
export function gorunenSayim(oylama: Oylama): Sayim {
  const s = sayim(oylama);
  if (temsilciAsamasi(oylama)) return s;
  const K = carpan(`oylama${oylama.id}`);
  const evet = buyut(s.evet, K, `e${oylama.id}`);
  const hayir = buyut(s.hayir, K, `h${oylama.id}`);
  return {
    evet,
    hayir,
    secmen: Math.max(buyut(s.secmen, K, `s${oylama.id}`), evet + hayir),
    gereken: s.gereken === null ? null : s.gereken * K,
  };
}

/** Oylama sonucu kesinleşti mi? Kesinleştiyse kapatır ve süreci ilerletir. */
function oylamaKontrol(oylama: Oylama) {
  if (oylama.durum !== "acik") return;
  const s = sayim(oylama);
  const sureDoldu = new Date(oylama.bitis) <= suan();

  let sonuc: "kabul" | "red" | null = null;
  if (s.gereken === null) {
    if (sureDoldu) sonuc = s.evet > s.hayir ? "kabul" : "red";
  } else if (s.evet >= s.gereken) sonuc = "kabul";
  else if (s.secmen - s.hayir < s.gereken || sureDoldu) sonuc = "red";
  if (!sonuc) return;

  const r = db.prepare("UPDATE oylamalar SET durum = ?, kapanis = ? WHERE id = ? AND durum = 'acik'").run(sonuc, simdi(), oylama.id);
  if (r.changes === 0) return;
  gecmiseEkle(oylama.surec_id, `${ASAMA_ADLARI[oylama.asama]}: ${sonuc === "kabul" ? "kabul" : "red"} (evet ${s.evet}, hayır ${s.hayir}).`);
  asamaSonucu(surecGetir(oylama.surec_id)!, sonuc);
}

/** Süresi dolan oylamaları ve yönetici bekleyen süreçleri sonuçlandırır. Sayfa yüklenirken çağrılır. */
export function suresiDolanlariKapat() {
  const t = simdi();
  for (const o of db.prepare("SELECT * FROM oylamalar WHERE durum = 'acik' AND bitis <= ?").all(t) as Oylama[])
    oylamaKontrol(o);
  for (const s of db
    .prepare("SELECT * FROM surecler WHERE durum = 'suruyor' AND asama = 'yonetici' AND yonetici_bitis <= ?")
    .all(t) as Surec[]) {
    gecmiseEkle(s.id, "Yönetici süresi içinde karar vermediği için öneri kendiliğinden kabul edildi.");
    bitir(s, "kabul");
  }
}

// ---------------- Oy verme + toplamalı devir ----------------

/** Bu oylamada geçerli devirler: veren → alan. En yakın (en alt) kategorideki devir önceliklidir; 0 = tüm forum. */
function vekilHaritasi(kategoriId: number | null): Map<number, number> {
  const zincir = [0, ...(kategoriId === null ? [] : ataZinciri(kategoriId).map((k) => k.id))];
  const satirlar = db
    .prepare(`SELECT veren_id, kategori_id, alan_id FROM devirler WHERE kategori_id IN (${zincir.map(() => "?").join(",")})`)
    .all(...zincir) as { veren_id: number; kategori_id: number; alan_id: number }[];
  const derinlik = new Map(zincir.map((id, i) => [id, i]));
  const secilen = new Map<number, { alan: number; d: number }>();
  for (const s of satirlar) {
    const d = derinlik.get(s.kategori_id)!;
    const onceki = secilen.get(s.veren_id);
    if (!onceki || d > onceki.d) secilen.set(s.veren_id, { alan: s.alan_id, d });
  }
  return new Map([...secilen].map(([veren, { alan }]) => [veren, alan]));
}

/**
 * Toplamalı devir: A→B→C zincirinde C oy verdiğinde, henüz oy vermemiş B ve A'nın oyları da C'ye gelir.
 * Zincir, zaten oy vermiş birine ulaşınca durur. Toplam ağırlık maksimumOyAgirligi'ni geçemez.
 * Yayın Kurulu'nda devir yoktur (temsilci oyu kişiseldir).
 */
function temsilEdilecekler(oylama: Oylama, kullaniciId: number, secmen: Set<number>): number[] {
  if (temsilciAsamasi(oylama)) return [];
  const oyVerenler = new Set(
    (db.prepare("SELECT kullanici_id FROM oylar WHERE oylama_id = ?").all(oylama.id) as { kullanici_id: number }[]).map(
      (r) => r.kullanici_id,
    ),
  );
  const gelenler = new Map<number, number[]>();
  for (const [veren, alan] of vekilHaritasi(oylama.kategori_id)) gelenler.set(alan, [...(gelenler.get(alan) ?? []), veren]);

  const sonuc: number[] = [];
  const ziyaret = new Set([kullaniciId]);
  const kuyruk = [kullaniciId];
  while (kuyruk.length) {
    for (const veren of gelenler.get(kuyruk.shift()!) ?? []) {
      if (ziyaret.has(veren) || oyVerenler.has(veren)) continue;
      ziyaret.add(veren);
      kuyruk.push(veren);
      if (secmen.has(veren)) sonuc.push(veren);
    }
  }
  return sonuc.slice(0, kurallar().maksimumOyAgirligi - 1);
}

export type OyDurumu =
  | { tur: "ilgisiz" }
  | { tur: "oy_verdi"; secim: Secim }
  | { tur: "temsil_edildi"; secim: Secim; vekil: string }
  | { tur: "oy_verebilir"; temsilEdilecekler: string[] };

export function oyDurumu(oylama: Oylama, kullaniciId: number): OyDurumu {
  const oy = db
    .prepare(
      `SELECT o.secim, v.takma_ad AS vekil FROM oylar o LEFT JOIN kullanicilar v ON v.id = o.vekil_id
       WHERE o.oylama_id = ? AND o.kullanici_id = ?`,
    )
    .get(oylama.id, kullaniciId) as { secim: Secim; vekil: string | null } | undefined;
  if (oy) return oy.vekil ? { tur: "temsil_edildi", secim: oy.secim, vekil: oy.vekil } : { tur: "oy_verdi", secim: oy.secim };

  const secmen = secmenler(oylama);
  if (!secmen.has(kullaniciId)) return { tur: "ilgisiz" };
  const idler = temsilEdilecekler(oylama, kullaniciId, secmen);
  const adlar = idler.length
    ? (db.prepare(`SELECT takma_ad FROM kullanicilar WHERE id IN (${idler.map(() => "?").join(",")})`).all(...idler) as {
        takma_ad: string;
      }[]).map((r) => r.takma_ad)
    : [];
  return { tur: "oy_verebilir", temsilEdilecekler: adlar };
}

export function oyKullan(oylamaId: number, kullaniciId: number, secim: Secim): string | null {
  const oylama = oylamaGetir(oylamaId);
  if (!oylama || oylama.durum !== "acik" || new Date(oylama.bitis) <= suan()) return "Bu oylama kapanmış.";

  const durum = oyDurumu(oylama, kullaniciId);
  if (durum.tur === "ilgisiz")
    return temsilciAsamasi(oylama)
      ? "Bu oylamada yalnızca Yayın Kurulu üyeleri oy kullanır."
      : "Bu oylamada oy verebilmek için bölümü takip etmelisin.";
  if (durum.tur === "oy_verdi") return "Bu oylamada zaten oy verdin.";
  if (durum.tur === "temsil_edildi") return `Oyunu @${durum.vekil} senin adına kullandı.`;

  const zaman = simdi();
  const ekle = db.prepare("INSERT INTO oylar (oylama_id, kullanici_id, secim, vekil_id, zaman) VALUES (?, ?, ?, ?, ?)");
  const temsil = temsilEdilecekler(oylama, kullaniciId, secmenler(oylama));
  db.exec("BEGIN");
  try {
    ekle.run(oylamaId, kullaniciId, secim, null, zaman);
    for (const veren of temsil) ekle.run(oylamaId, veren, secim, kullaniciId, zaman);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  const ad = (id: number) => (db.prepare("SELECT takma_ad FROM kullanicilar WHERE id = ?").get(id) as { takma_ad: string }).takma_ad;
  deftereYaz("oy", {
    surec_id: oylama.surec_id,
    oylama_id: oylamaId,
    asama: oylama.asama,
    oy_veren: ad(kullaniciId),
    secim,
    adina_oy_kullanilanlar: temsil.map(ad),
  });
  oylamaKontrol(oylamaGetir(oylamaId)!);
  return null;
}

export function oyListesi(oylamaId: number) {
  return db
    .prepare(
      `SELECT u.takma_ad, o.secim, v.takma_ad AS vekil FROM oylar o
       JOIN kullanicilar u ON u.id = o.kullanici_id LEFT JOIN kullanicilar v ON v.id = o.vekil_id
       WHERE o.oylama_id = ? ORDER BY o.zaman, o.vekil_id IS NOT NULL`,
    )
    .all(oylamaId) as { takma_ad: string; secim: Secim; vekil: string | null }[];
}

// ---------------- Oy devri yönetimi ----------------

export type Devir = { kategori_id: number; kategori_ad: string; takma_ad: string };

const DEVIR_SECIM = `SELECT d.kategori_id, COALESCE(k.ad, 'Tüm platform') AS kategori_ad, u.takma_ad FROM devirler d
  LEFT JOIN kategoriler k ON k.id = d.kategori_id`;

export function verdigimDevirler(kullaniciId: number): Devir[] {
  return db
    .prepare(`${DEVIR_SECIM} JOIN kullanicilar u ON u.id = d.alan_id WHERE d.veren_id = ? ORDER BY d.kategori_id`)
    .all(kullaniciId) as Devir[];
}

export function aldigimDevirler(kullaniciId: number): Devir[] {
  return db
    .prepare(`${DEVIR_SECIM} JOIN kullanicilar u ON u.id = d.veren_id WHERE d.alan_id = ? ORDER BY d.kategori_id`)
    .all(kullaniciId) as Devir[];
}

export function devret(verenId: number, alanId: number, kategoriId: number): string | null {
  if (verenId === alanId) return "Oyunu kendine devredemezsin.";
  const alan = db.prepare("SELECT rol FROM kullanicilar WHERE id = ?").get(alanId) as { rol: string } | undefined;
  if (alan?.rol === "yz" || alan?.rol === "resmi") return "Yapay zeka ve kurum hesaplarına oy devredilemez.";
  const veren = db.prepare("SELECT rol FROM kullanicilar WHERE id = ?").get(verenId) as { rol: string } | undefined;
  if (veren?.rol === "resmi" || veren?.rol === "yz") return "Kurum hesaplarının ve yapay zekanın oy hakkı yoktur.";
  // Sınır oy anında uygulanır: taşınamayan oylar sahiplerinde kalır, kendileri kullanabilir.
  db.prepare(
    `INSERT INTO devirler (veren_id, kategori_id, alan_id, zaman) VALUES (?, ?, ?, ?)
     ON CONFLICT (veren_id, kategori_id) DO UPDATE SET alan_id = excluded.alan_id, zaman = excluded.zaman`,
  ).run(verenId, kategoriId, alanId, simdi());
  return null;
}

export function devirGeriAl(verenId: number, kategoriId: number) {
  db.prepare("DELETE FROM devirler WHERE veren_id = ? AND kategori_id = ?").run(verenId, kategoriId);
}
