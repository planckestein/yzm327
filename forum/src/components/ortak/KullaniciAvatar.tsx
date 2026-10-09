import Link from "next/link";
import { Bot, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { tamga } from "@/components/motif/tamga";

const YZ_TAKMA_AD = "yz_bilirkisi";

const BOYUT = { sm: "size-6", default: "size-8", lg: "size-10", xl: "size-20" } as const;
type Boyut = keyof typeof BOYUT;

type Props = { ad: string; boyut?: Boyut; baglanti?: boolean; className?: string; rol?: string };

/** Üye avatarı: keçe zeminde üyenin tamgası (bkz. motif/tamga.ts). YZ üyesi robot, kurum hesabı bina simgesiyle gösterilir. */
export function KullaniciAvatar({ ad, boyut = "default", baglanti = true, className, rol }: Props) {
  const yz = ad === YZ_TAKMA_AD;
  const kurum = rol === "resmi";
  const t = tamga(ad);
  const avatar = kurum ? (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[3px] bg-foreground text-background", BOYUT[boyut], className)}
      title={`@${ad}`}
    >
      <Landmark className="size-[55%]" />
    </span>
  ) : (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[3px] select-none", BOYUT[boyut], className)}
      style={{
        background: `color-mix(in oklch, ${yz ? "var(--gok)" : t.boya} 18%, var(--card))`,
        color: `color-mix(in oklch, ${yz ? "var(--gok)" : t.boya} 72%, var(--foreground))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${yz ? "var(--gok)" : t.boya} 30%, transparent)`,
      }}
      title={`@${ad}`}
    >
      {yz ? (
        <Bot className="size-[60%]" />
      ) : (
        <svg viewBox="0 0 20 20" className="size-[78%]" aria-hidden>
          <path d={t.yol} fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
  return baglanti ? (
    <Link href={`/profil/${encodeURIComponent(ad)}`} className="inline-flex shrink-0 rounded-[3px] focus-visible:ring-2 focus-visible:ring-ring">
      {avatar}
    </Link>
  ) : (
    avatar
  );
}

export function AvatarYigini({ adlar, fazla = 0, className }: { adlar: string[]; fazla?: number; className?: string }) {
  return (
    <span className={cn("flex items-center -space-x-1 [&>span]:ring-2 [&>span]:ring-background", className)}>
      {adlar.map((a) => (
        <KullaniciAvatar key={a} ad={a} boyut="sm" baglanti={false} />
      ))}
      {fazla > 0 && (
        <span className="relative inline-flex size-6 items-center justify-center rounded-[3px] bg-muted text-[10px] font-medium text-muted-foreground">
          +{fazla}
        </span>
      )}
    </span>
  );
}

export function KullaniciAdi({ ad, className }: { ad: string; className?: string }) {
  return (
    <Link href={`/profil/${encodeURIComponent(ad)}`} className={cn("font-medium hover:underline", className)}>
      {ad}
    </Link>
  );
}
