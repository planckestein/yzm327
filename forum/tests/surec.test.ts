import "./geciciVeritabani"; // ilk import: gerçek veritabanına dokunulmaz
import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { tumKategoriler, takipDegistir } from "../src/lib/ontoloji";
import { kurallar } from "../src/lib/kurallar";
import { saatiAyarla } from "../src/lib/saat";
import { adayOl, destekDegistir } from "../src/lib/secim";
import { devret } from "../src/lib/devir";
import { acikOylama, oyKullan, oyListesi, surecOylamalari, suresiDolanlariKapat, type Secim } from "../src/lib/oylama";
import { surecBaslat, surecGecmisi, surecGetir, yoneticiKarari } from "../src/lib/surec";

/*
 * Karar motoru (State deseni) uçtan uca: her test boş bir veritabanında, gerçek kurallarla çalışır.
 * Demo verisinin hiç geçmediği yollar da burada denenir: kurulun atlanması, vetonun aşılması,
 * yönetmenin sessiz kalması.
 */

const uye = (takmaAd: string) =>
  Number(
    db
      .prepare(
        `INSERT INTO kullanicilar (ad, soyad, takma_ad, adres, dogum_tarihi, sifre_hash, rol, olusturma)
         VALUES ('Test', 'Üye', ?, '-', '2000-01-01', '!', 'uye', '2026-01-01T00:00:00.000Z')`,
      )
      .run(takmaAd).lastInsertRowid,
  );

const K = tumKategoriler().find((k) => k.ust_id === null)!.id;
const [u1, u2, u3, u4, u5] = ["u1", "u2", "u3", "u4", "u5"].map(uye);
for (const u of [u1, u2, u3, u4, u5]) takipDegistir(u, K);

/** Sürecin açık oylamasında sırayla oy kullanır. */
function oyla(surecId: number, ...oylar: [number, Secim][]) {
  for (const [kim, secim] of oylar) {
    const o = acikOylama(surecId);
    assert.ok(o, `#${surecId} için açık oylama yok`);
    assert.equal(oyKullan(o.id, kim, secim), null);
  }
}
const olaylar = (id: number) => surecGecmisi(surecGetir(id)!).map((g) => g.olay);

test("salt çoğunluk: oy vermeyenler de hesaba katılır", () => {
  // 5 seçmen → 3 "evet" gerekir. 2 evet + 2 hayır sonucu belirlemez
  const id = surecBaslat("konu_ac", null, K, u1);
  oyla(id, [u1, "evet"], [u2, "evet"], [u3, "hayir"], [u4, "hayir"]);
  assert.equal(surecGetir(id)!.durum, "suruyor");
  oyla(id, [u5, "evet"]);
  assert.equal(surecGetir(id)!.durum, "kabul");
});

test("sonuç kesinleşince oylama süre beklenmeden kapanır", () => {
  // 3 hayırdan sonra en fazla 2 evet gelebilir; 3'e ulaşılamaz
  const id = surecBaslat("konu_ac", null, K, u1);
  oyla(id, [u1, "hayir"], [u2, "hayir"], [u3, "hayir"]);
  assert.equal(surecGetir(id)!.durum, "red");
});

test("Yayın Kurulu ve yönetmen yokken ilke önerisi bu aşamaları atlar", () => {
  const id = surecBaslat("kural_degistir", null, null, u1, { anahtar: "yoneticiSuresiGun", deger: 2 });
  oyla(id, [u1, "evet"], [u2, "evet"], [u3, "evet"]);
  assert.equal(surecGetir(id)!.durum, "kabul");
  assert.ok(olaylar(id).includes("Yayın Kurulu henüz oluşmadığı için bu aşama atlandı."));
  assert.equal(kurallar().yoneticiSuresiGun, 2);
});

test("veto, iki aşamada da 2/3 ile aşılır", () => {
  // Yönetmen: u1. Kurul (bölüm başına 2 koltuk): u2 ve u3
  assert.equal(adayOl(u1, "yonetici", 0), null);
  for (const u of [u2, u3, u4, u5]) assert.equal(destekDegistir(u, u1), null);
  for (const aday of [u2, u3]) {
    assert.equal(adayOl(aday, "temsilci", K), null);
    for (const u of [u4, u5]) assert.equal(destekDegistir(u, aday), null);
  }

  const id = surecBaslat("kural_degistir", null, null, u2, { anahtar: "oylamaSuresiGun", deger: 4 });
  oyla(id, [u1, "evet"], [u2, "evet"], [u3, "evet"]); // Topluluk Oylaması (salt: 3/5)
  oyla(id, [u2, "evet"], [u3, "evet"]); // Yayın Kurulu (3/5 of 2 → 2)
  assert.equal(surecGetir(id)!.asama, "yonetici");

  assert.equal(yoneticiKarari(id, u1, "veto", "Süre uzamamalı"), null);
  assert.equal(surecGetir(id)!.asama, "veto_uyeler");
  oyla(id, [u2, "evet"], [u3, "evet"], [u4, "evet"], [u5, "evet"]); // 2/3 of 5 → 4
  oyla(id, [u2, "evet"], [u3, "evet"]); // 2/3 of 2 → 2

  assert.equal(surecGetir(id)!.durum, "kabul");
  assert.ok(olaylar(id).includes("Veto aşıldı."));
  assert.equal(kurallar().oylamaSuresiGun, 4);
});

test("yönetmen süresi içinde karar vermezse öneri kendiliğinden yürürlüğe girer", () => {
  const id = surecBaslat("kural_degistir", null, null, u2, { anahtar: "maksimumOyAgirligi", deger: 3 });
  oyla(id, [u1, "evet"], [u2, "evet"], [u3, "evet"]);
  oyla(id, [u2, "evet"], [u3, "evet"]);
  assert.equal(surecGetir(id)!.asama, "yonetici");

  saatiAyarla(new Date(Date.now() + 3 * 86400_000)); // yönetmenin süresi 2 gün
  suresiDolanlariKapat();
  saatiAyarla(new Date());

  assert.equal(surecGetir(id)!.durum, "kabul");
  assert.ok(olaylar(id).some((o) => o.includes("kendiliğinden kabul")));
  assert.equal(kurallar().maksimumOyAgirligi, 3);
});

test("oy emaneti zincirleme toplanır ve oy ağırlığı tavanını aşmaz", () => {
  // u5 → u4 → u3 ve u2 → u3: u3 oy verince en fazla 3 oy taşır (tavan önceki testte 3 oldu)
  assert.equal(devret(u5, u4, K), null);
  assert.equal(devret(u4, u3, K), null);
  assert.equal(devret(u2, u3, K), null);

  // Tek bir oy, 2 emanetle birlikte 3 "evet" eder: 5 kişilik bölümde salt çoğunluk tamamlanır
  const id = surecBaslat("konu_ac", null, K, u1);
  oyla(id, [u3, "evet"]);
  assert.equal(surecGetir(id)!.durum, "kabul");

  const liste = oyListesi(surecOylamalari(id)[0].id);
  assert.equal(liste.length, 3);
  assert.deepEqual(liste.filter((o) => o.vekil === "u3").map((o) => o.takma_ad).sort(), ["u2", "u4"]);
  // Zincirin ucundaki u5 tavana takıldı; oyu kendisinde kaldı
  assert.ok(!liste.some((o) => o.takma_ad === "u5"));
});
