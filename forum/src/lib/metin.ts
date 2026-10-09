/*
 * Türkçe metin ön işleme hattı (Pipeline). Tehdit denetimi, uygunluk raporu, YZ Analist ve arama
 * aynı adımları kullanır; böylece bir modül "İ"yi bir şekilde, öteki başka şekilde küçültmez.
 *
 * Türkçe tuzağı: "I".toLowerCase() → "i" (ı değil!), "İ".toLowerCase() → "i̇" (i + birleştirici nokta).
 * Bu yüzden küçültme her zaman tr-TR yerel ayarıyla yapılır: "YARALI" → "yaralı", "İZMİR" → "izmir".
 */

export type Adim = (metin: string) => string;

/** Adımları sırayla uygulayan tek bir adım üretir. */
export const hat =
  (...adimlar: Adim[]): Adim =>
  (metin) =>
    adimlar.reduce((m, adim) => adim(m), metin);

export const kucult: Adim = (m) => m.toLocaleLowerCase("tr-TR");

/** Harf, rakam ve boşluk dışındaki işaretleri boşluğa çevirir; `korunan` karakterler kalır (ör. cümle sonu ".!?"). */
export const isaretleriAt = (korunan = ""): Adim => {
  const desen = new RegExp(`[^\\p{L}\\p{N}\\s${korunan}]`, "gu");
  return (m) => m.replace(desen, " ");
};

export const anmalariAt: Adim = (m) => m.replace(/@\w+/g, " ");

export const boslukDaralt: Adim = (m) => m.replace(/\s+/g, " ");

export const kirp: Adim = (m) => m.trim();

/** Baş ve sona boşluk ekler: " kelime" araması kelime başını yakalar. */
export const kenarBoslugu: Adim = (m) => ` ${m} `;
