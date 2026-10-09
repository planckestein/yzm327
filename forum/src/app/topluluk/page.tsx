import type { Metadata } from "next";
import Link from "next/link";
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

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="border-b pb-2 text-xl font-semibold">Genel Yayın Yönetmeni</h2>
          <p className="mt-2 text-sm text-muted-foreground">İlke önerilerini onaylar ya da veto eder. Tüm üyeler seçer; her üye bir adayı destekler.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="flex items-center gap-3">
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
        </div>
      </section>

      <section className="flex flex-col gap-3" data-tur="kurul">
        <div>
          <h2 className="border-b pb-2 text-xl font-semibold">Yayın Kurulu</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Her ana kategori, büyüklüğünden bağımsız olarak {k.kategoridenTemsilci} temsilci seçer; böylece küçük topluluklar da eşit
            söz sahibidir. Kurul’da kabul için {k.kurulKabulOrani} gerekir.
          </p>
        </div>
        <div className="grid gap-x-10 md:grid-cols-2">
          {anaKategoriler().map((kat) => {
            const uye = !!ben && kategoriUyeleri(kat.id).has(ben.id);
            const temsilciler = kategoriTemsilcileri(kat.id);
            return (
              <div key={kat.id} className="flex flex-col gap-3 border-t py-4">
                <h3 className="flex items-baseline justify-between gap-3 font-semibold">
                  <Link href={`/kategori/${kat.id}`} className="hover:underline">
                    {kat.ad}
                  </Link>
                  <span className="text-xs font-normal text-muted-foreground">
                    {temsilciler.length}/{k.kategoridenTemsilci} koltuk dolu
                  </span>
                </h3>
                <AdayListesi adaylar={adaySonuclari("temsilci", kat.id)} koltuk={k.kategoridenTemsilci} oyHakki={uye} {...ortak} />
                {ben && !benimAdayligim && uye && <AdayOlDugmesi makam="temsilci" kategoriId={kat.id} yazi="Bu bölümden kurula aday ol" />}
                {ben && !uye && <p className="text-xs text-muted-foreground">Oy vermek ya da aday olmak için bu bölümü takip et.</p>}
              </div>
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
                {gorevde && <span className="text-xs font-medium text-vurgu">görevde</span>}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden bg-foreground/10">
                  <div className={gorevde ? "h-full bg-foreground/70" : "h-full bg-muted-foreground/35"} style={{ width: `${(a.destek / enCok) * 100}%` }} />
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
