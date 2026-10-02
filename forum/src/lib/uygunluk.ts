import "server-only";
import { db } from "./db";
import { kurallar } from "./kurallar";
import { anahtarKelimeler, ataZinciri, altAgacIdleri, tumKategoriler, type Kategori } from "./ontoloji";
import type { Konu } from "./konular";
import { TEHDIT_MESAJI, tehditBul } from "./tehdit";

/*
 * Uygunluk Kurulu — ücretsiz, kural tabanlı denetim (dış API yok). Sansür yok ilkesi:
 *  1) Tek ENGEL: tehdit (bkz. tehdit.ts). Hakaret, tekrar, kısa metin vb. engellenmez.
 *  2) Ontoloji uygunluğu: metin, kategorinin anahtar kelimeleriyle ne kadar örtüşüyor → 0-100 puan.
 *     Sadece bilgi notu + kategori önerisi düşülür, karar oylamaya kalır.
 */

export type UygunlukSonucu = {
  gecti: boolean;
  puan: number;
  engeller: string[];
  notlar: string[];
  oneriKategori?: { id: number; ad: string };
};

export function normallestir(metin: string): string {
  return (
    " " +
    metin
      .toLocaleLowerCase("tr-TR")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim() +
    " "
  );
}

/** Anahtar kelimenin bir kelime başında geçmesi yeterli: "test" → "testler" eşleşir. */
function eslesenler(metin: string, kelimeler: string[]): string[] {
  return kelimeler.filter((k) => metin.includes(" " + k));
}

function kelimeKumesi(metin: string): Set<string> {
  return new Set(normallestir(metin).split(" ").filter((w) => w.length >= 3));
}

function benzerlik(a: string, b: string): number {
  const A = kelimeKumesi(a);
  const B = kelimeKumesi(b);
  if (!A.size || !B.size) return 0;
  let ortak = 0;
  for (const w of A) if (B.has(w)) ortak++;
  return ortak / (A.size + B.size - ortak);
}

export function uygunlukDenetle(girdi: {
  kategori: Kategori;
  baslik: string;
  aciklama: string;
  ustKonu?: Konu;
  kullaniciId: number;
}): UygunlukSonucu {
  const { kategori, baslik, aciklama, ustKonu } = girdi;
  const engeller: string[] = [];
  const notlar: string[] = [];

  // 1) Tek engel: tehdit (ABD 1. Değişiklik — "true threat" istisnası)
  if (!baslik) engeller.push("Başlık boş olamaz.");
  if (tehditBul(`${baslik}\n${aciklama}`)) engeller.push(TEHDIT_MESAJI);

  const metin = normallestir(`${baslik} ${aciklama}`);

  // Benzer konu varsa sadece bilgi notu düşülür (engellemez)
  const mevcutlar = db
    .prepare(
      `SELECT id, baslik FROM konular WHERE kategori_id = ? AND durum IN ('oylamada','aktif')
       AND ust_konu_id IS ?`,
    )
    .all(kategori.id, ustKonu?.id ?? null) as { id: number; baslik: string }[];
  const tekrar = mevcutlar.find((m) => benzerlik(m.baslik, baslik) >= kurallar().benzerlikEsigi);
  if (tekrar) notlar.push(`Benzer bir konu da var: #${tekrar.id} “${tekrar.baslik}”`);

  // 2) Ontoloji uygunluğu — kategorinin kapsamı: kendisi + üstleri + altları
  const tum = tumKategoriler();
  const kapsamIdleri = new Set([...ataZinciri(kategori.id).map((k) => k.id), ...altAgacIdleri(kategori.id)]);
  const kapsamKelimeleri = tum.filter((k) => kapsamIdleri.has(k.id)).flatMap(anahtarKelimeler);
  const kapsamEslesme = [...new Set(eslesenler(metin, kapsamKelimeleri))];
  let puan = Math.min(100, kapsamEslesme.length * 25);

  if (kapsamEslesme.length) notlar.push(`Bölümle örtüşen kavramlar: ${kapsamEslesme.join(", ")}`);

  // Alt konu, üst konusuyla da ilişkili olmalı
  if (ustKonu) {
    const ortak = benzerlik(`${ustKonu.baslik} ${ustKonu.aciklama}`, `${baslik} ${aciklama}`);
    const bonus = Math.round(Math.min(1, ortak * 4) * 40);
    puan = Math.min(100, puan + bonus);
    if (bonus > 0) notlar.push(`Üst konuyla ilişki: +${bonus} puan`);
    else if (!kapsamEslesme.length) notlar.push("Üst konuyla belirgin bir kavram örtüşmesi bulunamadı.");
  }

  // En uygun kategori hangisi? (yalnızca kendi anahtar kelimelerine göre)
  const enIyi = tum
    .map((k) => ({ k, n: eslesenler(metin, anahtarKelimeler(k)).length }))
    .sort((a, b) => b.n - a.n)[0];
  let oneriKategori: UygunlukSonucu["oneriKategori"];

  if (enIyi && enIyi.n > 0 && !kapsamIdleri.has(enIyi.k.id)) {
    if (puan === 0 || enIyi.n >= kapsamEslesme.length + 2) {
      oneriKategori = { id: enIyi.k.id, ad: enIyi.k.ad };
      notlar.push(`“${enIyi.k.ad}” bölümü de uygun olabilir.`);
    }
  }
  if (puan === 0 && !oneriKategori && !ustKonu) notlar.push("Belirgin bir bölüm örtüşmesi bulunamadı.");

  return { gecti: engeller.length === 0, puan, engeller, notlar, oneriKategori };
}
