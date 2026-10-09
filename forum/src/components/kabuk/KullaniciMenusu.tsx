"use client";

import Link from "next/link";
import { LogOut, Repeat, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KullaniciAvatar } from "@/components/ortak/KullaniciAvatar";
import { cikisYap, hesapDegistir } from "@/app/actions/hesap";

type Props = { takmaAd: string; adSoyad: string; rol: string; gorevler: string[] };

export function KullaniciMenusu({ takmaAd, adSoyad, rol, gorevler }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-1 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Hesap menüsü">
        <KullaniciAvatar ad={takmaAd} rol={rol} baglanti={false} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="text-base font-semibold">{adSoyad}</div>
          <div className="text-xs text-muted-foreground">@{takmaAd}</div>
          {gorevler.map((g) => (
            <div key={g} className="mt-1 text-xs font-medium text-vurgu">
              {g}
            </div>
          ))}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/profil/${encodeURIComponent(takmaAd)}`}>
            <User /> Profilim
          </Link>
        </DropdownMenuItem>
        <form action={hesapDegistir}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <Repeat /> Hesap değiştir
            </button>
          </DropdownMenuItem>
        </form>
        <DropdownMenuSeparator />
        <form action={cikisYap}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Çıkış yap
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
