import "server-only";
import { db } from "./db";
import { gerekenEvet, type Oran } from "./kurallar";
import { ataZinciri } from "./ontoloji";
import { temsilciIdleri } from "./secim";
import { deftereYaz } from "./defter";
import { suan, suanIso } from "./saat";
import { buyut, carpan } from "./kalabalik";
import { ASAMA_ADLARI, asamaSonucu, gecmiseEkle, surecGetir, yoneticiSuresiDolanlariKapat, type Asama } from "./surec";
import { temsilEdilecekler as emanetZinciri } from "./devir";

/*
 * OYLAMA — bir sürecin her aşaması için açılan oylamanın sayımı ve sonuçlanması.
 *
 * Topluluk Oylaması: konuyla ilgili üyeler (kategoriyi/üstünü takip edenler; forum geneli için tüm üyeler).
 *                    Oy emaneti kullanılabilir (devir.ts). Varsayılan salt çoğunluk.
 * Yayın Kurulu     : her ana kategoriden eşit sayıda temsilci; kişisel oy (emanet yok). Varsayılan 3/5.
 *
 * Oylar kesindir; sonuç kesinleşince oylama süre beklenmeden kapanır ve süreç (surec.ts) bir sonraki aşamaya geçer.
 */

export type Secim = "evet" | "hayir";

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

// ---------------- Oylama ----------------

const simdi = suanIso;

export function surecOylamalari(surecId: number): Oylama[] {
  return db.prepare("SELECT * FROM oylamalar WHERE surec_id = ? ORDER BY id").all(surecId) as Oylama[];
}

export function acikOylama(surecId: number): Oylama | undefined {
  return db.prepare("SELECT * FROM oylamalar WHERE surec_id = ? AND durum = 'acik'").get(surecId) as Oylama | undefined;
}

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
  yoneticiSuresiDolanlariKapat();
}

// ---------------- Oy verme ----------------

/** Bu oylamada kullanıcının oyuyla birlikte kullanılacak emanet oylar. Yayın Kurulu'nda emanet yoktur (temsilci oyu kişiseldir). */
function temsilEdilecekler(oylama: Oylama, kullaniciId: number, secmen: Set<number>): number[] {
  return temsilciAsamasi(oylama) ? [] : emanetZinciri(oylama.id, oylama.kategori_id, kullaniciId, secmen);
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
