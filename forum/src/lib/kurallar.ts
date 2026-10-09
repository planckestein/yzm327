import "server-only";
import { db } from "./db";

/*
 * Yayın İlkeleri. Buradakiler başlangıç değerleridir; "değiştirilebilir" olanlar
 * Kural Önerisi ile (Topluluk Oylaması → Yayın Kurulu → Genel Yayın Yönetmeni) değiştirilir
 * ve yeni değer veritabanında saklanır.
 */

export type Oran = "1/2" | "3/5" | "2/3";

export const VARSAYILAN = {
  // Topluluk Oylaması: "salt" = ilgili üyelerin TAMAMININ yarısından fazlası; "basit" = oy verenlerin çoğunluğu
  cogunlukTuru: "salt" as "salt" | "basit",
  // Yayın Kurulu'nda kabul oranı (azınlık koruması: 3/5 ise 2/5'lik azınlık durdurabilir)
  kurulKabulOrani: "3/5" as Oran,
  // Genel Yayın Yönetmeni'nin vetosunu aşmak için iki aşamada da gereken oran
  vetoAsimOrani: "2/3" as Oran,
  // Her ana kategorinin Yayın Kurulu'ndaki koltuk sayısı (büyüklükten bağımsız, eşit)
  kategoridenTemsilci: 2,
  oylamaSuresiGun: 3,
  // Yönetici bu süre içinde onaylamaz ya da veto etmezse öneri kendiliğinden yürürlüğe girer
  yoneticiSuresiGun: 3,
  // Bir kişinin taşıyabileceği en fazla oy (kendi oyu + devredilenler)
  maksimumOyAgirligi: 5,
  minimumYas: 13,
  // Aynı kategoride başlık benzerliği bu oranı geçerse "benzer konu var" notu düşülür
  benzerlikEsigi: 0.9,
};

export type Kurallar = typeof VARSAYILAN;
export type KuralAnahtari = keyof Kurallar;

type Tanim =
  | { ad: string; tip: "sayi"; min: number; max: number }
  | { ad: string; tip: "secim"; secenekler: { deger: string; ad: string }[] };

const ORANLAR = [
  { deger: "1/2", ad: "Yarıdan fazla" },
  { deger: "3/5", ad: "5'te 3" },
  { deger: "2/3", ad: "3'te 2" },
];

/** Oylamayla değiştirilebilen kurallar */
export const DEGISTIRILEBILIR: Partial<Record<KuralAnahtari, Tanim>> = {
  cogunlukTuru: {
    ad: "Topluluk Oylamasında çoğunluk",
    tip: "secim",
    secenekler: [
      { deger: "salt", ad: "Salt çoğunluk (tüm ilgili üyelerin yarısından fazlası)" },
      { deger: "basit", ad: "Basit çoğunluk (oy verenlerin çoğunluğu)" },
    ],
  },
  kurulKabulOrani: { ad: "Yayın Kurulu'nda kabul oranı", tip: "secim", secenekler: ORANLAR },
  vetoAsimOrani: { ad: "Vetoyu aşmak için gereken oran", tip: "secim", secenekler: ORANLAR },
  kategoridenTemsilci: { ad: "Bölüm başına Yayın Kurulu üyesi", tip: "sayi", min: 1, max: 10 },
  oylamaSuresiGun: { ad: "Oylama süresi (gün)", tip: "sayi", min: 1, max: 30 },
  yoneticiSuresiGun: { ad: "Yöneticinin karar süresi (gün)", tip: "sayi", min: 1, max: 30 },
  maksimumOyAgirligi: { ad: "Bir kişinin taşıyabileceği en fazla oy", tip: "sayi", min: 1, max: 50 },
};

export function kurallar(): Kurallar {
  const k: Record<string, unknown> = { ...VARSAYILAN };
  for (const s of db.prepare("SELECT anahtar, deger FROM kural_degerleri").all() as { anahtar: string; deger: string }[])
    if (s.anahtar in k) k[s.anahtar] = JSON.parse(s.deger);
  return k as Kurallar;
}

/** Formdan gelen değeri doğrular; geçersizse null döner. */
export function kuralDegeriCoz(anahtar: string, ham: string): string | number | null {
  const t = DEGISTIRILEBILIR[anahtar as KuralAnahtari];
  if (!t) return null;
  if (t.tip === "sayi") {
    const n = Number(ham);
    return Number.isInteger(n) && n >= t.min && n <= t.max ? n : null;
  }
  return t.secenekler.some((s) => s.deger === ham) ? ham : null;
}

export function kuralDegeriYazi(anahtar: string, deger: unknown): string {
  const t = DEGISTIRILEBILIR[anahtar as KuralAnahtari];
  if (t?.tip === "secim") return t.secenekler.find((s) => s.deger === deger)?.ad ?? String(deger);
  return String(deger);
}

export function kuralUygula(anahtar: string, deger: unknown) {
  db.prepare(
    `INSERT INTO kural_degerleri (anahtar, deger) VALUES (?, ?)
     ON CONFLICT (anahtar) DO UPDATE SET deger = excluded.deger`,
  ).run(anahtar, JSON.stringify(deger));
}

// Her eşik bir hesap stratejisidir; yeni bir oran eklemek tabloya bir satır eklemektir.
const ESIK_HESAPLARI: Record<Oran | "salt", (n: number) => number> = {
  salt: (n) => Math.floor(n / 2) + 1,
  "1/2": (n) => Math.floor(n / 2) + 1,
  "3/5": (n) => Math.ceil((3 * n) / 5),
  "2/3": (n) => Math.ceil((2 * n) / 3),
};

/** Oran → n kişilik bir heyette kabul için gereken en az "evet" */
export function gerekenEvet(oran: Oran | "salt", n: number): number {
  return Math.max(1, ESIK_HESAPLARI[oran](n));
}
