import type { Metadata } from "next";
import Link from "next/link";
import { mevcutKullanici } from "@/lib/auth";
import { menuKategorileri } from "@/lib/akis";
import { tumKategoriler, takipEdiyorMu } from "@/lib/ontoloji";
import { SayfaBasligi } from "@/components/ortak/SayfaBasligi";
import { TakipDugmesi } from "@/components/ortak/TakipDugmesi";

export const metadata: Metadata = { title: "Bölümler" };

export default async function KategorilerSayfasi() {
  const ben = await mevcutKullanici();
  const aciklama = new Map(tumKategoriler().map((k) => [k.id, k.aciklama]));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <SayfaBasligi ust="Ontoloji" baslik="Bölümler">
        Her tartışma bu ağaçtaki bir bölüme aittir. Bir bölümü takip edersen onun (ve alt bölümlerinin) oylamalarında oy hakkın olur.
      </SayfaBasligi>
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {menuKategorileri().map((k) => (
          <section key={k.id} className="cizgi-kalin flex flex-col gap-3 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/kategori/${k.id}`} className="font-serif text-2xl leading-tight font-bold hover:underline">
                  {k.ad}
                </Link>
                <p className="mt-1 font-serif text-muted-foreground">{aciklama.get(k.id)}</p>
              </div>
              {ben && <TakipDugmesi kategoriId={k.id} takipte={takipEdiyorMu(ben.id, k.id)} />}
            </div>
            {k.altlar.length > 0 && (
              <ul className="divide-y border-y text-sm">
                {k.altlar.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-1.5">
                    <Link href={`/kategori/${a.id}`} className="hover:text-vurgu">
                      {a.ad}
                    </Link>
                    <span className="text-xs text-muted-foreground tabular-nums">{a.konu} tartışma</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">{k.konu} tartışma</div>
          </section>
        ))}
      </div>
    </div>
  );
}
