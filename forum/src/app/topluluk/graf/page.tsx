import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { GENISLIK, YUKSEKLIK, grafOzeti, uyeGrafi, type Dugum, type Katman } from "@/lib/graf";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Üye grafı" };

const KATMANLAR: Record<Katman, { ad: string; aciklama: string; ozet: string }> = {
  etkilesim: {
    ad: "Etkileşim",
    aciklama: "Çizgi, iki üyenin birbirinin mesajına yanıt verdiğini gösterir; kalınlık yanıt sayısıdır.",
    ozet: "En çok etkileşime girenler",
  },
  devir: {
    ad: "Oy devri",
    aciklama: "Ok, oyun kimden kime devredildiğini gösterir. Zincirler toplanır: A→B→C ise C, A ve B’nin oyunu da taşır.",
    ozet: "En çok oy devralanlar",
  },
  destek: {
    ad: "Seçim desteği",
    aciklama: "Ok, bir üyenin hangi adayı (Yayın Kurulu ya da Genel Yayın Yönetmeni) desteklediğini gösterir.",
    ozet: "En çok desteklenenler",
  },
};

const RENK: Record<Dugum["tur"], string> = {
  yonetici: "var(--vurgu)",
  temsilci: "oklch(0.52 0.13 255)",
  bilirkisi: "var(--warning)",
  resmi: "var(--foreground)",
  yz: "var(--success)",
  uye: "var(--muted-foreground)",
};
const TUR_ADI: Record<Dugum["tur"], string> = {
  yonetici: "Genel Yayın Yönetmeni",
  temsilci: "Yayın Kurulu",
  bilirkisi: "Uzman",
  resmi: "Kurum",
  yz: "YZ Analist",
  uye: "Üye",
};

export default async function GrafSayfasi({ searchParams }: PageProps<"/topluluk/graf">) {
  const k = String((await searchParams).katman ?? "etkilesim");
  const katman: Katman = k === "devir" || k === "destek" ? k : "etkilesim";
  const g = uyeGrafi(katman);
  const konum = new Map(g.dugumler.map((d) => [d.id, d]));
  const ozet = grafOzeti(katman, g);
  const yonlu = katman !== "etkilesim";
  const kenarRengi = katman === "devir" ? "oklch(0.52 0.13 255)" : katman === "destek" ? "var(--vurgu)" : "currentColor";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-5">
        {(Object.keys(KATMANLAR) as Katman[]).map((x) => (
          <Link
            key={x}
            href={x === "etkilesim" ? "/topluluk/graf" : `/topluluk/graf?katman=${x}`}
            className={cn(
              "border-b-[3px] border-transparent py-1 text-[12px] font-semibold tracking-[0.08em] text-muted-foreground uppercase hover:text-foreground",
              x === katman && "border-vurgu text-foreground",
            )}
          >
            {KATMANLAR[x].ad}
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{KATMANLAR[katman].aciklama} Düğüm büyüklüğü mesaj sayısını gösterir; düğüme tıklayınca profil açılır.</p>

      <Card className="py-2" data-tur="graf">
        <CardContent className="overflow-x-auto px-2">
          <svg viewBox={`0 0 ${GENISLIK} ${YUKSEKLIK}`} className="block h-auto w-full min-w-[560px]" role="img" aria-label={`${KATMANLAR[katman].ad} grafı`}>
            <defs>
              <marker id="ok" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" style={{ fill: kenarRengi }} className="text-muted-foreground" />
              </marker>
            </defs>
            <g className="text-muted-foreground">
              {g.kenarlar.map((e, i) => {
                const a = konum.get(e.kaynak);
                const b = konum.get(e.hedef);
                if (!a || !b) return null;
                const u = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={yonlu ? b.x - ((b.x - a.x) / u) * (b.boyut + 3) : b.x}
                    y2={yonlu ? b.y - ((b.y - a.y) / u) * (b.boyut + 3) : b.y}
                    style={{ stroke: kenarRengi }}
                    strokeOpacity={yonlu ? 0.75 : 0.35}
                    strokeWidth={Math.min(6, 1 + e.agirlik)}
                    markerEnd={yonlu ? "url(#ok)" : undefined}
                  >
                    <title>{`@${a.ad} → @${b.ad}${e.etiket ? ` (${e.etiket})` : ""}${katman === "etkilesim" ? ` · ${e.agirlik} yanıt` : ""}`}</title>
                  </line>
                );
              })}
            </g>
            {g.dugumler.map((d) => (
              <a key={d.id} href={`/profil/${encodeURIComponent(d.ad)}`} className="group">
                <circle cx={d.x} cy={d.y} r={d.boyut} style={{ fill: RENK[d.tur] }} className="stroke-background transition-[stroke-width]" strokeWidth={2.5}>
                  <title>{`@${d.ad} — ${d.etiket ?? TUR_ADI[d.tur]}`}</title>
                </circle>
                <text x={d.x} y={d.y + d.boyut + 13} textAnchor="middle" className="fill-foreground text-[11px] group-hover:font-semibold">
                  {d.ad}
                </text>
              </a>
            ))}
          </svg>
          <div className="flex flex-wrap gap-4 px-3 pb-2 text-xs text-muted-foreground">
            {(Object.keys(RENK) as Dugum["tur"][]).map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: RENK[t] }} /> {TUR_ADI[t]}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {ozet.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">{KATMANLAR[katman].ozet}</h2>
          <ol className="flex flex-wrap gap-2">
            {ozet.map((o, i) => (
              <li key={o.ad}>
                <Link href={`/profil/${encodeURIComponent(o.ad)}`} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm hover:bg-muted">
                  <span className="text-muted-foreground">{i + 1}.</span> @{o.ad} <b>{o.n}</b>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
