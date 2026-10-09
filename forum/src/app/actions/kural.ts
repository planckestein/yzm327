"use server";

import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/lib/auth";
import { DEGISTIRILEBILIR, kuralDegeriCoz, kurallar, type KuralAnahtari } from "@/lib/kurallar";
import { surecBaslat } from "@/lib/surec";
import { TEHDIT_MESAJI, tehditBul } from "@/lib/tehdit";

export type KuralOneriDurumu = { hata?: string };

export async function kuralOner(_onceki: KuralOneriDurumu, form: FormData): Promise<KuralOneriDurumu> {
  const ben = await mevcutKullanici();
  if (!ben) redirect("/giris");
  if (ben.rol === "resmi") return { hata: "Kurum hesapları yayın ilkelerinin değiştirilmesini öneremez." };

  const anahtar = String(form.get("anahtar")) as KuralAnahtari;
  const gerekce = String(form.get("gerekce") ?? "").trim();
  if (!DEGISTIRILEBILIR[anahtar]) return { hata: "Bu kural oylamayla değiştirilemez." };

  const deger = kuralDegeriCoz(anahtar, String(form.get("deger") ?? ""));
  if (deger === null) return { hata: "Geçersiz değer." };
  if (kurallar()[anahtar] === deger) return { hata: "Bu kural zaten bu değerde." };
  if (tehditBul(gerekce)) return { hata: TEHDIT_MESAJI };

  // İlke önerisi tüm forumu ilgilendirir → kategori yok (tüm üyeler oy verir)
  const id = surecBaslat("kural_degistir", null, null, ben.id, {
    anahtar,
    eski: kurallar()[anahtar],
    deger,
    gerekce,
  });
  redirect(`/karar/${id}`);
}
