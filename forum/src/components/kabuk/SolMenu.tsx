"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MenuKategorisi } from "@/lib/akis";
import { cn } from "@/lib/utils";
import { Compass } from "lucide-react";
import { TUR_OLAYI } from "@/components/tur/TurRehberi";
import { ANA_BAGLANTILAR, aktifMi } from "./menuVerisi";

type Props = { kategoriler: MenuKategorisi[]; oyBekleyen: number; onSec?: () => void };

/** Telefondaki yan menü: ana bağlantılar ve gazetenin bölümleri. */
export function SolMenu({ kategoriler, oyBekleyen, onSec }: Props) {
  const yol = usePathname();

  return (
    <nav className="flex flex-col gap-7 text-sm" aria-label="Ana menü">
      <ul className="flex flex-col">
        {ANA_BAGLANTILAR.map(({ href, ad, ikon: Ikon }) => {
          const aktif = aktifMi(yol, href);
          return (
            <li key={href} className="border-b last:border-b-0">
              <Link
                href={href}
                onClick={onSec}
                className={cn(
                  "relative flex items-center gap-3 py-2.5 pl-3 font-serif text-[17px] text-muted-foreground transition-colors hover:text-foreground",
                  aktif && "font-semibold text-foreground before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:bg-vurgu",
                )}
              >
                <Ikon className="size-4" />
                <span className="flex-1">{ad}</span>
                {href === "/kararlar" && oyBekleyen > 0 && (
                  <span className="rounded-[2px] bg-vurgu px-1.5 font-sans text-[11px] font-semibold text-vurgu-foreground" title="Oyunu bekleyen kararlar">
                    {oyBekleyen}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li className="border-t">
          <button
            type="button"
            onClick={() => {
              onSec?.();
              window.dispatchEvent(new Event(TUR_OLAYI));
            }}
            className="flex w-full items-center gap-3 py-2.5 pl-3 text-left font-serif text-[17px] text-vurgu"
          >
            <Compass className="size-4" /> Tanıtım turu
          </button>
        </li>
      </ul>

      <div>
        <div className="cizgi-kalin mb-2 flex items-center justify-between pt-2">
          <span className="text-[11px] font-bold tracking-[0.16em] uppercase">Bölümler</span>
          <Link href="/kategoriler" onClick={onSec} className="text-xs text-muted-foreground hover:text-foreground">
            Tümü
          </Link>
        </div>
        <ul className="flex flex-col">
          {kategoriler.map((k) => {
            const aktif = yol === `/kategori/${k.id}` || k.altlar.some((a) => yol === `/kategori/${a.id}`);
            return (
              <li key={k.id}>
                <Link
                  href={`/kategori/${k.id}`}
                  onClick={onSec}
                  className={cn(
                    "flex items-center gap-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
                    aktif && "font-medium text-foreground",
                  )}
                >
                  <span className="flex-1 truncate">{k.ad}</span>
                  {k.konu > 0 && <span className="text-xs tabular-nums opacity-60">{k.konu}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
