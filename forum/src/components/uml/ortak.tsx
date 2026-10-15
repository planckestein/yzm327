/*
 * UML çizimlerinin ortak parçaları: ok uçları, metin genişliği tahmini ve kesişim hesapları.
 * Diyagramlar sunucuda düz SVG olarak çizilir (istemci kodu yok); renkler tema değişkenlerinden gelir,
 * böylece gece temasında ve yazdırırken de okunur.
 */

export type Nokta = [number, number];

export const YAZI = {
  ad: 13,
  kucuk: 11,
  uye: 11.5,
};

/** Ortalama karakter genişliğinden metnin piksel genişliği (sunucuda ölçüm yapılamadığı için tahmin). */
export function metinGenisligi(metin: string, boyut: number, tur: "sans" | "kalin" | "mono" = "sans") {
  const oran = tur === "mono" ? 0.6 : tur === "kalin" ? 0.6 : 0.56;
  return metin.length * boyut * oran;
}

/** Kutunun kenarında, merkezden `yon` doğrultusundaki nokta. */
export function kutuKesisimi(merkez: Nokta, yarimEn: number, yarimBoy: number, hedef: Nokta): Nokta {
  const [dx, dy] = [hedef[0] - merkez[0], hedef[1] - merkez[1]];
  if (dx === 0 && dy === 0) return merkez;
  const t = Math.min(dx ? yarimEn / Math.abs(dx) : Infinity, dy ? yarimBoy / Math.abs(dy) : Infinity);
  return [merkez[0] + dx * t, merkez[1] + dy * t];
}

/** Elipsin kenarında, merkezden hedefe giden doğrultudaki nokta. */
export function elipsKesisimi(merkez: Nokta, rx: number, ry: number, hedef: Nokta): Nokta {
  const [dx, dy] = [hedef[0] - merkez[0], hedef[1] - merkez[1]];
  if (dx === 0 && dy === 0) return merkez;
  const t = 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
  return [merkez[0] + dx * t, merkez[1] + dy * t];
}

export const yol = (noktalar: Nokta[]) => noktalar.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

/** Kırık çizginin uzunluğunun ortasındaki nokta (etiketler için). */
export function ortaNokta(noktalar: Nokta[]): Nokta {
  const parcalar = noktalar.slice(1).map((n, i) => Math.hypot(n[0] - noktalar[i][0], n[1] - noktalar[i][1]));
  let kalan = parcalar.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < parcalar.length; i++) {
    if (kalan <= parcalar[i]) {
      const t = parcalar[i] ? kalan / parcalar[i] : 0;
      const [a, b] = [noktalar[i], noktalar[i + 1]];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    kalan -= parcalar[i];
  }
  return noktalar[0];
}

export const CIZGI = "var(--foreground)";
export const ZEMIN = "var(--card)";
export const SOLUK = "var(--muted-foreground)";

/**
 * Ok uçları. `on` her diyagrama özgü önektir; aynı sayfadaki SVG'lerin kimlikleri çakışmasın.
 *  dolu   : dolu üçgen uç (eşzamanlı mesaj)
 *  acik   : açık V uç (dönüş, bağımlılık, include/extend, yönlü ilişki)
 *  ucgen  : içi boş üçgen (kalıtım, gerçekleştirme)
 *  elmas  : dolu elmas (bileşim) · elmasBos : içi boş elmas (toplama); çizginin başında, bütünden dışarı doğru
 */
export function OkUclari({ on }: { on: string }) {
  return (
    <defs>
      <marker id={`${on}-dolu`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M0 1L10 5L0 9z" fill={CIZGI} />
      </marker>
      <marker id={`${on}-acik`} viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M0 0.5L9.5 5L0 9.5" fill="none" stroke={CIZGI} strokeWidth="1.3" />
      </marker>
      <marker id={`${on}-ucgen`} viewBox="0 0 14 14" refX="13.5" refY="7" markerWidth="14" markerHeight="14" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M0.7 0.7L13.5 7L0.7 13.3z" fill={ZEMIN} stroke={CIZGI} strokeWidth="1.2" />
      </marker>
      <marker id={`${on}-elmas`} viewBox="0 0 20 10" refX="0.5" refY="5" markerWidth="20" markerHeight="10" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0.5 5L10 0.6L19.5 5L10 9.4z" fill={CIZGI} stroke={CIZGI} strokeWidth="1" />
      </marker>
      <marker id={`${on}-elmasBos`} viewBox="0 0 20 10" refX="0.5" refY="5" markerWidth="20" markerHeight="10" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0.5 5L10 0.6L19.5 5L10 9.4z" fill={ZEMIN} stroke={CIZGI} strokeWidth="1.1" />
      </marker>
    </defs>
  );
}

/** Çok satırlı metin: satırlar `y`'den başlayıp `aralik` kadar aşağı iner. */
export function Satirlar({
  satirlar,
  x,
  y,
  aralik = 15,
  ...ozellik
}: { satirlar: string[]; x: number; y: number; aralik?: number } & React.SVGProps<SVGTextElement>) {
  return (
    <text x={x} y={y} {...ozellik}>
      {satirlar.map((s, i) => (
        <tspan key={i} x={x} dy={i ? aralik : 0}>
          {s}
        </tspan>
      ))}
    </text>
  );
}

/** Etiketin arkasına zemin rengi bir kutu koyar ki çizgilerin üstünde okunsun. */
export function ZeminliEtiket({
  x,
  y,
  metin,
  boyut = YAZI.kucuk,
  italik,
  anchor = "middle",
}: {
  x: number;
  y: number;
  metin: string;
  boyut?: number;
  italik?: boolean;
  anchor?: "start" | "middle" | "end";
}) {
  const en = metinGenisligi(metin, boyut) + 8;
  const sol = anchor === "middle" ? x - en / 2 : anchor === "end" ? x - en + 4 : x - 4;
  return (
    <g>
      <rect x={sol} y={y - boyut + 1} width={en} height={boyut + 5} fill={ZEMIN} />
      <text x={x} y={y + 1} fontSize={boyut} textAnchor={anchor} fill={CIZGI} fontStyle={italik ? "italic" : undefined}>
        {metin}
      </text>
    </g>
  );
}

/** UML not kutusu: sağ üst köşesi kıvrık. */
export function NotKutusu({ x, y, en, satirlar, boyut = YAZI.kucuk }: { x: number; y: number; en: number; satirlar: string[]; boyut?: number }) {
  const boy = satirlar.length * (boyut + 4) + 10;
  const k = 9;
  return (
    <g>
      <path
        d={`M${x} ${y}H${x + en - k}L${x + en} ${y + k}V${y + boy}H${x}z`}
        style={{ fill: "color-mix(in oklch, var(--sari) 16%, var(--card))" }}
        stroke={SOLUK}
        strokeWidth={1}
      />
      <path d={`M${x + en - k} ${y}V${y + k}H${x + en}`} fill="none" stroke={SOLUK} strokeWidth={1} />
      <Satirlar satirlar={satirlar} x={x + 7} y={y + boyut + 4} aralik={boyut + 4} fontSize={boyut} fill={CIZGI} />
    </g>
  );
}

export const notBoyu = (satirSayisi: number, boyut = YAZI.kucuk) => satirSayisi * (boyut + 4) + 10;
