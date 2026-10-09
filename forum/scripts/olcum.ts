/*
 * Ölçüm raporu: npm run olcum
 *
 * Kural tabanlı bileşenleri (tehdit denetimi, bölüm önerisi) temel çizgilerle aynı veride karşılaştırır.
 * Veritabanına yazmaz; bölüm ölçümü için demo verisi gerekir (npm run demo).
 */
import { ontolojiOlcumu, tehditOlcumu } from "../src/lib/olcum";

const yuzde = (x: number) => `${(x * 100).toFixed(0)}%`.padStart(5);
const iki = (x: number) => x.toFixed(2).padStart(5);

const t = tehditOlcumu();
console.log(`\nTEHDİT DENETİMİ — ${t.ornek} etiketli cümle (ikili sınıflandırma, pozitif = tehdit)\n`);
console.log("Yöntem".padEnd(22), "Doğruluk  Kesinlik  Duyarlılık    F1   F0.5   YP  YN");
for (const s of t.satirlar)
  console.log(
    s.yontem.padEnd(22),
    yuzde(s.dogruluk).padStart(8),
    iki(s.kesinlik).padStart(9),
    iki(s.duyarlilik).padStart(11),
    iki(s.f1).padStart(6),
    iki(s.f05),
    String(s.yp).padStart(4),
    String(s.yn).padStart(3),
  );
console.log("\nBizim kuralın hataları:");
for (const h of t.hatalar) console.log(`  ${h.tur === "YP" ? "YP (yanlış alarm)" : "YN (kaçan tehdit)"}  ${h.metin}`);

const o = ontolojiOlcumu();
console.log(`\nBÖLÜM ÖNERİSİ — ${o.ornek} konu, ${o.sinif} ana bölüm (çok sınıflı sınıflandırma)\n`);
console.log("Yöntem".padEnd(22), "Doğruluk  Makro F1");
for (const s of o.satirlar) console.log(s.yontem.padEnd(22), yuzde(s.dogruluk).padStart(8), iki(s.makroF1).padStart(9));
console.log();
