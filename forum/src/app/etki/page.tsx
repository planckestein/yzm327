import type { Metadata } from "next";
import Link from "next/link";
import { Handshake } from "lucide-react";
import { db } from "@/lib/db";
import { kategoriEtiketi } from "@/lib/akis";
import { etkiIstatistikleri, konuTepkileri, kurumAdlari, TEPKILER } from "@/lib/etki";
import { konuUzlasmasi } from "@/lib/oylama";
import { KategoriRozeti } from "@/components/ortak/KategoriRozeti";
import { EtkiRozeti } from "@/components/ortak/EtkiRozeti";
import { AraBaslik, SayfaBasligi } from "@/components/ortak/SayfaBasligi";
import { Zaman } from "@/components/ortak/Zaman";

export const metadata: Metadata = { title: "Etki raporu" };

export default function EtkiSayfasi() {
  const e = etkiIstatistikleri();
  const tartisilan = (db.prepare("SELECT COUNT(*) AS n FROM konular WHERE durum IN ('aktif','kapandi')").get() as { n: number }).n;
  const adlar = kurumAdlari();
  const konular = db
    .prepare("SELECT id, baslik, kategori_id FROM konular WHERE durum = 'kapandi' ORDER BY id DESC")
    .all() as { id: number; baslik: string; kategori_id: number }[];

  const HUNI = [
    { ad: "Tartışıldı", n: tartisilan },
    { ad: "Uzlaşıldı", n: e.uzlasilan },
    { ad: "Kurum yanıt verdi", n: e.tepkiAlan },
    { ad: "Gündeme alındı", n: e.gundemeGiren },
    { ad: "Uygulandı", n: e.uygulanan },
  ];
  const enBuyuk = Math.max(1, ...HUNI.map((h) => h.n));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <SayfaBasligi ust="Etki raporu" baslik="Fikirleriniz nereye ulaştı?">
        Burada uzlaşılan her fikir, ilgili kurumların önüne konur. Kurumların verdiği her yanıt silinmeden ve tarihiyle kayıt altında
        tutulur. Yanıt vermemek de bir yanıttır.
      </SayfaBasligi>

      <section className="flex flex-col gap-5">
        <AraBaslik>Fikirden uygulamaya</AraBaslik>
        <ol className="grid gap-2.5">
          {HUNI.map((h, i) => (
            <li key={h.ad} className="grid grid-cols-[120px_1fr_56px] items-center gap-3 text-sm sm:grid-cols-[160px_1fr_64px]">
              <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">{h.ad}</span>
              <span className="h-8 bg-foreground/5">
                <span
                  className={`block h-full ${i < 2 ? "bg-foreground" : "bg-vurgu"}`}
                  style={{ width: `${(h.n / enBuyuk) * 100}%`, opacity: 1 - (i % 3) * 0.15 }}
                />
              </span>
              <span className="text-right font-serif text-3xl leading-none font-bold tabular-nums">{h.n}</span>
            </li>
          ))}
        </ol>
        <p className="font-serif text-lg">
          Uzlaşılan fikirlerin <b className="text-vurgu">%{e.oran}</b>’i kurumların çalışma gündemine girdi ya da uygulandı. Kurumlar
          bugüne kadar <b>{e.resmiAciklama}</b> resmî açıklama yaptı.
        </p>
      </section>

      <section className="flex flex-col">
        <AraBaslik>Uzlaşılan fikirler ve kurum yanıtları</AraBaslik>
        {konular.length === 0 && <p className="py-4 font-serif text-muted-foreground italic">Henüz uzlaşmayla kapanan konu yok.</p>}
        <div className="divide-y">
          {konular.map((k) => {
            const u = konuUzlasmasi(k.id);
            const { guncel } = konuTepkileri(k.id);
            return (
              <article key={k.id} className="py-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <KategoriRozeti {...kategoriEtiketi(k.kategori_id)} />
                  {u?.kapanis && (
                    <span className="text-xs text-muted-foreground">
                      uzlaşıldı <Zaman iso={u.kapanis} />
                    </span>
                  )}
                </div>
                <Link href={`/konu/${k.id}`} className="mt-1 block font-serif text-2xl leading-tight font-bold hover:underline">
                  {k.baslik}
                </Link>
                {u && (
                  <p className="mt-2 flex gap-2 font-serif text-muted-foreground italic">
                    <Handshake className="mt-1 size-4 shrink-0 not-italic" />
                    <span className="line-clamp-2">{(JSON.parse(u.veri) as { metin: string }).metin}</span>
                  </p>
                )}
                <div className="mt-4 grid gap-3 border-l-[3px] border-foreground pl-4">
                  {guncel.length ? (
                    guncel.map((t) => (
                      <div key={t.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
                        <span className="shrink-0 text-[11px] font-bold tracking-[0.08em] uppercase sm:w-52">{adlar.get(t.kurum) ?? t.kurum}</span>
                        <p className="min-w-0 flex-1 text-sm">{t.aciklama}</p>
                        <EtkiRozeti durum={t.durum} className="self-start" />
                      </div>
                    ))
                  ) : (
                    <p className="font-serif text-sm text-muted-foreground italic">Henüz hiçbir kurum yanıt vermedi.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <AraBaslik>Tepki türleri</AraBaslik>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(TEPKILER).map(([durum, t]) => (
            <li key={durum} className="flex items-center gap-2">
              <EtkiRozeti durum={durum as keyof typeof TEPKILER} />
              <span className="text-muted-foreground">{t.aciklama}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
