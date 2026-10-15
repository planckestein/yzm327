import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SekilCizimi, TUR_ADI } from "@/components/uml/Sekil";
import { sekilBul, TUM_SEKILLER } from "../sekiller";

/* Tek bir diyagram, gerçek boyutunda: derste yansıtmak ya da yakından bakmak için. */

export async function generateMetadata({ params }: PageProps<"/diyagramlar/[kod]">): Promise<Metadata> {
  const s = sekilBul((await params).kod);
  return { title: s ? `Şekil ${s.no}: ${s.baslik}` : "Diyagram" };
}

export default async function SekilSayfasi({ params }: PageProps<"/diyagramlar/[kod]">) {
  const s = sekilBul((await params).kod);
  if (!s) notFound();
  const sira = TUM_SEKILLER.indexOf(s);
  const [onceki, sonraki] = [TUM_SEKILLER[sira - 1], TUM_SEKILLER[sira + 1]];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/diyagramlar#${s.kod}`} className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
          <ArrowLeft className="size-4" /> Tüm diyagramlar
        </Link>
        <div className="flex gap-4 text-sm">
          {onceki && (
            <Link href={`/diyagramlar/${onceki.kod}`} className="hover:underline">
              ← Şekil {onceki.no}
            </Link>
          )}
          {sonraki && (
            <Link href={`/diyagramlar/${sonraki.kod}`} className="hover:underline">
              Şekil {sonraki.no} →
            </Link>
          )}
        </div>
      </div>
      <div>
        <div className="ust-etiket">{TUR_ADI[s.tur]}</div>
        <h1 className="mt-1 text-2xl font-semibold">
          <span className="mr-2 text-vurgu tabular-nums">Şekil {s.no}</span>
          {s.baslik}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{s.aciklama}</p>
      </div>
      {/* Sayfa sütununun dışına taşar: geniş diyagramlar ekran genişliğince, gerçek boyutunda görünür */}
      <div className="relative left-1/2 w-[96vw] -translate-x-1/2 print:static print:w-full print:translate-x-0">
        <div className="uml-kap uml-tam mx-auto w-fit max-w-full overflow-x-auto border bg-card p-4">
          <SekilCizimi sekil={s} />
        </div>
      </div>
    </div>
  );
}
