import "server-only";
import { db } from "./db";
import { deftereYaz } from "./defter";
import { suanIso } from "./saat";
import { TEHDIT_MESAJI, tehditBul } from "./tehdit";

/*
 * Etki takibi — Ortak Akıl'da uzlaşılan fikirlerin karar vericilere ulaşıp ulaşmadığının kaydı.
 * Kurum hesapları (bakanlıklar, komisyonlar) uzlaşılan konulara resmî tepki bildirir. Tepkiler
 * silinmez; yeni bir tepki eskisinin üstüne yazılmaz, geçmişe eklenir ve deftere yazılır.
 */

export type TepkiDurumu = "inceleniyor" | "gundemde" | "uygulandi" | "reddedildi";

export const TEPKILER: Record<TepkiDurumu, { ad: string; aciklama: string }> = {
  inceleniyor: { ad: "İnceleniyor", aciklama: "Kurum öneriyi değerlendiriyor" },
  gundemde: { ad: "Gündeme alındı", aciklama: "Öneri kurumun çalışma gündemine / yasa taslağına alındı" },
  uygulandi: { ad: "Uygulandı", aciklama: "Öneri hayata geçirildi" },
  reddedildi: { ad: "Gerekçeli ret", aciklama: "Kurum öneriyi gerekçesini açıklayarak reddetti" },
};

// Etki sırası: en güçlü tepki konunun rozetinde gösterilir
const GUC: Record<TepkiDurumu, number> = { uygulandi: 4, gundemde: 3, inceleniyor: 2, reddedildi: 1 };

export type KurumTepkisi = { id: number; konu_id: number; kurum: string; durum: TepkiDurumu; aciklama: string; zaman: string };

const SECIM = `SELECT t.id, t.konu_id, u.takma_ad AS kurum, t.durum, t.aciklama, t.zaman
  FROM kurum_tepkileri t JOIN kullanicilar u ON u.id = t.kurum_id`;

export function tepkiBildir(konuId: number, kurumId: number, durum: string, aciklama: string): { hata: string } | { id: number } {
  const kurum = db.prepare("SELECT rol, takma_ad FROM kullanicilar WHERE id = ?").get(kurumId) as { rol: string; takma_ad: string } | undefined;
  if (kurum?.rol !== "resmi") return { hata: "Yalnızca kurum hesapları resmî tepki bildirebilir." };
  const konu = db.prepare("SELECT durum FROM konular WHERE id = ?").get(konuId) as { durum: string } | undefined;
  if (konu?.durum !== "kapandi") return { hata: "Resmî tepki yalnızca uzlaşmayla kapanan konulara verilebilir." };
  if (!(durum in TEPKILER)) return { hata: "Geçersiz durum." };
  if (!aciklama.trim()) return { hata: "Kısa bir açıklama yazın." };
  if (tehditBul(aciklama)) return { hata: TEHDIT_MESAJI };

  const r = db
    .prepare("INSERT INTO kurum_tepkileri (konu_id, kurum_id, durum, aciklama, zaman) VALUES (?, ?, ?, ?, ?)")
    .run(konuId, kurumId, durum, aciklama.trim(), suanIso());
  deftereYaz("kurum_tepkisi", { konu_id: konuId, kurum: kurum.takma_ad, durum });
  return { id: Number(r.lastInsertRowid) };
}

/** Konuya gelen tepkiler: her kurumun en son tepkisi + tam geçmiş. */
export function konuTepkileri(konuId: number): { guncel: KurumTepkisi[]; gecmis: KurumTepkisi[] } {
  const gecmis = db.prepare(`${SECIM} WHERE t.konu_id = ? ORDER BY t.id DESC`).all(konuId) as KurumTepkisi[];
  const gorulen = new Set<string>();
  const guncel = gecmis.filter((t) => (gorulen.has(t.kurum) ? false : (gorulen.add(t.kurum), true)));
  return { guncel, gecmis };
}

/** Konunun etki rozeti: kurumların en güçlü güncel tepkisi. */
export function konuEtkisi(konuId: number): TepkiDurumu | null {
  const g = konuTepkileri(konuId).guncel;
  return g.length ? g.map((t) => t.durum).sort((a, b) => GUC[b] - GUC[a])[0] : null;
}

/** Son tepkiler: her kurumun her konudaki yalnızca en güncel tepkisi. */
export function sonTepkiler(limit = 5): (KurumTepkisi & { baslik: string })[] {
  return db
    .prepare(
      `${SECIM.replace("FROM kurum_tepkileri t", ", k.baslik FROM kurum_tepkileri t JOIN konular k ON k.id = t.konu_id")}
       WHERE t.id = (SELECT MAX(t2.id) FROM kurum_tepkileri t2 WHERE t2.konu_id = t.konu_id AND t2.kurum_id = t.kurum_id)
       ORDER BY t.id DESC LIMIT ?`,
    )
    .all(limit) as (KurumTepkisi & { baslik: string })[];
}

export function sonResmiAciklamalar(limit = 4) {
  return db
    .prepare(
      `SELECT m.id, m.icerik, m.olusturma, u.takma_ad AS kurum, k.id AS konu_id, k.baslik
       FROM mesajlar m JOIN kullanicilar u ON u.id = m.yazan_id JOIN konular k ON k.id = m.konu_id
       WHERE u.rol = 'resmi' AND m.gizleyen_surec_id IS NULL ORDER BY m.id DESC LIMIT ?`,
    )
    .all(limit) as { id: number; icerik: string; olusturma: string; kurum: string; konu_id: number; baslik: string }[];
}

/** Kurum hesaplarının görünen adları (takma ad → kurum adı: ad + soyad alanlarında tutulur). */
export function kurumAdlari(): Map<string, string> {
  return new Map(
    (db.prepare("SELECT takma_ad, ad, soyad FROM kullanicilar WHERE rol = 'resmi'").all() as { takma_ad: string; ad: string; soyad: string }[]).map(
      (r) => [r.takma_ad, `${r.ad} ${r.soyad}`.trim()],
    ),
  );
}

export function resmiAciklamaVarMi(konuId: number): boolean {
  return !!db
    .prepare("SELECT 1 FROM mesajlar m JOIN kullanicilar u ON u.id = m.yazan_id WHERE m.konu_id = ? AND u.rol = 'resmi' LIMIT 1")
    .get(konuId);
}

export function etkiIstatistikleri() {
  const say = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  const uzlasilan = say("SELECT COUNT(*) AS n FROM konular WHERE durum = 'kapandi'");
  // Her konu için her kurumun en son tepkisine bakılır
  const sonDurumlar = db
    .prepare(
      `SELECT t.konu_id, t.durum FROM kurum_tepkileri t
       WHERE t.id = (SELECT MAX(t2.id) FROM kurum_tepkileri t2 WHERE t2.konu_id = t.konu_id AND t2.kurum_id = t.kurum_id)`,
    )
    .all() as { konu_id: number; durum: TepkiDurumu }[];
  const etkili = new Set(sonDurumlar.filter((d) => d.durum === "gundemde" || d.durum === "uygulandi").map((d) => d.konu_id));
  return {
    uzlasilan,
    tepkiAlan: new Set(sonDurumlar.map((d) => d.konu_id)).size,
    gundemeGiren: etkili.size,
    uygulanan: new Set(sonDurumlar.filter((d) => d.durum === "uygulandi").map((d) => d.konu_id)).size,
    oran: uzlasilan ? Math.round((etkili.size / uzlasilan) * 100) : 0,
    resmiAciklama: say("SELECT COUNT(*) AS n FROM mesajlar m JOIN kullanicilar u ON u.id = m.yazan_id WHERE u.rol = 'resmi'"),
    kurum: say("SELECT COUNT(*) AS n FROM kullanicilar WHERE rol = 'resmi'"),
    vatandas: say("SELECT COUNT(*) AS n FROM kullanicilar WHERE rol NOT IN ('yz','resmi')"),
  };
}
