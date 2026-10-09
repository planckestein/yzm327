import { Check } from "lucide-react";
import { CRISP_ASAMALARI, DERS_ILKELERI, DERS_SLOGANI, KALITE_GUVENCESI } from "@/lib/dersYontemi";

/*
 * "Nasıl işliyor?" sayfasındaki dersin yöntemi bölümü: CRISP-ML(Q) döngüsünün altı aşamasında ne yaptığımız
 * ve Hafta 1–2 ilkelerinin karşılıkları. Tanıtım turu bu bölümdeki aşama listesini vurgular.
 */

const M = 100;
const R = 70;
const nokta = (aci: number, r = R) => [M + r * Math.cos((aci * Math.PI) / 180), M + r * Math.sin((aci * Math.PI) / 180)];

/** Altı aşama bir çember üzerinde, ortada sarı Q (otağın tündüğü gibi merkez). */
function Dongu({ className }: { className?: string }) {
  const oklar = Array.from({ length: 6 }, (_, k) => {
    const aci = -60 + 60 * k;
    const r = (aci * Math.PI) / 180;
    const [x, y] = nokta(aci);
    const [dx, dy] = [-Math.sin(r), Math.cos(r)];
    const [nx, ny] = [Math.cos(r), Math.sin(r)];
    return `M${x + 5 * dx} ${y + 5 * dy}L${x - 4 * dx + 4 * nx} ${y - 4 * dy + 4 * ny}L${x - 4 * dx - 4 * nx} ${y - 4 * dy - 4 * ny}z`;
  });
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="CRISP-ML(Q): altı aşamalı, ortasında kalite güvencesi olan döngü">
      <circle cx={M} cy={M} r={R} fill="none" stroke="var(--border)" strokeWidth={1.5} />
      {oklar.map((d) => (
        <path key={d} d={d} fill="var(--muted-foreground)" />
      ))}
      {CRISP_ASAMALARI.map((a, k) => {
        const [x, y] = nokta(-90 + 60 * k);
        return (
          <g key={a.ad}>
            <rect x={x - 13} y={y - 13} width={26} height={26} transform={`rotate(45 ${x} ${y})`} fill="var(--card)" stroke="var(--foreground)" strokeWidth={1.4} />
            <text x={x} y={y + 4.5} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--foreground)">
              {k + 1}
            </text>
          </g>
        );
      })}
      <rect x={M - 22} y={M - 22} width={44} height={44} transform={`rotate(45 ${M} ${M})`} fill="var(--sari)" />
      <text x={M} y={M + 6.5} textAnchor="middle" fontSize={19} fontWeight={700} fill="var(--kara)">
        Q
      </text>
    </svg>
  );
}

export function DersYontemi() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
        <div className="flex flex-col gap-3">
          <blockquote className="border-l-2 border-vurgu pl-3">
            <p className="text-[17px] leading-snug italic">“{DERS_SLOGANI}”</p>
            <span className="mt-1 block text-xs text-muted-foreground">Hafta 2 ders notları</span>
          </blockquote>
          <p className="max-w-2xl text-[15px] leading-relaxed">
            Hocamız projeyi dersin yöntemiyle yürütmemizi istedi. Hafta 1’de verilen <b>CRISP-ML(Q)</b> döngüsünü ve Hafta 2’nin problem
            çerçeveleme ilkelerini izledik. Döngünün altı aşaması var, ortasında kalite güvencesi (Q) duruyor: aşağıda her aşamada ne
            yaptığımız ve onu nasıl kontrol ettiğimiz.
          </p>
        </div>
        <Dongu className="mx-auto w-40 md:w-full" />
      </div>

      <ol data-tur="yontem" className="grid gap-px border-y border-foreground bg-border md:grid-cols-2 lg:grid-cols-3">
        {CRISP_ASAMALARI.map((a, i) => (
          <li key={a.ad} className="flex flex-col gap-2 bg-background py-4 md:px-4">
            <div className="flex items-baseline gap-2">
              <span className="text-lg leading-6 font-semibold text-vurgu tabular-nums">{i + 1}</span>
              <span className="leading-6 font-semibold">{a.ad}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{a.metin}</p>
            <p className="flex gap-2 text-sm leading-snug">
              <span aria-hidden className="mt-1.5 size-[7px] shrink-0 rotate-45 bg-sari" />
              <span>
                <span className="font-medium">Q:</span> {a.kalite}
              </span>
            </p>
            <span className="mt-auto pt-1 font-mono text-[11px] text-muted-foreground">{a.dayanak}</span>
          </li>
        ))}
      </ol>

      <div className="kece-kart flex items-start gap-3 p-4">
        <span aria-hidden className="mt-1 grid size-7 shrink-0 rotate-45 place-items-center bg-sari">
          <span className="-rotate-45 text-sm font-bold text-kara">Q</span>
        </span>
        <p className="text-sm leading-relaxed">{KALITE_GUVENCESI}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="border-b pb-2 text-xl font-semibold">Hafta 1–2 ilkeleri ve karşılıkları</h3>
        <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {DERS_ILKELERI.map(([hafta, ilke, karsilik]) => (
            <li key={ilke} className="flex gap-2">
              <Check className="mt-1 size-3.5 shrink-0 text-success" strokeWidth={3} />
              <span className="text-sm leading-snug">
                <span className="font-semibold">{ilke}</span> <span className="text-xs text-muted-foreground">· {hafta}</span>
                <span className="mt-0.5 block text-muted-foreground">{karsilik}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
