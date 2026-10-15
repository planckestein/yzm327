import { CIZGI, elipsKesisimi, kutuKesisimi, metinGenisligi, NotKutusu, notBoyu, OkUclari, ortaNokta, Satirlar, SOLUK, YAZI, yol, ZEMIN, ZeminliEtiket, type Nokta } from "./ortak";

/*
 * Kullanım durumu (use case) diyagramı: aktörler, sistem sınırı, kullanım durumları ve aralarındaki ilişkiler.
 *  iliski  : aktör ile kullanım durumu arasındaki düz çizgi (association)
 *  include : her seferinde çalışan zorunlu alt adım, ok dahil edilene doğru
 *  extend  : yalnızca bir koşulda devreye giren ek davranış, ok temel kullanım durumuna doğru
 *  kalitim : aktörler (ya da kullanım durumları) arasında genelleme, içi boş üçgen genel olana doğru
 */

export type UcAktor = { id: string; ad: string[]; x: number; y: number; sistem?: boolean };
export type UcDurum = { id: string; ad: string[]; x: number; y: number; en?: number };
export type UcBag = { a: string; b: string; tur: "iliski" | "include" | "extend" | "kalitim"; ara?: Nokta[]; kosul?: string; etiket?: Nokta };
export type UcNot = { x: number; y: number; en: number; satirlar: string[]; bag?: Nokta };

export type KullanimDiyagrami = {
  en: number;
  boy: number;
  sistem: { x: number; y: number; en: number; boy: number; ad: string };
  aktorler: UcAktor[];
  durumlar: UcDurum[];
  baglar: UcBag[];
  notlar?: UcNot[];
};

type Sekil = { merkez: Nokta; kenar: (hedef: Nokta) => Nokta };

const durumOlcusu = (d: UcDurum) => ({
  rx: d.en ? d.en / 2 : Math.max(58, Math.max(...d.ad.map((s) => metinGenisligi(s, 12.5))) / 2 + 24),
  ry: (d.ad.length * 15 + 16) / 2,
});

const sistemAktorOlcusu = (a: UcAktor) => ({
  en: Math.max(...a.ad.map((s) => metinGenisligi(s, 12.5, "kalin")), metinGenisligi("«actor»", YAZI.kucuk)) + 22,
  boy: 22 + a.ad.length * 15,
});

function sekiller(d: KullanimDiyagrami): Map<string, Sekil> {
  const m = new Map<string, Sekil>();
  for (const a of d.aktorler) {
    if (a.sistem) {
      const { en, boy } = sistemAktorOlcusu(a);
      const merkez: Nokta = [a.x, a.y];
      m.set(a.id, { merkez, kenar: (h) => kutuKesisimi(merkez, en / 2 + 1, boy / 2 + 1, h) });
    } else {
      // Çöp adam ve altındaki adı: çizgiler adın üstünden geçmesin diye kutu adı da kapsar
      const alt = 46 + (a.ad.length - 1) * 15;
      const merkez: Nokta = [a.x, a.y + (alt - 38) / 2];
      m.set(a.id, { merkez, kenar: (h) => kutuKesisimi(merkez, 19, (alt + 38) / 2, h) });
    }
  }
  for (const u of d.durumlar) {
    const { rx, ry } = durumOlcusu(u);
    const merkez: Nokta = [u.x, u.y];
    m.set(u.id, { merkez, kenar: (h) => elipsKesisimi(merkez, rx + 1, ry + 1, h) });
  }
  return m;
}

function Aktor({ a }: { a: UcAktor }) {
  if (a.sistem) {
    const { en, boy } = sistemAktorOlcusu(a);
    return (
      <g>
        <rect x={a.x - en / 2} y={a.y - boy / 2} width={en} height={boy} fill={ZEMIN} stroke={CIZGI} strokeWidth={1.2} />
        <text x={a.x} y={a.y - boy / 2 + 15} textAnchor="middle" fontSize={YAZI.kucuk} fill={SOLUK}>
          «actor»
        </text>
        <Satirlar satirlar={a.ad} x={a.x} y={a.y - boy / 2 + 31} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={CIZGI} />
      </g>
    );
  }
  const { x, y } = a;
  return (
    <g stroke={CIZGI} strokeWidth={1.5} fill="none" strokeLinecap="round">
      <circle cx={x} cy={y - 28} r={8} fill={ZEMIN} />
      <path d={`M${x} ${y - 20}V${y + 4}M${x - 15} ${y - 12}H${x + 15}M${x} ${y + 4}L${x - 12} ${y + 24}M${x} ${y + 4}L${x + 12} ${y + 24}`} />
      <Satirlar satirlar={a.ad} x={x} y={y + 41} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={CIZGI} stroke="none" />
    </g>
  );
}

export function KullanimDurumuDiyagrami({ veri, on, baslik }: { veri: KullanimDiyagrami; on: string; baslik: string }) {
  const s = sekiller(veri);
  const { sistem } = veri;
  return (
    <svg viewBox={`0 0 ${veri.en} ${veri.boy}`} width={veri.en} className="uml" role="img" aria-label={baslik} fontFamily="var(--font-sans)">
      <OkUclari on={on} />
      <rect x={sistem.x} y={sistem.y} width={sistem.en} height={sistem.boy} style={{ fill: "color-mix(in oklch, var(--background) 70%, var(--card))" }} stroke={CIZGI} strokeWidth={1.3} />
      <text x={sistem.x + 12} y={sistem.y + 21} fontSize={14} fontWeight={650} fill={CIZGI}>
        {sistem.ad}
      </text>

      {veri.baglar.map((b, i) => {
        const A = s.get(b.a)!;
        const B = s.get(b.b)!;
        const ara = b.ara ?? [];
        const ilk = A.kenar(ara[0] ?? B.merkez);
        const son = B.kenar(ara.at(-1) ?? A.merkez);
        const noktalar: Nokta[] = [ilk, ...ara, son];
        const kesikli = b.tur === "include" || b.tur === "extend";
        const uc = b.tur === "kalitim" ? "ucgen" : kesikli ? "acik" : null;
        const [ex, ey] = b.etiket ?? ortaNokta(noktalar);
        return (
          <g key={i}>
            <path
              d={yol(noktalar)}
              fill="none"
              stroke={CIZGI}
              strokeWidth={1.1}
              strokeDasharray={kesikli ? "5 4" : undefined}
              markerEnd={uc ? `url(#${on}-${uc})` : undefined}
            />
            {kesikli && <ZeminliEtiket x={ex} y={ey + 4} metin={`«${b.tur}»`} />}
            {b.kosul && <ZeminliEtiket x={ex} y={ey + 18} metin={b.kosul} italik />}
          </g>
        );
      })}

      {veri.durumlar.map((u) => {
        const { rx, ry } = durumOlcusu(u);
        return (
          <g key={u.id}>
            <ellipse cx={u.x} cy={u.y} rx={rx} ry={ry} fill={ZEMIN} stroke={CIZGI} strokeWidth={1.2} />
            <Satirlar
              satirlar={u.ad}
              x={u.x}
              y={u.y - ((u.ad.length - 1) * 15) / 2 + 4.5}
              textAnchor="middle"
              fontSize={12.5}
              fill={CIZGI}
            />
          </g>
        );
      })}

      {veri.aktorler.map((a) => (
        <Aktor key={a.id} a={a} />
      ))}

      {veri.notlar?.map((n, i) => (
        <g key={i}>
          {n.bag && (
            <path d={yol([[n.x + n.en / 2, n.y + notBoyu(n.satirlar.length) / 2], n.bag])} stroke={SOLUK} strokeDasharray="3 3" fill="none" />
          )}
          <NotKutusu x={n.x} y={n.y} en={n.en} satirlar={n.satirlar} />
        </g>
      ))}
    </svg>
  );
}
