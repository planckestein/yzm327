import { cn } from "@/lib/utils";
import { izgaraYolu } from "./desenler";

/*
 * Büyük otağ çizimi (ana sayfa başlığı ve uygulama ikonu için): dokuma ızgarasında, katman katman.
 * Kubbe kara keçe; ortasında kızıl kuşak ve üstünde sarı ilmekler; tepede sarı tündük;
 * duvarda ak keçe üstüne çaprazlama kerege (kafes); önde sarı çerçeveli kızıl kapı.
 */
const EN = 27;

const KUBBE = [
  ".........XXXXXXXXX.........",
  ".......XXXXXXXXXXXXX.......",
  ".....XXXXXXXXXXXXXXXXX.....",
  "....XXXXXXXXXXXXXXXXXXX....",
  "...XXXXXXXXXXXXXXXXXXXXX...",
  "..XXXXXXXXXXXXXXXXXXXXXXX..",
  ".XXXXXXXXXXXXXXXXXXXXXXXXX.",
  "XXXXXXXXXXXXXXXXXXXXXXXXXXX",
];

function katmanlar() {
  const bos = () => Array.from({ length: 17 }, () => Array<string>(EN).fill("."));
  const kara = bos();
  const kizil = bos();
  const sari = bos();
  const ak = bos();
  const yaz = (k: string[][], x: number, y: number) => (k[y][x] = "X");

  // Tündük (satır 0) ve kubbe (satır 1–8)
  for (let x = 11; x <= 15; x++) yaz(sari, x, 0);
  KUBBE.forEach((satir, i) => [...satir].forEach((c, x) => c === "X" && yaz(kara, x, i + 1)));
  // Kuşak: kubbenin 5. ve 6. satırı kızıl, üstünde aralıklı sarı ilmek
  for (const y of [5, 6])
    [...KUBBE[y - 1]].forEach((c, x) => {
      if (c !== "X") return;
      kara[y][x] = ".";
      if ((x + y) % 3 === 0) yaz(sari, x, y);
      else yaz(kizil, x, y);
    });
  // Duvar (satır 9–15): ak keçe, çaprazlama kerege
  for (let y = 9; y <= 15; y++)
    for (let x = 0; x < EN; x++) {
      if (x === 0 || x === EN - 1) yaz(kara, x, y);
      else if ((x - y + 60) % 4 === 0 || (x + y) % 4 === 0) yaz(kara, x, y);
      else yaz(ak, x, y);
    }
  // Kapı: sarı çerçeve, kızıl kanat
  for (let y = 10; y <= 15; y++)
    for (let x = 10; x <= 16; x++) {
      kara[y][x] = ".";
      ak[y][x] = ".";
      if (x === 10 || x === 16 || y === 10) yaz(sari, x, y);
      else yaz(kizil, x, y);
    }
  // Taban
  for (let x = 0; x < EN; x++) yaz(kara, x, 16);
  const satirlar = (k: string[][]) => k.map((r) => r.join(""));
  return { kara: satirlar(kara), kizil: satirlar(kizil), sari: satirlar(sari), ak: satirlar(ak) };
}

const K = katmanlar();

export function OtagCizimi({ className }: { className?: string }) {
  return (
    <svg viewBox={`-0.5 -0.5 ${EN + 1} 18`} className={cn("h-auto w-40 shrink-0", className)} shapeRendering="crispEdges" aria-hidden>
      <path d={izgaraYolu(K.ak)} style={{ fill: "var(--ak)" }} />
      <path d={izgaraYolu(K.kara)} style={{ fill: "var(--otag)" }} />
      <path d={izgaraYolu(K.kizil)} style={{ fill: "var(--kizil)" }} />
      <path d={izgaraYolu(K.sari)} style={{ fill: "var(--sari)" }} />
    </svg>
  );
}

/** PWA ikonu gibi CSS değişkeni olmayan yerler için sabit renkli SVG metni. */
export function otagSvgMetni(boy: number): string {
  const yol = (k: string[], renk: string) => `<path d="${izgaraYolu(k)}" fill="${renk}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.5 -0.5 ${EN + 1} 18" width="${boy}" height="${Math.round((boy * 18) / (EN + 1))}" shape-rendering="crispEdges">` +
    yol(K.ak, "#f6efe2") +
    yol(K.kara, "#2b221b") +
    yol(K.kizil, "#b33a2b") +
    yol(K.sari, "#e2a93b") +
    `</svg>`
  );
}
