"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mevcutKullanici } from "@/lib/auth";
import * as t from "@/lib/tartisma";

export type TartismaDurumu = { hata?: string; tamam?: number | string };

const metin = (form: FormData, ad: string) => String(form.get(ad) ?? "").trim();
const sayi = (form: FormData, ad: string) => Number(form.get(ad)) || 0;

async function kullanici() {
  const ben = await mevcutKullanici();
  if (!ben) redirect("/giris");
  return ben;
}

export async function mesajGonder(_o: TartismaDurumu, form: FormData): Promise<TartismaDurumu> {
  const ben = await kullanici();
  const konuId = sayi(form, "konu_id");
  const r = t.mesajYaz(konuId, ben.id, metin(form, "icerik"), sayi(form, "yanit_id") || null);
  if ("hata" in r) return r;
  revalidatePath(`/konu/${konuId}`);
  return { tamam: r.id };
}

/** Öneri başlatan işlemler: başarılıysa sürecin sayfasına gider. */
function sureceGit(r: { hata: string } | { id: number }): TartismaDurumu {
  if ("hata" in r) return r;
  redirect(`/karar/${r.id}`);
}

export async function mesajSilmeOnerisi(_o: TartismaDurumu, form: FormData) {
  const ben = await kullanici();
  return sureceGit(t.mesajSilmeOner(sayi(form, "mesaj_id"), ben.id, metin(form, "gerekce")));
}

export async function konuSilmeOnerisi(_o: TartismaDurumu, form: FormData) {
  const ben = await kullanici();
  return sureceGit(t.konuSilmeOner(sayi(form, "konu_id"), ben.id, metin(form, "gerekce")));
}

export async function konuDuzenlemeOnerisi(_o: TartismaDurumu, form: FormData) {
  const ben = await kullanici();
  return sureceGit(
    t.konuDuzenlemeOner(sayi(form, "konu_id"), ben.id, metin(form, "baslik"), metin(form, "aciklama"), metin(form, "gerekce")),
  );
}

export async function uzlasmaOnerisi(_o: TartismaDurumu, form: FormData) {
  const ben = await kullanici();
  return sureceGit(t.uzlasmaOner(sayi(form, "konu_id"), ben.id, metin(form, "metin")));
}

export async function serhEkle(_o: TartismaDurumu, form: FormData): Promise<TartismaDurumu> {
  const ben = await kullanici();
  const konuId = sayi(form, "konu_id");
  const r = t.serhYaz(konuId, ben.id, metin(form, "icerik"));
  if ("hata" in r) return r;
  revalidatePath(`/konu/${konuId}`);
  return { tamam: r.id };
}
