import { test } from "node:test";
import assert from "node:assert/strict";
import { tehditBul } from "../src/lib/tehdit";

test("açık tehdit kalıpları yakalanır", () => {
  assert.ok(tehditBul("Adresini biliyorum, dikkatli ol."));
  assert.ok(tehditBul("Seni bulacağım."));
});

test("birinci tekil şiddet fiili + hedef aynı cümlede tehdittir (büyük harfle yazılsa da)", () => {
  assert.ok(tehditBul("SENİ ÖLDÜRÜRÜM"));
  assert.ok(tehditBul("Bir daha yazarsan kafanı kırarım"));
});

test("ünlüyle biten fiil kökleri de yakalanır (ölçümde bulunan hata)", () => {
  assert.ok(tehditBul("Seni bıçaklarım"));
  assert.ok(tehditBul("Hepinizi parçalayacağım"));
});

test("hakaret, tartışma ve abartı tehdit sayılmaz (sansür yok)", () => {
  assert.equal(tehditBul("Yapay zeka insanlığı öldürür mü?"), null);
  assert.equal(tehditBul("Bu bakan tam bir beceriksiz, istifa etmeli."), null);
  assert.equal(tehditBul("Gülmekten öldüm."), null);
  assert.equal(tehditBul("Polis şüpheliyi bacağından vurdu."), null);
});

test("tehdit cümlesi tek başına döndürülür", () => {
  assert.equal(tehditBul("Konuya katılmıyorum. Seni öldürürüm!"), "seni öldürürüm");
});
