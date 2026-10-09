import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Oy hakkın olan ve henüz oy vermediğin oylama varsa üst çubuğun altında tek satırlık sessiz hatırlatma. */
export function OyHatirlatma({ oyBekleyen }: { oyBekleyen: number }) {
  if (oyBekleyen === 0) return null;
  return (
    <div className="border-b bg-card text-sm">
      <div className="mx-auto flex h-9 max-w-6xl items-center gap-2 px-4">
        <span className="size-[7px] rotate-45 bg-vurgu" aria-hidden />
        <span className="text-muted-foreground">
          <b className="font-semibold text-foreground tabular-nums">{oyBekleyen}</b> oylama senin oyunu bekliyor
        </span>
        <Link href="/kararlar" className="ml-auto inline-flex items-center gap-1 font-medium hover:underline">
          Oy ver <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
