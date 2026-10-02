import Link from "next/link";
import { BadgeCheck, EyeOff, Flag, Reply, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sha256 } from "@/lib/defter";
import { cn } from "@/lib/utils";
import { mesajSilmeOnerisi } from "@/app/actions/tartisma";
import { KullaniciAvatar, KullaniciAdi } from "@/components/ortak/KullaniciAvatar";
import { Damga } from "@/components/ortak/Durum";
import { IslemDiyalogu } from "@/components/ortak/IslemDiyalogu";
import { Zaman } from "@/components/ortak/Zaman";

export type GonderiVerisi = {
  id: number | null; // null = konunun ilk gönderisi (açıklama)
  sira: number;
  yazan: string;
  rol: string;
  icerik: string;
  olusturma: string;
  gizleyenKarar: number | null;
  yanit?: { id: number; yazan: string; ozet: string } | null;
  konuAcan?: boolean;
  gorunenAd?: string; // kurum hesaplarında kurumun adı
};

type Props = {
  g: GonderiVerisi;
  konuId: number;
  girisli: boolean;
  yazilabilir: boolean; // konu tartışmaya açık mı
  acikSilmeKarari?: number;
  benKurum?: boolean; // giriş yapan kişi kurum hesabı mı (gizleme önerisi yapamaz)
};

const ROL_DAMGASI: Record<string, { ad: string; sinif: string }> = {
  resmi: { ad: "Resmî açıklama", sinif: "border-foreground bg-foreground text-background" },
  bilirkisi: { ad: "Uzman", sinif: "border-warning/60 text-warning" },
  yz: { ad: "YZ Analist", sinif: "border-success/50 text-success" },
};

export function Gonderi({ g, konuId, girisli, yazilabilir, acikSilmeKarari, benKurum }: Props) {
  const rol = ROL_DAMGASI[g.rol];
  const yz = g.rol === "yz";
  const resmi = g.rol === "resmi";

  return (
    <article id={g.id ? `m${g.id}` : "ilk"} data-tur={yz ? "yz-mesaj" : undefined} className="group flex scroll-mt-28 gap-3 py-5 target:bg-vurgu/5 sm:gap-4">
      <KullaniciAvatar ad={g.yazan} rol={g.rol} />
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {resmi ? (
            <span className="inline-flex items-center gap-1 font-bold">
              {g.gorunenAd ?? g.yazan}
              <BadgeCheck className="size-4" aria-label="Doğrulanmış kurum" />
            </span>
          ) : (
            <KullaniciAdi ad={g.yazan} className="font-bold" />
          )}
          {rol && <Damga className={rol.sinif}>{rol.ad}</Damga>}
          {g.konuAcan && <Damga className="border-border text-muted-foreground">Konuyu açan</Damga>}
          <a href={g.id ? `#m${g.id}` : "#ilk"} className="ml-auto text-xs text-muted-foreground tabular-nums hover:text-foreground">
            <Zaman iso={g.olusturma} /> {g.id !== null && <span className="opacity-60">· №{g.sira}</span>}
          </a>
        </header>

        {g.yanit && (
          <a
            href={`#m${g.yanit.id}`}
            className="mt-2 block border-l-2 border-foreground/25 pl-3 font-serif text-sm text-muted-foreground italic hover:border-vurgu"
          >
            <Reply className="mr-1 inline size-3 -scale-x-100 not-italic" />
            <b className="font-sans font-semibold text-foreground not-italic">@{g.yanit.yazan}</b>: {g.yanit.ozet}
          </a>
        )}

        {g.gizleyenKarar ? (
          <p className="mt-2 inline-flex flex-wrap items-center gap-2 border border-dashed px-3 py-2 font-serif text-sm text-muted-foreground italic">
            <EyeOff className="size-4" /> Bu mesaj üyelerin ve Yayın Kurulu’nun oyuyla gizlendi; kaydı arşivde duruyor.
            <Link href={`/karar/${g.gizleyenKarar}`} className="font-sans font-semibold text-foreground not-italic hover:underline">
              Kararı gör
            </Link>
          </p>
        ) : (
          <div
            className={cn(
              "metin mt-1.5 font-serif text-[16.5px] leading-relaxed",
              yz && "mt-3 border border-dashed border-success/50 bg-success/5 p-4 font-sans text-[15px]",
              resmi && "mt-3 border-l-4 border-foreground bg-card py-3 pr-3 pl-4",
            )}
          >
            {g.icerik}
          </div>
        )}

        {g.id !== null && !g.gizleyenKarar && (
          <footer className="mt-2 flex items-center gap-1 text-muted-foreground">
            {girisli && yazilabilir && (
              <Button asChild variant="ghost" size="xs">
                <Link href={`/konu/${konuId}?yanit=${g.id}#yaz`} scroll={false}>
                  <Reply className="-scale-x-100" /> Yanıtla
                </Link>
              </Button>
            )}
            {girisli &&
              !benKurum &&
              (acikSilmeKarari ? (
                <Button asChild variant="ghost" size="xs" className="text-vurgu">
                  <Link href={`/karar/${acikSilmeKarari}`}>
                    <Flag /> Gizleme oylaması sürüyor
                  </Link>
                </Button>
              ) : (
                <IslemDiyalogu
                  tetik={
                    <Button variant="ghost" size="xs" className="opacity-60 group-hover:opacity-100" title="Gizlenmesini öner">
                      <Flag /> <span className="hidden sm:inline">Gizlenmesini öner</span>
                    </Button>
                  }
                  baslik="Bu mesajın gizlenmesini öner"
                  aciklama="Mesajlar kendiliğinden silinmez. Önerin Topluluk Oylaması’ndan ve Yayın Kurulu’ndan geçerse mesaj gizlenir; kaydı defterde kalır. Tehdit dışındaki ifadeler serbesttir."
                  islem={mesajSilmeOnerisi}
                  gizli={{ mesaj_id: g.id }}
                  alanlar={[{ ad: "gerekce", etiket: "Gerekçe", tip: "uzun", zorunlu: true, satir: 3 }]}
                  dugme="Oylamaya sun"
                />
              ))}
            <span
              className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] opacity-0 transition-opacity group-hover:opacity-60"
              title="Mesaj metninin SHA-256 özeti — dağıtık defterde kayıtlı"
            >
              <ShieldCheck className="size-3" />
              {sha256(g.icerik).slice(0, 10)}
            </span>
          </footer>
        )}
      </div>
    </article>
  );
}
