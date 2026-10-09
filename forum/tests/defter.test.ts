import "./geciciVeritabani"; // ilk import: gerçek veritabanına dokunulmaz
import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { defterDogrula, deftereYaz } from "../src/lib/defter";
import { gerekenEvet } from "../src/lib/kurallar";

test("eşikler: salt çoğunluk, 3/5 ve 2/3", () => {
  assert.equal(gerekenEvet("salt", 10), 6);
  assert.equal(gerekenEvet("salt", 11), 6);
  assert.equal(gerekenEvet("3/5", 22), 14); // 11 bölüm × 2 koltuk
  assert.equal(gerekenEvet("2/3", 5), 4);
  assert.equal(gerekenEvet("salt", 0), 1); // boş heyette bile en az bir "evet"
});

test("Açık Arşiv: zincir sağlam başlar, geçmişteki tek bir değişiklik yakalanır", () => {
  for (let i = 0; i < 5; i++) deftereYaz("deneme", { i });
  assert.deepEqual(defterDogrula().gecerli, true);

  db.prepare("UPDATE defter SET veri = ? WHERE sira = 3").run(JSON.stringify({ i: 99 }));
  const d = defterDogrula();
  assert.equal(d.gecerli, false);
  assert.equal(d.bozukSira, 3);
});
