"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { oturumAc, oturumKapat } from "@/lib/auth";
import { kullaniciOlustur } from "@/lib/kullanicilar";
import { DEMO_SIFRESI, DEMO_TAKMA_ADLARI } from "@/lib/demoHesaplari";

export type FormDurumu = { hata?: string; alanlar?: Record<string, string> };

export async function kayitOl(_onceki: FormDurumu, form: FormData): Promise<FormDurumu> {
  const alanlar = {
    ad: String(form.get("ad") ?? "").trim(),
    soyad: String(form.get("soyad") ?? "").trim(),
    takma_ad: String(form.get("takma_ad") ?? "").trim(),
    adres: String(form.get("adres") ?? "").trim(),
    dogum_tarihi: String(form.get("dogum_tarihi") ?? ""),
  };
  const sifre = String(form.get("sifre") ?? "");
  if (sifre !== String(form.get("sifre2") ?? "")) return { hata: "Şifreler eşleşmiyor.", alanlar };

  const sonuc = await kullaniciOlustur({ ...alanlar, sifre });
  if ("hata" in sonuc) return { hata: sonuc.hata, alanlar };

  await oturumAc(sonuc.id);
  redirect(`/profil/${encodeURIComponent(alanlar.takma_ad)}`);
}

export async function girisYap(_onceki: FormDurumu, form: FormData): Promise<FormDurumu> {
  const takma_ad = String(form.get("takma_ad") ?? "").trim();
  const sifre = String(form.get("sifre") ?? "");

  const k = db
    .prepare("SELECT id, sifre_hash FROM kullanicilar WHERE takma_ad = ?")
    .get(takma_ad) as { id: number; sifre_hash: string } | undefined;

  if (!k || !(await bcrypt.compare(sifre, k.sifre_hash)))
    return { hata: "Takma ad veya şifre hatalı.", alanlar: { takma_ad } };

  await oturumAc(k.id);
  redirect("/");
}

export async function cikisYap() {
  await oturumKapat();
  redirect("/");
}

/** Başka bir hesaba geçmek için: çıkış yapar ve giriş ekranına götürür. */
export async function hesapDegistir() {
  await oturumKapat();
  redirect("/giris");
}

/** Demo hesaplarına tek tıkla giriş. Yalnızca demo listesindeki ve şifresi hâlâ demo şifresi olan hesaplar. */
export async function demoGiris(form: FormData) {
  const takma_ad = String(form.get("takma_ad") ?? "");
  if (!DEMO_TAKMA_ADLARI.includes(takma_ad)) redirect("/giris");
  const k = db.prepare("SELECT id, sifre_hash FROM kullanicilar WHERE takma_ad = ?").get(takma_ad) as
    | { id: number; sifre_hash: string }
    | undefined;
  if (!k || !(await bcrypt.compare(DEMO_SIFRESI, k.sifre_hash))) redirect("/giris");
  await oturumKapat();
  await oturumAc(k.id);
  redirect("/");
}
