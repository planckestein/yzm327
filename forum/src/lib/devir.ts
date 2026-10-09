import "server-only";
import { db } from "./db";
import { kurallar } from "./kurallar";
import { ataZinciri } from "./ontoloji";
import { suanIso } from "./saat";

/*
 * Oy emaneti (toplamalı devir). İsteğe bağlıdır ve bölüm bazında verilir; 0 = tüm platform.
 */

/** Bu oylamada geçerli devirler: veren → alan. En yakın (en alt) kategorideki devir önceliklidir. */
function vekilHaritasi(kategoriId: number | null): Map<number, number> {
  const zincir = [0, ...(kategoriId === null ? [] : ataZinciri(kategoriId).map((k) => k.id))];
  const satirlar = db
    .prepare(`SELECT veren_id, kategori_id, alan_id FROM devirler WHERE kategori_id IN (${zincir.map(() => "?").join(",")})`)
    .all(...zincir) as { veren_id: number; kategori_id: number; alan_id: number }[];
  const derinlik = new Map(zincir.map((id, i) => [id, i]));
  const secilen = new Map<number, { alan: number; d: number }>();
  for (const s of satirlar) {
    const d = derinlik.get(s.kategori_id)!;
    const onceki = secilen.get(s.veren_id);
    if (!onceki || d > onceki.d) secilen.set(s.veren_id, { alan: s.alan_id, d });
  }
  return new Map([...secilen].map(([veren, { alan }]) => [veren, alan]));
}

/**
 * Toplamalı devir: A→B→C zincirinde C oy verdiğinde, henüz oy vermemiş B ve A'nın oyları da C'ye gelir.
 * Zincir, zaten oy vermiş birine ulaşınca durur. Toplam ağırlık maksimumOyAgirligi'ni geçemez.
 * Emanet grafiğinde oy verenden geriye doğru genişlik öncelikli arama; ziyaret kümesi döngüleri (A→B→A) keser.
 */
export function temsilEdilecekler(oylamaId: number, kategoriId: number | null, kullaniciId: number, secmen: Set<number>): number[] {
  const oyVerenler = new Set(
    (db.prepare("SELECT kullanici_id FROM oylar WHERE oylama_id = ?").all(oylamaId) as { kullanici_id: number }[]).map(
      (r) => r.kullanici_id,
    ),
  );
  const gelenler = new Map<number, number[]>();
  for (const [veren, alan] of vekilHaritasi(kategoriId)) gelenler.set(alan, [...(gelenler.get(alan) ?? []), veren]);

  const sonuc: number[] = [];
  const ziyaret = new Set([kullaniciId]);
  const kuyruk = [kullaniciId];
  while (kuyruk.length) {
    for (const veren of gelenler.get(kuyruk.shift()!) ?? []) {
      if (ziyaret.has(veren) || oyVerenler.has(veren)) continue;
      ziyaret.add(veren);
      kuyruk.push(veren);
      if (secmen.has(veren)) sonuc.push(veren);
    }
  }
  return sonuc.slice(0, kurallar().maksimumOyAgirligi - 1);
}

// ---------------- Emanet yönetimi ----------------

export type Devir = { kategori_id: number; kategori_ad: string; takma_ad: string };

const DEVIR_SECIM = `SELECT d.kategori_id, COALESCE(k.ad, 'Tüm platform') AS kategori_ad, u.takma_ad FROM devirler d
  LEFT JOIN kategoriler k ON k.id = d.kategori_id`;

export function verdigimDevirler(kullaniciId: number): Devir[] {
  return db
    .prepare(`${DEVIR_SECIM} JOIN kullanicilar u ON u.id = d.alan_id WHERE d.veren_id = ? ORDER BY d.kategori_id`)
    .all(kullaniciId) as Devir[];
}

export function aldigimDevirler(kullaniciId: number): Devir[] {
  return db
    .prepare(`${DEVIR_SECIM} JOIN kullanicilar u ON u.id = d.veren_id WHERE d.alan_id = ? ORDER BY d.kategori_id`)
    .all(kullaniciId) as Devir[];
}

export function devret(verenId: number, alanId: number, kategoriId: number): string | null {
  if (verenId === alanId) return "Oyunu kendine devredemezsin.";
  const alan = db.prepare("SELECT rol FROM kullanicilar WHERE id = ?").get(alanId) as { rol: string } | undefined;
  if (alan?.rol === "yz" || alan?.rol === "resmi") return "Yapay zeka ve kurum hesaplarına oy devredilemez.";
  const veren = db.prepare("SELECT rol FROM kullanicilar WHERE id = ?").get(verenId) as { rol: string } | undefined;
  if (veren?.rol === "resmi" || veren?.rol === "yz") return "Kurum hesaplarının ve yapay zekanın oy hakkı yoktur.";
  // Sınır oy anında uygulanır: taşınamayan oylar sahiplerinde kalır, kendileri kullanabilir.
  db.prepare(
    `INSERT INTO devirler (veren_id, kategori_id, alan_id, zaman) VALUES (?, ?, ?, ?)
     ON CONFLICT (veren_id, kategori_id) DO UPDATE SET alan_id = excluded.alan_id, zaman = excluded.zaman`,
  ).run(verenId, kategoriId, alanId, suanIso());
  return null;
}

export function devirGeriAl(verenId: number, kategoriId: number) {
  db.prepare("DELETE FROM devirler WHERE veren_id = ? AND kategori_id = ?").run(verenId, kategoriId);
}
