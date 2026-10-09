/*
 * Anadolu kilim motifleri, dokuma ızgarası üzerinde.
 * Kilimde her motif atkı ve çözgü ipliklerinin oluşturduğu ızgaradan çıkar; burada da her "X" bir ilmek.
 * Anlamlar halk geleneğindeki yaygın yorumlardır (bölgeden bölgeye değişebilir).
 */

export type MotifAdi =
  | "otag"
  | "elibelinde"
  | "kocboynuzu"
  | "hayatAgaci"
  | "goz"
  | "yildiz"
  | "suYolu"
  | "bereket"
  | "muska"
  | "kus"
  | "pitrak";

export const DESENLER: Record<MotifAdi, { ad: string; anlam: string; izgara: string[] }> = {
  otag: {
    ad: "Otağ",
    anlam: "Kurultayın toplandığı çadır; tepesindeki halka (tündük) gökyüzüne açılır.",
    izgara: [
      "....XXX....",
      "...X.X.X...",
      "..XXXXXXX..",
      ".XX.X.X.XX.",
      "XXXXXXXXXXX",
      "X.X.X.X.X.X",
      "XXXXXXXXXXX",
      "XXXX...XXXX",
      "XXXX...XXXX",
    ],
  },
  elibelinde: {
    ad: "Elibelinde",
    anlam: "Annelik, aile ve bereket.",
    izgara: [
      ".....X.....",
      "....XXX....",
      ".....X.....",
      ".XXXXXXXXX.",
      ".X..XXX..X.",
      ".XX.XXX.XX.",
      "..XXXXXXX..",
      "....XXX....",
      "...XXXXX...",
      "..XX...XX..",
      ".XX.....XX.",
    ],
  },
  kocboynuzu: {
    ad: "Koçboynuzu",
    anlam: "Güç, cesaret ve koruma.",
    izgara: [
      ".XXXX...XXXX.",
      "XX..XX.XX..XX",
      "X..X.XXX.X..X",
      "X.XX..X..XX.X",
      "XXX...X...XXX",
      "......X......",
      ".....XXX.....",
    ],
  },
  hayatAgaci: {
    ad: "Hayat ağacı",
    anlam: "Yaşamın sürekliliği, yer ile göğün bağı.",
    izgara: [
      ".....X.....",
      "....XXX....",
      "..X..X..X..",
      "..XX.X.XX..",
      "X..XXXXX..X",
      "XX...X...XX",
      ".XXX.X.XXX.",
      "....XXX....",
      ".....X.....",
      "....XXX....",
      "...XXXXX...",
    ],
  },
  goz: {
    ad: "Göz",
    anlam: "Kem gözden ve kötülükten koruma.",
    izgara: [
      ".....X.....",
      "....X.X....",
      "...X...X...",
      "..X..X..X..",
      ".X..XXX..X.",
      "X..XXXXX..X",
      ".X..XXX..X.",
      "..X..X..X..",
      "...X...X...",
      "....X.X....",
      ".....X.....",
    ],
  },
  yildiz: {
    ad: "Yıldız",
    anlam: "Devamlılık, yol gösterme ve umut.",
    izgara: [
      ".....X.....",
      ".X..XXX..X.",
      ".XX.XXX.XX.",
      "..XXXXXXX..",
      ".XXXX.XXXX.",
      "XXXX...XXXX",
      ".XXXX.XXXX.",
      "..XXXXXXX..",
      ".XX.XXX.XX.",
      ".X..XXX..X.",
      ".....X.....",
    ],
  },
  suYolu: {
    ad: "Su yolu",
    anlam: "Hayatın kaynağı, akış ve yolculuk.",
    izgara: [
      "X...X...X..",
      "XX.XXX.XXX.",
      ".XXX.XXX.XX",
      "..X...X...X",
      "...........",
      "X...X...X..",
      "XX.XXX.XXX.",
      ".XXX.XXX.XX",
      "..X...X...X",
    ],
  },
  bereket: {
    ad: "Bereket",
    anlam: "Bolluk, refah ve paylaşım.",
    izgara: [
      ".....X.....",
      "XX..XXX..XX",
      "X..XX.XX..X",
      "..XX.X.XX..",
      ".XX.XXX.XX.",
      "XX.XX.XX.XX",
      ".XX.XXX.XX.",
      "..XX.X.XX..",
      "X..XX.XX..X",
      "XX..XXX..XX",
      ".....X.....",
    ],
  },
  muska: {
    ad: "Muska",
    anlam: "Koruma ve güvence; insanı kötülükten saklar.",
    izgara: [
      ".....X.....",
      "....XXX....",
      "...XX.XX...",
      "..XX.X.XX..",
      ".XX.XXX.XX.",
      "XXXXXXXXXXX",
      "...X.X.X...",
      "...X.X.X...",
      "..XX.X.XX..",
    ],
  },
  kus: {
    ad: "Kuş",
    anlam: "Özgürlük, haber ve kavuşma.",
    izgara: [
      "X..........",
      "XX.....XX..",
      "XXX...XXXX.",
      "XXXX..XX..X",
      ".XXXXXXX...",
      "..XXXXXX...",
      "...XXXX....",
      "....X.X....",
      "...XX.XX...",
    ],
  },
  pitrak: {
    ad: "Pıtrak",
    anlam: "Şifa ve korunma; dikenleriyle kötülüğü uzak tutar.",
    izgara: [
      "X....X....X",
      ".X..XXX..X.",
      "..X..X..X..",
      "...XXXXX...",
      ".XXX.X.XXX.",
      "XXXXXXXXXXX",
      ".XXX.X.XXX.",
      "...XXXXX...",
      "..X..X..X..",
      ".X..XXX..X.",
      "X....X....X",
    ],
  },
};

/** Izgarayı SVG yoluna çevirir: her satırdaki ardışık ilmekler tek dikdörtgen olur (dosya küçük kalır). */
export function izgaraYolu(izgara: string[], ox = 0, oy = 0): string {
  let d = "";
  izgara.forEach((satir, y) => {
    let x = 0;
    while (x < satir.length) {
      if (satir[x] !== "X") {
        x++;
        continue;
      }
      let son = x;
      while (satir[son + 1] === "X") son++;
      d += `M${x + ox} ${y + oy}h${son - x + 1}v1h${-(son - x + 1)}z`;
      x = son + 1;
    }
  });
  return d;
}

/** Ana bölüm → motif ve renk (renkler globals.css'teki boya adlarıdır). */
export const BOLUM_MOTIFI: Record<string, { motif: MotifAdi; renk: string }> = {
  "Anayasa ve Hukuk": { motif: "muska", renk: "var(--civit)" },
  "İfade Özgürlüğü ve Basın": { motif: "kus", renk: "var(--kizil)" },
  "Ekonomi ve Çalışma Hayatı": { motif: "bereket", renk: "var(--sari)" },
  "Eğitim": { motif: "yildiz", renk: "var(--gok)" },
  "Sağlık": { motif: "pitrak", renk: "var(--al)" },
  "Çevre ve Enerji": { motif: "hayatAgaci", renk: "var(--yasil)" },
  "Dijital Haklar ve Teknoloji": { motif: "goz", renk: "var(--mor)" },
  "Şehirler ve Ulaşım": { motif: "suYolu", renk: "var(--boz)" },
  "Güvenlik ve Göç": { motif: "kocboynuzu", renk: "var(--kahve)" },
  "Aile ve Toplum": { motif: "elibelinde", renk: "var(--gul)" },
  "Kurultay Hakkında": { motif: "otag", renk: "var(--foreground)" },
};

export function bolumMotifi(anaBolumAd: string) {
  return BOLUM_MOTIFI[anaBolumAd] ?? { motif: "yildiz" as MotifAdi, renk: "var(--muted-foreground)" };
}
