import type { TepkiDurumu } from "@/lib/etki";
import { cn } from "@/lib/utils";
import { Damga } from "./Durum";

const GORUNUM: Record<TepkiDurumu, { ad: string; sinif: string }> = {
  inceleniyor: { ad: "Kurum inceliyor", sinif: "text-muted-foreground" },
  gundemde: { ad: "Gündeme alındı", sinif: "text-warning" },
  uygulandi: { ad: "Uygulandı", sinif: "text-success" },
  reddedildi: { ad: "Gerekçeli ret", sinif: "text-destructive" },
};

export function EtkiRozeti({ durum, className }: { durum: TepkiDurumu; className?: string }) {
  const g = GORUNUM[durum];
  return <Damga className={cn(g.sinif, className)}>{g.ad}</Damga>;
}

export function KurumYanitiRozeti({ className }: { className?: string }) {
  return <Damga className={cn("text-foreground", className)}>Kurum yanıtladı</Damga>;
}
