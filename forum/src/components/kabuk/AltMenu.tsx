"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, Plus, Scale, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { aktifMi } from "./menuVerisi";

/** Telefonda ekranın altında uygulama gibi menü çubuğu. */
export function AltMenu({ takmaAd, oyBekleyen }: { takmaAd: string | null; oyBekleyen: number }) {
  const yol = usePathname();
  const ogeler = [
    { href: "/", ad: "Gündem", ikon: Newspaper },
    { href: "/kararlar", ad: "Kararlar", ikon: Scale, sayi: oyBekleyen },
    { href: "/konu/yeni", ad: "Öner", ikon: Plus },
    { href: "/etki", ad: "Etki", ikon: TrendingUp },
    { href: takmaAd ? `/profil/${encodeURIComponent(takmaAd)}` : "/giris", ad: takmaAd ? "Profil" : "Giriş", ikon: User },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Alt menü"
    >
      <ul className="grid grid-cols-5">
        {ogeler.map(({ href, ad, ikon: Ikon, sayi }) => {
          const aktif = href !== "/konu/yeni" && aktifMi(yol, href);
          return (
            <li key={ad}>
              <Link
                href={href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
                  aktif && "font-medium text-foreground",
                )}
              >
                <Ikon className="size-5" strokeWidth={aktif ? 2.2 : 1.8} />
                {ad}
                {!!sayi && (
                  <span className="absolute top-1 left-1/2 ml-2.5 text-xs font-medium text-vurgu tabular-nums">
                    {sayi}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
