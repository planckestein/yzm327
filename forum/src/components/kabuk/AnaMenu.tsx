"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ANA_BAGLANTILAR, aktifMi } from "./menuVerisi";
import { Logo } from "./Logo";

/** Masaüstünde logonun yanındaki yatay ana menü. */
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
              "relative flex items-center gap-1.5 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
              aktif && "font-medium text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-foreground",
            )}
          >
            {ad}
            {href === "/kararlar" && oyBekleyen > 0 && (
              <span className="text-xs font-semibold text-vurgu tabular-nums" title="Oyunu bekleyen kararlar">
                {oyBekleyen}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function KucukKunye() {
  return (
    <>
      <Link href="/" aria-label="Kurultay ana sayfa" className="whitespace-nowrap">
        <Logo />
      </Link>
      <span className="mx-3 hidden h-5 w-px bg-border lg:block" />
    </>
  );
}
