import Link from "next/link";
import { Bot, Landmark } from "lucide-react";
import { avatarRengi, ozet32 } from "@/lib/bicim";
import { cn } from "@/lib/utils";

const YZ_TAKMA_AD = "yz_bilirkisi";

const BOYUT = { sm: "size-6", default: "size-8", lg: "size-10", xl: "size-20" } as const;
type Boyut = keyof typeof BOYUT;

type Props = { ad: string; boyut?: Boyut; baglanti?: boolean; className?: string; rol?: string };

/**
 * Roma mozaiği gibi taş parçacıklarından (tessera) desen: renk geçişinin yönü ve taş rengi takma addan üretilir,
 * böylece her üyenin mozaiği kendine özgüdür ve hep aynı kalır. Karanlık temada negatifi alınır.
 */
function Mozaik({ ad, harf }: { ad: string; harf?: string }) {
  const renk = avatarRengi(ad);
  const aci = ((ozet32(ad) >>> 7) % 360) * (Math.PI / 180);
  const [dx, dy] = [Math.cos(aci), Math.sin(aci)];
  const adim = 40 / 6;
  const taslar: { x: number; y: number; o: number }[] = [];
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 6; j++) {
      const x = i * adim;
      const y = j * adim;
      const t = ((x + adim / 2 - 20) * dx + (y + adim / 2 - 20) * dy) / 30 + 0.55;
      // Taşlar elle döşenmiş gibi hafif farklı tonlarda
      const titreme = ((ozet32(`${ad}${i}${j}`) % 100) / 100 - 0.5) * 0.18;
      const o = Math.min(1, Math.max(0.08, t + titreme));
      // Yuvarlama: sunucu ve tarayıcının küçük ondalık farkları hidrasyon uyarısı vermesin
      taslar.push({ x: +x.toFixed(2), y: +y.toFixed(2), o: +o.toFixed(2) });
    }
  return (
    <svg viewBox="0 0 40 40" className="size-full dark:[filter:invert(1)_hue-rotate(180deg)]" aria-hidden>
      <rect width="40" height="40" fill="#d9dbe0" />
      {taslar.map((t) => (
        <rect
          key={`${t.x}-${t.y}`}
          x={t.x + 0.45}
          y={t.y + 0.45}
          width={adim - 0.9}
          height={adim - 0.9}
          rx="0.6"
          fill={renk}
          fillOpacity={t.o}
        />
      ))}
      {harf && (
        <text
          x="20"
          y="21.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="21"
          fontWeight="700"
          fill="#22252c"
          stroke="#f1f2f4"
          strokeWidth="4"
          strokeLinejoin="round"
          paintOrder="stroke"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {harf}
        </text>
      )}
    </svg>
  );
}

/** Üye avatarı; YZ üyesi robot, kurum hesabı mühür (bina simgesi) ile gösterilir. */
export function KullaniciAvatar({ ad, boyut = "default", baglanti = true, className, rol }: Props) {
  const yz = ad === YZ_TAKMA_AD;
  const kurum = rol === "resmi";
  const avatar = kurum ? (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[3px] bg-foreground text-background", BOYUT[boyut], className)}
      title={`@${ad}`}
    >
      <Landmark className="size-[55%]" />
    </span>
  ) : (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/20", BOYUT[boyut], className)}
      title={`@${ad}`}
    >
      <Mozaik ad={ad} harf={yz ? undefined : ad[0].toLocaleUpperCase("tr-TR")} />
      {yz && (
        <span className="absolute inset-[22%] flex items-center justify-center rounded-full bg-background text-success">
          <Bot className="size-[90%]" />
        </span>
      )}
    </span>
  );
  return baglanti ? (
    <Link href={`/profil/${encodeURIComponent(ad)}`} className="inline-flex shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring">
      {avatar}
    </Link>
  ) : (
    avatar
  );
}

export function AvatarYigini({ adlar, fazla = 0, className }: { adlar: string[]; fazla?: number; className?: string }) {
  return (
    <span className={cn("flex items-center -space-x-1.5 [&>span]:ring-2 [&>span]:ring-background", className)}>
      {adlar.map((a) => (
        <KullaniciAvatar key={a} ad={a} boyut="sm" baglanti={false} />
      ))}
      {fazla > 0 && (
        <span className="relative inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
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
