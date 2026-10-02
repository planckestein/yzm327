import "server-only";
import crypto from "node:crypto";
import { db } from "./db";
import { suanIso } from "./saat";

/*
 * Dağıtık defter — değiştirilemez olay kaydı (hash zinciri).
 *
 * Her kayıt, bir önceki kaydın hash'ini içerir: hash = SHA-256(önceki_hash | zaman | tür | veri).
 * Geçmişteki tek bir kayıt değiştirilirse ondan sonraki bütün hash'ler tutmaz; "Zinciri doğrula" bunu yakalar.
 * Herkes defterin tamamını indirip (/defter/indir) kendi kopyasında doğrulayabilir; kopyalar dağıtık bir
 * denetim sağlar. Kişisel bilgiler ve gizlenen mesajların metni deftere yazılmaz (sadece metnin hash'i).
 */

export type DefterKaydi = { sira: number; zaman: string; tur: string; veri: string; onceki_hash: string; hash: string };

const BASLANGIC = "0".repeat(64);

export function sha256(metin: string): string {
  return crypto.createHash("sha256").update(metin, "utf8").digest("hex");
}

function kayitHash(onceki: string, zaman: string, tur: string, veri: string) {
  return sha256(`${onceki}|${zaman}|${tur}|${veri}`);
}

export function deftereYaz(tur: string, veri: object) {
  const son = db.prepare("SELECT hash FROM defter ORDER BY sira DESC LIMIT 1").get() as { hash: string } | undefined;
  const onceki = son?.hash ?? BASLANGIC;
  const zaman = suanIso();
  const v = JSON.stringify(veri);
  db.prepare("INSERT INTO defter (zaman, tur, veri, onceki_hash, hash) VALUES (?, ?, ?, ?, ?)").run(
    zaman,
    tur,
    v,
    onceki,
    kayitHash(onceki, zaman, tur, v),
  );
}

export function defterKayitlari(limit = 50, once?: number): DefterKaydi[] {
  return (
    once
      ? db.prepare("SELECT * FROM defter WHERE sira < ? ORDER BY sira DESC LIMIT ?").all(once, limit)
      : db.prepare("SELECT * FROM defter ORDER BY sira DESC LIMIT ?").all(limit)
  ) as DefterKaydi[];
}

export function tumDefter(): DefterKaydi[] {
  return db.prepare("SELECT * FROM defter ORDER BY sira").all() as DefterKaydi[];
}

/** Zinciri baştan sona yeniden hesaplar. */
export function defterDogrula(): { gecerli: boolean; kayit: number; bozukSira?: number; sonHash: string } {
  let onceki = BASLANGIC;
  const kayitlar = tumDefter();
  for (const k of kayitlar) {
    if (k.onceki_hash !== onceki || k.hash !== kayitHash(k.onceki_hash, k.zaman, k.tur, k.veri))
      return { gecerli: false, kayit: kayitlar.length, bozukSira: k.sira, sonHash: onceki };
    onceki = k.hash;
  }
  return { gecerli: true, kayit: kayitlar.length, sonHash: onceki };
}
