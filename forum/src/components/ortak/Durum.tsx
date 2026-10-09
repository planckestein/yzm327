import type { KonuDurumu } from "@/lib/konular";
import { cn } from "@/lib/utils";

/** Küçük durum etiketi: kilimdeki gibi renkli bir baklava ve yazı. */
export function Damga({ className, nokta = true, children }: { className?: string; nokta?: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground", className)}>
      {nokta && <span className="size-[7px] rotate-45 bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const KONU: Record<KonuDurumu, { ad: string; sinif: string }> = {
  oylamada: { ad: "Oylamada", sinif: "text-vurgu" },
  aktif: { ad: "Açık", sinif: "text-success" },
  kapandi: { ad: "Uzlaşıldı", sinif: "text-foreground" },
  reddedildi: { ad: "Reddedildi", sinif: "text-destructive" },
  silindi: { ad: "Kaldırıldı", sinif: "text-muted-foreground" },
};

export function KonuDurumRozeti({ durum, className }: { durum: KonuDurumu; className?: string }) {
  const d = KONU[durum];
  return <Damga className={cn(d.sinif, className)}>{d.ad}</Damga>;
}

export function KararDurumRozeti({ durum, asamaAd, className }: { durum: "suruyor" | "kabul" | "red"; asamaAd?: string; className?: string }) {
  if (durum === "kabul") return <Damga className={cn("text-success", className)}>Kabul edildi</Damga>;
  if (durum === "red") return <Damga className={cn("text-destructive", className)}>Reddedildi</Damga>;
  return <Damga className={cn("text-vurgu", className)}>{asamaAd ?? "Oylamada"}</Damga>;
}
