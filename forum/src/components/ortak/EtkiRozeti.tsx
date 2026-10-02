import { CheckCheck, Clock, Landmark, Scroll, XCircle } from "lucide-react";
import type { TepkiDurumu } from "@/lib/etki";
import { cn } from "@/lib/utils";
import { Damga } from "./Durum";

const GORUNUM: Record<TepkiDurumu, { ad: string; ikon: typeof Clock; sinif: string }> = {
  inceleniyor: { ad: "Kurum inceliyor", ikon: Clock, sinif: "border-foreground/30 text-muted-foreground" },
  gundemde: { ad: "Gündeme alındı", ikon: Scroll, sinif: "border-warning/60 text-warning" },
  uygulandi: { ad: "Uygulandı", ikon: CheckCheck, sinif: "border-success bg-success text-background" },
  reddedildi: { ad: "Gerekçeli ret", ikon: XCircle, sinif: "border-destructive/50 text-destructive" },
};

export function EtkiRozeti({ durum, className }: { durum: TepkiDurumu; className?: string }) {
  const g = GORUNUM[durum];
  return (
    <Damga className={cn(g.sinif, className)}>
      <g.ikon />
      {g.ad}
    </Damga>
  );
}

export function KurumYanitiRozeti({ className }: { className?: string }) {
  return (
    <Damga className={cn("border-foreground/30 text-foreground", className)}>
      <Landmark /> Kurum yanıtladı
    </Damga>
  );
}
