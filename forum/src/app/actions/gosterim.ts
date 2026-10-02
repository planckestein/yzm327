"use server";

import { revalidatePath } from "next/cache";
import { gosterimHedefi, gosterimiOynat } from "@/lib/gosterim";

export async function gosterimHazirla() {
  return gosterimHedefi();
}

export async function gosterimUygula(surecId: number) {
  const sonuc = gosterimiOynat(surecId);
  if (!("hata" in sonuc)) revalidatePath("/", "layout");
  return sonuc;
}
