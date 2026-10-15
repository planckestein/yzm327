import { CIZGI, OkUclari, ZEMIN } from "./ortak";

/*
 * Gösterim anahtarı: diyagramlarda kullanılan UML işaretlerinin küçük örnekleri ve anlamları.
 * Her örnek ayrı bir küçük SVG'dir; ok uçları ortak.tsx'teki tanımlardan gelir.
 */

type Ornek = { ad: string; anlam: string; cizim: (on: string) => React.ReactNode };

const cizgi = (on: string, { kesikli, bas, son }: { kesikli?: boolean; bas?: string; son?: string } = {}) => (
  <path
    d="M10 15H96"
    stroke={CIZGI}
    strokeWidth={1.2}
    fill="none"
    strokeDasharray={kesikli ? "5 4" : undefined}
    markerStart={bas ? `url(#${on}-${bas})` : undefined}
    markerEnd={son ? `url(#${on}-${son})` : undefined}
  />
);

const yazi = (x: number, y: number, metin: string, italik = false) => (
  <text x={x} y={y} fontSize={10} textAnchor="middle" fill={CIZGI} fontStyle={italik ? "italic" : undefined}>
    {metin}
  </text>
);

export const KULLANIM_ANAHTARI: Ornek[] = [
  {
    ad: "Aktör",
    anlam: "Sistemi kullanan kişi ya da dış sistem. «actor» yazan kutu insan olmayan aktördür.",
    cizim: () => (
      <g stroke={CIZGI} strokeWidth={1.3} fill="none">
        <circle cx={53} cy={6} r={4} fill={ZEMIN} />
        <path d="M53 10V20M45 14H61M53 20L47 28M53 20L59 28" />
      </g>
    ),
  },
  {
    ad: "Kullanım durumu",
    anlam: "Aktörün sistemde yaptığı bir iş.",
    cizim: () => (
      <g>
        <ellipse cx={53} cy={15} rx={40} ry={11} fill={ZEMIN} stroke={CIZGI} strokeWidth={1.2} />
        {yazi(53, 18.5, "Oy ver")}
      </g>
    ),
  },
  { ad: "İlişki", anlam: "Aktör bu işi yapar.", cizim: (on) => cizgi(on) },
  {
    ad: "«include»",
    anlam: "Her seferinde çalışan zorunlu alt adım; ok dahil edilene doğru.",
    cizim: (on) => (
      <g>
        {cizgi(on, { kesikli: true, son: "acik" })}
        {yazi(53, 10, "«include»")}
      </g>
    ),
  },
  {
    ad: "«extend»",
    anlam: "Yalnızca bir koşulda devreye giren ek davranış; ok temel kullanım durumuna doğru.",
    cizim: (on) => (
      <g>
        {cizgi(on, { kesikli: true, son: "acik" })}
        {yazi(53, 10, "«extend»")}
      </g>
    ),
  },
  { ad: "Genelleme", anlam: "Alt aktör üst aktörün yaptığı her şeyi yapar (Üye bir Ziyaretçi’dir).", cizim: (on) => cizgi(on, { son: "ucgen" }) },
];

export const SINIF_ANAHTARI: Ornek[] = [
  {
    ad: "İlişki ve çokluk",
    anlam: "İki sınıf birbirine bağlı. 1 tam bir, 0..1 en fazla bir, 0..* sıfır ya da daha çok.",
    cizim: (on) => (
      <g>
        {cizgi(on)}
        {yazi(18, 11, "1")}
        {yazi(86, 11, "0..*")}
      </g>
    ),
  },
  { ad: "Kalıtım (genelleme)", anlam: "Alt tür üst türün özel bir hâlidir.", cizim: (on) => cizgi(on, { son: "ucgen" }) },
  { ad: "Gerçekleştirme", anlam: "Bir arayüzü uygular (beş aşama AsamaDurumu’nu uygular).", cizim: (on) => cizgi(on, { kesikli: true, son: "ucgen" }) },
  { ad: "Bileşim", anlam: "Dolu elmas bütünün yanında: parça bütünsüz var olamaz.", cizim: (on) => cizgi(on, { bas: "elmas" }) },
  { ad: "Toplama", anlam: "Boş elmas: parça bütüne bağlıdır ama ondan bağımsız da var olabilir.", cizim: (on) => cizgi(on, { bas: "elmasBos" }) },
  { ad: "Bağımlılık", anlam: "Kullanır ya da çağırır; ok kullanılan tarafa doğru.", cizim: (on) => cizgi(on, { kesikli: true, son: "acik" }) },
];

export const SIRA_ANAHTARI: Ornek[] = [
  { ad: "Çağrı", anlam: "Bir fonksiyonu çağırır ve sonucunu bekler (eşzamanlı).", cizim: (on) => cizgi(on, { son: "dolu" }) },
  { ad: "Dönüş", anlam: "Çağrının döndürdüğü değer.", cizim: (on) => cizgi(on, { kesikli: true, son: "acik" }) },
  {
    ad: "Kendine çağrı",
    anlam: "Aynı modülün kendi fonksiyonunu çağırması.",
    cizim: (on) => (
      <g>
        <path d="M40 2V29" stroke={CIZGI} strokeDasharray="4 3" strokeWidth={1} />
        <path d="M45 8H70V20H50" stroke={CIZGI} strokeWidth={1.2} fill="none" markerEnd={`url(#${on}-dolu)`} />
        <rect x={35} y={4} width={10} height={24} fill={ZEMIN} stroke={CIZGI} />
      </g>
    ),
  },
  {
    ad: "Etkinlik çubuğu",
    anlam: "Yaşam çizgisi üstündeki ince kutu: nesne o sırada çalışıyor.",
    cizim: () => (
      <g>
        <path d="M53 1V29" stroke={CIZGI} strokeDasharray="4 3" strokeWidth={1} />
        <rect x={48} y={6} width={10} height={18} style={{ fill: "color-mix(in oklch, var(--gok) 16%, var(--card))" }} stroke={CIZGI} />
      </g>
    ),
  },
  {
    ad: "Çerçeveler",
    anlam: "alt: if/else · opt: yalnızca if · loop: döngü · break: koşul doğruysa senaryo orada biter.",
    cizim: () => (
      <g>
        <rect x={6} y={3} width={94} height={25} fill="none" stroke={CIZGI} />
        <path d="M6 3H30V11L25 16H6z" fill={ZEMIN} stroke={CIZGI} />
        <text x={10} y={13} fontSize={9.5} fontWeight={700} fill={CIZGI}>
          alt
        </text>
        <path d="M6 20H100" stroke={CIZGI} strokeDasharray="5 3" />
      </g>
    ),
  },
];

export function GosterimAnahtari({ baslik, ornekler, on }: { baslik: string; ornekler: Ornek[]; on: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{baslik}</h3>
      <ul className="flex flex-col gap-2">
        {ornekler.map((o, i) => (
          <li key={o.ad} className="grid grid-cols-[106px_minmax(0,1fr)] items-center gap-3">
            <svg viewBox="0 0 106 30" width={106} height={30} className="shrink-0" aria-hidden fontFamily="var(--font-sans)">
              <OkUclari on={`${on}${i}`} />
              {o.cizim(`${on}${i}`)}
            </svg>
            <span className="text-sm leading-snug">
              <span className="font-medium">{o.ad}</span>
              <span className="text-muted-foreground"> · {o.anlam}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
