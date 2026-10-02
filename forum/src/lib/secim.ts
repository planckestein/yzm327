import "server-only";
import { db } from "./db";
import { kurallar } from "./kurallar";
import { altAgacIdleri, tumKategoriler, type Kategori } from "./ontoloji";
import { suanIso } from "./saat";
import { deftereYaz } from "./defter";

/*
 * Temsilci ve Genel Yayın Yönetmeni seçimi — sürekli destek usulü.
 * - Herkes aday olabilir (bir kişi yalnızca tek makama ve tek ana kategoriye aday olur).
 * - Temsilci: ana kategorinin üyeleri (o kategoriyi ya da alt kategorisini takip edenler) destek verir;
 *   her üye en fazla koltuk sayısı kadar adayı destekleyebilir. En çok desteklenen N aday temsilcidir.
 * - Yönetici: tüm üyeler destek verir, her üye 1 aday destekler. En çok desteklenen yöneticidir.
 * - Destek her an geri çekilebilir; sonuçlar anlık hesaplanır. Eşitlikte önce aday olan öne geçer.
 */

export type Makam = "temsilci" | "yonetici";
export type Aday = { id: number; takma_ad: string; kategori_id: number; destek: number; zaman: string };

export function anaKategoriler(): Kategori[] {
  return tumKategoriler().filter((k) => k.ust_id === null);
}

/** Ana kategorinin üyeleri: kendisini ya da bir alt kategorisini takip edenler. */
export function kategoriUyeleri(anaKategoriId: number): Set<number> {
  const idler = altAgacIdleri(anaKategoriId);
  const satirlar = db
    .prepare(`SELECT DISTINCT t.kullanici_id FROM takipler t JOIN kullanicilar u ON u.id = t.kullanici_id
       WHERE u.rol NOT IN ('yz','resmi') AND t.kategori_id IN (${idler.map(() => "?").join(",")})`)
    .all(...idler) as { kullanici_id: number }[];
  return new Set(satirlar.map((s) => s.kullanici_id));
}

function tumKullaniciIdleri(): Set<number> {
  return new Set((db.prepare("SELECT id FROM kullanicilar WHERE rol NOT IN ('yz','resmi')").all() as { id: number }[]).map((r) => r.id));
}

/** Adaylar ve destek sayıları (yalnızca hâlâ oy hakkı olanların desteği sayılır). */
export function adaySonuclari(makam: Makam, kategoriId = 0): Aday[] {
  const secmen = makam === "temsilci" ? kategoriUyeleri(kategoriId) : tumKullaniciIdleri();
  const adaylar = db
    .prepare(
      `SELECT u.id, u.takma_ad, a.kategori_id, a.zaman FROM adaylar a JOIN kullanicilar u ON u.id = a.kullanici_id
       WHERE a.makam = ? AND a.kategori_id = ?`,
    )
    .all(makam, kategoriId) as Omit<Aday, "destek">[];
  const destekler = db
    .prepare("SELECT destekleyen_id, aday_id FROM destekler WHERE makam = ?")
    .all(makam) as { destekleyen_id: number; aday_id: number }[];

  return adaylar
    .filter((a) => secmen.has(a.id))
    .map((a) => ({
      ...a,
      destek: destekler.filter((d) => d.aday_id === a.id && secmen.has(d.destekleyen_id)).length,
    }))
    .sort((x, y) => y.destek - x.destek || x.zaman.localeCompare(y.zaman));
}

export function kategoriTemsilcileri(anaKategoriId: number): Aday[] {
  return adaySonuclari("temsilci", anaKategoriId)
    .filter((a) => a.destek > 0)
    .slice(0, kurallar().kategoridenTemsilci);
}

export function tumTemsilciler(): (Aday & { kategori_ad: string })[] {
  return anaKategoriler().flatMap((k) => kategoriTemsilcileri(k.id).map((a) => ({ ...a, kategori_ad: k.ad })));
}

export function temsilciIdleri(): Set<number> {
  return new Set(tumTemsilciler().map((t) => t.id));
}

export function forumYoneticisi(): Aday | null {
  return adaySonuclari("yonetici").find((a) => a.destek > 0) ?? null;
}

/** Kullanıcının şu anki görevleri (profilde rozet olarak gösterilir). */
export function gorevler(kullaniciId: number): string[] {
  const g: string[] = [];
  if (forumYoneticisi()?.id === kullaniciId) g.push("Genel Yayın Yönetmeni");
  const t = tumTemsilciler().find((t) => t.id === kullaniciId);
  if (t) g.push(`Yayın Kurulu · ${t.kategori_ad}`);
  return g;
}

export function adaylik(kullaniciId: number): { makam: Makam; kategori_id: number } | undefined {
  return db.prepare("SELECT makam, kategori_id FROM adaylar WHERE kullanici_id = ?").get(kullaniciId) as
    | { makam: Makam; kategori_id: number }
    | undefined;
}

export function adayOl(kullaniciId: number, makam: Makam, kategoriId: number): string | null {
  const rol = (db.prepare("SELECT rol FROM kullanicilar WHERE id = ?").get(kullaniciId) as { rol: string } | undefined)?.rol;
  if (rol === "yz" || rol === "resmi") return "Yapay zeka ve kurum hesapları aday olamaz.";
  if (makam === "temsilci") {
    if (!anaKategoriler().some((k) => k.id === kategoriId)) return "Geçersiz bölüm.";
    if (!kategoriUyeleri(kategoriId).has(kullaniciId))
      return "Yayın Kurulu’na aday olmak için bu bölümü (ya da alt bölümlerinden birini) takip etmelisin.";
  } else kategoriId = 0;

  const mevcut = adaylik(kullaniciId);
  if (mevcut && (mevcut.makam !== makam || mevcut.kategori_id !== kategoriId))
    return "Aynı anda yalnızca bir makama aday olabilirsin; önce mevcut adaylığından çekil.";
  if (mevcut) return null;

  db.prepare("INSERT INTO adaylar (kullanici_id, makam, kategori_id, zaman) VALUES (?, ?, ?, ?)").run(
    kullaniciId,
    makam,
    kategoriId,
    suanIso(),
  );
  deftereYaz("secim", { olay: "aday_oldu", aday: ad(kullaniciId), makam, kategori_id: kategoriId });
  return null;
}

export function adayliktanCekil(kullaniciId: number) {
  db.prepare("DELETE FROM destekler WHERE aday_id = ?").run(kullaniciId);
  const r = db.prepare("DELETE FROM adaylar WHERE kullanici_id = ?").run(kullaniciId);
  if (r.changes) deftereYaz("secim", { olay: "adayliktan_cekildi", aday: ad(kullaniciId) });
}

const ad = (id: number) => (db.prepare("SELECT takma_ad FROM kullanicilar WHERE id = ?").get(id) as { takma_ad: string }).takma_ad;

export function desteklediklerim(kullaniciId: number): Set<number> {
  return new Set(
    (db.prepare("SELECT aday_id FROM destekler WHERE destekleyen_id = ?").all(kullaniciId) as { aday_id: number }[]).map(
      (r) => r.aday_id,
    ),
  );
}

/** Desteği verir ya da geri çeker. */
export function destekDegistir(kullaniciId: number, adayId: number): string | null {
  const aday = db.prepare("SELECT makam, kategori_id FROM adaylar WHERE kullanici_id = ?").get(adayId) as
    | { makam: Makam; kategori_id: number }
    | undefined;
  if (!aday) return "Aday bulunamadı.";

  const sil = db
    .prepare("DELETE FROM destekler WHERE destekleyen_id = ? AND aday_id = ? AND makam = ?")
    .run(kullaniciId, adayId, aday.makam);
  if (sil.changes > 0) {
    deftereYaz("secim", { olay: "destek_cekildi", destekleyen: ad(kullaniciId), aday: ad(adayId), makam: aday.makam });
    return null;
  }

  if (aday.makam === "temsilci" && !kategoriUyeleri(aday.kategori_id).has(kullaniciId))
    return "Bu bölümün kurul üyesini seçmek için bölümü takip etmelisin.";

  const limit = aday.makam === "temsilci" ? kurallar().kategoridenTemsilci : 1;
  const mevcut = db
    .prepare(
      `SELECT COUNT(*) AS n FROM destekler d JOIN adaylar a ON a.kullanici_id = d.aday_id
       WHERE d.destekleyen_id = ? AND d.makam = ? AND a.kategori_id = ?`,
    )
    .get(kullaniciId, aday.makam, aday.kategori_id) as { n: number };
  if (mevcut.n >= limit)
    return `Burada en fazla ${limit} adayı destekleyebilirsin; önce birinden desteğini geri çek.`;

  db.prepare("INSERT INTO destekler (destekleyen_id, aday_id, makam, zaman) VALUES (?, ?, ?, ?)").run(
    kullaniciId,
    adayId,
    aday.makam,
    suanIso(),
  );
  deftereYaz("secim", { olay: "destek_verdi", destekleyen: ad(kullaniciId), aday: ad(adayId), makam: aday.makam });
  return null;
}
