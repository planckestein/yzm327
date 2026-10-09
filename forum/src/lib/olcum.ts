import "server-only";
import { db } from "./db";
import { TEHDIT_SETI } from "./etiketliVeri";
import { hat, isaretleriAt, kucult } from "./metin";
import { ataZinciri, tumKategoriler } from "./ontoloji";
import { tehditBul } from "./tehdit";
import { enUygunBolum } from "./uygunluk";

/*
 * Kural tabanlı bileşenlerimizin ölçümü (Hafta 2: başarı metrikleri ve temel çizgi merdiveni).
 * Her yöntem aynı etiketli veride, en basitten başlayarak karşılaştırılır: rastgele → çoğunluk sınıfı →
 * naif anahtar kelime → bizim kural. Karmaşık bir model ancak bu basamakları açık farkla geçerse anlamlıdır.
 */

// ---------------- Metrikler ----------------

export type IkiliSonuc = {
  dp: number; // doğru pozitif: tehdit dedi, gerçekten tehdit
  yp: number; // yanlış pozitif: masum bir söz engellendi (sansür)
  yn: number; // yanlış negatif: tehdit kaçtı
  dn: number;
  dogruluk: number;
  kesinlik: number;
  duyarlilik: number;
  f1: number;
  f05: number;
};

const bol = (a: number, b: number) => (b === 0 ? 0 : a / b);

/** Fβ: β < 1 kesinliğe, β > 1 duyarlılığa ağırlık verir. */
const fBeta = (p: number, r: number, beta: number) => bol((1 + beta ** 2) * p * r, beta ** 2 * p + r);

export function ikiliMetrikler(gercek: boolean[], tahmin: boolean[]): IkiliSonuc {
  let dp = 0, yp = 0, yn = 0, dn = 0;
  gercek.forEach((g, i) => {
    if (g && tahmin[i]) dp++;
    else if (!g && tahmin[i]) yp++;
    else if (g) yn++;
    else dn++;
  });
  const kesinlik = bol(dp, dp + yp);
  const duyarlilik = bol(dp, dp + yn);
  return {
    dp, yp, yn, dn,
    dogruluk: bol(dp + dn, gercek.length),
    kesinlik,
    duyarlilik,
    f1: fBeta(kesinlik, duyarlilik, 1),
    f05: fBeta(kesinlik, duyarlilik, 0.5),
  };
}

/** Çok sınıflıda makro F1: her sınıfın F1'i eşit ağırlıkla ortalanır (küçük bölümler de eşit söz sahibi). */
export function makroF1(gercek: string[], tahmin: string[]): number {
  const siniflar = [...new Set(gercek)];
  const f1ler = siniflar.map((s) => ikiliMetrikler(gercek.map((g) => g === s), tahmin.map((t) => t === s)).f1);
  return bol(f1ler.reduce((a, b) => a + b, 0), siniflar.length);
}

/** Tekrarlanabilir rastgelelik (her çalıştırmada aynı sonuç). */
function tohumlu(tohum = 42) {
  let t = tohum;
  return () => {
    t = (t * 1103515245 + 12345) % 2147483648;
    return t / 2147483648;
  };
}

// ---------------- Tehdit denetimi (ikili sınıflandırma) ----------------

// Naif temel çizgi: şiddet çağrıştıran bir kelime kökü geçiyorsa "tehdit"
const NAIF_KOKLER = ["öldür", "gebert", "bıçak", "vur", "döv", "kes", "yak", "boğ", "kır", "bomba", "canına"];
const naifHazirla = hat(kucult, isaretleriAt());
const naifTehdit = (m: string) => naifHazirla(m).split(/\s+/).some((w) => NAIF_KOKLER.some((k) => w.startsWith(k)));

export type TehditSatiri = { yontem: string; aciklama: string } & IkiliSonuc;

export function tehditOlcumu(): { satirlar: TehditSatiri[]; hatalar: { metin: string; tur: "YP" | "YN" }[]; ornek: number } {
  const metinler = TEHDIT_SETI.map(([m]) => m);
  const gercek = TEHDIT_SETI.map(([, t]) => t);
  const oran = gercek.filter(Boolean).length / gercek.length;
  const rastgele = tohumlu();

  const yontemler: [string, string, (m: string) => boolean][] = [
    ["Rastgele (oranla)", "Sınıf oranına göre yazı tura", () => rastgele() < oran],
    ["Çoğunluk sınıfı", "Her şeye “tehdit değil” der", () => false],
    ["Naif anahtar kelime", "Şiddet kökü geçiyorsa tehdit", naifTehdit],
    ["Bizim kural", "Açık kalıp ya da 1. tekil şiddet fiili + hedef", (m) => tehditBul(m) !== null],
  ];
  const satirlar = yontemler.map(([yontem, aciklama, f]) => ({ yontem, aciklama, ...ikiliMetrikler(gercek, metinler.map(f)) }));

  const hatalar = TEHDIT_SETI.flatMap(([metin, t]) => {
    const tahmin = tehditBul(metin) !== null;
    return tahmin === t ? [] : [{ metin, tur: tahmin ? ("YP" as const) : ("YN" as const) }];
  });
  return { satirlar, hatalar, ornek: TEHDIT_SETI.length };
}

// ---------------- Ontoloji: konu → ana bölüm (çok sınıflı sınıflandırma) ----------------

export type BolumSatiri = { yontem: string; aciklama: string; dogruluk: number; makroF1: number };

export function ontolojiOlcumu(): { satirlar: BolumSatiri[]; ornek: number; sinif: number } {
  const kok = (id: number) => ataZinciri(id)[0].ad;
  const konular = db.prepare("SELECT kategori_id, baslik, aciklama FROM konular").all() as {
    kategori_id: number;
    baslik: string;
    aciklama: string;
  }[];
  const gercek = konular.map((k) => kok(k.kategori_id));

  const sayac = new Map<string, number>();
  for (const g of gercek) sayac.set(g, (sayac.get(g) ?? 0) + 1);
  const enSik = [...sayac].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const rastgele = tohumlu();
  const oranla = () => {
    let r = rastgele() * gercek.length;
    for (const [s, n] of sayac) if ((r -= n) < 0) return s;
    return enSik;
  };
  const tum = tumKategoriler();

  const yontemler: [string, string, (k: (typeof konular)[number]) => string][] = [
    ["Rastgele (oranla)", "Bölüm oranlarına göre rastgele", () => oranla()],
    ["Çoğunluk sınıfı", `Her konuya “${enSik}” der`, () => enSik],
    [
      "Bizim kural",
      "Anahtar kelime örtüşmesi; örtüşme yoksa en sık bölüm",
      (k) => {
        const b = enUygunBolum(`${k.baslik} ${k.aciklama}`, tum);
        return b ? kok(b.k.id) : enSik;
      },
    ],
  ];
  const satirlar = yontemler.map(([yontem, aciklama, f]) => {
    const tahmin = konular.map(f);
    return { yontem, aciklama, dogruluk: tahmin.filter((t, i) => t === gercek[i]).length / gercek.length || 0, makroF1: makroF1(gercek, tahmin) };
  });
  return { satirlar, ornek: konular.length, sinif: sayac.size };
}
