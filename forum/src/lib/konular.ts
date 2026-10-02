import "server-only";
import { db } from "./db";
import { deftereYaz } from "./defter";
import { kategoriGetir } from "./ontoloji";
import { surecBaslat } from "./oylama";
import { suanIso } from "./saat";
import { uygunlukDenetle, type UygunlukSonucu } from "./uygunluk";

export type KonuDurumu = "oylamada" | "aktif" | "reddedildi" | "kapandi" | "silindi";

export const DURUMLAR: Record<KonuDurumu, string> = {
  oylamada: "Oylamada",
  aktif: "Tartışmaya açık",
  reddedildi: "Reddedildi",
  kapandi: "Uzlaşıyla kapandı",
  silindi: "Oylamayla kaldırıldı",
};

export type Konu = {
  id: number;
  kategori_id: number;
  kategori_ad: string;
  ust_konu_id: number | null;
  baslik: string;
  aciklama: string;
  acan_id: number;
  acan_takma_ad: string;
  durum: KonuDurumu;
  uygunluk_puani: number;
  uygunluk_rapor: string;
  olusturma: string;
  alt_sayisi: number;
  mesaj_sayisi: number;
  son_etkinlik: string;
};

const SECIM = `
  SELECT k.*, kat.ad AS kategori_ad, u.takma_ad AS acan_takma_ad,
         (SELECT COUNT(*) FROM konular a WHERE a.ust_konu_id = k.id AND a.durum != 'silindi') AS alt_sayisi,
         (SELECT COUNT(*) FROM mesajlar m WHERE m.konu_id = k.id) AS mesaj_sayisi,
         COALESCE((SELECT MAX(m.olusturma) FROM mesajlar m WHERE m.konu_id = k.id), k.olusturma) AS son_etkinlik
  FROM konular k
  JOIN kategoriler kat ON kat.id = k.kategori_id
  JOIN kullanicilar u ON u.id = k.acan_id`;

export function konuGetir(id: number): Konu | undefined {
  return db.prepare(`${SECIM} WHERE k.id = ?`).get(id) as Konu | undefined;
}

/** Konunun üst konu zinciri (en üstten başlayarak, kendisi hariç). */
export function ustKonuZinciri(konu: Konu): Konu[] {
  const zincir: Konu[] = [];
  let ustId = konu.ust_konu_id;
  while (ustId !== null) {
    const ust = konuGetir(ustId);
    if (!ust) break;
    zincir.unshift(ust);
    ustId = ust.ust_konu_id;
  }
  return zincir;
}

export function altKonular(konuId: number): Konu[] {
  return db.prepare(`${SECIM} WHERE k.ust_konu_id = ? AND k.durum != 'silindi' ORDER BY k.id DESC`).all(konuId) as Konu[];
}

/** Verilen kategorilerdeki ana konular (alt konular hariç). */
export function kategoriKonulari(kategoriIdleri: number[]): Konu[] {
  return db
    .prepare(
      `${SECIM} WHERE k.ust_konu_id IS NULL AND k.durum != 'silindi'
       AND k.kategori_id IN (${kategoriIdleri.map(() => "?").join(",")})
       ORDER BY son_etkinlik DESC`,
    )
    .all(...kategoriIdleri) as Konu[];
}

export function sonKonular(durum: KonuDurumu, limit = 10): Konu[] {
  return db.prepare(`${SECIM} WHERE k.durum = ? ORDER BY son_etkinlik DESC LIMIT ?`).all(durum, limit) as Konu[];
}

export function kullaniciKonulari(kullaniciId: number): Konu[] {
  return db
    .prepare(`${SECIM} WHERE k.acan_id = ? AND k.durum != 'silindi' ORDER BY k.id DESC`)
    .all(kullaniciId) as Konu[];
}

/**
 * Konu ya da alt konu önerir: uygunluk denetimi → kayıt → Topluluk Oylaması başlar.
 * Başarılıysa yeni konu id'si, değilse denetim sonucu döner.
 */
export function konuOner(girdi: {
  kategoriId: number;
  ustKonuId: number | null;
  baslik: string;
  aciklama: string;
  onerenId: number;
}): { hata: string; denetim?: UygunlukSonucu } | { id: number } {
  const ustKonu = girdi.ustKonuId ? konuGetir(girdi.ustKonuId) : undefined;
  if (girdi.ustKonuId && !ustKonu) return { hata: "Üst konu bulunamadı." };
  if (ustKonu && ustKonu.durum !== "aktif")
    return { hata: "Alt konu yalnızca tartışmaya açık (oylamayla kabul edilmiş) konulara önerilebilir." };

  const kategori = kategoriGetir(ustKonu ? ustKonu.kategori_id : girdi.kategoriId);
  if (!kategori) return { hata: "Bir bölüm seçin." };

  const denetim = uygunlukDenetle({ kategori, baslik: girdi.baslik, aciklama: girdi.aciklama, ustKonu, kullaniciId: girdi.onerenId });
  if (!denetim.gecti) return { hata: "Göndermeden önce küçük bir düzeltme gerekiyor.", denetim };

  const r = db
    .prepare(
      `INSERT INTO konular (kategori_id, ust_konu_id, baslik, aciklama, acan_id, durum, uygunluk_puani, uygunluk_rapor, olusturma)
       VALUES (?, ?, ?, ?, ?, 'oylamada', ?, ?, ?)`,
    )
    .run(
      kategori.id,
      ustKonu?.id ?? null,
      girdi.baslik,
      girdi.aciklama,
      girdi.onerenId,
      denetim.puan,
      JSON.stringify({ notlar: denetim.notlar, oneriKategori: denetim.oneriKategori ?? null }),
      suanIso(),
    );
  const id = Number(r.lastInsertRowid);

  // Öneren kişi kategoriyle ilgili sayılır → otomatik takip
  db.prepare("INSERT OR IGNORE INTO takipler (kullanici_id, kategori_id) VALUES (?, ?)").run(girdi.onerenId, kategori.id);
  deftereYaz("konu_onerildi", { konu_id: id, ust_konu_id: ustKonu?.id ?? null, kategori: kategori.ad, baslik: girdi.baslik });
  surecBaslat("konu_ac", id, kategori.id, girdi.onerenId);
  return { id };
}
