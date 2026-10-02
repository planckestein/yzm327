"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { mevcutKullanici } from "@/lib/auth";
import { kategoriGetir } from "@/lib/ontoloji";
import { devirGeriAl, devret, oyKullan, yoneticiKarari, type Secim } from "@/lib/oylama";

export type IslemDurumu = { hata?: string; tamam?: number | string };

export async function oyVer(_onceki: IslemDurumu, form: FormData): Promise<IslemDurumu> {
  const ben = await mevcutKullanici();
  if (!ben) redirect("/giris");
  const secim = String(form.get("secim"));
  if (secim !== "evet" && secim !== "hayir") return { hata: "Geçersiz seçim." };

  const hata = oyKullan(Number(form.get("oylama_id")), ben.id, secim as Secim);
  revalidatePath("/", "layout");
  return hata ? { hata } : { tamam: "Oyun kaydedildi." };
}

export async function oyDevret(_onceki: IslemDurumu, form: FormData): Promise<IslemDurumu> {
  const ben = await mevcutKullanici();
  if (!ben) redirect("/giris");
  const kategoriId = Number(form.get("kategori_id"));
  const kategoriAd = kategoriId === 0 ? "Tüm forum" : kategoriGetir(kategoriId)?.ad;
  if (!kategoriAd || !Number.isInteger(kategoriId)) return { hata: "Bir bölüm seçin." };
  const alan = db.prepare("SELECT id, takma_ad FROM kullanicilar WHERE takma_ad = ?").get(String(form.get("alan"))) as
    | { id: number; takma_ad: string }
    | undefined;
  if (!alan) return { hata: "Kullanıcı bulunamadı." };

  const hata = devret(ben.id, alan.id, kategoriId);
  revalidatePath("/", "layout");
  return hata ? { hata } : { tamam: `“${kategoriAd}” oylamalarındaki oyunu @${alan.takma_ad} kullanacak.` };
}

export async function devriKaldir(form: FormData) {
  const ben = await mevcutKullanici();
  if (!ben) redirect("/giris");
  devirGeriAl(ben.id, Number(form.get("kategori_id")));
  revalidatePath("/", "layout");
}

export async function yoneticiKarariVer(_onceki: IslemDurumu, form: FormData): Promise<IslemDurumu> {
  const ben = await mevcutKullanici();
  if (!ben) redirect("/giris");
  const karar = String(form.get("karar"));
  if (karar !== "onay" && karar !== "veto") return { hata: "Geçersiz karar." };

  const hata = yoneticiKarari(Number(form.get("surec_id")), ben.id, karar, String(form.get("gerekce") ?? "").trim());
  revalidatePath("/", "layout");
  return hata ? { hata } : { tamam: karar === "onay" ? "Öneri onaylandı." : "Öneri veto edildi." };
}
