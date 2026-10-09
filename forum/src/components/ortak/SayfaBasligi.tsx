import { cn } from "@/lib/utils";
import { KilimSerit } from "@/components/motif/Motif";

type Props = {
  ust: string;
  baslik: React.ReactNode;
  children?: React.ReactNode; // giriş paragrafı
  sag?: React.ReactNode; // sağ üstte düğmeler
  className?: string;
};

/** İç sayfaların başlığı: küçük üst etiket, başlık, giriş paragrafı ve altında kızıl su yolu (zikzak) şeridi. */
export function SayfaBasligi({ ust, baslik, children, sag, className }: Props) {
  return (
    <header className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="ust-etiket">{ust}</div>
          <h1 className="mt-1 text-[clamp(1.6rem,3.2vw,2.25rem)] leading-tight font-semibold">{baslik}</h1>
        </div>
        {sag}
      </div>
      {children && <div className="max-w-2xl text-base leading-relaxed text-muted-foreground">{children}</div>}
      <KilimSerit desen="zikzak" ilmek={1} className="mt-3 text-kizil/70" />
    </header>
  );
}

/** Bölüm içi ara başlık; altında ince kızıl su yolu şeridi. */
export function AraBaslik({ children, sag, className }: { children: React.ReactNode; sag?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-base font-semibold">{children}</h2>
        {sag}
      </div>
      <KilimSerit desen="zikzak" ilmek={1} className="text-kizil/60" />
    </div>
  );
}
