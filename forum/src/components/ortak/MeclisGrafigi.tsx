import { sayi } from "@/lib/bicim";
import { cn } from "@/lib/utils";

type Props = {
  evet: number;
  hayir: number;
  secmen: number;
  gereken: number | null;
  /** Giriş yapan üyenin oyu: kendi sandalyesi halkayla işaretlenir. */
  benim?: "evet" | "hayir" | null;
  kucuk?: boolean;
  className?: string;
};

type Koltuk = { x: number; y: number; aci: number };

/**
 * Kurultay yarım dairesi: oy hakkı olan herkes bir sandalye (kilim baklavası).
 * Soldan evetler (yeşil), sağdan hayırlar (kırmızı) dolar; boş sandalyeler henüz oy vermeyenlerdir.
 * Kesik çizgi kabul eşiğidir: yeşiller çizgiyi geçerse öneri kabul edilir.
 */
function koltuklar(n: number): { liste: Koltuk[]; yaricap: number; ic: number } {
  if (n <= 0) return { liste: [], yaricap: 0, ic: 0 };
  const sira = n <= 16 ? 1 : n <= 36 ? 2 : n <= 70 ? 3 : n <= 110 ? 4 : n <= 170 ? 5 : 6;
  const ic = sira === 1 ? 0.75 : sira === 2 ? 0.62 : 0.5;
  const r = Array.from({ length: sira }, (_, i) => (sira === 1 ? 0.85 : ic + ((1 - ic) * i) / (sira - 1)));
  const toplamR = r.reduce((a, b) => a + b, 0);
  const sayi = r.map((ri) => Math.max(1, Math.round((n * ri) / toplamR)));
  sayi[sira - 1] += n - sayi.reduce((a, b) => a + b, 0);

  const liste: Koltuk[] = [];
  let enDar = sira > 1 ? (1 - ic) / (sira - 1) : 0.5;
  r.forEach((ri, i) => {
    const s = sayi[i];
    if (s > 1) enDar = Math.min(enDar, (Math.PI * ri) / (s - 1));
    for (let j = 0; j < s; j++) {
      const aci = s === 1 ? Math.PI / 2 : Math.PI * (1 - j / (s - 1));
      liste.push({ x: Math.cos(aci) * ri * 100, y: -Math.sin(aci) * ri * 100, aci });
    }
  });
  liste.sort((a, b) => b.aci - a.aci || a.y - b.y);
  return { liste, yaricap: Math.min(10, enDar * 100 * 0.42), ic: (sira === 1 ? 0.85 : ic) * 100 };
}

/** En fazla bu kadar sandalye çizilir; daha kalabalık meclislerde her sandalye birden çok kişiyi temsil eder. */
const EN_COK_SANDALYE = 100;

/** Kişi sayılarını sandalye sayılarına çevirir; kabul/red durumu (eşiğin altında mı üstünde mi) korunur. */
function sandalyelere(evet: number, hayir: number, secmen: number, gereken: number | null) {
  if (secmen <= EN_COK_SANDALYE) return { kS: secmen, kE: evet, kH: hayir, kG: gereken, kisi: 1 };
  const N = EN_COK_SANDALYE;
  const oran = (n: number) => (n / secmen) * N;
  const kG = gereken === null ? null : Math.min(N, Math.ceil(oran(gereken)));
  let kE = Math.round(oran(evet));
  if (kG !== null) kE = evet >= gereken! ? Math.max(kE, kG) : Math.min(kE, kG - 1);
  const kH = Math.min(N - kE, Math.round(oran(hayir)));
  return { kS: N, kE, kH, kG, kisi: Math.round(secmen / N) };
}

export function MeclisGrafigi({ evet, hayir, secmen, gereken, benim, kucuk, className }: Props) {
  const { kS, kE, kH, kG, kisi } = sandalyelere(evet, hayir, secmen, gereken);
  const { liste, yaricap, ic } = koltuklar(kS);
  const esikAcisi =
    kG !== null && kG > 0 && kG <= liste.length
      ? kG < liste.length
        ? (liste[kG - 1].aci + liste[kG].aci) / 2
        : liste[kG - 1].aci / 2
      : null;
  const benimSira = benim === "evet" ? kE - 1 : benim === "hayir" ? kS - kH : -1;
  const buyuk = evet >= 1000 || (gereken ?? 0) >= 1000;

  return (
    <figure className={cn("flex flex-col items-center", className)}>
      <svg
        viewBox="-112 -112 224 122"
        className="w-full overflow-visible"
        role="img"
        aria-label={`${sayi(secmen)} oy hakkı: ${sayi(evet)} evet, ${sayi(hayir)} hayır, ${sayi(secmen - evet - hayir)} henüz oy vermedi${gereken ? `; kabul için ${sayi(gereken)} evet gerekiyor` : ""}`}
      >
        {liste.map((k, i) => {
          const tur = i < kE ? "evet" : i >= kS - kH ? "hayir" : "bos";
          // Her sandalye kilimdeki gibi bir baklava (45° dönmüş kare)
          const yan = (tur === "bos" ? yaricap * 0.8 : yaricap) * 1.45;
          return (
            <rect
              key={i}
              x={k.x - yan / 2}
              y={k.y - yan / 2}
              width={yan}
              height={yan}
              transform={`rotate(45 ${k.x} ${k.y})`}
              className={cn(
                tur === "evet" && "fill-success",
                tur === "hayir" && "fill-destructive",
                tur === "bos" && "fill-transparent stroke-muted-foreground/45",
              )}
              strokeWidth={tur === "bos" ? 1.3 : 0}
            />
          );
        })}
        {benimSira >= 0 && liste[benimSira] && (
          <rect
            x={liste[benimSira].x - (yaricap * 1.45 + 6) / 2}
            y={liste[benimSira].y - (yaricap * 1.45 + 6) / 2}
            width={yaricap * 1.45 + 6}
            height={yaricap * 1.45 + 6}
            transform={`rotate(45 ${liste[benimSira].x} ${liste[benimSira].y})`}
            className="fill-none stroke-foreground"
            strokeWidth={1.6}
          >
            <title>Senin oyun</title>
          </rect>
        )}
        {esikAcisi !== null && (
          <g className="text-foreground">
            <line
              x1={Math.cos(esikAcisi) * Math.min(52, ic - yaricap - 4)}
              y1={-Math.sin(esikAcisi) * Math.min(52, ic - yaricap - 4)}
              x2={Math.cos(esikAcisi) * 108}
              y2={-Math.sin(esikAcisi) * 108}
              stroke="currentColor"
              strokeWidth={1.2}
              strokeDasharray="3 3"
            />
          </g>
        )}
        {!kucuk &&
          (buyuk ? (
            <text x="0" y="-20" textAnchor="middle" className="fill-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              <tspan fontSize="21" fontWeight="600">
                {sayi(evet)}
              </tspan>
              {gereken !== null && (
                <tspan x="0" dy="15" fontSize="9.5" className="fill-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                  / {sayi(gereken)} gerekli
                </tspan>
              )}
            </text>
          ) : (
            <text x="0" y="-6" textAnchor="middle" className="fill-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              <tspan fontSize="30" fontWeight="600">
                {evet}
              </tspan>
              {gereken !== null && (
                <tspan fontSize="14" dx="3" className="fill-muted-foreground">
                  / {gereken}
                </tspan>
              )}
            </text>
          ))}
      </svg>
      {!kucuk && (
        <figcaption className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1">
            <span className="size-[7px] rotate-45 bg-success" /> Evet {sayi(evet)}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-[7px] rotate-45 bg-destructive" /> Hayır {sayi(hayir)}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-[7px] rotate-45 border border-muted-foreground/60" /> Bekleyen {sayi(Math.max(0, secmen - evet - hayir))}
          </span>
          {gereken !== null && (
            <span className="inline-flex items-center gap-1">
              <span className="w-3 border-t border-dashed border-foreground" /> Eşik
            </span>
          )}
          {kisi > 1 && <span className="w-full text-center text-[10px]">Her nokta ≈ {sayi(kisi)} kişi</span>}
        </figcaption>
      )}
    </figure>
  );
}
