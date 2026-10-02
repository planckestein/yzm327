import { CheckCircle2, Circle, Lock, Vote, XCircle } from "lucide-react";
import type { KonuDurumu } from "@/lib/konular";
import { cn } from "@/lib/utils";

/** Gazete damgası gibi küçük, köşeli, büyük harfli durum etiketi. */
export function Damga({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-[2px] border px-1.5 text-[10px] font-bold tracking-[0.1em] whitespace-nowrap uppercase [&>svg]:size-3",
        className,
      )}
    >
      {children}
    </span>
  );
}

const KONU: Record<KonuDurumu, { ad: string; ikon: typeof Circle; sinif: string }> = {
  oylamada: { ad: "Oylamada", ikon: Vote, sinif: "border-vurgu/50 text-vurgu" },
  aktif: { ad: "Açık", ikon: Circle, sinif: "border-success/40 text-success" },
  kapandi: { ad: "Uzlaşıldı", ikon: CheckCircle2, sinif: "border-foreground bg-foreground text-background" },
  reddedildi: { ad: "Reddedildi", ikon: XCircle, sinif: "border-destructive/40 text-destructive" },
  silindi: { ad: "Kaldırıldı", ikon: Lock, sinif: "border-border text-muted-foreground" },
};

export function KonuDurumRozeti({ durum, className }: { durum: KonuDurumu; className?: string }) {
  const d = KONU[durum];
  return (
    <Damga className={cn(d.sinif, className)}>
      <d.ikon />
      {d.ad}
    </Damga>
  );
}

export function KararDurumRozeti({ durum, asamaAd, className }: { durum: "suruyor" | "kabul" | "red"; asamaAd?: string; className?: string }) {
  if (durum === "kabul")
    return (
      <Damga className={cn("border-success/50 text-success", className)}>
        <CheckCircle2 /> Kabul edildi
      </Damga>
    );
  if (durum === "red")
    return (
      <Damga className={cn("border-destructive/50 text-destructive", className)}>
        <XCircle /> Reddedildi
      </Damga>
    );
  return (
    <Damga className={cn("border-vurgu/50 text-vurgu", className)}>
      <Vote /> {asamaAd ?? "Oylamada"}
    </Damga>
  );
}
