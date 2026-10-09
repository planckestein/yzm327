import "server-only";
import { db } from "./db";
import { DEGISTIRILEBILIR, kuralDegeriYazi, type KuralAnahtari } from "./kurallar";
import { SUREC_TURLERI, type Surec } from "./surec";

const kisalt = (s: string, n = 70) => (s.length > n ? s.slice(0, n) + "…" : s);

/** Bir sürecin okunabilir başlığı. */
export function surecBasligi(s: Surec): string {
  const v = JSON.parse(s.veri) as Record<string, string>;
  const konuBaslik = (id: number | null) =>
    (db.prepare("SELECT baslik FROM konular WHERE id = ?").get(id) as { baslik: string } | undefined)?.baslik ?? "?";

  switch (s.tur) {
    case "konu_ac":
      return `“${kisalt(konuBaslik(s.hedef_id))}” konusu açılsın`;
    case "konu_kapat":
      return `Uzlaşma: “${kisalt(v.metin)}”`;
    case "konu_sil":
      return `“${kisalt(konuBaslik(s.hedef_id))}” konusu kaldırılsın`;
    case "konu_duzenle":
      return `“${kisalt(v.eski_baslik)}” konusu düzenlensin`;
    case "mesaj_sil": {
      const m = db
        .prepare("SELECT u.takma_ad FROM mesajlar m JOIN kullanicilar u ON u.id = m.yazan_id WHERE m.id = ?")
        .get(s.hedef_id) as { takma_ad: string } | undefined;
      return `@${m?.takma_ad} kullanıcısının bir mesajı gizlensin`;
    }
    case "kural_degistir":
      return `${DEGISTIRILEBILIR[v.anahtar as KuralAnahtari]?.ad}: ${kuralDegeriYazi(v.anahtar, v.eski)} → ${kuralDegeriYazi(v.anahtar, v.deger)}`;
  }
}

export function surecTurAdi(s: Surec): string {
  return SUREC_TURLERI[s.tur].ad;
}

/** Tüm forumda süren öneriler (ana sayfa için). */
export function suruyorSurecler(limit = 10): (Surec & { oneren: string })[] {
  return db
    .prepare(
      `SELECT s.*, u.takma_ad AS oneren FROM surecler s JOIN kullanicilar u ON u.id = s.oneren_id
       WHERE s.durum = 'suruyor' AND s.tur != 'konu_ac' ORDER BY s.id DESC LIMIT ?`,
    )
    .all(limit) as (Surec & { oneren: string })[];
}
