import type { Metadata } from "next";
import Link from "next/link";
import { mevcutKullanici } from "@/lib/auth";
import { acikKararlar, sonuclananKararlar, turKararlari } from "@/lib/akis";
import { DEGISTIRILEBILIR, kuralDegeriYazi, kurallar, VARSAYILAN, type KuralAnahtari } from "@/lib/kurallar";
import { cn } from "@/lib/utils";
import { KararListesi } from "@/components/karar/KararListesi";
import { KuralOneriDiyalogu } from "@/components/karar/KuralOneriDiyalogu";
import { AraBaslik, SayfaBasligi } from "@/components/ortak/SayfaBasligi";

export const metadata: Metadata = { title: "Kararlar" };

const SEKMELER = [
  { s: "acik", ad: "Süren" },
  { s: "sonuc", ad: "Sonuçlanan" },
  { s: "kurallar", ad: "Yayın ilkeleri" },
] as const;

export default async function KararlarSayfasi({ searchParams }: PageProps<"/kararlar">) {
  const s = String((await searchParams).s ?? "acik");
  const sekme = SEKMELER.some((x) => x.s === s) ? s : "acik";
  const ben = await mevcutKullanici();
  const acik = acikKararlar(ben?.id ?? null).sort((a, b) => Number(b.oyBekliyor) - Number(a.oyBekliyor));
  const k = kurallar();
  const anahtarlar = Object.keys(DEGISTIRILEBILIR) as KuralAnahtari[];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <SayfaBasligi
        ust="Meclis"
        baslik="Kararlar"
        sag={
          ben && (
            <KuralOneriDiyalogu
              tanimlar={Object.fromEntries(anahtarlar.map((a) => [a, DEGISTIRILEBILIR[a]!]))}
              mevcut={Object.fromEntries(anahtarlar.map((a) => [a, kuralDegeriYazi(a, k[a])]))}
            />
          )
        }
      >
        Burada her şey oylamayla karara bağlanır: konu açmak, mesaj gizlemek, konuyu kapatmak, yayın ilkelerini değiştirmek.
      </SayfaBasligi>

      <nav className="flex gap-5 border-b">
        {SEKMELER.map((x) => (
          <Link
            key={x.s}
            href={x.s === "acik" ? "/kararlar" : `/kararlar?s=${x.s}`}
            className={cn(
              "-mb-px border-b-[3px] border-transparent py-2 text-[12px] font-semibold tracking-[0.08em] text-muted-foreground uppercase hover:text-foreground",
              sekme === x.s && "border-vurgu text-foreground",
            )}
          >
            {x.ad}
            {x.s === "acik" && <span className="ml-1.5 text-vurgu tabular-nums">{acik.length}</span>}
          </Link>
        ))}
      </nav>

      {sekme === "acik" && <KararListesi kararlar={acik} bos="Şu an süren bir oylama yok." />}
      {sekme === "sonuc" && <KararListesi kararlar={sonuclananKararlar()} bos="Henüz sonuçlanan karar yok." />}
      {sekme === "kurallar" && (
        <div className="flex flex-col gap-8">
          <table className="w-full text-sm">
            <tbody className="divide-y border-y border-foreground">
              {anahtarlar.map((a) => (
                <tr key={a}>
                  <th className="py-3 pr-4 text-left font-normal text-muted-foreground">{DEGISTIRILEBILIR[a]!.ad}</th>
                  <td className="py-3 text-right font-serif text-base font-semibold">
                    {kuralDegeriYazi(a, k[a])}
                    {k[a] !== VARSAYILAN[a] && (
                      <span className="ml-2 font-sans text-[10px] font-bold tracking-[0.1em] text-vurgu uppercase">oylamayla değişti</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <section className="flex flex-col gap-1">
            <AraBaslik>İlke önerileri</AraBaslik>
            <KararListesi kararlar={turKararlari("kural_degistir", ben?.id ?? null)} bos="Henüz ilke önerisi yok." />
          </section>
          <p className="text-sm text-muted-foreground">
            Temel ilkeler (ifade özgürlüğü, eşit haklar, silinmeyen kayıtlar, azınlığın korunması) için{" "}
            <Link href="/hakkinda" className="font-semibold text-foreground underline underline-offset-2">
              Nasıl işliyor?
            </Link>{" "}
            sayfasına bak.
          </p>
        </div>
      )}
    </div>
  );
}
