// Arayüz biçimlendirme yardımcıları (hem sunucu hem tarayıcı tarafında kullanılabilir).

/** "az önce", "12 dk", "3 sa", "4 g", "12 Eyl" */
export function goreceZaman(iso: string, simdi: Date = new Date()): string {
  const fark = (simdi.getTime() - new Date(iso).getTime()) / 1000;
  if (fark < 60) return "az önce";
  if (fark < 3600) return `${Math.floor(fark / 60)} dk`;
  if (fark < 86400) return `${Math.floor(fark / 3600)} sa`;
  if (fark < 86400 * 30) return `${Math.floor(fark / 86400)} g`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

/** "3 gün sonra", "5 saat sonra" gibi kalan süre */
export function kalanSure(iso: string, simdi: Date = new Date()): string {
  const fark = (new Date(iso).getTime() - simdi.getTime()) / 1000;
  if (fark <= 0) return "süresi doldu";
  if (fark < 3600) return `${Math.max(1, Math.floor(fark / 60))} dk kaldı`;
  if (fark < 86400) return `${Math.floor(fark / 3600)} sa kaldı`;
  return `${Math.floor(fark / 86400)} gün kaldı`;
}

/** Binlik ayraçlı sayı: 12480 → "12.480" */
export function sayi(n: number): string {
  return n.toLocaleString("tr-TR");
}

export function tamTarih(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" });
}

/** Metinden her zaman aynı sayıyı üretir (avatar deseni için). */
export function ozet32(metin: string): number {
  let h = 2166136261;
  for (const c of metin) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

// Roma taşları: nero, porfir, lapis, verde antico, giallo antico, pavonazzetto, rosso antico
const MUREKKEPLER = ["#23262d", "#6e2233", "#27407a", "#2f5d50", "#a8781e", "#5a3a63", "#9a3a2a"];

/** Takma ada göre her zaman aynı avatar mürekkebi */
export function avatarRengi(ad: string): string {
  return MUREKKEPLER[ozet32(ad) % MUREKKEPLER.length];
}

const KATEGORI_RENKLERI: Record<string, string> = {
  "Anayasa ve Hukuk": "#1d4ed8",
  "İfade Özgürlüğü ve Basın": "#b91c1c",
  "Ekonomi ve Çalışma Hayatı": "#b45309",
  "Eğitim": "#7c3aed",
  "Sağlık": "#0d9488",
  "Çevre ve Enerji": "#15803d",
  "Dijital Haklar ve Teknoloji": "#0369a1",
  "Şehirler ve Ulaşım": "#be185d",
  "Güvenlik ve Göç": "#44403c",
  "Aile ve Toplum": "#c2410c",
  "Ortak Akıl Hakkında": "#475569",
};

/** Ana kategori adına göre renk (alt kategoriler üst kategorinin rengini alır) */
export function kategoriRengi(anaKategoriAd: string): string {
  return KATEGORI_RENKLERI[anaKategoriAd] ?? "#64748b";
}
