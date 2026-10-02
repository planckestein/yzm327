"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, Landmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeclisGrafigi } from "@/components/ortak/MeclisGrafigi";
import { sayi } from "@/lib/bicim";
import { gosterimHazirla, gosterimUygula } from "@/app/actions/gosterim";
import type { GosterimHedefi } from "@/lib/gosterim";

export const GOSTERIM_OLAYI = "ortakakil:canli-gosterim";

/** Canlı gösterimi turdan bağımsız başlatan düğme ("Nasıl işliyor?" sayfasında). */
export function GosterimDugmesi() {
  return (
    <Button className="bg-vurgu text-vurgu-foreground hover:bg-vurgu/90" onClick={() => window.dispatchEvent(new Event(GOSTERIM_OLAYI))}>
      <span className="canli-nokta size-1.5 rounded-full bg-current" /> Canlı gösterimi başlat
    </Button>
  );
}

type Sayim = GosterimHedefi["baslangic"];
type Evre = "hazirlaniyor" | "yok" | "oylama" | "kabul" | "kurum" | "bitti" | "hata";

const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Turun sonundaki canlı gösterim: süren bir uzlaşma oylaması gözün önünde sonuçlanır,
 * "Kabul edildi" damgası vurulur ve ilgili kurum "uygulayacağız" diyen resmî tepkisini bildirir.
 * Değişiklikler gerçekten veritabanına işlenir; konuya gidince sonuç orada da görünür.
 */
export function CanliGosterim() {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [evre, setEvre] = useState<Evre>("hazirlaniyor");
  const [hedef, setHedef] = useState<GosterimHedefi | null>(null);
  const [sayim, setSayim] = useState<Sayim | null>(null);
  const [tepki, setTepki] = useState("");
  const [yazilan, setYazilan] = useState(0);
  const [hata, setHata] = useState("");
  const [konuId, setKonuId] = useState<number | null>(null);
  const calisiyor = useRef(false);

  useEffect(() => {
    const baslat = async () => {
      if (calisiyor.current) return;
      calisiyor.current = true;
      setAcik(true);
      setEvre("hazirlaniyor");
      setYazilan(0);
      const h = await gosterimHazirla();
      if (!h) {
        setEvre("yok");
        calisiyor.current = false;
        return;
      }
      setHedef(h);
      setSayim(h.baslangic);
      await bekle(1400);
      setEvre("oylama");

      // Oylar gerçekten kullanılır; bu sırada ekranda sandalyeler dolar
      const sonuc = await gosterimUygula(h.surecId);
      if ("hata" in sonuc) {
        setHata(sonuc.hata);
        setEvre("hata");
        calisiyor.current = false;
        return;
      }
      const bas = h.baslangic;
      const son = sonuc.bitis;
      const ADIM = 40;
      for (let i = 1; i <= ADIM; i++) {
        const t = 1 - Math.pow(1 - i / ADIM, 2.2);
        setSayim({
          evet: Math.round(bas.evet + (son.evet - bas.evet) * t),
          hayir: Math.round(bas.hayir + (son.hayir - bas.hayir) * t),
          secmen: son.secmen,
          gereken: son.gereken,
        });
        await bekle(90);
      }
      setEvre("kabul");
      router.refresh();
      await bekle(1700);
      setTepki(sonuc.tepki);
      setKonuId(sonuc.konuId);
      setEvre("kurum");
      calisiyor.current = false;
    };
    const dinle = () => void baslat();
    window.addEventListener(GOSTERIM_OLAYI, dinle);
    return () => window.removeEventListener(GOSTERIM_OLAYI, dinle);
  }, [router]);

  // Kurumun açıklaması daktiloyla yazılıyormuş gibi belirir
  useEffect(() => {
    if (evre !== "kurum" || yazilan >= tepki.length) return;
    const t = setTimeout(() => setYazilan((n) => Math.min(tepki.length, n + 3)), 18);
    return () => clearTimeout(t);
  }, [evre, yazilan, tepki]);

  if (!acik) return null;
  const kapat = () => {
    if (calisiyor.current) return;
    setAcik(false);
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-label="Canlı gösterim">
      <div className="relative flex max-h-[calc(100dvh-32px)] w-full max-w-2xl flex-col overflow-y-auto border-2 border-foreground bg-background shadow-2xl">
        <div className="flex items-center justify-between gap-2 bg-vurgu px-4 py-2 text-vurgu-foreground">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] uppercase">
            <span className="canli-nokta size-1.5 rounded-full bg-current" /> Canlı gösterim
          </span>
          <button onClick={kapat} aria-label="Kapat" className="opacity-80 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5 sm:p-6">
          {evre === "hazirlaniyor" && <p className="py-10 text-center font-serif text-lg italic">Meclis toplanıyor…</p>}

          {evre === "yok" && (
            <div className="py-6 text-center">
              <p className="font-serif text-lg">Şu an gösterime uygun, süren bir uzlaşma oylaması yok.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Gösterim bir kez yapıldıysa demo verisini <code className="font-mono">npm run demo</code> ile yenileyip tekrar deneyebilirsin.
              </p>
            </div>
          )}
          {evre === "hata" && <p className="py-6 text-center text-destructive">{hata}</p>}

          {hedef && sayim && evre !== "yok" && evre !== "hata" && evre !== "hazirlaniyor" && (
            <>
              <div>
                <div className="ust-etiket">Topluluk Oylaması · Uzlaşma önerisi</div>
                <h2 className="mt-1 font-serif text-2xl leading-tight font-bold">{hedef.konuBaslik}</h2>
                <p className="mt-2 border-l-[3px] border-foreground pl-3 font-serif text-[15px] leading-snug italic">“{hedef.uzlasma}”</p>
              </div>

              <div className="relative mx-auto w-full max-w-[340px]">
                <MeclisGrafigi {...sayim} />
                {evre !== "oylama" && (
                  <span className="pointer-events-none absolute inset-x-0 top-[22%] flex justify-center">
                    <span className="animate-in zoom-in-150 fade-in -rotate-6 border-4 border-double border-success bg-background/85 px-4 py-1.5 font-serif text-3xl font-black tracking-wide text-success uppercase duration-300">
                      Kabul edildi
                    </span>
                  </span>
                )}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {evre === "oylama" ? (
                  <>Oylar sayılıyor… {sayi(sayim.evet)} evet</>
                ) : (
                  <>
                    <b className="text-foreground">{sayi(sayim.evet)}</b> vatandaşın oyuyla eşik aşıldı; konu bu uzlaşmayla kapandı ve ilgili kurumlara
                    iletildi.
                  </>
                )}
              </p>

              {(evre === "kurum" || evre === "bitti") && (
                <section className="animate-in fade-in slide-in-from-bottom-2 border-2 border-foreground p-4 duration-500">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-[12px] font-bold tracking-[0.08em] uppercase">
                      <span className="flex size-6 items-center justify-center rounded-[3px] bg-foreground text-background">
                        <Landmark className="size-3.5" />
                      </span>
                      {hedef.kurumAd}
                      <BadgeCheck className="size-4" />
                    </span>
                    <span className="inline-flex h-5 items-center rounded-[2px] border border-warning/60 px-1.5 text-[10px] font-bold tracking-[0.1em] text-warning uppercase">
                      Resmî tepki · Gündeme alındı
                    </span>
                  </div>
                  <p className="mt-3 min-h-[6.5rem] font-serif text-[16px] leading-relaxed">
                    {tepki.slice(0, yazilan)}
                    {yazilan < tepki.length && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-foreground" />}
                  </p>
                </section>
              )}

              {evre === "kurum" && yazilan >= tepki.length && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="ghost" onClick={kapat}>
                    Kapat
                  </Button>
                  {konuId && (
                    <Button
                      onClick={() => {
                        setAcik(false);
                        router.push(`/konu/${konuId}`);
                      }}
                    >
                      Sonucu konuda gör <ArrowRight />
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
