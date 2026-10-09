import Link from "next/link";
import { EyeOff, FileEdit, Gavel, Handshake, MessageSquarePlus, Trash2 } from "lucide-react";
import type { KararOzeti } from "@/lib/akis";
import { kalanSure, sayi } from "@/lib/bicim";
import { suan } from "@/lib/saat";
import type { SurecTuru } from "@/lib/surec";
import { cn } from "@/lib/utils";
import { KararDurumRozeti } from "@/components/ortak/Durum";
import { OyCubugu } from "@/components/ortak/OyCubugu";
import { Zaman } from "@/components/ortak/Zaman";

export const TUR_IKONU: Record<SurecTuru, typeof Gavel> = {
  konu_ac: MessageSquarePlus,
  konu_kapat: Handshake,
  mesaj_sil: EyeOff,
  konu_sil: Trash2,
  konu_duzenle: FileEdit,
  kural_degistir: Gavel,
};

export function KararListesi({ kararlar, bos }: { kararlar: KararOzeti[]; bos: string }) {
  if (!kararlar.length) return <div className="border-y border-dashed py-8 text-center text-muted-foreground italic">{bos}</div>;
  return (
    <ul className="divide-y border-b">
      {kararlar.map((k) => {
        const Ikon = TUR_IKONU[k.tur];
        return (
          <li key={k.id} className={cn("group relative flex gap-4 py-4", k.oyBekliyor && "border-l-2 border-l-vurgu pl-3")}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="ust-etiket inline-flex items-center gap-1">
                  <Ikon className="size-3" /> {k.turAd}
                </span>
                {k.oyBekliyor && <span className="text-xs font-medium">· Sıra sende</span>}
              </div>
              <Link
                href={`/karar/${k.id}`}
                className="mt-1 block text-[18px] leading-snug font-semibold decoration-2 underline-offset-4 after:absolute after:inset-0 group-hover:underline"
              >
                {k.baslik}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>@{k.oneren}</span>
                <span aria-hidden>·</span>
                <Zaman iso={k.kapanis ?? k.olusturma} />
              </div>
              {k.oylama && (
                <div className="mt-2 flex max-w-md items-center gap-3">
                  <OyCubugu {...k.oylama} ince className="flex-1" />
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {sayi(k.oylama.evet)} / {k.oylama.gereken === null ? "?" : sayi(k.oylama.gereken)} · {kalanSure(k.oylama.bitis, suan())}
                  </span>
                </div>
              )}
            </div>
            <KararDurumRozeti durum={k.durum} asamaAd={k.yoneticiBekliyor ? "Yönetmen onayında" : k.asamaAd} className="relative self-start" />
          </li>
        );
      })}
    </ul>
  );
}
