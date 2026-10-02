"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mevcutKullanici } from "@/lib/auth";
import * as secim from "@/lib/secim";

export type SecimDurumu = { hata?: string };

async function kullanici() {
  const ben = await mevcutKullanici();
  if (!ben) redirect("/giris");
  return ben;
}

export async function adayOl(_onceki: SecimDurumu, form: FormData): Promise<SecimDurumu> {
  const ben = await kullanici();
  const makam = String(form.get("makam")) === "yonetici" ? "yonetici" : "temsilci";
  const hata = secim.adayOl(ben.id, makam, Number(form.get("kategori_id") ?? 0));
  revalidatePath("/", "layout");
  return hata ? { hata } : {};
}

export async function adayliktanCekil() {
  const ben = await kullanici();
  secim.adayliktanCekil(ben.id);
  revalidatePath("/", "layout");
}

export async function destekVer(_onceki: SecimDurumu, form: FormData): Promise<SecimDurumu> {
  const ben = await kullanici();
  const hata = secim.destekDegistir(ben.id, Number(form.get("aday_id")));
  revalidatePath("/", "layout");
  return hata ? { hata } : {};
}
