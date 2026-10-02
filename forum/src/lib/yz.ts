import "server-only";
import { db } from "./db";
import { deftereYaz } from "./defter";
import { suanIso } from "./saat";
import { konuMesajlari, mesajYaz, type Mesaj } from "./tartisma";

/*
 * YZ Analist — forumdaki yapay zeka üyesi ("bazı kullanıcılar yapay zeka olabilir").
 *
 * - Ücretsizdir: varsayılan olarak tamamen kural tabanlı çalışır (dış API yok).
 *     · Özet: çıkarımsal özetleme — cümleler, tartışmada sık geçen kavramlara göre puanlanır, en iyiler seçilir.
 *     · Anahtar kavramlar, katılımcı sayısı, katılma/itiraz işaretleri.
 *     · Uzlaşma taslağı: öne çıkan görüşlerden düzenlenebilir bir taslak.
 * - İsteğe bağlı: bilgisayarda ücretsiz Ollama kuruluysa (.env: OLLAMA_MODEL=llama3.2) özet yerel modelle yazılır;
 *   model yanıt vermezse kural tabanlı özete dönülür.
 * - Danışmandır: oy kullanamaz, aday olamaz, kendisine oy devredilemez.
 */

export const YZ_TAKMA_AD = "yz_bilirkisi";

/** YZ üyesini (yoksa) oluşturur ve id'sini döner. Şifresi geçersiz bir değerdir; kimse onunla giriş yapamaz. */
export function yzKullanicisi(): number {
  const var_ = db.prepare("SELECT id FROM kullanicilar WHERE takma_ad = ?").get(YZ_TAKMA_AD) as { id: number } | undefined;
  if (var_) return var_.id;
  const r = db
    .prepare(
      `INSERT INTO kullanicilar (ad, soyad, takma_ad, adres, dogum_tarihi, sifre_hash, rol, olusturma)
       VALUES ('Yapay Zeka', 'Bilirkişi', ?, '-', '2026-01-01', '!', 'yz', ?)`,
    )
    .run(YZ_TAKMA_AD, suanIso());
  deftereYaz("uye_katildi", { takma_ad: YZ_TAKMA_AD, yapay_zeka: true });
  return Number(r.lastInsertRowid);
}

// ---------------- Kural tabanlı dil işleme ----------------

const DURAK = new Set(
  (
    "ve veya ile için ama fakat ancak ki de da bu şu o bir iki çok daha en gibi kadar göre sonra önce diye ya yani zaten " +
    "hem ise eğer çünkü mi mı mu mü ne neden nasıl var yok olarak olan olur oluyor olmalı olabilir değil her şey bence " +
    "ben sen biz siz onlar bana beni bizim sizin onun benim senin bunu şunu onu bunun burada orada böyle şöyle öyle " +
    "gerçekten aslında sadece bile artık hala hâlâ biraz tüm bütün kendi başka diğer aynı yine şimdi zaman lazım gerek " +
    "evet hayır tabii mesela örneğin olsun oldu olduğu olduğunu yapmak yapıyor yaptık yapın etmek ediyor içinde üzerinde " +
    "katılıyorum katılmıyorum katılmasam katılırım fikrine düşünüyorum sanırım hangi hangisi nasıl neden bazı birkaç"
  ).split(" "),
);
const KATILMA = ["katılıyorum", "haklısın", "aynen", "iyi fikir", "güzel", "doğru", "mantıklı", "katılırım", "destekliyorum"];
const ITIRAZ = ["katılmıyorum", "karşıyım", "yanlış", "abartıyorsunuz", "sanmıyorum", "gerek yok", "saçma", "katılmasam"];

const kucuk = (s: string) => s.toLocaleLowerCase("tr-TR");
const kelimeler = (s: string) =>
  kucuk(s)
    .replace(/@\w+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !DURAK.has(w) && !/^\d+$/.test(w));
// Türkçe sondan eklemeli: kaba bir gövdeleme için ilk 5 harf ("testler", "testleri" → "testl")
const govde = (w: string) => w.slice(0, 5);

function cumleler(metin: string): string[] {
  return metin
    .replace(/@\w+\s*/g, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((c) => c.trim())
    .filter((c) => c.length >= 25 && c.length <= 320);
}

export type YzAnalizi = {
  mesajSayisi: number;
  katilimci: number;
  kavramlar: string[];
  oneCikanlar: { cumle: string; yazan: string }[];
  katilma: number;
  itiraz: number;
  uzlasmaTaslagi: string;
  model: "kural" | "ollama";
};

/** Bir konunun tartışmasını analiz eder. En az 3 mesaj gerekir. */
export function tartismayiAnalizEt(konuId: number): YzAnalizi | null {
  const mesajlar = konuMesajlari(konuId).filter((m) => !m.gizleyen_surec_id && m.yazan_rol !== "yz");
  if (mesajlar.length < 3) return null;

  // Kavram puanı: kaç farklı kişinin kullandığı (tek kişinin tekrarı fikir birliği sayılmaz)
  const kullananlar = new Map<string, Set<string>>();
  const yuzey = new Map<string, Map<string, number>>();
  for (const m of mesajlar)
    for (const w of kelimeler(m.icerik)) {
      const g = govde(w);
      (kullananlar.get(g) ?? kullananlar.set(g, new Set()).get(g)!).add(m.yazan);
      const y = yuzey.get(g) ?? yuzey.set(g, new Map()).get(g)!;
      y.set(w, (y.get(w) ?? 0) + 1);
    }
  const puan = (g: string) => (kullananlar.get(g)?.size ?? 0) - 1; // sadece bir kişinin kullandığı kavram 0 puan

  const kavramlar = [...kullananlar.keys()]
    .filter((g) => puan(g) >= 1)
    .sort((a, b) => puan(b) - puan(a))
    .slice(0, 7)
    .map((g) => [...yuzey.get(g)!].sort((a, b) => b[1] - a[1])[0][0]);

  // Cümle puanı: içerdiği kavramların puanı / √uzunluk; bilirkişi mesajlarına ve yanıt alan mesajlara küçük bonus
  const yanitAlan = new Set(mesajlar.map((m) => m.yanit_id).filter(Boolean));
  const adaylar = mesajlar.flatMap((m: Mesaj) =>
    cumleler(m.icerik).map((c) => {
      const g = new Set(kelimeler(c).map(govde));
      // Çok kısa cümleler az bilgi taşır: uzunluk en az 6 kavram sayılır. Soru cümleleri görüş bildirmez.
      let p = [...g].reduce((t, x) => t + Math.max(0, puan(x)), 0) / Math.sqrt(Math.max(6, g.size));
      if (c.trim().endsWith("?")) p *= 0.6;
      if (m.yazan_rol === "bilirkisi") p *= 1.2;
      if (yanitAlan.has(m.id)) p *= 1.15;
      return { cumle: c, yazan: m.yazan, p, sira: m.id };
    }),
  );
  const secilen: typeof adaylar = [];
  for (const a of [...adaylar].sort((x, y) => y.p - x.p)) {
    if (secilen.length >= 3) break;
    if (secilen.some((s) => s.yazan === a.yazan)) continue; // farklı seslerden seç
    secilen.push(a);
  }
  secilen.sort((a, b) => a.sira - b.sira);

  const say = (liste: string[]) => mesajlar.filter((m) => liste.some((k) => kucuk(m.icerik).includes(k))).length;
  const oneCikanlar = secilen.map(({ cumle, yazan }) => ({ cumle, yazan }));

  return {
    mesajSayisi: mesajlar.length,
    katilimci: new Set(mesajlar.map((m) => m.yazan)).size,
    kavramlar,
    oneCikanlar,
    katilma: say(KATILMA),
    itiraz: say(ITIRAZ),
    uzlasmaTaslagi:
      "Tartışmada şu noktalar öne çıktı: " +
      oneCikanlar.map((o) => o.cumle.replace(/[.!?]+$/, "")).join("; ") +
      ". Bu görüşler doğrultusunda ortak tutum: …",
    model: "kural",
  };
}

// ---------------- İsteğe bağlı yerel model (Ollama) ----------------

async function ollamaOzeti(mesajlar: Mesaj[]): Promise<string | null> {
  const model = process.env.OLLAMA_MODEL;
  if (!model) return null;
  const adres = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const metin = mesajlar.map((m) => `@${m.yazan}: ${m.icerik}`).join("\n").slice(-6000);
  try {
    const r = await fetch(`${adres}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        prompt:
          "Aşağıdaki forum tartışmasını Türkçe, tarafsız ve en fazla 5 madde halinde özetle. " +
          "Farklı görüşleri ayrı ayrı belirt, kimseyi yargılama.\n\n" +
          metin,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { response?: string };
    return j.response?.trim() || null;
  } catch {
    return null; // model yoksa ya da yanıt vermezse kural tabanlı özete dönülür
  }
}

// ---------------- Tartışmaya özet mesajı ----------------

const YENI_MESAJ_ESIGI = 4;

/** Son YZ mesajından sonra yeterince yeni mesaj varsa özeti tartışmaya YZ Analist olarak yazar. */
export async function ozetiPaylas(konuId: number): Promise<{ hata: string } | { id: number }> {
  const tum = konuMesajlari(konuId);
  const sonYz = tum.findLastIndex((m) => m.yazan_rol === "yz");
  const yeni = tum.slice(sonYz + 1).filter((m) => !m.gizleyen_surec_id).length;
  if (sonYz >= 0 && yeni < YENI_MESAJ_ESIGI)
    return { hata: `Son özetten sonra en az ${YENI_MESAJ_ESIGI} yeni mesaj olmalı (şu an ${yeni}).` };

  const analiz = tartismayiAnalizEt(konuId);
  if (!analiz) return { hata: "Özet için tartışmada en az 3 mesaj olmalı." };

  const yerel = await ollamaOzeti(tum.filter((m) => !m.gizleyen_surec_id && m.yazan_rol !== "yz"));
  const govdeMetni = yerel
    ? yerel
    : "Öne çıkan görüşler:\n" +
      analiz.oneCikanlar.map((o) => `• @${o.yazan}: “${o.cumle}”`).join("\n") +
      (analiz.kavramlar.length ? `\n\nOrtak kavramlar: ${analiz.kavramlar.join(", ")}` : "") +
      (analiz.itiraz ? `\nİtiraz içeren mesaj: ${analiz.itiraz} · Katılma bildiren mesaj: ${analiz.katilma}` : "");

  const icerik =
    `🤖 Tartışma özeti (${analiz.mesajSayisi} mesaj, ${analiz.katilimci} katılımcı)\n\n${govdeMetni}\n\n` +
    `Not: Bu özet otomatik oluşturuldu${yerel ? " (yerel dil modeli)" : " (kural tabanlı)"}; hatalı olabilir. ` +
    "YZ Analist danışmandır, oy kullanmaz.";
  return mesajYaz(konuId, yzKullanicisi(), icerik);
}
