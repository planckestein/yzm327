import { cn } from "@/lib/utils";

type Props = { evet: number; hayir: number; secmen: number; gereken: number | null; ince?: boolean; className?: string };

/** Evet (yeşil) / hayır (kırmızı) çubuğu; dikey çizgi kabul eşiğini gösterir. */
export function OyCubugu({ evet, hayir, secmen, gereken, ince, className }: Props) {
  const y = (n: number) => (secmen ? Math.min(100, (n / secmen) * 100) : 0);
  return (
    <div
      className={cn("relative flex w-full overflow-visible bg-foreground/10", ince ? "h-1" : "h-2", className)}
      role="img"
      aria-label={`Evet ${evet}, hayır ${hayir}, toplam ${secmen}${gereken ? `, gereken ${gereken}` : ""}`}
    >
      <span className="h-full bg-success" style={{ width: `${y(evet)}%` }} />
      <span className="ml-auto h-full bg-destructive" style={{ width: `${y(hayir)}%` }} />
      {gereken !== null && secmen > 0 && (
        <span
          className={cn("absolute w-px bg-foreground", ince ? "-top-1 -bottom-1" : "-top-1.5 -bottom-1.5")}
          style={{ left: `${y(gereken)}%` }}
          title={`Kabul eşiği: ${gereken}`}
        />
      )}
    </div>
  );
}
