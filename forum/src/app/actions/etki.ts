"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mevcutKullanici } from "@/lib/auth";
import { tepkiBildir } from "@/lib/etki";
import type { TartismaDurumu } from "./tartisma";

export async function kurumTepkisiBildir(_o: TartismaDurumu, form: FormData): Promise<TartismaDurumu> {
  const ben = await mevcutKullanici();
  if (!ben) redirect("/giris");
  const konuId = Number(form.get("konu_id"));
  const r = tepkiBildir(konuId, ben.id, String(form.get("durum") ?? ""), String(form.get("aciklama") ?? ""));
  if ("hata" in r) return r;
  revalidatePath("/", "layout");
  return { tamam: r.id };
}
