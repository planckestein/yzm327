import { cn } from "@/lib/utils";
import { DESENLER, izgaraYolu, type MotifAdi } from "./desenler";

/** Tek bir kilim motifi; rengi `renk` ya da çevredeki yazı renginden (currentColor) alır. */
export function Motif({ ad, renk, className, baslik }: { ad: MotifAdi; renk?: string; className?: string; baslik?: string }) {
  const { izgara } = DESENLER[ad];
  const en = Math.max(...izgara.map((s) => s.length));
  return (
    <svg
      viewBox={`-0.5 -0.5 ${en + 1} ${izgara.length + 1}`}
      className={cn("size-4 shrink-0", className)}
      style={renk ? { color: renk } : undefined}
      shapeRendering="crispEdges"
      role={baslik ? "img" : undefined}
      aria-label={baslik}
      aria-hidden={baslik ? undefined : true}
    >
      <path d={izgaraYolu(izgara)} fill="currentColor" />
    </svg>
  );
}

/*
 * Kilim şeridi: tekrar eden dokuma deseni. Renkler CSS değişkenlerinden gelir, gece temasında kendiliğinden döner.
 * "goz": kızıl zemin, ak baklava (göz), arada çivit küçük baklavalar, üstte altta kara kenar ve sarı ilmek sırası.
 * "zikzak": tek renkli su yolu; başlık altlarında ince süs çizgisi.
 */
type Katman = { renk: string; izgara: string[] };

const SERITLER: Record<"goz" | "zikzak" | "koc", { en: number; boy: number; zemin?: string; katmanlar: Katman[] }> = {
  goz: {
    en: 12,
    boy: 9,
    zemin: "var(--kizil)",
    katmanlar: [
      { renk: "var(--kara)", izgara: ["XXXXXXXXXXXX", "", "", "", "", "", "", "", "XXXXXXXXXXXX"] },
      { renk: "var(--sari)", izgara: ["", "X.X.X.X.X.X.", "", "", "", "", "", ".X.X.X.X.X.X"] },
      {
        renk: "var(--ak)",
        izgara: ["", "", ".....XX.....", "....XXXX....", "...XX..XX...", "....XXXX....", ".....XX....."],
      },
      { renk: "var(--kara)", izgara: ["", "", "", "", ".....XX.....", "", ""] },
      { renk: "var(--civit)", izgara: ["", "", "", "X..........X", "XX........XX", "X..........X", ""] },
    ],
  },
  zikzak: {
    en: 8,
    boy: 5,
    katmanlar: [{ renk: "currentColor", izgara: ["X.......", ".X.....X", "..X...X.", "...X.X..", "....X..."] }],
  },
  koc: {
    en: 14,
    boy: 7,
    zemin: "var(--civit)",
    katmanlar: [
      { renk: "var(--kara)", izgara: ["XXXXXXXXXXXXXX", "", "", "", "", "", "XXXXXXXXXXXXXX"] },
      {
        renk: "var(--ak)",
        izgara: ["", ".XXX....XXX...", ".X.X.XX.X.X...", "...XXXXXX.....", ".....XX.......", ""],
      },
      { renk: "var(--sari)", izgara: ["", "", "", "", "", "..........XX..", ""] },
    ],
  },
};

export function KilimSerit({
  desen = "goz",
  ilmek = 2,
  className,
}: {
  desen?: keyof typeof SERITLER;
  /** Bir ilmeğin piksel boyu: şeridin kalınlığı = ilmek × desen boyu */
  ilmek?: number;
  className?: string;
}) {
  const s = SERITLER[desen];
  const id = `kilim-${desen}-${ilmek}`;
  return (
    <svg className={cn("block w-full shrink-0", className)} height={s.boy * ilmek} aria-hidden shapeRendering="crispEdges">
      <defs>
        <pattern id={id} width={s.en * ilmek} height={s.boy * ilmek} patternUnits="userSpaceOnUse">
          <g transform={`scale(${ilmek})`}>
            {s.zemin && <rect width={s.en} height={s.boy} style={{ fill: s.zemin }} />}
            {s.katmanlar.map((k, i) => (
              <path key={i} d={izgaraYolu(k.izgara)} style={{ fill: k.renk }} />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
