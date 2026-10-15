import Link from "next/link";
import { Maximize2 } from "lucide-react";
import { KullanimDurumuDiyagrami, type KullanimDiyagrami } from "./KullanimDurumuDiyagrami";
import { SinifDiyagrami, type SinifDiyagramiVerisi } from "./SinifDiyagrami";
import { SiraDiyagrami, type SiraDiyagramiVerisi } from "./SiraDiyagrami";

/** Diyagramlar sayfasındaki bir şekil: numara, başlık, ne gösterdiği, çizim, nasıl okunacağı ve dayandığı dosyalar. */
export type SekilVerisi = {
  kod: string;
  no: string;
  baslik: string;
  aciklama: string;
  okuma: string[];
  kaynak: string[];
} & (
  | { tur: "kullanim"; veri: KullanimDiyagrami }
  | { tur: "sinif"; veri: SinifDiyagramiVerisi }
  | { tur: "sira"; veri: SiraDiyagramiVerisi }
);

export const TUR_ADI = { kullanim: "Kullanım durumu diyagramı", sinif: "Sınıf diyagramı", sira: "Sıralama diyagramı" } as const;

export function SekilCizimi({ sekil }: { sekil: SekilVerisi }) {
  const ortak = { on: sekil.kod, baslik: `Şekil ${sekil.no}: ${sekil.baslik}` };
  if (sekil.tur === "kullanim") return <KullanimDurumuDiyagrami veri={sekil.veri} {...ortak} />;
  if (sekil.tur === "sinif") return <SinifDiyagrami veri={sekil.veri} {...ortak} />;
  return <SiraDiyagrami veri={sekil.veri} {...ortak} />;
}

export function Sekil({ sekil }: { sekil: SekilVerisi }) {
  return (
    <figure id={sekil.kod} className="sekil flex scroll-mt-28 flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg leading-snug font-semibold">
          <span className="mr-2 text-vurgu tabular-nums">Şekil {sekil.no}</span>
          {sekil.baslik}
        </h3>
        <Link href={`/diyagramlar/${sekil.kod}`} className="inline-flex items-center gap-1 text-xs font-semibold hover:underline print:hidden">
          <Maximize2 className="size-3.5" /> Tam boyut
        </Link>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{sekil.aciklama}</p>
      {/* Çizim sayfa sütunundan geniş olabilir: geniş ekranda sütunun dışına taşar, dar ekranda sığacak kadar küçülür */}
      <div className="relative left-1/2 w-[min(96vw,1480px)] -translate-x-1/2 print:static print:w-full print:translate-x-0">
        <div className="uml-kap mx-auto w-fit max-w-full overflow-x-auto border bg-card p-3">
          <SekilCizimi sekil={sekil} />
        </div>
      </div>
      <figcaption className="grid gap-x-8 gap-y-2 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
        <ul className="flex flex-col gap-1.5">
          {sekil.okuma.map((o) => (
            <li key={o} className="flex gap-2 leading-snug">
              <span aria-hidden className="mt-[7px] size-[5px] shrink-0 rotate-45 bg-sari" />
              <span>{o}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1">
          <span className="ust-etiket">Dayandığı dosyalar</span>
          {sekil.kaynak.map((k) => (
            <span key={k} className="font-mono text-xs leading-snug break-all text-muted-foreground">
              {k}
            </span>
          ))}
        </div>
      </figcaption>
    </figure>
  );
}
