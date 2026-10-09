import Link from "next/link";
import { PenLine, Search, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MenuKategorisi } from "@/lib/akis";
import { MobilMenu } from "./MobilMenu";
import { TemaDugmesi } from "./TemaDugmesi";
import { KullaniciMenusu } from "./KullaniciMenusu";
import { AnaMenu, KucukKunye } from "./AnaMenu";
import { TurDugmesi } from "@/components/tur/TurRehberi";

type Props = {
  kullanici: { takma_ad: string; ad: string; soyad: string; rol: string } | null;
  gorevler: string[];
  kategoriler: MenuKategorisi[];
  oyBekleyen: number;
};

export function UstBar({ kullanici, gorevler, kategoriler, oyBekleyen }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <MobilMenu kategoriler={kategoriler} oyBekleyen={oyBekleyen} />
        <KucukKunye />
        <AnaMenu oyBekleyen={oyBekleyen} />

        <div className="ml-auto flex items-center gap-1">
          <form action="/ara" className="relative hidden md:block" role="search">
            <Search className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              placeholder="Arşivde ara"
              className="h-8 w-40 border-0 border-b border-transparent bg-transparent pr-2 pl-6 text-sm outline-none placeholder:text-muted-foreground focus:w-56 focus:border-foreground xl:w-48"
            />
          </form>
          <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Ara">
            <Link href="/ara">
              <Search />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex" title="Telefonda aç">
            <Link href="/telefon" aria-label="Telefonda aç">
              <Smartphone />
            </Link>
          </Button>
          <TurDugmesi />
          <TemaDugmesi />
          {kullanici ? (
            <>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/konu/yeni">
                  <PenLine /> Gündem öner
                </Link>
              </Button>
              <KullaniciMenusu
                takmaAd={kullanici.takma_ad}
                adSoyad={`${kullanici.ad} ${kullanici.soyad}`}
                rol={kullanici.rol}
                gorevler={gorevler}
              />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/giris">Giriş</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/kayit">Katıl</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
