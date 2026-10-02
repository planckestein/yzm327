import "server-only";
import { db } from "./db";
import { forumYoneticisi, tumTemsilciler } from "./secim";

/*
 * Üye grafı ("insanları grafta tut"): düğümler üyeler, kenarlar üyeler arasındaki ilişkiler.
 *   etkilesim : A, B'nin mesajına yanıt verdi (ağırlık = yanıt sayısı)
 *   devir     : A oyunu B'ye devretti (yönlü)
 *   destek    : A, B'nin adaylığını destekliyor (yönlü)
 * Yerleşim, Fruchterman–Reingold kuvvet yönlü algoritmasıyla sunucuda hesaplanır (dış kütüphane yok).
 */

export type Katman = "etkilesim" | "devir" | "destek";
export type Dugum = { id: number; ad: string; tur: "yonetici" | "temsilci" | "bilirkisi" | "yz" | "resmi" | "uye"; boyut: number; x: number; y: number; etiket?: string };
export type Kenar = { kaynak: number; hedef: number; agirlik: number; etiket?: string };

export const GENISLIK = 820;
export const YUKSEKLIK = 560;

function kenarlar(katman: Katman): Kenar[] {
  if (katman === "devir")
    return (
      db
        .prepare(
          `SELECT d.veren_id AS kaynak, d.alan_id AS hedef, 1 AS agirlik, COALESCE(k.ad, 'Tüm forum') AS etiket
           FROM devirler d LEFT JOIN kategoriler k ON k.id = d.kategori_id`,
        )
        .all() as Kenar[]
    );
  if (katman === "destek")
    return db.prepare("SELECT destekleyen_id AS kaynak, aday_id AS hedef, 1 AS agirlik, makam AS etiket FROM destekler").all() as Kenar[];
  // etkileşim: yanıtlar, yönsüz ve birleştirilmiş
  const satirlar = db
    .prepare(
      `SELECT m.yazan_id AS a, y.yazan_id AS b FROM mesajlar m JOIN mesajlar y ON y.id = m.yanit_id
       WHERE m.yazan_id != y.yazan_id`,
    )
    .all() as { a: number; b: number }[];
  const say = new Map<string, number>();
  for (const { a, b } of satirlar) {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    say.set(k, (say.get(k) ?? 0) + 1);
  }
  return [...say].map(([k, n]) => {
    const [a, b] = k.split("-").map(Number);
    return { kaynak: a, hedef: b, agirlik: n };
  });
}

/** Deterministik kuvvet yönlü yerleşim. */
function yerlestir(dugumler: Dugum[], kenar: Kenar[]) {
  const n = dugumler.length;
  if (!n) return;
  const alan = GENISLIK * YUKSEKLIK;
  const k = Math.sqrt(alan / n) * 0.75;
  const indeks = new Map(dugumler.map((d, i) => [d.id, i]));
  // Başlangıç: çember üzerinde
  dugumler.forEach((d, i) => {
    d.x = GENISLIK / 2 + (GENISLIK / 3) * Math.cos((2 * Math.PI * i) / n);
    d.y = YUKSEKLIK / 2 + (YUKSEKLIK / 3) * Math.sin((2 * Math.PI * i) / n);
  });
  let sicaklik = GENISLIK / 8;
  for (let tur = 0; tur < 300; tur++) {
    const dx = new Array(n).fill(0);
    const dy = new Array(n).fill(0);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const x = dugumler[i].x - dugumler[j].x;
        const y = dugumler[i].y - dugumler[j].y;
        const u = Math.max(0.01, Math.hypot(x, y));
        const f = (k * k) / u; // itme
        dx[i] += (x / u) * f;
        dy[i] += (y / u) * f;
        dx[j] -= (x / u) * f;
        dy[j] -= (y / u) * f;
      }
    for (const e of kenar) {
      const i = indeks.get(e.kaynak);
      const j = indeks.get(e.hedef);
      if (i === undefined || j === undefined) continue;
      const x = dugumler[i].x - dugumler[j].x;
      const y = dugumler[i].y - dugumler[j].y;
      const u = Math.max(0.01, Math.hypot(x, y));
      const f = ((u * u) / k) * Math.min(3, 0.6 + 0.4 * e.agirlik); // çekme
      dx[i] -= (x / u) * f;
      dy[i] -= (y / u) * f;
      dx[j] += (x / u) * f;
      dy[j] += (y / u) * f;
    }
    for (let i = 0; i < n; i++) {
      // merkeze çekim: az bağlantılı düğümler kenarlara savrulmasın
      dx[i] += (GENISLIK / 2 - dugumler[i].x) * 0.6;
      dy[i] += (YUKSEKLIK / 2 - dugumler[i].y) * 0.9;
      const u = Math.max(0.01, Math.hypot(dx[i], dy[i]));
      dugumler[i].x = Math.min(GENISLIK - 40, Math.max(40, dugumler[i].x + (dx[i] / u) * Math.min(u, sicaklik)));
      dugumler[i].y = Math.min(YUKSEKLIK - 30, Math.max(30, dugumler[i].y + (dy[i] / u) * Math.min(u, sicaklik)));
    }
    sicaklik *= 0.985;
  }

  // Bağlantılı düğümleri çizim alanını dolduracak şekilde ölçekle; bağlantısızları altta sıraya diz
  const bagli = new Set(kenar.flatMap((e) => [e.kaynak, e.hedef]));
  const ana = dugumler.filter((d) => bagli.has(d.id));
  const yalniz = dugumler.filter((d) => !bagli.has(d.id));
  const altBosluk = yalniz.length ? 70 : 0;
  if (ana.length > 1) {
    const [x0, x1] = [Math.min(...ana.map((d) => d.x)), Math.max(...ana.map((d) => d.x))];
    const [y0, y1] = [Math.min(...ana.map((d) => d.y)), Math.max(...ana.map((d) => d.y))];
    for (const d of ana) {
      d.x = 60 + ((d.x - x0) / (x1 - x0 || 1)) * (GENISLIK - 120);
      d.y = 40 + ((d.y - y0) / (y1 - y0 || 1)) * (YUKSEKLIK - 90 - altBosluk);
    }
  }
  yalniz.forEach((d, i) => {
    d.x = ((i + 1) * GENISLIK) / (yalniz.length + 1);
    d.y = YUKSEKLIK - 45;
  });
}

export function uyeGrafi(katman: Katman): { dugumler: Dugum[]; kenarlar: Kenar[] } {
  const yonetici = forumYoneticisi()?.id;
  const temsilciler = new Map(tumTemsilciler().map((t) => [t.id, t.kategori_ad]));
  const uyeler = db
    .prepare(
      `SELECT u.id, u.takma_ad AS ad, u.rol, (SELECT COUNT(*) FROM mesajlar m WHERE m.yazan_id = u.id) AS mesaj
       FROM kullanicilar u ORDER BY u.id`,
    )
    .all() as { id: number; ad: string; rol: string; mesaj: number }[];

  const dugumler: Dugum[] = uyeler.map((u) => ({
    id: u.id,
    ad: u.ad,
    tur: u.id === yonetici ? "yonetici" : temsilciler.has(u.id) ? "temsilci" : u.rol === "bilirkisi" ? "bilirkisi" : u.rol === "yz" ? "yz" : u.rol === "resmi" ? "resmi" : "uye",
    etiket: u.id === yonetici ? "Genel Yayın Yönetmeni" : temsilciler.has(u.id) ? `Yayın Kurulu · ${temsilciler.get(u.id)}` : undefined,
    boyut: 7 + Math.min(11, Math.sqrt(u.mesaj) * 2.5),
    x: 0,
    y: 0,
  }));
  // Yerleşim tüm ilişkilerin toplamına göre yapılır: sekme değişince düğümler yerinde kalır
  const tum = [...kenarlar("etkilesim"), ...kenarlar("devir"), ...kenarlar("destek").map((e) => ({ ...e, agirlik: 0.5 }))];
  yerlestir(dugumler, tum);
  return { dugumler, kenarlar: kenarlar(katman) };
}

/** Grafla ilgili kısa istatistikler. */
export function grafOzeti(katman: Katman, g: { dugumler: Dugum[]; kenarlar: Kenar[] }) {
  const derece = new Map<number, number>();
  for (const e of g.kenarlar) {
    derece.set(e.hedef, (derece.get(e.hedef) ?? 0) + e.agirlik);
    if (katman === "etkilesim") derece.set(e.kaynak, (derece.get(e.kaynak) ?? 0) + e.agirlik);
  }
  const ad = new Map(g.dugumler.map((d) => [d.id, d.ad]));
  return [...derece]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, n]) => ({ ad: ad.get(id)!, n }));
}
