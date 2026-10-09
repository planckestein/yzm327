import Link from "next/link";
import { GitBranch } from "lucide-react";
import type { AkisKonusu } from "@/lib/akis";
import { kalanSure, sayi } from "@/lib/bicim";
import { suan } from "@/lib/saat";
import { okunma } from "@/lib/kalabalik";
import { KategoriRozeti } from "@/components/ortak/KategoriRozeti";
import { KonuDurumRozeti } from "@/components/ortak/Durum";
import { EtkiRozeti, KurumYanitiRozeti } from "@/components/ortak/EtkiRozeti";
import { OyCubugu } from "@/components/ortak/OyCubugu";
import { Zaman } from "@/components/ortak/Zaman";

/** Gazetenin iç sayfa dizini gibi konu listesi: üst etiket, serif başlık, sağda yanıt sayısı. */
export function KonuTablosu({ konular, bos }: { konular: AkisKonusu[]; bos: React.ReactNode }) {
  if (!konular.length) return <div className="border-y border-dashed py-10 text-center text-muted-foreground italic">{bos}</div>;

  return (
    <ul className="divide-y border-b">
      {konular.map((k) => (
        <KonuSatiri key={k.id} k={k} />
      ))}
    </ul>
  );
}

function KonuSatiri({ k }: { k: AkisKonusu }) {
  const digerleri = k.katilimcilar.filter((a) => a !== k.acan_takma_ad).length;
  return (
    <li className="group relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <KategoriRozeti {...k.kategori} className="relative z-10" />
          {k.durum !== "aktif" && <KonuDurumRozeti durum={k.durum} />}
          {k.etki && <EtkiRozeti durum={k.etki} />}
          {k.resmiYanit && !k.etki && <KurumYanitiRozeti />}
        </div>
        <Link
          href={`/konu/${k.id}`}
          className="mt-1 block text-[19px] leading-snug font-semibold text-foreground decoration-2 underline-offset-4 after:absolute after:inset-0 group-hover:underline"
        >
          {k.baslik}
        </Link>
        {k.oylama && (
          <div className="mt-2 flex max-w-sm items-center gap-3">
            <OyCubugu {...k.oylama} ince className="flex-1" />
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {sayi(k.oylama.evet)} / {k.oylama.gereken === null ? "?" : sayi(k.oylama.gereken)} evet · {kalanSure(k.oylama.bitis, suan())}
            </span>
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>
            @{k.acan_takma_ad}
            {digerleri > 0 && ` ve ${digerleri} kişi`}
          </span>
          <span aria-hidden>·</span>
          <span>{sayi(okunma(k.id, k.mesaj_sayisi))} okuma</span>
          <span aria-hidden>·</span>
          <Zaman iso={k.son_etkinlik} />
          {k.alt_sayisi > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <GitBranch className="size-3" /> {k.alt_sayisi} alt konu
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex w-12 flex-col items-end pt-5 text-right">
        <span className="text-2xl leading-none font-semibold tabular-nums">{k.mesaj_sayisi}</span>
        <span className="mt-1 text-[10px] text-muted-foreground">yanıt</span>
      </div>
    </li>
  );
}
