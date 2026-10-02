import type { Metadata } from "next";
import Link from "next/link";
import { Crown, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { mevcutKullanici } from "@/lib/auth";
import { sayi } from "@/lib/bicim";
import { kurallar } from "@/lib/kurallar";
import {
  adaylik,
  adaySonuclari,
  anaKategoriler,
  desteklediklerim,
  forumYoneticisi,
  kategoriTemsilcileri,
  kategoriUyeleri,
  type Aday,
} from "@/lib/secim";
import { KullaniciAvatar, KullaniciAdi } from "@/components/ortak/KullaniciAvatar";
import { AdayOlDugmesi, CekilDugmesi, DestekDugmesi } from "@/components/topluluk/SecimDugmeleri";

export const metadata: Metadata = { title: "Yayın Kurulu" };

// Görünen kalabalık (bkz. lib/kalabalik.ts): her gerçek destek binlerce üyelik platformda bir destek grubunu temsil eder
const DESTEK_CARPANI = 347;

export default async function YonetimSayfasi() {
  const ben = await mevcutKullanici();
  const k = kurallar();
  const benimAdayligim = ben ? adaylik(ben.id) : undefined;
  const destekler = ben ? desteklediklerim(ben.id) : new Set<number>();
  const yonetici = forumYoneticisi();
  const ortak = { benId: ben?.id ?? null, destekler };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Görevliler <b className="text-foreground">sürekli destek</b> usulüyle seçilir: adayları istediğin zaman destekler, istediğin
        zaman desteğini çekersin; en çok desteklenenler görevdedir.{" "}
        <Link href="/hakkinda" className="font-semibold text-foreground underline underline-offset-2">
          Nasıl işliyor?
        </Link>
      </p>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle className="flex items-center gap-2">
            <Crown className="size-5 text-warning" /> Genel Yayın Yönetmeni
          </CardTitle>
          <CardDescription>İlke önerilerini onaylar ya da veto eder. Tüm üyeler seçer; her üye bir adayı destekler.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 md:grid-cols-[220px_1fr]">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
            {yonetici ? (
              <>
                <KullaniciAvatar ad={yonetici.takma_ad} boyut="lg" />
                <div>
                  <KullaniciAdi ad={yonetici.takma_ad} className="font-semibold" />
                  <div className="text-xs text-muted-foreground">{sayi(yonetici.destek * DESTEK_CARPANI)} destek ile görevde</div>
                </div>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Henüz seçilmedi</span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <AdayListesi adaylar={adaySonuclari("yonetici")} koltuk={1} oyHakki {...ortak} />
            {ben && !benimAdayligim && <AdayOlDugmesi makam="yonetici" yazi="Yöneticiliğe aday ol" />}
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3" data-tur="kurul">
        <div>
          <h2 className="border-b border-foreground pb-1.5 font-serif text-xl font-bold">Yayın Kurulu</h2>
          <p className="text-sm text-muted-foreground">
            Her ana kategori, büyüklüğünden bağımsız olarak {k.kategoridenTemsilci} temsilci seçer; böylece küçük topluluklar da eşit
            söz sahibidir. Kurul’da kabul için {k.kurulKabulOrani} gerekir.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {anaKategoriler().map((kat) => {
            const uye = !!ben && kategoriUyeleri(kat.id).has(ben.id);
            const temsilciler = kategoriTemsilcileri(kat.id);
            return (
              <Card key={kat.id} className="gap-3 overflow-hidden pt-0 pb-4">
                <div className="h-[3px] bg-foreground" />
                <CardHeader className="px-4 pt-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <Link href={`/kategori/${kat.id}`} className="hover:underline">
                      {kat.ad}
                    </Link>
                    <span className="text-xs font-normal text-muted-foreground">
                      {temsilciler.length}/{k.kategoridenTemsilci} koltuk
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 px-4">
                  <div className="flex gap-3">
                    {Array.from({ length: k.kategoridenTemsilci }, (_, i) => {
                      const t = temsilciler[i];
                      return t ? (
                        <div key={i} className="flex min-w-0 flex-1 items-center gap-2 rounded-md border p-2">
                          <KullaniciAvatar ad={t.takma_ad} boyut="sm" />
                          <KullaniciAdi ad={t.takma_ad} className="truncate text-sm" />
                        </div>
                      ) : (
                        <div key={i} className="flex flex-1 items-center gap-2 rounded-md border border-dashed p-2 text-sm text-muted-foreground">
                          <UserRound className="size-4" /> Boş koltuk
                        </div>
                      );
                    })}
                  </div>
                  <AdayListesi adaylar={adaySonuclari("temsilci", kat.id)} koltuk={k.kategoridenTemsilci} oyHakki={uye} {...ortak} />
                  {ben && !benimAdayligim && uye && <AdayOlDugmesi makam="temsilci" kategoriId={kat.id} yazi="Bu bölümden kurula aday ol" />}
                  {ben && !uye && <p className="text-xs text-muted-foreground">Oy vermek ya da aday olmak için bu bölümü takip et.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

type AdayListesiProps = { adaylar: Aday[]; koltuk: number; oyHakki: boolean; benId: number | null; destekler: Set<number> };

function AdayListesi({ adaylar, koltuk, oyHakki, benId, destekler }: AdayListesiProps) {
  if (!adaylar.length) return <p className="text-sm text-muted-foreground">Henüz aday yok.</p>;
  const enCok = Math.max(1, ...adaylar.map((a) => a.destek));
  return (
    <ul className="flex flex-col gap-2">
      {adaylar.map((a, i) => {
        const gorevde = i < koltuk && a.destek > 0;
        return (
          <li key={a.id} className="flex items-center gap-3">
            <KullaniciAvatar ad={a.takma_ad} boyut="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <KullaniciAdi ad={a.takma_ad} />
                {gorevde && <span className="text-[10px] font-bold tracking-[0.1em] text-vurgu uppercase">görevde</span>}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden bg-foreground/10">
                  <div className={gorevde ? "h-full bg-foreground" : "h-full bg-muted-foreground/40"} style={{ width: `${(a.destek / enCok) * 100}%` }} />
                </div>
                <span className="w-20 text-right text-xs tabular-nums text-muted-foreground">{sayi(a.destek * DESTEK_CARPANI)} destek</span>
              </div>
            </div>
            {benId !== null && oyHakki && benId !== a.id && <DestekDugmesi adayId={a.id} destekliyor={destekler.has(a.id)} />}
            {benId === a.id && <CekilDugmesi />}
          </li>
        );
      })}
    </ul>
  );
}
