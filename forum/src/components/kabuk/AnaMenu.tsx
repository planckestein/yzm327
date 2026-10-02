"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ANA_BAGLANTILAR, aktifMi } from "./menuVerisi";

/** Masaüstünde künyenin yanındaki yatay bölüm menüsü (gazetenin "Gündem · Kararlar · …" şeridi). */
export function AnaMenu({ oyBekleyen }: { oyBekleyen: number }) {
  const yol = usePathname();
  return (
    <nav className="hidden items-stretch self-stretch lg:flex" aria-label="Ana menü">
      {ANA_BAGLANTILAR.map(({ href, ad }) => {
        const aktif = aktifMi(yol, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex items-center gap-1.5 px-3 text-[12px] font-semibold tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-foreground",
              aktif && "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-vurgu",
            )}
          >
            {ad}
            {href === "/kararlar" && oyBekleyen > 0 && (
              <span className="rounded-[2px] bg-vurgu px-1 text-[10px] leading-4 text-vurgu-foreground" title="Oyunu bekleyen kararlar">
                {oyBekleyen}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Ana sayfada büyük künye zaten göründüğü için üst çubuktaki küçük logo gizlenir. */
export function KucukKunye() {
  const anaSayfa = usePathname() === "/";
  return (
    <>
      <Link
        href="/"
        aria-label="Ortak Akıl ana sayfa"
        className={cn("yazit font-serif text-[15px] leading-none font-black tracking-tight whitespace-nowrap sm:text-[22px]", anaSayfa && "lg:hidden")}
      >
        Ortak Akıl<span className="text-vurgu">.</span>
      </Link>
      <span className={cn("mx-2 hidden h-6 w-px bg-border lg:block", anaSayfa && "lg:hidden")} />
    </>
  );
}
