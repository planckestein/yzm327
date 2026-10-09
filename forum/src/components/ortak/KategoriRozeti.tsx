import Link from "next/link";
import { cn } from "@/lib/utils";
import { Motif } from "@/components/motif/Motif";
import { bolumMotifi } from "@/components/motif/desenler";

type Props = { id: number; ad: string; renk?: string; ustAd?: string | null; className?: string };

/** Bölüm etiketi: ana bölümün kilim motifi (kendi renginde) ve "Eğitim · Sınav Sistemi" gibi yol. */
export function KategoriRozeti({ id, ad, ustAd, className }: Props) {
  const m = bolumMotifi(ustAd ?? ad);
  return (
    <Link
      href={`/kategori/${id}`}
      className={cn("ust-etiket inline-flex min-w-0 items-center gap-1.5 hover:text-foreground", className)}
      title={ustAd ? `${ustAd} › ${ad}` : ad}
    >
      <Motif ad={m.motif} renk={m.renk} className="size-3.5" />
      <span className="truncate">{ustAd ? `${ustAd} · ${ad}` : ad}</span>
    </Link>
  );
}
