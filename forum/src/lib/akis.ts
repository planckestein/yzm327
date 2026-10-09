import "server-only";
import { db } from "./db";
import { kategoriRengi } from "./bicim";
import { ataZinciri, kategoriAgaci } from "./ontoloji";
import type { Konu, KonuDurumu } from "./konular";
import { acikOylama, oyDurumu, gorunenSayim, type Oylama } from "./oylama";
import { ASAMA_ADLARI, SUREC_TURLERI, hedefSureci, type Asama, type Surec, type SurecTuru } from "./surec";
import { surecBasligi } from "./surecOzeti";
import { konuEtkisi, resmiAciklamaVarMi, type TepkiDurumu } from "./etki";

/*
 * Arayüz için hazırlanmış veri: akıştaki konu satırları, açık kararlar, kenar çubuğu.
 * (İş kuralları oylama.ts / tartisma.ts içinde; burası sadece okur ve biçimler.)
 */

export type KategoriEtiketi = { id: number; ad: string; renk: string; ustAd: string | null };

export function kategoriEtiketi(kategoriId: number): KategoriEtiketi {
  const zincir = ataZinciri(kategoriId);
  const kendi = zincir.at(-1)!;
  return { id: kendi.id, ad: kendi.ad, renk: kategoriRengi(zincir[0].ad), ustAd: zincir.length > 1 ? zincir[0].ad : null };
}

export type OyOzeti = { evet: number; hayir: number; secmen: number; gereken: number | null; bitis: string; asama: Asama };

function oyOzeti(o: Oylama | undefined): OyOzeti | null {
  if (!o) return null;
  const s = gorunenSayim(o);
  return { ...s, bitis: o.bitis, asama: o.asama };
}

export type AkisKonusu = Konu & {
  kategori: KategoriEtiketi;
  katilimcilar: string[];
  oylama: OyOzeti | null;
  etki: TepkiDurumu | null;
  resmiYanit: boolean;
};

const KONU_SECIM = `
  SELECT k.*, kat.ad AS kategori_ad, u.takma_ad AS acan_takma_ad,
         (SELECT COUNT(*) FROM konular a WHERE a.ust_konu_id = k.id AND a.durum != 'silindi') AS alt_sayisi,
         (SELECT COUNT(*) FROM mesajlar m WHERE m.konu_id = k.id) AS mesaj_sayisi,
         COALESCE((SELECT MAX(m.olusturma) FROM mesajlar m WHERE m.konu_id = k.id), k.olusturma) AS son_etkinlik
  FROM konular k JOIN kategoriler kat ON kat.id = k.kategori_id JOIN kullanicilar u ON u.id = k.acan_id`;

function zenginlestir(k: Konu): AkisKonusu {
  const katilimcilar = (
    db
      .prepare(
        `SELECT u.takma_ad FROM mesajlar m JOIN kullanicilar u ON u.id = m.yazan_id
         WHERE m.konu_id = ? GROUP BY u.id ORDER BY COUNT(*) DESC, MIN(m.id) LIMIT 5`,
      )
      .all(k.id) as { takma_ad: string }[]
  ).map((r) => r.takma_ad);
  if (!katilimcilar.includes(k.acan_takma_ad)) katilimcilar.unshift(k.acan_takma_ad);
  const surec = k.durum === "oylamada" ? hedefSureci("konu_ac", k.id) : undefined;
  return {
    ...k,
    kategori: kategoriEtiketi(k.kategori_id),
    katilimcilar: katilimcilar.slice(0, 5),
    oylama: surec ? oyOzeti(acikOylama(surec.id)) : null,
    etki: k.durum === "kapandi" ? konuEtkisi(k.id) : null,
    resmiYanit: resmiAciklamaVarMi(k.id),
  };
}

export type AkisFiltresi = "son" | "oylamada" | "uzlasildi" | "tumu";

export function akisKonulari(filtre: AkisFiltresi, kategoriIdleri?: number[], limit = 50): AkisKonusu[] {
  const kosul: string[] = ["k.ust_konu_id IS NULL"];
  const deger: (string | number)[] = [];
  const durumlar: Record<AkisFiltresi, KonuDurumu[]> = {
    son: ["aktif", "oylamada", "kapandi"],
    oylamada: ["oylamada"],
    uzlasildi: ["kapandi"],
    tumu: ["aktif", "oylamada", "kapandi", "reddedildi"],
  };
  kosul.push(`k.durum IN (${durumlar[filtre].map(() => "?").join(",")})`);
  deger.push(...durumlar[filtre]);
  if (kategoriIdleri?.length) {
    kosul.push(`k.kategori_id IN (${kategoriIdleri.map(() => "?").join(",")})`);
    deger.push(...kategoriIdleri);
  }
  const satirlar = db
    .prepare(`${KONU_SECIM} WHERE ${kosul.join(" AND ")} ORDER BY son_etkinlik DESC LIMIT ?`)
    .all(...deger, limit) as Konu[];
  return satirlar.map(zenginlestir);
}

export function altKonuSatirlari(konuId: number): AkisKonusu[] {
  return (db.prepare(`${KONU_SECIM} WHERE k.ust_konu_id = ? AND k.durum != 'silindi' ORDER BY k.id`).all(konuId) as Konu[]).map(
    zenginlestir,
  );
}

export function kullaniciKonuSatirlari(kullaniciId: number): AkisKonusu[] {
  return (
    db.prepare(`${KONU_SECIM} WHERE k.acan_id = ? AND k.durum != 'silindi' ORDER BY k.id DESC`).all(kullaniciId) as Konu[]
  ).map(zenginlestir);
}

// ---------------- Kararlar ----------------

export type KararOzeti = {
  id: number;
  tur: SurecTuru;
  turAd: string;
  baslik: string;
  durum: Surec["durum"];
  asama: Asama;
  asamaAd: string;
  oneren: string;
  olusturma: string;
  kapanis: string | null;
  oylama: OyOzeti | null;
  yoneticiBekliyor: string | null; // yönetici kararı bekleniyorsa bitiş zamanı
  oyBekliyor: boolean; // giriş yapan kullanıcı şu an oy verebilir mi
  bagKonu: number | null;
  hedefId: number | null;
};

function kararOzeti(s: Surec & { oneren: string }, kullaniciId: number | null): KararOzeti {
  const o = s.durum === "suruyor" ? acikOylama(s.id) : undefined;
  let bagKonu: number | null = null;
  if (s.tur === "mesaj_sil")
    bagKonu = (db.prepare("SELECT konu_id FROM mesajlar WHERE id = ?").get(s.hedef_id) as { konu_id: number } | undefined)?.konu_id ?? null;
  else if (s.tur !== "kural_degistir") bagKonu = s.hedef_id;
  return {
    id: s.id,
    tur: s.tur,
    turAd: SUREC_TURLERI[s.tur].ad,
    baslik: surecBasligi(s),
    durum: s.durum,
    asama: s.asama,
    asamaAd: ASAMA_ADLARI[s.asama],
    oneren: s.oneren,
    olusturma: s.olusturma,
    kapanis: s.kapanis,
    oylama: oyOzeti(o),
    yoneticiBekliyor: s.durum === "suruyor" && s.asama === "yonetici" ? s.yonetici_bitis : null,
    oyBekliyor: !!(o && kullaniciId && oyDurumu(o, kullaniciId).tur === "oy_verebilir"),
    bagKonu,
    hedefId: s.hedef_id,
  };
}

const SUREC_SECIM = `SELECT s.*, u.takma_ad AS oneren FROM surecler s JOIN kullanicilar u ON u.id = s.oneren_id`;

export function acikKararlar(kullaniciId: number | null): KararOzeti[] {
  return (db.prepare(`${SUREC_SECIM} WHERE s.durum = 'suruyor' ORDER BY s.id DESC`).all() as (Surec & { oneren: string })[]).map(
    (s) => kararOzeti(s, kullaniciId),
  );
}

export function sonuclananKararlar(limit = 40): KararOzeti[] {
  return (
    db.prepare(`${SUREC_SECIM} WHERE s.durum != 'suruyor' ORDER BY s.kapanis DESC LIMIT ?`).all(limit) as (Surec & {
      oneren: string;
    })[]
  ).map((s) => kararOzeti(s, null));
}

export function turKararlari(tur: SurecTuru, kullaniciId: number | null): KararOzeti[] {
  return (
    db.prepare(`${SUREC_SECIM} WHERE s.tur = ? ORDER BY s.durum = 'suruyor' DESC, s.id DESC`).all(tur) as (Surec & {
      oneren: string;
    })[]
  ).map((s) => kararOzeti(s, kullaniciId));
}

export function konuKararlari(konuId: number, kullaniciId: number | null): KararOzeti[] {
  return (
    db
      .prepare(
        `${SUREC_SECIM} WHERE (s.tur IN ('konu_kapat','konu_sil','konu_duzenle') AND s.hedef_id = ?)
           OR (s.tur = 'mesaj_sil' AND s.hedef_id IN (SELECT id FROM mesajlar WHERE konu_id = ?))
         ORDER BY s.durum = 'suruyor' DESC, s.id DESC`,
      )
      .all(konuId, konuId) as (Surec & { oneren: string })[]
  ).map((s) => kararOzeti(s, kullaniciId));
}

export function kararOzetiGetir(surecId: number, kullaniciId: number | null): KararOzeti | null {
  const s = db.prepare(`${SUREC_SECIM} WHERE s.id = ?`).get(surecId) as (Surec & { oneren: string }) | undefined;
  return s ? kararOzeti(s, kullaniciId) : null;
}

// ---------------- Kenar çubuğu ----------------

export type MenuKategorisi = { id: number; ad: string; renk: string; konu: number; altlar: { id: number; ad: string; konu: number }[] };

export function menuKategorileri(): MenuKategorisi[] {
  const sayilar = new Map(
    (
      db
        .prepare("SELECT kategori_id, COUNT(*) AS n FROM konular WHERE ust_konu_id IS NULL AND durum IN ('aktif','oylamada','kapandi') GROUP BY kategori_id")
        .all() as { kategori_id: number; n: number }[]
    ).map((r) => [r.kategori_id, r.n]),
  );
  return kategoriAgaci().map((k) => {
    const altlar = k.altlar.map((a) => ({ id: a.id, ad: a.ad, konu: sayilar.get(a.id) ?? 0 }));
    return {
      id: k.id,
      ad: k.ad,
      renk: kategoriRengi(k.ad),
      konu: (sayilar.get(k.id) ?? 0) + altlar.reduce((t, a) => t + a.konu, 0),
      altlar,
    };
  });
}

// ---------------- Ana sayfa ----------------

/** Manşet için alıntı: konudaki en son (gizlenmemiş, yapay zeka dışı) söz. */
export function sonSoz(konuId: number): { yazan: string; icerik: string; id: number } | undefined {
  return db
    .prepare(
      `SELECT m.id, m.icerik, u.takma_ad AS yazan FROM mesajlar m JOIN kullanicilar u ON u.id = m.yazan_id
       WHERE m.konu_id = ? AND m.gizleyen_surec_id IS NULL AND u.rol NOT IN ('yz','resmi') AND length(m.icerik) BETWEEN 40 AND 320
       ORDER BY m.id DESC LIMIT 1`,
    )
    .get(konuId) as { yazan: string; icerik: string; id: number } | undefined;
}

/**
 * Tanıtım turunun gezeceği örnekler: en çok konuşulan açık tartışma ve
 * birden çok aşamadan geçen (tercihen süren) bir karar.
 */
export function turHedefleri(): { konuId: number | null; kararId: number | null; profil: string | null } {
  const konu = db
    .prepare(
      `SELECT k.id FROM konular k WHERE k.durum = 'aktif' AND k.ust_konu_id IS NULL
       ORDER BY (SELECT COUNT(*) FROM mesajlar m WHERE m.konu_id = k.id) DESC LIMIT 1`,
    )
    .get() as { id: number } | undefined;
  const karar = db
    .prepare(
      `SELECT id FROM surecler WHERE tur IN ('kural_degistir','mesaj_sil','konu_sil','konu_duzenle')
       ORDER BY durum = 'suruyor' DESC, tur = 'kural_degistir' DESC, id DESC LIMIT 1`,
    )
    .get() as { id: number } | undefined;
  const profil = db
    .prepare(
      `SELECT u.takma_ad FROM kullanicilar u WHERE u.rol NOT IN ('yz','resmi')
       ORDER BY (SELECT COUNT(*) FROM mesajlar m WHERE m.yazan_id = u.id) DESC LIMIT 1`,
    )
    .get() as { takma_ad: string } | undefined;
  return { konuId: konu?.id ?? null, kararId: karar?.id ?? null, profil: profil?.takma_ad ?? null };
}

export function forumIstatistikleri() {
  const say = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    uye: say("SELECT COUNT(*) AS n FROM kullanicilar WHERE rol NOT IN ('yz','resmi')"),
    konu: say("SELECT COUNT(*) AS n FROM konular WHERE durum IN ('aktif','kapandi')"),
    mesaj: say("SELECT COUNT(*) AS n FROM mesajlar"),
    karar: say("SELECT COUNT(*) AS n FROM surecler WHERE durum != 'suruyor'"),
  };
}
