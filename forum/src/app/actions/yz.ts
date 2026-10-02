"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mevcutKullanici } from "@/lib/auth";
import { ozetiPaylas } from "@/lib/yz";
import type { TartismaDurumu } from "./tartisma";

export async function yzOzetiIste(_o: TartismaDurumu, form: FormData): Promise<TartismaDurumu> {
  if (!(await mevcutKullanici())) redirect("/giris");
  const konuId = Number(form.get("konu_id"));
  const r = await ozetiPaylas(konuId);
  if ("hata" in r) return r;
  revalidatePath(`/konu/${konuId}`);
  return { tamam: r.id };
}
