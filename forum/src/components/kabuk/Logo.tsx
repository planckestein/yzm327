import { cn } from "@/lib/utils";
import { izgaraYolu } from "@/components/motif/desenler";

/*
 * Kurultay işareti: dokuma ızgarasında bir otağ (kurultayın toplandığı çadır).
 * Tepede sarı tündük (gökyüzüne açılan halka), kubbede kızıl kuşak, gövdede kerege (kafes duvar), önde kızıl kapı.
 * Büyük boyu: motif/OtagCizimi.tsx.
 */
export const OTAG = {
  en: 13,
  boy: 10,
  govde: [
    ".............",
    "....X.X.X....",
    "...XXXXXXX...",
    "..XXXXXXXXX..",
    ".............",
    "XXXXXXXXXXXXX",
    "X.X.X.X.X.X.X",
    "XXXXXXXXXXXXX",
    "XXXXX...XXXXX",
    "XXXXX...XXXXX",
  ],
  tunduk: [".....XXX.....", ".....X.X....."],
  kusak: ["", "", "", "", ".XXXXXXXXXXX."],
  kapi: ["", "", "", "", "", "", "", "", ".....XXX.....", ".....XXX....."],
};

export function Isaret({ className }: { className?: string }) {
  return (
    <svg viewBox={`-0.5 -0.5 ${OTAG.en + 1} ${OTAG.boy + 1}`} className={cn("h-5 w-auto shrink-0", className)} shapeRendering="crispEdges" aria-hidden>
      <path d={izgaraYolu(OTAG.govde)} style={{ fill: "var(--foreground)" }} />
      <path d={izgaraYolu(OTAG.kusak)} style={{ fill: "var(--kizil)" }} />
      <path d={izgaraYolu(OTAG.tunduk)} style={{ fill: "var(--sari)" }} />
      <path d={izgaraYolu(OTAG.kapi)} style={{ fill: "var(--kizil)" }} />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[19px] leading-none font-bold tracking-[-0.01em] [font-stretch:112%]", className)}>
      <Isaret className="h-[1.05em] -translate-y-px" />
      Kurultay
    </span>
  );
}
