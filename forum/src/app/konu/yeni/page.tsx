import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/lib/auth";
import { duzListe } from "@/lib/ontoloji";
import { KonuOneriFormu } from "@/components/konu/KonuOneriFormu";
import { SayfaBasligi } from "@/components/ortak/SayfaBasligi";

export const metadata: Metadata = { title: "Yeni konu" };

export default async function YeniKonuSayfasi({ searchParams }: PageProps<"/konu/yeni">) {
  if (!(await mevcutKullanici())) redirect("/giris");
  const secili = Number((await searchParams).kategori) || undefined;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <SayfaBasligi ust="Gündem öner" baslik="Yeni konu">
        Herkes konu önerebilir. Bölümü takip eden üyelerin çoğunluğu kabul ederse konu tartışmaya açılır.
      </SayfaBasligi>
      <KonuOneriFormu kategoriler={duzListe()} seciliKategori={secili} />
    </div>
  );
}
