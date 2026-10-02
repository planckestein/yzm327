import { cn } from "@/lib/utils";

type Props = {
  ust: string;
  baslik: React.ReactNode;
  children?: React.ReactNode; // giriş paragrafı
  sag?: React.ReactNode; // sağ üstte düğmeler
  className?: string;
};

/** İç sayfaların gazete bölüm başlığı: üst etiket, büyük serif başlık, giriş paragrafı ve çift çizgi. */
export function SayfaBasligi({ ust, baslik, children, sag, className }: Props) {
  return (
    <header className={cn("meandros-alt flex flex-col gap-3 pb-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="ust-etiket">{ust}</div>
          <h1 className="yazit mt-1 font-serif text-[clamp(1.7rem,3.8vw,2.75rem)] leading-[1.08] font-black tracking-[-0.025em]">{baslik}</h1>
        </div>
        {sag}
      </div>
      {children && <div className="max-w-2xl font-serif text-[17px] leading-relaxed text-muted-foreground">{children}</div>}
    </header>
  );
}

/** Bölüm içi ara başlık: serif başlık, altında siyah çizgi. */
export function AraBaslik({ children, sag, className }: { children: React.ReactNode; sag?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-3 border-b border-foreground pb-1.5", className)}>
      <h2 className="yazit font-serif text-lg font-bold">{children}</h2>
      {sag}
    </div>
  );
}
