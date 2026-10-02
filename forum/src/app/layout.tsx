import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { mevcutKullanici } from "@/lib/auth";
import { acikKararlar, menuKategorileri, turHedefleri } from "@/lib/akis";
import { kurallar } from "@/lib/kurallar";
import { TurRehberi } from "@/components/tur/TurRehberi";
import { CanliGosterim } from "@/components/tur/CanliGosterim";
import { suresiDolanlariKapat } from "@/lib/oylama";
import { gorevler } from "@/lib/secim";
import { cn } from "@/lib/utils";
import { Saglayicilar } from "@/components/kabuk/Saglayicilar";
import { UstBar } from "@/components/kabuk/UstBar";
import { CanliBant } from "@/components/kabuk/CanliBant";
import { AltMenu } from "@/components/kabuk/AltMenu";
import ServiceWorkerKayit from "./ServiceWorkerKayit";
import "@fontsource-variable/source-serif-4/opsz.css";
import "@fontsource-variable/source-serif-4/opsz-italic.css";
import "@fontsource-variable/cinzel";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ortak Akıl", template: "%s · Ortak Akıl" },
  description: "Bağımsız kamuoyu platformu: sansürsüz tartışma, oylamayla karar, kurumlara etki",
  appleWebApp: { capable: true, title: "Ortak Akıl", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f2f4" },
    { media: "(prefers-color-scheme: dark)", color: "#15171b" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  suresiDolanlariKapat();
  const kullanici = await mevcutKullanici();
  const kategoriler = menuKategorileri();
  const kararlar = acikKararlar(kullanici?.id ?? null);
  const oyBekleyen = kararlar.filter((k) => k.oyBekliyor).length;
  const k = kurallar();
  const ORAN_YAZISI = { "1/2": "yarıdan fazla", "3/5": "5’te 3", "2/3": "3’te 2" };
  const turVerisi = {
    ...turHedefleri(),
    kurulOrani: ORAN_YAZISI[k.kurulKabulOrani],
    vetoOrani: ORAN_YAZISI[k.vetoAsimOrani],
    koltuk: k.kategoridenTemsilci,
    maksOy: k.maksimumOyAgirligi,
  };

  return (
    <html lang="tr" suppressHydrationWarning className={cn(GeistSans.variable, GeistMono.variable)}>
      <body className="min-h-dvh bg-background">
        <Saglayicilar>
          <UstBar
            kullanici={kullanici}
            gorevler={kullanici ? gorevler(kullanici.id) : []}
            kategoriler={kategoriler}
            oyBekleyen={oyBekleyen}
          />
          <CanliBant kararlar={kararlar} oyBekleyen={oyBekleyen} />
          <main className="mx-auto w-full max-w-6xl min-w-0 px-4 pt-6 pb-24 lg:pb-16">{children}</main>
          <footer className="mx-auto hidden max-w-6xl px-4 pb-10 lg:block">
            <div className="cizgi-cift flex items-center justify-between pt-3 text-xs text-muted-foreground">
              <span className="font-serif text-base font-bold text-foreground">
                Ortak Akıl<span className="text-vurgu">.</span>
              </span>
              <span>Sansürsüz · Bağımsız · Her kayıt Açık Arşiv’de</span>
            </div>
          </footer>
          <AltMenu takmaAd={kullanici?.takma_ad ?? null} oyBekleyen={oyBekleyen} />
          <TurRehberi veri={turVerisi} />
          <CanliGosterim />
        </Saglayicilar>
        <ServiceWorkerKayit />
      </body>
    </html>
  );
}
