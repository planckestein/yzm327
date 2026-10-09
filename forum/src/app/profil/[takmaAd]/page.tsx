import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, CalendarDays, Lock, MapPin, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { mevcutKullanici, ROLLER, type Kullanici } from "@/lib/auth";
import { kullaniciKonuSatirlari } from "@/lib/akis";
import { kurallar } from "@/lib/kurallar";
import { duzListe, takipEdilenler } from "@/lib/ontoloji";
import { aldigimDevirler, verdigimDevirler } from "@/lib/devir";
import { gorevler } from "@/lib/secim";
import { devriKaldir } from "@/app/actions/oylama";
import { KullaniciAvatar, KullaniciAdi } from "@/components/ortak/KullaniciAvatar";
import { AraBaslik } from "@/components/ortak/SayfaBasligi";
import { Zaman } from "@/components/ortak/Zaman";
import { KonuTablosu } from "@/components/konu/KonuTablosu";
import { DevirDiyalogu } from "@/components/profil/DevirDiyalogu";

export async function generateMetadata({ params }: PageProps<"/profil/[takmaAd]">): Promise<Metadata> {
  return { title: `@${decodeURIComponent((await params).takmaAd)}` };
}

export default async function ProfilSayfasi({ params }: PageProps<"/profil/[takmaAd]">) {
  const takmaAd = decodeURIComponent((await params).takmaAd);
  const profil = db
    .prepare("SELECT id, ad, soyad, takma_ad, adres, dogum_tarihi, rol, olusturma FROM kullanicilar WHERE takma_ad = ?")
    .get(takmaAd) as Kullanici | undefined;
  if (!profil) notFound();

  const ben = await mevcutKullanici();
  const kendim = ben?.id === profil.id;
  const yz = profil.rol === "yz";
  const say = (sql: string) => (db.prepare(sql).get(profil.id) as { n: number }).n;
  const istatistik = [
    { ad: "konu", n: say("SELECT COUNT(*) AS n FROM konular WHERE acan_id = ? AND durum != 'silindi'") },
    { ad: "mesaj", n: say("SELECT COUNT(*) AS n FROM mesajlar WHERE yazan_id = ?") },
    { ad: "oy", n: say("SELECT COUNT(*) AS n FROM oylar WHERE kullanici_id = ? AND vekil_id IS NULL") },
  ];
  const verdikleri = verdigimDevirler(profil.id);
  const aldiklari = aldigimDevirler(profil.id);
  const takipler = takipEdilenler(profil.id);
  const unvanlar = gorevler(profil.id);
  const sonMesajlar = db
    .prepare(
      `SELECT m.id, m.icerik, m.olusturma, k.id AS konu_id, k.baslik FROM mesajlar m JOIN konular k ON k.id = m.konu_id
       WHERE m.yazan_id = ? AND m.gizleyen_surec_id IS NULL ORDER BY m.id DESC LIMIT 5`,
    )
    .all(profil.id) as { id: number; icerik: string; olusturma: string; konu_id: number; baslik: string }[];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      {/* Başkalarına yalnızca ad soyad ve takma ad görünür; adres ve doğum tarihi gizlidir */}
      <header data-tur="profil" className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end">
        <KullaniciAvatar ad={profil.takma_ad} boyut="xl" baglanti={false} rol={profil.rol} />
        <div className="min-w-0 flex-1">
          <div className="ust-etiket">{[ROLLER[profil.rol] ?? "Üye", ...unvanlar].join(" · ")}</div>
          <h1 className="mt-1 text-[clamp(1.7rem,3vw,2.375rem)] leading-tight font-semibold">
            {profil.ad} {profil.soyad}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">@{profil.takma_ad}</span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" /> {new Date(profil.olusturma).toLocaleDateString("tr-TR", { dateStyle: "long" })} tarihinde katıldı
            </span>
          </div>
        </div>
        <dl className="flex gap-6 sm:gap-8">
          {istatistik.map((s) => (
            <div key={s.ad}>
              <dd className="text-4xl leading-none font-semibold tabular-nums">{s.n}</dd>
              <dt className="mt-1 text-xs font-medium text-muted-foreground">{s.ad}</dt>
            </div>
          ))}
        </dl>
      </header>

      {kendim && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border border-dashed border-foreground/40 px-4 py-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <Lock className="size-3.5" /> Yalnızca sana görünür
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" /> {new Date(profil.dogum_tarihi).toLocaleDateString("tr-TR")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {profil.adres}
          </span>
        </div>
      )}

      {yz && (
        <div className="flex gap-3 border-l-2 border-success pl-4">
          <Bot className="mt-1 size-5 shrink-0 text-success" />
          <p>
            Bu üye bir yapay zekadır. Tartışmaları özetler, ortak kavramları çıkarır ve uzlaşma taslağı hazırlar. Danışman olduğu için oy
            kullanamaz, aday olamaz ve kendisine oy devredilemez. Ücretsizdir: kural tabanlı çalışır; bilgisayarda Ollama kuruluysa yerel bir
            dil modeli kullanabilir.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-0 lg:[&>*+*]:border-l lg:[&>*+*]:pl-8 lg:[&>*:first-child]:pr-8">
        <section className="flex flex-col gap-3">
          <AraBaslik
            sag={ben && !kendim && !yz && profil.rol !== "resmi" && <DevirDiyalogu alan={profil.takma_ad} kategoriler={duzListe()} maksimum={kurallar().maksimumOyAgirligi} />}
          >
            Oy emaneti
          </AraBaslik>
          <div className="grid gap-4 text-sm">
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {kendim ? "Oyunu emanet ettiklerin" : "Oyunu emanet ettiği kişiler"}
              </div>
              {verdikleri.length ? (
                <ul className="grid gap-1">
                  {verdikleri.map((d) => (
                    <li key={d.kategori_id} className="flex items-center justify-between gap-2">
                      <span>
                        {d.kategori_ad} → <KullaniciAdi ad={d.takma_ad} />
                      </span>
                      {kendim && (
                        <form action={devriKaldir}>
                          <input type="hidden" name="kategori_id" value={d.kategori_id} />
                          <Button size="xs" variant="ghost">
                            <Undo2 /> Geri al
                          </Button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Yok{kendim && " — bir üyenin profilinden oyunu emanet edebilirsin"}.</p>
              )}
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {kendim ? "Sana oyunu emanet edenler" : "Oyunu emanet edenler"}
              </div>
              {aldiklari.length ? (
                <ul className="grid gap-1">
                  {aldiklari.map((d) => (
                    <li key={`${d.kategori_id}-${d.takma_ad}`}>
                      <KullaniciAdi ad={d.takma_ad} /> <span className="text-muted-foreground">({d.kategori_ad})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Yok.</p>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <AraBaslik>Takip ettiği bölümler</AraBaslik>
          {takipler.length ? (
            <p className="text-[12px] leading-7 font-semibold">
              {takipler.map((k, i) => (
                <span key={k.id}>
                  {i > 0 && <span className="px-1.5 text-border">|</span>}
                  <Link href={`/kategori/${k.id}`} className="hover:underline">
                    {k.ad}
                  </Link>
                </span>
              ))}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Henüz bölüm takip etmiyor.</p>
          )}
        </section>
      </div>

      {sonMesajlar.length > 0 && (
        <section className="flex flex-col">
          <AraBaslik>Son sözleri</AraBaslik>
          <ul className="divide-y">
            {sonMesajlar.map((m) => (
              <li key={m.id}>
                <Link href={`/konu/${m.konu_id}#m${m.id}`} className="group block py-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    {m.baslik} · <Zaman iso={m.olusturma} />
                  </div>
                  <p className="mt-1 line-clamp-2 group-hover:underline">“{m.icerik}”</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col">
        <AraBaslik>Önerdiği konular</AraBaslik>
        <KonuTablosu konular={kullaniciKonuSatirlari(profil.id)} bos="Henüz konu önermedi." />
      </section>
    </div>
  );
}
