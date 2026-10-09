import { Check, Minus, X } from "lucide-react";
import { surecOylamalari } from "@/lib/oylama";
import { ASAMA_ADLARI, SUREC_TURLERI, type Asama, type Surec } from "@/lib/surec";
import { cn } from "@/lib/utils";

type AdimDurumu = "tamam" | "simdi" | "red" | "bekliyor" | "atlandi";

/**
 * "Bir öneri nasıl karar olur": önerinin geçtiği duraklar bir metro hattı gibi çizilir.
 * Geçilen duraklar dolu, bulunduğu durak nabız gibi atar, reddedildiği durak kırmızı çarpıdır.
 */
export function KararAdimlari({ surec }: { surec: Surec }) {
  const oylamalar = surecOylamalari(surec.id);
  const vetoYolu = oylamalar.some((o) => o.asama.startsWith("veto_")) || surec.asama.startsWith("veto_");
  const adimlar: Asama[] = [...SUREC_TURLERI[surec.tur].yol, ...(vetoYolu ? (["veto_uyeler", "veto_temsilciler"] as Asama[]) : [])];

  const sonRed = [...oylamalar].reverse().find((o) => o.durum === "red");
  const ulasilan =
    surec.asama !== "bitti" ? adimlar.indexOf(surec.asama) : surec.durum === "red" && sonRed ? adimlar.indexOf(sonRed.asama) : adimlar.length;

  const durumu = (a: Asama): AdimDurumu => {
    if (surec.asama === a) return "simdi";
    const o = [...oylamalar].reverse().find((x) => x.asama === a);
    if (o) return o.durum === "kabul" ? "tamam" : o.durum === "red" ? "red" : "simdi";
    const sira = adimlar.indexOf(a);
    if (a === "yonetici" && sira < ulasilan) return vetoYolu ? "red" : "tamam";
    return sira < ulasilan ? "atlandi" : "bekliyor";
  };

  const ALT_YAZI: Record<AdimDurumu, string> = {
    tamam: "Kabul",
    simdi: "Şu an burada",
    red: "Red",
    bekliyor: "Sırada",
    atlandi: "Atlandı",
  };

  const altYazi = (a: Asama, d: AdimDurumu) => {
    if (d === "red" && a === "yonetici") return "Veto";
    if (d === "bekliyor" && surec.asama === "bitti") return "Ulaşılmadı";
    return ALT_YAZI[d];
  };

  const sonuc = surec.durum === "kabul" ? "kabul" : surec.durum === "red" ? "red" : null;
  const duraklar = adimlar.map((a) => ({ a, d: durumu(a) }));

  return (
    <ol className="relative flex flex-col gap-5 sm:flex-row sm:gap-0">
      {[...duraklar, { a: "bitti" as Asama, d: (sonuc === "kabul" ? "tamam" : sonuc === "red" ? "red" : "bekliyor") as AdimDurumu }].map(
        ({ a, d }, i, tum) => {
          const son = a === "bitti";
          const sonrakiGecildi = i < tum.length - 1 && tum[i + 1].d !== "bekliyor";
          return (
            <li key={a} className="relative flex items-center gap-3 sm:flex-1 sm:flex-col sm:items-start sm:gap-3">
              {/* hat */}
              {i < tum.length - 1 && (
                <span
                  className={cn(
                    "absolute top-[33px] left-[15.5px] h-[calc(100%-13px)] w-[2px] sm:top-[15.5px] sm:left-8 sm:h-[2px] sm:w-[calc(100%-32px)]",
                    sonrakiGecildi ? "bg-foreground/60" : "bg-foreground/15",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-[33px] shrink-0 items-center justify-center rounded-full border-2 bg-background",
                  d === "tamam" && "border-foreground bg-foreground text-background",
                  d === "red" && "border-destructive bg-destructive text-background",
                  d === "simdi" && "border-vurgu text-vurgu",
                  d === "atlandi" && "border-foreground/30 text-muted-foreground",
                  d === "bekliyor" && "border-foreground/20 text-muted-foreground",
                  son && d === "tamam" && "border-success bg-success",
                )}
              >
                {d === "tamam" ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : d === "red" ? (
                  <X className="size-4" strokeWidth={2.5} />
                ) : d === "atlandi" ? (
                  <Minus className="size-4" />
                ) : d === "simdi" ? (
                  <span className="size-2.5 rounded-full bg-vurgu" />
                ) : null}
              </span>
              <div className="min-w-0 sm:pr-3">
                <div className={cn("text-xs font-medium", d === "bekliyor" && "text-muted-foreground")}>
                  {son ? "Karar" : ASAMA_ADLARI[a]}
                </div>
                <div className={cn("text-sm text-muted-foreground italic", d === "simdi" && "font-semibold text-vurgu not-italic")}>
                  {son ? (sonuc === "kabul" ? "Kabul edildi" : sonuc === "red" ? "Reddedildi" : "Bekleniyor") : altYazi(a, d)}
                </div>
              </div>
            </li>
          );
        },
      )}
    </ol>
  );
}
