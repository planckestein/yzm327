import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = { id: number; ad: string; renk?: string; ustAd?: string | null; className?: string };

/** Gazete üst etiketi gibi bölüm adı: "EĞİTİM › SINAV SİSTEMİ" */
export function KategoriRozeti({ id, ad, ustAd, className }: Props) {
  return (
    <Link
      href={`/kategori/${id}`}
      className={cn("ust-etiket inline-flex min-w-0 items-center gap-1 hover:underline", className)}
      title={ustAd ? `${ustAd} › ${ad}` : ad}
    >
      <span className="truncate">{ustAd ? `${ustAd} · ${ad}` : ad}</span>
    </Link>
  );
}
