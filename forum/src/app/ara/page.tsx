import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { KullaniciAvatar } from "@/components/ortak/KullaniciAvatar";
import { Zaman } from "@/components/ortak/Zaman";
import { AraBaslik, SayfaBasligi } from "@/components/ortak/SayfaBasligi";

export const metadata: Metadata = { title: "Ara" };

const kucuk = (s: string) => s.toLocaleLowerCase("tr-TR");

/** Aranan kelimenin çevresinden kısa bir parça */
function parca(metin: string, q: string) {
  const i = kucuk(metin).indexOf(q);
  if (i < 0) return metin.slice(0, 160);
  const bas = Math.max(0, i - 60);
  return (bas > 0 ? "…" : "") + metin.slice(bas, i + q.length + 100) + (i + q.length + 100 < metin.length ? "…" : "");
}

function Vurgu({ metin, q }: { metin: string; q: string }) {
  const i = kucuk(metin).indexOf(q);
  if (i < 0) return <>{metin}</>;
  return (
    <>
      {metin.slice(0, i)}
      <mark className="bg-vurgu/20 px-0.5 text-foreground">{metin.slice(i, i + q.length)}</mark>
      {metin.slice(i + q.length)}
    </>
  );
}

export default async function AraSayfasi({ searchParams }: PageProps<"/ara">) {
  const ham = String((await searchParams).q ?? "").trim();
  const q = kucuk(ham);

  const konular = q
    ? (db
        .prepare("SELECT id, baslik, aciklama, olusturma FROM konular WHERE durum IN ('aktif','oylamada','kapandi') ORDER BY id DESC")
        .all() as { id: number; baslik: string; aciklama: string; olusturma: string }[]).filter(
        (k) => kucuk(k.baslik).includes(q) || kucuk(k.aciklama).includes(q),
      )
    : [];
  const mesajlar = q
    ? (db
        .prepare(
          `SELECT m.id, m.icerik, m.olusturma, u.takma_ad, k.id AS konu_id, k.baslik FROM mesajlar m
           JOIN kullanicilar u ON u.id = m.yazan_id JOIN konular k ON k.id = m.konu_id
           WHERE m.gizleyen_surec_id IS NULL AND k.durum != 'silindi' ORDER BY m.id DESC`,
        )
        .all() as { id: number; icerik: string; olusturma: string; takma_ad: string; konu_id: number; baslik: string }[]).filter((m) =>
        kucuk(m.icerik).includes(q),
      )
    : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <SayfaBasligi ust="Açık Arşiv" baslik="Arşivde ara" />
      <form className="flex gap-2" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={ham} placeholder="Konularda ve mesajlarda ara…" className="pl-9" autoFocus />
        </div>
        <Button type="submit">Ara</Button>
      </form>

      {q && (
        <>
          <section className="flex flex-col gap-2">
            <AraBaslik>Konular ({konular.length})</AraBaslik>
            {konular.length ? (
              <ul className="divide-y">
                {konular.map((k) => (
                  <li key={k.id}>
                    <Link href={`/konu/${k.id}`} className="group block py-3">
                      <div className="font-serif text-lg font-semibold group-hover:underline">
                        <Vurgu metin={k.baslik} q={q} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        <Vurgu metin={parca(k.aciklama, q)} q={q} />
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Eşleşen konu yok.</p>
            )}
          </section>
          <section className="flex flex-col gap-2">
            <AraBaslik>Mesajlar ({mesajlar.length})</AraBaslik>
            {mesajlar.length ? (
              <ul className="divide-y">
                {mesajlar.slice(0, 30).map((m) => (
                  <li key={m.id}>
                    <Link href={`/konu/${m.konu_id}#m${m.id}`} className="flex gap-3 py-3 hover:bg-muted/40">
                      <KullaniciAvatar ad={m.takma_ad} boyut="sm" baglanti={false} />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">
                          @{m.takma_ad} · {m.baslik} · <Zaman iso={m.olusturma} />
                        </div>
                        <p className="mt-0.5 font-serif">
                          <Vurgu metin={parca(m.icerik, q)} q={q} />
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Eşleşen mesaj yok.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
