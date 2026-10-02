"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mevcutKullanici } from "@/lib/auth";
import { kategoriGetir, takipDegistir as takipDegistirLib } from "@/lib/ontoloji";
import { konuOner as konuOnerLib } from "@/lib/konular";
import type { UygunlukSonucu } from "@/lib/uygunluk";

export type OneriDurumu = {
  hata?: string;
  denetim?: UygunlukSonucu;
  alanlar?: { kategori_id?: string; baslik?: string; aciklama?: string };
};

export async function konuOner(_onceki: OneriDurumu, form: FormData): Promise<OneriDurumu> {
  const ben = await mevcutKullanici();
  if (!ben) redirect("/giris");

  const alanlar = {
    kategori_id: String(form.get("kategori_id") ?? ""),
    baslik: String(form.get("baslik") ?? "").trim(),
    aciklama: String(form.get("aciklama") ?? "").trim(),
  };
  const sonuc = konuOnerLib({
    kategoriId: Number(alanlar.kategori_id),
    ustKonuId: Number(form.get("ust_konu_id")) || null,
    baslik: alanlar.baslik,
    aciklama: alanlar.aciklama,
    onerenId: ben.id,
  });
  if ("hata" in sonuc) return { ...sonuc, alanlar };
  redirect(`/konu/${sonuc.id}`);
}

export async function takipDegistir(form: FormData) {
  const ben = await mevcutKullanici();
  if (!ben) redirect("/giris");
  const kategoriId = Number(form.get("kategori_id"));
  if (!kategoriGetir(kategoriId)) return;
  takipDegistirLib(ben.id, kategoriId);
  revalidatePath("/", "layout");
}
