import { test } from "node:test";
import assert from "node:assert/strict";
import { boslukDaralt, hat, isaretleriAt, kucult } from "../src/lib/metin";

test("Türkçe tuzağı: büyük I ve İ doğru küçülür", () => {
  // Varsayılan toLowerCase "YARALI"yı "yarali" yapar; "yaralı" kelimesi bulunamaz
  assert.equal("YARALI".toLowerCase(), "yarali");
  assert.equal(kucult("YARALI"), "yaralı");
  assert.equal(kucult("İZMİR"), "izmir");
  assert.equal(kucult("SENİ ÖLDÜRÜRÜM"), "seni öldürürüm");
});

test("hat adımları sırayla uygular", () => {
  const n = hat(kucult, isaretleriAt(".!?"), boslukDaralt);
  assert.equal(n("Merhaba,   DÜNYA!  (deneme)"), "merhaba dünya! deneme ");
});
