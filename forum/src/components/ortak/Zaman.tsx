import { goreceZaman, tamTarih } from "@/lib/bicim";
import { suan } from "@/lib/saat";

/** Göreli zaman ("3 sa"); üzerine gelince tam tarih. */
export function Zaman({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} title={tamTarih(iso)} className={className}>
      {goreceZaman(iso, suan())}
    </time>
  );
}
