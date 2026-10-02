import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mevcutKullanici } from "@/lib/auth";
import { sayi } from "@/lib/bicim";
import { gorunenTakipci } from "@/lib/kalabalik";
import { akisKonulari } from "@/lib/akis";
import { altAgacIdleri, ataZinciri, ilgiliUyeSayisi, kategoriGetir, takipEdiyorMu, tumKategoriler } from "@/lib/ontoloji";
import { AkisSekmeleri, filtreCoz } from "@/components/konu/AkisSekmeleri";
import { KonuTablosu } from "@/components/konu/KonuTablosu";
import { TakipDugmesi } from "@/components/ortak/TakipDugmesi";

export async function generateMetadata({ params }: PageProps<"/kategori/[id]">): Promise<Metadata> {
  return { title: kategoriGetir(Number((await params).id))?.ad ?? "Bölüm" };
}

export default async function KategoriSayfasi({ params, searchParams }: PageProps<"/kategori/[id]">) {
  const id = Number((await params).id);
  const kategori = kategoriGetir(id);
  if (!kategori) notFound();
  const filtre = filtreCoz((await searchParams).f);

  const ben = await mevcutKullanici();
  const zincir = ataZinciri(id);
  const altlar = tumKategoriler().filter((k) => k.ust_id === id);
  const kurallar = zincir.map((k) => k.kurallar).filter(Boolean);
  const idler = altAgacIdleri(id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-3 border-b-[4px] border-double border-foreground pb-5">
        <nav className="ust-etiket">
          <Link href="/kategoriler" className="hover:underline">
            Bölümler
          </Link>
          {zincir.slice(0, -1).map((k) => (
            <span key={k.id}>
              {" › "}
              <Link href={`/kategori/${k.id}`} className="hover:underline">
                {k.ad}
              </Link>
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-serif text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] font-black tracking-[-0.025em]">{kategori.ad}</h1>
          {ben && (
            <div className="flex gap-2">
              <TakipDugmesi kategoriId={id} takipte={takipEdiyorMu(ben.id, id)} />
              <Button asChild size="sm">
                <Link href={`/konu/yeni?kategori=${id}`}>
                  <PenSquare /> Gündem öner
                </Link>
              </Button>
            </div>
          )}
        </div>
        <p className="max-w-2xl font-serif text-[17px] text-muted-foreground">{kategori.aciklama}</p>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[12px] font-semibold tracking-[0.06em] uppercase">
          <span className="mr-2 font-normal tracking-normal text-muted-foreground normal-case">{sayi(gorunenTakipci(id, ilgiliUyeSayisi(id)))} vatandaş takip ediyor</span>
          {altlar.map((a, i) => (
            <span key={a.id}>
              {i > 0 && <span className="px-1 text-border">|</span>}
              <Link href={`/kategori/${a.id}`} className="hover:text-vurgu">
                {a.ad}
              </Link>
            </span>
          ))}
        </div>
        {kurallar.length > 0 && (
          <p className="border-l-[3px] border-vurgu pl-3 text-sm">
            <b className="text-[11px] tracking-[0.1em] uppercase">Bölüm ilkesi · </b>
            {kurallar.join(" ")}
          </p>
        )}
      </header>
      <AkisSekmeleri aktif={filtre} taban={`/kategori/${id}`} />
      <KonuTablosu konular={akisKonulari(filtre, idler)} bos="Bu bölümde henüz tartışma yok. İlk gündem önerisini sen yap!" />
    </div>
  );
}
