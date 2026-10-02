import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/lib/auth";
import { SayfaBasligi } from "@/components/ortak/SayfaBasligi";
import KayitFormu from "./KayitFormu";

export const metadata: Metadata = { title: "Kayıt ol" };

export default async function KayitSayfasi() {
  if (await mevcutKullanici()) redirect("/");
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <SayfaBasligi ust="Ücretsiz üyelik" baslik="Ortak Akıl’a katıl">
        Konu öner, tartışmalara katıl, kararlarda oy kullan. Başkaları yalnızca adını ve takma adını görür.
      </SayfaBasligi>
      <KayitFormu />
    </div>
  );
}
