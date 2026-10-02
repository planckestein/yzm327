import "server-only";
import { db } from "./db";

export type Kategori = {
  id: number;
  ust_id: number | null;
  ad: string;
  aciklama: string;
  anahtar_kelimeler: string;
  kurallar: string;
};

export type KategoriDugumu = Kategori & { altlar: KategoriDugumu[] };

export function tumKategoriler(): Kategori[] {
  return db.prepare("SELECT * FROM kategoriler ORDER BY id").all() as Kategori[];
}

export function kategoriGetir(id: number): Kategori | undefined {
  return db.prepare("SELECT * FROM kategoriler WHERE id = ?").get(id) as Kategori | undefined;
}

export function kategoriAgaci(): KategoriDugumu[] {
  const dugumler = new Map<number, KategoriDugumu>();
  for (const k of tumKategoriler()) dugumler.set(k.id, { ...k, altlar: [] });
  const kokler: KategoriDugumu[] = [];
  for (const d of dugumler.values()) {
    if (d.ust_id === null) kokler.push(d);
    else dugumler.get(d.ust_id)?.altlar.push(d);
  }
  return kokler;
}

/** Kökten başlayarak kategorinin kendisine kadar olan zincir. */
export function ataZinciri(id: number): Kategori[] {
  const zincir: Kategori[] = [];
  let k = kategoriGetir(id);
  while (k) {
    zincir.unshift(k);
    k = k.ust_id === null ? undefined : kategoriGetir(k.ust_id);
  }
  return zincir;
}

/** Kategorinin kendisi ve tüm alt kategorilerinin id'leri. */
export function altAgacIdleri(id: number): number[] {
  const tum = tumKategoriler();
  const sonuc = [id];
  for (let i = 0; i < sonuc.length; i++) {
    for (const k of tum) if (k.ust_id === sonuc[i]) sonuc.push(k.id);
  }
  return sonuc;
}

export function anahtarKelimeler(k: Kategori): string[] {
  return k.anahtar_kelimeler
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Ağacı girintili düz liste yapar (select kutuları için). */
export function duzListe(agac = kategoriAgaci(), derinlik = 0): { id: number; ad: string; derinlik: number }[] {
  return agac.flatMap((d) => [{ id: d.id, ad: d.ad, derinlik }, ...duzListe(d.altlar, derinlik + 1)]);
}

/**
 * "Konuyla ilgili" üye sayısı: kategoriyi veya üst kategorilerinden birini takip edenler.
 * Salt çoğunluk bu sayının yarısından fazlası olarak hesaplanır.
 */
export function ilgiliUyeSayisi(kategoriId: number): number {
  const idler = ataZinciri(kategoriId).map((k) => k.id);
  const r = db
    .prepare(
      `SELECT COUNT(DISTINCT kullanici_id) AS n FROM takipler
       WHERE kategori_id IN (${idler.map(() => "?").join(",")})`,
    )
    .get(...idler) as { n: number };
  return r.n;
}

/** Takip eder ya da bırakır. */
export function takipDegistir(kullaniciId: number, kategoriId: number) {
  const sil = db.prepare("DELETE FROM takipler WHERE kullanici_id = ? AND kategori_id = ?").run(kullaniciId, kategoriId);
  if (sil.changes === 0) db.prepare("INSERT INTO takipler (kullanici_id, kategori_id) VALUES (?, ?)").run(kullaniciId, kategoriId);
}

export function takipEdiyorMu(kullaniciId: number, kategoriId: number): boolean {
  return !!db
    .prepare("SELECT 1 FROM takipler WHERE kullanici_id = ? AND kategori_id = ?")
    .get(kullaniciId, kategoriId);
}

export function takipEdilenler(kullaniciId: number): Kategori[] {
  return db
    .prepare(
      `SELECT k.* FROM takipler t JOIN kategoriler k ON k.id = t.kategori_id
       WHERE t.kullanici_id = ? ORDER BY k.id`,
    )
    .all(kullaniciId) as Kategori[];
}
