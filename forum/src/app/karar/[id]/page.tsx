import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Crown, Handshake } from "lucide-react";
import { mevcutKullanici } from "@/lib/auth";
import { kararOzetiGetir } from "@/lib/akis";
import { kalanSure, tamTarih } from "@/lib/bicim";
import { DEGISTIRILEBILIR, kuralDegeriYazi, type KuralAnahtari } from "@/lib/kurallar";
import { konuGetir } from "@/lib/konular";
import { gorunenSayim, surecOylamalari } from "@/lib/oylama";
import { ASAMA_ADLARI, surecGecmisi, surecGetir } from "@/lib/surec";
import { suan } from "@/lib/saat";
import { forumYoneticisi } from "@/lib/secim";
import { mesajGetir } from "@/lib/tartisma";
import { KararDurumRozeti } from "@/components/ortak/Durum";
import { KullaniciAdi } from "@/components/ortak/KullaniciAvatar";
import { MeclisGrafigi } from "@/components/ortak/MeclisGrafigi";
import { KararAdimlari } from "@/components/karar/KararAdimlari";
import { OyKarti } from "@/components/karar/OyKarti";
import { YoneticiKarari } from "@/components/karar/YoneticiKarari";
import { TUR_IKONU } from "@/components/karar/KararListesi";

export async function generateMetadata({ params }: PageProps<"/karar/[id]">): Promise<Metadata> {
  const k = kararOzetiGetir(Number((await params).id), null);
  return { title: k?.baslik ?? "Karar" };
}

function Ara({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b pb-2">
      <h2 className="text-xl font-semibold">{children}</h2>
    </div>
  );
}

export default async function KararSayfasi({ params }: PageProps<"/karar/[id]">) {
  const surec = surecGetir(Number((await params).id));
  if (!surec) notFound();
  const ben = await mevcutKullanici();
  const k = kararOzetiGetir(surec.id, ben?.id ?? null)!;
  const v = JSON.parse(surec.veri) as Record<string, string>;
  const mesaj = surec.tur === "mesaj_sil" ? mesajGetir(surec.hedef_id!) : undefined;
  const konu = k.bagKonu ? konuGetir(k.bagKonu) : undefined;
  const yonetici = forumYoneticisi();
  const bitenOylamalar = surecOylamalari(surec.id).filter((o) => o.durum !== "acik");
  const Ikon = TUR_IKONU[surec.tur];

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-3 pb-5">
        <nav className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-muted-foreground">
          <Link href="/kararlar" className="hover:text-foreground">
            Kararlar
          </Link>
          {konu && (
            <>
              <span aria-hidden>›</span>
              <Link href={`/konu/${konu.id}`} className="max-w-[20rem] truncate hover:text-foreground">
                {konu.baslik}
              </Link>
            </>
          )}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <span className="ust-etiket inline-flex items-center gap-1.5">
            <Ikon className="size-3.5" /> {k.turAd}
          </span>
          <KararDurumRozeti durum={k.durum} asamaAd={k.asamaAd} />
        </div>
        <h1 className="max-w-4xl text-[clamp(1.7rem,3vw,2.375rem)] leading-[1.15] font-semibold">{k.baslik}</h1>
        <p className="text-sm text-muted-foreground">
          <KullaniciAdi ad={k.oneren} className="text-foreground" /> önerdi · {tamTarih(surec.olusturma)}
          {surec.kapanis && <> · sonuçlandı {tamTarih(surec.kapanis)}</>}
        </p>
      </header>

      <section className="border-t pt-4 pb-8" data-tur="yolculuk">
        <div className="mb-4 text-xs font-medium">Önerinin yolculuğu</div>
        <KararAdimlari surec={surec} />
      </section>

      <div className="border-t grid gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-8">
          {/* Önerinin içeriği */}
          <section className="flex flex-col gap-4">
            <Ara>Öneri</Ara>
            {surec.tur === "kural_degistir" && (
              <div className="flex flex-wrap items-center gap-3 text-lg">
                <span className="w-full font-sans text-sm text-muted-foreground">{DEGISTIRILEBILIR[v.anahtar as KuralAnahtari]?.ad}</span>
                <span className="text-muted-foreground line-through decoration-destructive decoration-2">{kuralDegeriYazi(v.anahtar, v.eski)}</span>
                <ArrowRight className="size-5" />
                <span className="font-semibold underline decoration-success decoration-[3px] underline-offset-4">{kuralDegeriYazi(v.anahtar, v.deger)}</span>
              </div>
            )}
            {surec.tur === "konu_duzenle" && (
              <div className="grid gap-6 sm:grid-cols-2 sm:gap-0 sm:[&>*+*]:border-l sm:[&>*+*]:pl-6 sm:[&>*:first-child]:pr-6">
                <div>
                  <div className="text-xs font-medium text-destructive">Eski</div>
                  <div className="mt-1 text-lg font-semibold text-muted-foreground line-through decoration-destructive/60">{v.eski_baslik}</div>
                  <p className="metin mt-1 text-muted-foreground">{v.eski_aciklama}</p>
                </div>
                <div>
                  <div className="text-xs font-medium text-success">Önerilen</div>
                  <div className="mt-1 text-lg font-semibold">{v.baslik}</div>
                  <p className="metin mt-1">{v.aciklama}</p>
                </div>
              </div>
            )}
            {surec.tur === "konu_kapat" && (
              <blockquote className="border p-5">
                <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium">
                  <Handshake className="size-4" /> Önerilen uzlaşma
                </div>
                <p className="metin text-xl leading-snug font-medium">{v.metin}</p>
              </blockquote>
            )}
            {mesaj && (
              <blockquote className="border-l-2 border-foreground/40 pl-4">
                <div className="mb-1 text-xs text-muted-foreground">
                  @{mesaj.yazan} kullanıcısının mesajı ·{" "}
                  <Link href={`/konu/${mesaj.konu_id}#m${mesaj.id}`} className="font-semibold text-foreground underline underline-offset-2">
                    tartışmada gör
                  </Link>
                </div>
                <p className="metin text-[17px]">{mesaj.gizleyen_surec_id ? "(Bu mesaj gizlendi.)" : mesaj.icerik}</p>
              </blockquote>
            )}
            {(surec.tur === "konu_ac" || surec.tur === "konu_sil") && konu && (
              <Link href={`/konu/${konu.id}`} className="group block">
                <div className="text-xl font-semibold group-hover:underline">{konu.baslik}</div>
                <p className="mt-1 line-clamp-4 text-muted-foreground">{konu.aciklama}</p>
              </Link>
            )}
            {v.gerekce && (
              <p>
                <span className="font-sans text-xs font-medium text-muted-foreground">Gerekçe · </span>
                {v.gerekce}
              </p>
            )}
          </section>

          {/* Tamamlanan oylamalar */}
          {bitenOylamalar.length > 0 && (
            <section className="flex flex-col gap-4">
              <Ara>Tamamlanan oylamalar</Ara>
              <div className="grid gap-6 sm:grid-cols-2">
                {bitenOylamalar.map((o) => {
                  const s = gorunenSayim(o);
                  return (
                    <div key={o.id} className="flex flex-col">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span>{ASAMA_ADLARI[o.asama]}</span>
                        <span className={o.durum === "kabul" ? "text-success" : "text-destructive"}>{o.durum === "kabul" ? "Kabul" : "Red"}</span>
                      </div>
                      <MeclisGrafigi evet={s.evet} hayir={s.hayir} secmen={s.secmen} gereken={s.gereken} className="mt-2 max-w-[240px]" />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Zaman çizelgesi */}
          <section className="flex flex-col gap-4">
            <Ara>Süreç kaydı</Ara>
            <ol className="relative ml-1 border-l-2 border-foreground/20 pl-5">
              {surecGecmisi(surec).map((g, i) => (
                <li key={i} className="relative pb-3 last:pb-0">
                  <span className="absolute top-2 -left-[26px] size-2.5 rounded-full border-2 border-background bg-foreground" />
                  <div>{g.olay}</div>
                  <div className="text-xs text-muted-foreground">{tamTarih(g.zaman)}</div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">
              Bu kaydın her adımı{" "}
              <Link href="/topluluk/defter" className="font-semibold text-foreground underline underline-offset-2">
                Açık Arşiv’e
              </Link>{" "}
              değiştirilemez şekilde yazıldı.
            </p>
          </section>
        </div>

        {/* Yan sütun: şu anki aşama */}
        <aside className="flex flex-col gap-6 lg:border-l lg:pl-8">
          {k.durum === "suruyor" && k.oylama && <OyKarti surecId={surec.id} ben={ben} ayrinti={false} />}
          {k.yoneticiBekliyor && (
            <section className="border-t pt-2">
              <div className="flex items-center gap-2 text-xs font-medium text-vurgu">
                <Crown className="size-4" /> Genel Yayın Yönetmeni
              </div>
              <h3 className="mt-1 text-xl font-semibold">Onay ya da veto bekleniyor</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                @{yonetici?.takma_ad} öneriyi onaylayabilir ya da veto edebilir. Karar vermezse öneri {kalanSure(k.yoneticiBekliyor, suan())}{" "}
                sonra kendiliğinden kabul edilir. Veto edilirse üyeler ve Kurul vetoyu 3’te 2 çoğunlukla aşabilir.
              </p>
              {ben && yonetici?.id === ben.id && <YoneticiKarari surecId={surec.id} />}
            </section>
          )}
          {k.durum !== "suruyor" && (
            <section className="border-t pt-3">
              <div className="ust-etiket">Sonuç</div>
              <div className={`mt-1 text-xl font-semibold ${k.durum === "kabul" ? "text-success" : "text-destructive"}`}>
                {k.durum === "kabul" ? "Kabul edildi" : "Reddedildi"}
              </div>
              {surec.kapanis && <div className="mt-1 text-xs text-muted-foreground">{tamTarih(surec.kapanis)}</div>}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
