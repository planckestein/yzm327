"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { turAdimlari, type TurVerisi } from "./turAdimlari";
import { GOSTERIM_OLAYI } from "./CanliGosterim";
import { KilimSerit } from "@/components/motif/Motif";
import { Isaret } from "@/components/kabuk/Logo";

const DURUM_ANAHTARI = "kurultay-tur-adim";
const GORULDU_ANAHTARI = "kurultay-tur-goruldu";
export const TUR_OLAYI = "kurultay:tur-baslat";

// Tarayıcı depolaması kapalı olabilir (gizli pencere vb.); tur yine de çalışsın
function oku(anahtar: string): string | null {
  try {
    return localStorage.getItem(anahtar);
  } catch {
    return null;
  }
}
function yaz(anahtar: string, deger: string | null) {
  try {
    if (deger === null) localStorage.removeItem(anahtar);
    else localStorage.setItem(anahtar, deger);
  } catch {}
}

type Kutu = { top: number; left: number; width: number; height: number };

/**
 * Tanıtım turu: sayfalar arasında gezerek her adımda ilgili öğeyi vurgular ve yanında
 * "Hocanın isteği → Nasıl karşıladık" kartını gösterir. İlk ziyarette kendiliğinden açılır.
 */
export function TurRehberi({ veri }: { veri: TurVerisi }) {
  const adimlar = useMemo(() => turAdimlari(veri), [veri]);
  const router = useRouter();
  const yol = usePathname();
  const [adim, setAdim] = useState<number | null>(null);
  const [kutu, setKutu] = useState<Kutu | null>(null);
  const [hazir, setHazir] = useState(false);
  const hedefRef = useRef<HTMLElement | null>(null);
  const kartRef = useRef<HTMLDivElement>(null);

  // Açılış: yarım kalmış tur varsa sürdür; ilk ziyaretse ana sayfada başlat
  useEffect(() => {
    const kayitli = Number(oku(DURUM_ANAHTARI));
    const baslat = (n: number) => setTimeout(() => setAdim(n), 0);
    if (oku(DURUM_ANAHTARI) !== null && kayitli >= 0 && kayitli < adimlar.length) baslat(kayitli);
    else if (!oku(GORULDU_ANAHTARI) && location.pathname === "/") baslat(0);
    const dinle = () => setAdim(0);
    window.addEventListener(TUR_OLAYI, dinle);
    return () => window.removeEventListener(TUR_OLAYI, dinle);
  }, [adimlar.length]);

  const kapat = useCallback(() => {
    setAdim(null);
    setKutu(null);
    yaz(DURUM_ANAHTARI, null);
    yaz(GORULDU_ANAHTARI, "1");
  }, []);

  const git = useCallback(
    (n: number) => {
      if (n < 0) return;
      if (n >= adimlar.length) return kapat();
      setAdim(n);
    },
    [adimlar.length, kapat],
  );

  // Adım değişince: gerekirse sayfaya git, hedef öğeyi bekle, ekrana kaydır
  useEffect(() => {
    if (adim === null) return;
    yaz(DURUM_ANAHTARI, String(adim));
    const a = adimlar[adim];
    const [hedefYol, hedefSorgu = ""] = a.sayfa.split("?");
    const buradayiz = location.pathname === hedefYol && location.search.replace(/^\?/, "") === hedefSorgu;
    if (!buradayiz) router.push(a.sayfa, { scroll: false });

    const kurTimer = setTimeout(() => {
      setHazir(false);
      setKutu(null);
    }, 0);
    hedefRef.current = null;
    let deneme = 0;
    const ara = setInterval(() => {
      deneme++;
      if (location.pathname !== hedefYol) return deneme > 80 && clearInterval(ara);
      const el = a.hedef?.map((h) => document.querySelector<HTMLElement>(`[data-tur="${h}"]`)).find(Boolean) ?? null;
      if (el || !a.hedef || deneme > 30) {
        clearInterval(ara);
        hedefRef.current = el;
        if (el) {
          const r = el.getBoundingClientRect();
          const ust = r.top + window.scrollY - 120;
          const uzun = r.height > window.innerHeight * 0.5;
          window.scrollTo({ top: uzun ? ust : r.top + window.scrollY - (window.innerHeight - r.height) / 2 + 60, behavior: "smooth" });
        } else window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => setHazir(true), 350);
      }
    }, 100);
    return () => {
      clearTimeout(kurTimer);
      clearInterval(ara);
    };
  }, [adim, adimlar, router]);

  // Vurgu kutusunu kaydırma ve boyut değişiminde güncel tut
  useEffect(() => {
    if (adim === null || !hazir) return;
    let kare = 0;
    const olc = () => {
      const el = hedefRef.current;
      if (el && el.isConnected) {
        const r = el.getBoundingClientRect();
        const yeni = { top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 };
        setKutu((k) =>
          k && k.top === yeni.top && k.left === yeni.left && k.width === yeni.width && k.height === yeni.height ? k : yeni,
        );
      } else setKutu(null);
      kare = requestAnimationFrame(olc);
    };
    kare = requestAnimationFrame(olc);
    return () => cancelAnimationFrame(kare);
  }, [adim, hazir, yol]);

  // Klavye: → ileri, ← geri, Esc kapat
  useEffect(() => {
    if (adim === null) return;
    const tus = (e: KeyboardEvent) => {
      if (e.key === "Escape") kapat();
      else if (e.key === "ArrowRight") git(adim + 1);
      else if (e.key === "ArrowLeft") git(adim - 1);
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [adim, git, kapat]);

  // Kartın konumu: hedefin altına, sığmazsa üstüne; hedef çok büyükse köşeye
  const [kartKonum, setKartKonum] = useState<React.CSSProperties>({});
  useLayoutEffect(() => {
    const kart = kartRef.current;
    if (!kart) return;
    const g = window.innerWidth;
    const y = window.innerHeight;
    const kh = kart.offsetHeight;
    const kg = Math.min(420, g - 32);
    let stil: React.CSSProperties;
    if (!kutu || g < 640) stil = kutu ? { left: 16, right: 16, bottom: 16 } : { left: (g - Math.min(560, g - 32)) / 2, top: Math.max(16, (y - kh) / 2) };
    else if (kutu.top + kutu.height + kh + 16 < y) stil = { top: kutu.top + kutu.height + 12, left: Math.min(Math.max(16, kutu.left), g - kg - 16) };
    else if (kutu.top - kh - 12 > 0) stil = { top: kutu.top - kh - 12, left: Math.min(Math.max(16, kutu.left), g - kg - 16) };
    else stil = { right: 24, bottom: 24 };
    setKartKonum((onceki) => (JSON.stringify(onceki) === JSON.stringify(stil) ? onceki : stil));
  }, [kutu, adim, hazir]);

  if (adim === null) return null;
  const a = adimlar[adim];
  const merkez = !kutu;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="tur-baslik">
      {/* Karartma ve vurgu penceresi */}
      {kutu ? (
        <div
          className="pointer-events-none fixed rounded-[4px] ring-2 ring-vurgu transition-all duration-300 ease-out"
          style={{ ...kutu, boxShadow: "0 0 0 9999px color-mix(in oklch, black 58%, transparent)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}

      <div
        ref={kartRef}
        className={cn(
          "fixed flex max-h-[calc(100dvh-32px)] flex-col overflow-y-auto border bg-background shadow-lg transition-[top,left,opacity] duration-300",
          merkez ? "w-[min(560px,calc(100vw-32px))]" : "sm:w-[420px]",
          hazir ? "opacity-100" : "opacity-0",
        )}
        style={kartKonum}
      >
        <KilimSerit ilmek={1} />
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <Isaret className="h-3.5" /> Tanıtım turu · {adim + 1}/{adimlar.length}
          </span>
          <button onClick={kapat} className="text-muted-foreground hover:text-foreground" aria-label="Turu kapat">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-4 pt-3 pb-4">
          {a.ister && (
            <div className="border-l-2 border-vurgu pl-3">
              <div className="text-xs font-medium text-vurgu">{a.bizim ? "Tasarım kararımız" : "Hocanın isteği"}</div>
              <p className="mt-1 text-[15px] leading-snug italic">“{a.ister}”</p>
            </div>
          )}
          <div>
            {a.ister && <div className="text-xs font-medium text-muted-foreground">Nasıl karşıladık</div>}
            <h2 id="tur-baslik" className={cn("leading-tight font-semibold", a.ister ? "mt-0.5 text-xl" : "text-2xl")}>
              {a.baslik}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{a.metin}</p>
          </div>
          {a.liste && (
            <ul className="grid gap-1 border-y py-2 text-sm sm:grid-cols-2 sm:gap-x-4">
              {a.liste.map((l) => (
                <li key={l} className="flex gap-1.5">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={3} />
                  <span className="leading-snug">{l}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-1 flex items-center justify-end gap-2">
            <div className="mr-auto hidden gap-1 sm:flex" aria-hidden>
              {adimlar.map((_, i) => (
                <span key={i} className={cn("h-1 w-2.5 bg-foreground/15", i <= adim && "bg-vurgu")} />
              ))}
            </div>
            {adim > 0 && (
              <Button variant="ghost" size="sm" onClick={() => git(adim - 1)}>
                <ArrowLeft /> Geri
              </Button>
            )}
            {adim === 0 && (
              <Button variant="ghost" size="sm" onClick={kapat}>
                Şimdi değil
              </Button>
            )}
            {adim === adimlar.length - 1 ? (
              <>
                <Button variant="ghost" size="sm" onClick={kapat}>
                  Bitir
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    kapat();
                    window.dispatchEvent(new Event(GOSTERIM_OLAYI));
                  }}
                >
                  Canlı gösterimi başlat <ArrowRight />
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => git(adim + 1)}>
                {adim === 0 ? "Tura başla" : "İleri"} <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Turu yeniden başlatan düğme (üst çubukta, menüde ve "Nasıl işliyor?" sayfasında). */
export function TurDugmesi({ className, yazi }: { className?: string; yazi?: string }) {
  return (
    <Button
      variant={yazi ? "outline" : "ghost"}
      size={yazi ? "default" : "icon"}
      className={className}
      aria-label="Tanıtım turunu başlat"
      title="Tanıtım turu: hocamızın isteklerini nasıl karşıladık?"
      onClick={() => window.dispatchEvent(new Event(TUR_OLAYI))}
    >
      <Compass /> {yazi}
    </Button>
  );
}
