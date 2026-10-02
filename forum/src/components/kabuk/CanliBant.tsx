import Link from "next/link";
import type { KararOzeti } from "@/lib/akis";
import { kalanSure, sayi } from "@/lib/bicim";
import { suan } from "@/lib/saat";

/** Haber kanallarının alt bandı gibi akan "süren oylamalar" şeridi. Üzerine gelince durur. */
export function CanliBant({ kararlar, oyBekleyen }: { kararlar: KararOzeti[]; oyBekleyen: number }) {
  const ogeler = kararlar.filter((k) => k.oylama || k.yoneticiBekliyor).slice(0, 12);

  const Oge = ({ k }: { k: KararOzeti }) => (
    <Link href={`/karar/${k.id}`} className="inline-flex shrink-0 items-center gap-2 px-5 hover:underline">
      <span className="text-[10px] font-bold tracking-[0.14em] text-vurgu uppercase">{k.turAd}</span>
      <span className="max-w-[26rem] truncate font-serif">{k.baslik}</span>
      {k.oylama ? (
        <span className="text-muted-foreground tabular-nums">
          <b className="font-semibold text-success">{sayi(k.oylama.evet)}</b>
          {k.oylama.gereken !== null && <>/{sayi(k.oylama.gereken)}</>} evet · {kalanSure(k.oylama.bitis, suan())}
        </span>
      ) : (
        <span className="text-muted-foreground">yönetmen onayında</span>
      )}
      <span className="pl-3 text-muted-foreground/50" aria-hidden>
        ◆
      </span>
    </Link>
  );

  return (
    <div className="border-b border-foreground/80 bg-card/60 text-[13px]" data-tur="bant">
      <div className="mx-auto flex h-9 max-w-6xl items-stretch">
        <Link
          href="/kararlar"
          className="flex shrink-0 items-center gap-2 bg-vurgu px-3 text-[11px] font-bold tracking-[0.14em] text-vurgu-foreground uppercase"
        >
          <span className="canli-nokta size-1.5 rounded-full bg-current" /> Canlı oylama
        </Link>
        {ogeler.length ? (
          <div className="bant relative flex min-w-0 flex-1 items-center overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_24px,#000_calc(100%-24px),transparent)]">
            <div className="bant-ic flex w-max items-center" style={{ ["--bant-sure" as string]: `${ogeler.length * 9}s` }}>
              {[0, 1].map((kopya) => (
                <div key={kopya} className="flex items-center" aria-hidden={kopya === 1}>
                  {ogeler.map((k) => (
                    <Oge key={k.id} k={k} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center px-4 text-muted-foreground">Şu an süren oylama yok.</div>
        )}
        {oyBekleyen > 0 && (
          <Link
            href="/kararlar"
            className="flex shrink-0 items-center gap-1.5 border-l border-foreground/80 px-3 text-[11px] font-bold tracking-[0.12em] uppercase hover:bg-accent"
            title="Oy hakkın olan ve henüz oy vermediğin oylamalar"
          >
            Sıra sende
            <span className="rounded-[2px] bg-foreground px-1.5 py-px text-background tabular-nums">{oyBekleyen}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
