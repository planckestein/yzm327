// Arayüz biçimlendirme yardımcıları (hem sunucu hem tarayıcı tarafında kullanılabilir).
import { bolumMotifi } from "@/components/motif/desenler";

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

/** Metinden her zaman aynı sayıyı üretir (görünen kalabalık sayıları için). */
export function ozet32(metin: string): number {
  let h = 2166136261;
  for (const c of metin) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Ana kategori adına göre renk (alt kategoriler üst kategorinin rengini alır); renkler kilim boyalarıdır. */
export function kategoriRengi(anaKategoriAd: string): string {
  return bolumMotifi(anaKategoriAd).renk;
}
