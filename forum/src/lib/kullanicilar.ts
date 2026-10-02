import "server-only";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { deftereYaz } from "./defter";
import { kurallar } from "./kurallar";
import { suan, suanIso } from "./saat";

export type KayitBilgisi = {
  ad: string;
  soyad: string;
  takma_ad: string;
  adres: string;
  dogum_tarihi: string;
  sifre: string;
  rol?: string;
};

function yasHesapla(dogum: Date) {
  const bugun = suan();
  let yas = bugun.getFullYear() - dogum.getFullYear();
  const m = bugun.getMonth() - dogum.getMonth();
  if (m < 0 || (m === 0 && bugun.getDate() < dogum.getDate())) yas--;
  return yas;
}

/** Yeni üye oluşturur. Hata varsa mesaj döner, yoksa yeni kullanıcı id'si. */
export async function kullaniciOlustur(k: KayitBilgisi): Promise<{ hata: string } | { id: number }> {
  if ([k.ad, k.soyad, k.takma_ad, k.adres, k.dogum_tarihi].some((v) => !v)) return { hata: "Tüm alanları doldurun." };
  if (!/^[a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]{3,20}$/.test(k.takma_ad))
    return { hata: "Takma ad 3-20 karakter olmalı; sadece harf, rakam ve _ içerebilir." };
  if (k.sifre.length < 8) return { hata: "Şifre en az 8 karakter olmalı." };

  const dogum = new Date(k.dogum_tarihi);
  if (isNaN(dogum.getTime()) || dogum > suan()) return { hata: "Geçerli bir doğum tarihi girin." };
  const { minimumYas } = kurallar();
  if (yasHesapla(dogum) < minimumYas) return { hata: `Kayıt için en az ${minimumYas} yaşında olmalısınız.` };

  if (db.prepare("SELECT 1 FROM kullanicilar WHERE takma_ad = ?").get(k.takma_ad)) return { hata: "Bu takma ad alınmış." };

  const hash = await bcrypt.hash(k.sifre, 10);
  const r = db
    .prepare(
      `INSERT INTO kullanicilar (ad, soyad, takma_ad, adres, dogum_tarihi, sifre_hash, rol, olusturma)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(k.ad, k.soyad, k.takma_ad, k.adres, k.dogum_tarihi, hash, k.rol ?? "uye", suanIso());
  const id = Number(r.lastInsertRowid);
  deftereYaz("uye_katildi", { takma_ad: k.takma_ad }); // kişisel bilgiler deftere yazılmaz
  return { id };
}

export function takmaAdiGetir(id: number): string {
  return (db.prepare("SELECT takma_ad FROM kullanicilar WHERE id = ?").get(id) as { takma_ad: string }).takma_ad;
}
