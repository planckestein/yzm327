import "server-only";
import { db } from "./db";
import { kurallar } from "./kurallar";
import { anahtarKelimeler, ataZinciri, altAgacIdleri, tumKategoriler, type Kategori } from "./ontoloji";
import type { Konu } from "./konular";
import { TEHDIT_MESAJI, tehditBul } from "./tehdit";
import { boslukDaralt, hat, isaretleriAt, kenarBoslugu, kirp, kucult } from "./metin";

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

const normallestir = hat(kucult, isaretleriAt(), boslukDaralt, kirp, kenarBoslugu);

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

// ---------------- Denetim zinciri (Chain of Responsibility) ----------------
// Her halka bağlama bakar; engel, not ya da puan ekler ve sırayı bir sonrakine bırakır.
// Yeni bir kontrol eklemek = zincire bir halka eklemek; mevcut halkalar değişmez.

type Girdi = { kategori: Kategori; baslik: string; aciklama: string; ustKonu?: Konu; kullaniciId: number };

type Baglam = Girdi & {
  metin: string;
  tum: Kategori[];
  kapsamIdleri: Set<number>;
  kapsamEslesme: string[];
  puan: number;
  engeller: string[];
  notlar: string[];
  oneriKategori?: UygunlukSonucu["oneriKategori"];
};

type Halka = (b: Baglam) => void;

const bosBaslik: Halka = (b) => {
  if (!b.baslik) b.engeller.push("Başlık boş olamaz.");
};

// Tek engel: tehdit (ABD 1. Değişiklik — "true threat" istisnası)
const tehdit: Halka = (b) => {
  if (tehditBul(`${b.baslik}\n${b.aciklama}`)) b.engeller.push(TEHDIT_MESAJI);
};

// Benzer konu varsa sadece bilgi notu düşülür (engellemez)
const benzerKonu: Halka = (b) => {
  const mevcutlar = db
    .prepare(
      `SELECT id, baslik FROM konular WHERE kategori_id = ? AND durum IN ('oylamada','aktif')
       AND ust_konu_id IS ?`,
    )
    .all(b.kategori.id, b.ustKonu?.id ?? null) as { id: number; baslik: string }[];
  const tekrar = mevcutlar.find((m) => benzerlik(m.baslik, b.baslik) >= kurallar().benzerlikEsigi);
  if (tekrar) b.notlar.push(`Benzer bir konu da var: #${tekrar.id} “${tekrar.baslik}”`);
};

// Ontoloji uygunluğu — kategorinin kapsamı: kendisi + üstleri + altları
const ontoloji: Halka = (b) => {
  const kapsamKelimeleri = b.tum.filter((k) => b.kapsamIdleri.has(k.id)).flatMap(anahtarKelimeler);
  b.kapsamEslesme = [...new Set(eslesenler(b.metin, kapsamKelimeleri))];
  b.puan = Math.min(100, b.kapsamEslesme.length * 25);
  if (b.kapsamEslesme.length) b.notlar.push(`Bölümle örtüşen kavramlar: ${b.kapsamEslesme.join(", ")}`);
};

// Alt konu, üst konusuyla da ilişkili olmalı
const ustKonuIliskisi: Halka = (b) => {
  if (!b.ustKonu) return;
  const ortak = benzerlik(`${b.ustKonu.baslik} ${b.ustKonu.aciklama}`, `${b.baslik} ${b.aciklama}`);
  const bonus = Math.round(Math.min(1, ortak * 4) * 40);
  b.puan = Math.min(100, b.puan + bonus);
  if (bonus > 0) b.notlar.push(`Üst konuyla ilişki: +${bonus} puan`);
  else if (!b.kapsamEslesme.length) b.notlar.push("Üst konuyla belirgin bir kavram örtüşmesi bulunamadı.");
};

// Daha uygun bir bölüm varsa önerilir
const dahaUygunBolum: Halka = (b) => {
  const enIyi = enUygunBolum(b.metin, b.tum);
  if (enIyi && !b.kapsamIdleri.has(enIyi.k.id) && (b.puan === 0 || enIyi.n >= b.kapsamEslesme.length + 2)) {
    b.oneriKategori = { id: enIyi.k.id, ad: enIyi.k.ad };
    b.notlar.push(`“${enIyi.k.ad}” bölümü de uygun olabilir.`);
  }
  if (b.puan === 0 && !b.oneriKategori && !b.ustKonu) b.notlar.push("Belirgin bir bölüm örtüşmesi bulunamadı.");
};

const ZINCIR: Halka[] = [bosBaslik, tehdit, benzerKonu, ontoloji, ustKonuIliskisi, dahaUygunBolum];

/** Metnin anahtar kelimeleriyle en çok örtüşen bölüm (hiç örtüşme yoksa undefined). Ölçümde de kullanılır. */
export function enUygunBolum(metin: string, tum = tumKategoriler()): { k: Kategori; n: number } | undefined {
  const m = normallestir(metin);
  const enIyi = tum
    .map((k) => ({ k, n: eslesenler(m, anahtarKelimeler(k)).length }))
    .sort((a, b) => b.n - a.n)[0];
  return enIyi && enIyi.n > 0 ? enIyi : undefined;
}

export function uygunlukDenetle(girdi: Girdi): UygunlukSonucu {
  const tum = tumKategoriler();
  const b: Baglam = {
    ...girdi,
    metin: normallestir(`${girdi.baslik} ${girdi.aciklama}`),
    tum,
    kapsamIdleri: new Set([...ataZinciri(girdi.kategori.id).map((k) => k.id), ...altAgacIdleri(girdi.kategori.id)]),
    kapsamEslesme: [],
    puan: 0,
    engeller: [],
    notlar: [],
  };
  for (const halka of ZINCIR) halka(b);
  return { gecti: b.engeller.length === 0, puan: b.puan, engeller: b.engeller, notlar: b.notlar, oneriKategori: b.oneriKategori };
}
