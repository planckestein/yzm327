import "server-only";
import { db } from "./db";
import { deftereYaz, sha256 } from "./defter";
import { konuGetir } from "./konular";
import { acikSurecVarMi, konuUzlasmasi, surecBaslat, surecOylamalari } from "./oylama";
import { suanIso } from "./saat";
import { TEHDIT_MESAJI, tehditBul } from "./tehdit";

/*
 * Tartışma: konulara yazılan mesajlar.
 * - Mesajlar düzenlenemez ve silinemez. Silme ancak "Mesaj silme önerisi" ile olur (Topluluk Oylaması + Temsilciler
 *   Kurulu). Kabul edilirse mesaj gizlenir; kaydı ve metninin hash'i defterde kalır.
 * - Tartışma, bir "Uzlaşma önerisi" kabul edilince kapanır. Farklı uzlaşma önerileri yarışabilir; ilk kabul
 *   edilen kazanır. Katılmayanlar "azınlık görüşü" yazabilir.
 */

export type Mesaj = {
  id: number;
  konu_id: number;
  yazan_id: number;
  yazan: string;
  yazan_rol: string;
  yanit_id: number | null;
  icerik: string;
  olusturma: string;
  gizleyen_surec_id: number | null;
};

type Sonuc = { hata: string } | { id: number };
/** Kurum hesapları (bakanlık, komisyon vb.) yalnızca açıklama yazar; içerik üzerinde söz hakları yoktur. */
const KURUM_ENGELI =
  "Kurum hesapları içerik gizleme, kaldırma, düzenleme ya da uzlaşma önerisi yapamaz; tartışmaya açıklama yazarak katılır.";
function kurumMu(kullaniciId: number): boolean {
  return (db.prepare("SELECT rol FROM kullanicilar WHERE id = ?").get(kullaniciId) as { rol: string } | undefined)?.rol === "resmi";
}

export function konuMesajlari(konuId: number): Mesaj[] {
  return db
    .prepare(
      `SELECT m.*, u.takma_ad AS yazan, u.rol AS yazan_rol FROM mesajlar m JOIN kullanicilar u ON u.id = m.yazan_id
       WHERE m.konu_id = ? ORDER BY m.id`,
    )
    .all(konuId) as Mesaj[];
}

export function mesajGetir(id: number): Mesaj | undefined {
  return db
    .prepare(
      `SELECT m.*, u.takma_ad AS yazan, u.rol AS yazan_rol FROM mesajlar m JOIN kullanicilar u ON u.id = m.yazan_id
       WHERE m.id = ?`,
    )
    .get(id) as Mesaj | undefined;
}

export function mesajYaz(konuId: number, yazanId: number, icerik: string, yanitId: number | null = null): Sonuc {
  const konu = konuGetir(konuId);
  if (!konu || konu.durum !== "aktif") return { hata: "Bu konu şu an tartışmaya açık değil." };
  if (!icerik.trim()) return { hata: "Mesaj boş olamaz." };
  if (tehditBul(icerik)) return { hata: TEHDIT_MESAJI };
  if (yanitId && mesajGetir(yanitId)?.konu_id !== konuId) yanitId = null;

  const r = db
    .prepare("INSERT INTO mesajlar (konu_id, yazan_id, yanit_id, icerik, olusturma) VALUES (?, ?, ?, ?, ?)")
    .run(konuId, yazanId, yanitId, icerik.trim(), suanIso());
  const id = Number(r.lastInsertRowid);
  const yazan = (db.prepare("SELECT takma_ad FROM kullanicilar WHERE id = ?").get(yazanId) as { takma_ad: string }).takma_ad;
  deftereYaz("mesaj", { mesaj_id: id, konu_id: konuId, yazan, yanit_id: yanitId, icerik_hash: sha256(icerik.trim()) });
  return { id };
}

// ---------------- Öneriler ----------------

export function mesajSilmeOner(mesajId: number, onerenId: number, gerekce: string): Sonuc {
  if (kurumMu(onerenId)) return { hata: KURUM_ENGELI };
  const m = mesajGetir(mesajId);
  if (!m) return { hata: "Mesaj bulunamadı." };
  if (m.gizleyen_surec_id) return { hata: "Bu mesaj zaten gizlenmiş." };
  if (acikSurecVarMi("mesaj_sil", mesajId)) return { hata: "Bu mesaj için zaten açık bir silme önerisi var." };
  if (tehditBul(gerekce)) return { hata: TEHDIT_MESAJI };
  const konu = konuGetir(m.konu_id)!;
  return { id: surecBaslat("mesaj_sil", mesajId, konu.kategori_id, onerenId, { gerekce, konu_id: konu.id }) };
}

export function konuSilmeOner(konuId: number, onerenId: number, gerekce: string): Sonuc {
  if (kurumMu(onerenId)) return { hata: KURUM_ENGELI };
  const konu = konuGetir(konuId);
  if (!konu || konu.durum === "silindi") return { hata: "Konu bulunamadı." };
  if (acikSurecVarMi("konu_sil", konuId)) return { hata: "Bu konu için zaten açık bir silme önerisi var." };
  if (tehditBul(gerekce)) return { hata: TEHDIT_MESAJI };
  return { id: surecBaslat("konu_sil", konuId, konu.kategori_id, onerenId, { gerekce }) };
}

export function konuDuzenlemeOner(konuId: number, onerenId: number, baslik: string, aciklama: string, gerekce: string): Sonuc {
  if (kurumMu(onerenId)) return { hata: KURUM_ENGELI };
  const konu = konuGetir(konuId);
  if (!konu || konu.durum !== "aktif") return { hata: "Yalnızca tartışmaya açık konular düzenlenebilir." };
  if (konu.acan_id !== onerenId) return { hata: "Düzenlemeyi yalnızca konuyu açan kişi önerebilir." };
  if (acikSurecVarMi("konu_duzenle", konuId)) return { hata: "Bu konu için zaten açık bir düzenleme önerisi var." };
  if (!baslik.trim()) return { hata: "Başlık boş olamaz." };
  if (baslik === konu.baslik && aciklama === konu.aciklama) return { hata: "Hiçbir değişiklik yapılmamış." };
  if (tehditBul(`${baslik}\n${aciklama}\n${gerekce}`)) return { hata: TEHDIT_MESAJI };
  return {
    id: surecBaslat("konu_duzenle", konuId, konu.kategori_id, onerenId, {
      eski_baslik: konu.baslik,
      eski_aciklama: konu.aciklama,
      baslik: baslik.trim(),
      aciklama: aciklama.trim(),
      gerekce,
    }),
  };
}

export function uzlasmaOner(konuId: number, onerenId: number, metin: string): Sonuc {
  if (kurumMu(onerenId)) return { hata: KURUM_ENGELI };
  const konu = konuGetir(konuId);
  if (!konu || konu.durum !== "aktif") return { hata: "Yalnızca tartışmaya açık konular uzlaşmayla kapatılabilir." };
  if (!metin.trim()) return { hata: "Uzlaşma metni boş olamaz." };
  if (tehditBul(metin)) return { hata: TEHDIT_MESAJI };
  return { id: surecBaslat("konu_kapat", konuId, konu.kategori_id, onerenId, { metin: metin.trim() }) };
}

// ---------------- Azınlık görüşü ----------------

export type Serh = { id: number; yazan: string; icerik: string; olusturma: string };

export function konuSerhleri(konuId: number): Serh[] {
  return db
    .prepare(
      `SELECT s.id, u.takma_ad AS yazan, s.icerik, s.olusturma FROM serhler s JOIN kullanicilar u ON u.id = s.yazan_id
       WHERE s.konu_id = ? ORDER BY s.id`,
    )
    .all(konuId) as Serh[];
}

/** Uzlaşmaya "evet" demeyen (hayır diyen ya da oy vermeyen) herkes azınlık görüşü yazabilir. */
export function serhYazabilirMi(konuId: number, kullaniciId: number): boolean {
  const u = konuUzlasmasi(konuId);
  if (!u) return false;
  if (db.prepare("SELECT 1 FROM serhler WHERE konu_id = ? AND yazan_id = ?").get(konuId, kullaniciId)) return false;
  const oylama = surecOylamalari(u.id).at(-1);
  const oy = oylama
    ? (db.prepare("SELECT secim FROM oylar WHERE oylama_id = ? AND kullanici_id = ?").get(oylama.id, kullaniciId) as
        | { secim: string }
        | undefined)
    : undefined;
  return oy?.secim !== "evet";
}

export function serhYaz(konuId: number, kullaniciId: number, icerik: string): Sonuc {
  if (!serhYazabilirMi(konuId, kullaniciId)) return { hata: "Bu konuya azınlık görüşü yazamazsın." };
  if (!icerik.trim()) return { hata: "Görüş boş olamaz." };
  if (tehditBul(icerik)) return { hata: TEHDIT_MESAJI };
  const r = db
    .prepare("INSERT INTO serhler (konu_id, yazan_id, icerik, olusturma) VALUES (?, ?, ?, ?)")
    .run(konuId, kullaniciId, icerik.trim(), suanIso());
  deftereYaz("azinlik_gorusu", { konu_id: konuId, icerik_hash: sha256(icerik.trim()) });
  return { id: Number(r.lastInsertRowid) };
}

export function konuSurumleri(konuId: number) {
  return db.prepare("SELECT * FROM konu_surumleri WHERE konu_id = ? ORDER BY id DESC").all(konuId) as {
    id: number;
    baslik: string;
    aciklama: string;
    bitis: string;
    surec_id: number;
  }[];
}
