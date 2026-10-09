import type { Metadata, Viewport } from "next";
import { mevcutKullanici } from "@/lib/auth";
import { acikKararlar, menuKategorileri, turHedefleri } from "@/lib/akis";
import { kurallar } from "@/lib/kurallar";
import { TurRehberi } from "@/components/tur/TurRehberi";
import { CanliGosterim } from "@/components/tur/CanliGosterim";
import { suresiDolanlariKapat } from "@/lib/oylama";
import { gorevler } from "@/lib/secim";
import { Saglayicilar } from "@/components/kabuk/Saglayicilar";
import { UstBar } from "@/components/kabuk/UstBar";
import { OyHatirlatma } from "@/components/kabuk/OyHatirlatma";
import { Logo } from "@/components/kabuk/Logo";
import { AltMenu } from "@/components/kabuk/AltMenu";
import { KilimSerit } from "@/components/motif/Motif";
import ServiceWorkerKayit from "./ServiceWorkerKayit";
import "@fontsource-variable/source-serif-4/opsz.css";
import "@fontsource-variable/source-serif-4/opsz-italic.css";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/archivo/wdth-italic.css";
import "@fontsource/noto-sans-old-turkic/old-turkic-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kurultay", template: "%s · Kurultay" },
  description: "Bağımsız kamuoyu platformu: sansürsüz tartışma, oylamayla karar, kurumlara etki",
  appleWebApp: { capable: true, title: "Kurultay", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5efe3" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1915" },
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
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-dvh bg-background">
        <Saglayicilar>
          <KilimSerit ilmek={1} />
          <UstBar
            kullanici={kullanici}
            gorevler={kullanici ? gorevler(kullanici.id) : []}
            kategoriler={kategoriler}
            oyBekleyen={oyBekleyen}
          />
          <OyHatirlatma oyBekleyen={oyBekleyen} />
          <main className="mx-auto w-full max-w-6xl min-w-0 px-4 pt-6 pb-24 lg:pb-16">{children}</main>
          <footer className="hidden pb-10 lg:block">
            <KilimSerit desen="koc" ilmek={2} />
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 pt-5 text-xs text-muted-foreground">
              <Logo className="text-[15px] text-foreground" />
              <span className="max-w-md text-center">
                Kurultay, eski Türklerin <i>toy</i> dediği danışma meclisinin adını taşır: karar, otağda birlikte konuşularak alınır.
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
