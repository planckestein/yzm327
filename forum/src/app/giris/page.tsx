import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { mevcutKullanici } from "@/lib/auth";
import { ONE_CIKAN_DEMO_HESAPLARI } from "@/lib/demoHesaplari";
import { demoGiris } from "@/app/actions/hesap";
import { KullaniciAvatar } from "@/components/ortak/KullaniciAvatar";
import GirisFormu from "./GirisFormu";

export const metadata: Metadata = { title: "Giriş" };

export default async function GirisSayfasi() {
  if (await mevcutKullanici()) redirect("/");

  // Demo verisi yüklüyse tek tıkla girilebilen hesapları göster
  const roller = new Map(
    (db.prepare("SELECT takma_ad, rol FROM kullanicilar").all() as { takma_ad: string; rol: string }[]).map((r) => [r.takma_ad, r.rol]),
  );
  const demolar = ONE_CIKAN_DEMO_HESAPLARI.filter((d) => roller.has(d.takma_ad));

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Giriş yap</CardTitle>
            <CardDescription>Kendi Ortak Akıl hesabınla devam et.</CardDescription>
          </CardHeader>
          <CardContent>
            <GirisFormu />
          </CardContent>
        </Card>
        <Link
          href="/kayit"
          className="group flex items-center gap-4 border-2 border-foreground p-4 transition-colors hover:bg-card"
        >
          <span className="flex size-10 shrink-0 items-center justify-center bg-vurgu text-vurgu-foreground">
            <UserPlus className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-lg font-bold">Henüz hesabın yok mu?</span>
            <span className="text-sm text-muted-foreground">Bir dakikada kendi hesabını oluştur, söz al.</span>
          </span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {demolar.length > 0 && (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Demo hesapları</CardTitle>
            <CardDescription>
              Platformu farklı gözlerden görmek için tek tıkla gir. Hepsinin şifresi <b className="text-foreground">demo1234</b>. Kendi
              hesabın her zaman ayrı kalır.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {demolar.map((d) => (
              <form key={d.takma_ad} action={demoGiris}>
                <input type="hidden" name="takma_ad" value={d.takma_ad} />
                <Button type="submit" variant="outline" className="h-auto w-full justify-start gap-3 px-3 py-2 text-left">
                  <KullaniciAvatar ad={d.takma_ad} boyut="sm" baglanti={false} rol={roller.get(d.takma_ad)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">@{d.takma_ad}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">{d.aciklama}</span>
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Button>
              </form>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
