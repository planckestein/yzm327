import Link from "next/link";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
import type { Kullanici } from "@/lib/auth";
import { kalanSure, sayi } from "@/lib/bicim";
import { suan } from "@/lib/saat";
import { acikOylama, gorunenSayim, oyDurumu, oyListesi } from "@/lib/oylama";
import { ASAMA_ADLARI, surecGetir, type Surec } from "@/lib/surec";
import { cn } from "@/lib/utils";
import { MeclisGrafigi } from "@/components/ortak/MeclisGrafigi";
import { TakipDugmesi } from "@/components/ortak/TakipDugmesi";
import { OyDugmeleri } from "./OyDugmeleri";

export const SORULAR: Record<Surec["tur"], string> = {
  konu_ac: "Bu konu tartışmaya açılsın mı?",
  konu_kapat: "Tartışma bu uzlaşmayla kapansın mı?",
  mesaj_sil: "Bu mesaj gizlensin mi?",
  konu_sil: "Bu konu kaldırılsın mı?",
  konu_duzenle: "Bu düzenleme uygulansın mı?",
  kural_degistir: "Bu ilke değişikliği kabul edilsin mi?",
};

const ESIK: Record<string, string> = {
  salt: "tüm oy hakkı olanların yarısından fazlası",
  "1/2": "oy hakkı olanların yarısından fazlası",
  "3/5": "oy hakkı olanların 5'te 3'ü",
  "2/3": "oy hakkı olanların 3'te 2'si",
};

type Props = { surecId: number; ben: Kullanici | null; soru?: string; baslik?: string; ayrinti?: boolean; className?: string };

/** Bir kararın şu an açık oylaması: soru, meclis yarım dairesi, oy düğmeleri. */
export function OyKarti({ surecId, ben, soru, baslik, ayrinti = true, className }: Props) {
  const surec = surecGetir(surecId);
  const oylama = surec ? acikOylama(surec.id) : undefined;
  if (!surec || !oylama) return null;

  const s = gorunenSayim(oylama);
  const durum = ben ? oyDurumu(oylama, ben.id) : null;
  const kurul = oylama.asama === "temsilciler" || oylama.asama === "veto_temsilciler";
  const oylar = oyListesi(oylama.id);
  const benim = durum?.tur === "oy_verdi" || durum?.tur === "temsil_edildi" ? durum.secim : null;

  return (
    <section className={cn("border-t flex flex-col pt-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-vurgu">
          {ASAMA_ADLARI[oylama.asama]}
        </span>
        <span className="text-xs text-muted-foreground">{kalanSure(oylama.bitis, suan())}</span>
      </div>
      {baslik && (
        <Link href={`/karar/${surec.id}`} className="mt-2 text-xs leading-snug text-muted-foreground hover:text-foreground">
          {baslik}
        </Link>
      )}
      <h3 className="mt-1 text-xl leading-snug font-semibold">{soru ?? SORULAR[surec.tur]}</h3>

      <MeclisGrafigi evet={s.evet} hayir={s.hayir} secmen={s.secmen} gereken={s.gereken} benim={benim} className="mx-auto mt-3 w-full max-w-[280px]" />

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {sayi(s.secmen)} {kurul ? "kurul üyesi" : "oy hakkı olan"}
        {s.gereken !== null && (
          <>
            {" "}
            · kabul için <b className="text-foreground">{sayi(s.gereken)} evet</b> ({ESIK[oylama.esik]})
          </>
        )}
      </p>

      <div className="mt-4">
        {!ben ? (
          <p className="text-center text-sm text-muted-foreground">
            Oy vermek için{" "}
            <Link href="/giris" className="font-semibold text-foreground underline underline-offset-4">
              giriş yap
            </Link>
            .
          </p>
        ) : durum?.tur === "oy_verebilir" ? (
          <OyDugmeleri oylamaId={oylama.id} temsil={durum.temsilEdilecekler} />
        ) : durum?.tur === "oy_verdi" ? (
          <p className="flex items-center justify-center gap-1.5 text-sm">
            <CheckCircle2 className="size-4 text-success" /> Oyunu verdin: <b>{durum.secim === "evet" ? "Evet" : "Hayır"}</b>
          </p>
        ) : durum?.tur === "temsil_edildi" ? (
          <p className="flex items-center justify-center gap-1.5 text-center text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-success" /> Oyunu @{durum.vekil} senin adına kullandı:{" "}
            <b>{durum.secim === "evet" ? "Evet" : "Hayır"}</b>
          </p>
        ) : kurul ? (
          <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Info className="size-4" /> Bu aşamada yalnızca Yayın Kurulu oy kullanır.
          </p>
        ) : oylama.kategori_id !== null ? (
          <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <span>Oy verebilmek için bu bölümü takip etmelisin.</span>
            <TakipDugmesi kategoriId={oylama.kategori_id} takipte={false} />
          </div>
        ) : null}
      </div>

      {(oylar.length > 0 || ayrinti) && (
        <div className="mt-4 flex flex-wrap items-start justify-between gap-2 border-t pt-2 text-xs">
          {oylar.length > 0 ? (
            <details className="group min-w-0 flex-1">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Son oy verenlerden bazıları</summary>
              <ul className="mt-2 grid gap-1">
                {oylar.map((o) => (
                  <li key={o.takma_ad} className="flex items-center gap-1.5">
                    <span className={cn("size-2 shrink-0 rounded-full", o.secim === "evet" ? "bg-success" : "bg-destructive")} />
                    <Link href={`/profil/${encodeURIComponent(o.takma_ad)}`} className="hover:underline">
                      @{o.takma_ad}
                    </Link>
                    {o.vekil && <span className="text-muted-foreground">(@{o.vekil} ile)</span>}
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <span />
          )}
          {ayrinti && (
            <Link href={`/karar/${surec.id}`} className="inline-flex items-center gap-1 font-semibold hover:underline">
              Karar süreci <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
