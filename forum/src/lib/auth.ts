import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export const ROLLER: Record<string, string> = {
  uye: "Üye",
  bilirkisi: "Uzman",
  yz: "YZ Analist",
  resmi: "Kurum hesabı",
};

/** Oy kullanamayan, aday olamayan, oy devralamayan roller: yapay zeka ve kurum hesapları. */
export const OY_HAKKI_OLMAYAN_ROLLER = ["yz", "resmi"];

export type Kullanici = {
  id: number;
  ad: string;
  soyad: string;
  takma_ad: string;
  adres: string;
  dogum_tarihi: string;
  rol: string;
  olusturma: string;
};

const COOKIE = "oturum";
const OTURUM_GUN = 30;

export async function oturumAc(kullaniciId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const bitis = new Date(Date.now() + OTURUM_GUN * 86400_000);
  db.prepare("INSERT INTO oturumlar (token, kullanici_id, bitis) VALUES (?, ?, ?)").run(
    token,
    kullaniciId,
    bitis.toISOString(),
  );
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: bitis,
  });
}

export async function oturumKapat() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) db.prepare("DELETE FROM oturumlar WHERE token = ?").run(token);
  store.delete(COOKIE);
}

export async function mevcutKullanici(): Promise<Kullanici | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const satir = db
    .prepare(
      `SELECT k.id, k.ad, k.soyad, k.takma_ad, k.adres, k.dogum_tarihi, k.rol, k.olusturma
       FROM oturumlar o JOIN kullanicilar k ON k.id = o.kullanici_id
       WHERE o.token = ? AND o.bitis > ?`,
    )
    .get(token, new Date().toISOString());
  return (satir as Kullanici | undefined) ?? null;
}
