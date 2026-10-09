import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AkisFiltresi } from "@/lib/akis";

const SEKMELER: { f: AkisFiltresi; ad: string }[] = [
  { f: "son", ad: "Son" },
  { f: "oylamada", ad: "Oylamada" },
  { f: "uzlasildi", ad: "Uzlaşılanlar" },
  { f: "tumu", ad: "Tümü" },
];

/** Konu listesi filtre sekmeleri (bağlantı tabanlı, sayfa yenilenince korunur). */
export function AkisSekmeleri({
  aktif,
  taban,
  sayilar,
  capa,
}: {
  aktif: AkisFiltresi;
  taban: string;
  sayilar?: Partial<Record<AkisFiltresi, number>>;
  capa?: string;
}) {
  const son = capa ? `#${capa}` : "";
  return (
    <nav className="flex gap-4 overflow-x-auto" aria-label="Filtre">
      {SEKMELER.map(({ f, ad }) => (
        <Link
          key={f}
          href={(f === "son" ? taban : `${taban}?f=${f}`) + son}
          scroll={!capa}
          className={cn(
            "border-b-2 border-transparent py-1 text-[12px] font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
            aktif === f && "border-vurgu text-foreground",
          )}
        >
          {ad}
          {sayilar?.[f] ? <span className="ml-1 text-vurgu tabular-nums">{sayilar[f]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function filtreCoz(f: unknown): AkisFiltresi {
  return f === "oylamada" || f === "uzlasildi" || f === "tumu" ? f : "son";
}
