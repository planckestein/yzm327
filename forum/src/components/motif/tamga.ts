/*
 * Üye tamgası. Eski Türklerde her boyun kendine özgü bir damgası (tamga) vardı; mal, belge ve
 * yazıtlar onunla imzalanırdı. Burada her üyenin tamgası takma adından üretilir: bir gövde, bir ek
 * ve bir boya rengi. Aynı ad her zaman aynı tamgayı verir.
 * Haç, kanca ya da ok/yay birleşimi gibi dinî veya siyasi okunabilecek biçimler bilerek kümede yok.
 */

const GOVDELER = [
  "M10 3.5V16.5", // dik
  "M5.5 10a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0", // halka
  "M4 15.5V10a6 6 0 0 1 12 0v5.5", // kemer
  "M4 4.5V10a6 6 0 0 0 12 0V4.5", // çanak
  "M4 5L10 15L16 5", // ok ucu
  "M5 16V5H15V16", // kapı
];

const EKLER = [
  "M5 3H15", // üst çizgi
  "M6 17.6h.01M14 17.6h.01", // iki nokta
  "M3 10H6M14 10H17", // yan çentikler
  "M10 1.8h.01", // tepe nokta
  "M5 17.8H15", // alt çizgi
  "M7.5 18.2L10 16.2L12.5 18.2", // alt çatı
];

/** Kilim kök boyaları (globals.css); avatarın zemini ve çizgisi bunlardan türetilir. */
const BOYALAR = ["--kizil", "--civit", "--yasil", "--sari", "--kahve", "--mor", "--gul", "--gok", "--al"];

function ozet(metin: string): number {
  let h = 2166136261;
  for (const c of metin) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

export function tamga(ad: string): { yol: string; boya: string } {
  const h = ozet(ad);
  const govde = GOVDELER[h % GOVDELER.length];
  const ek = EKLER[Math.floor(h / GOVDELER.length) % EKLER.length];
  const boya = BOYALAR[Math.floor(h / (GOVDELER.length * EKLER.length)) % BOYALAR.length];
  return { yol: `${govde}${ek}`, boya: `var(${boya})` };
}
