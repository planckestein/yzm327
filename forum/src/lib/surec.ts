import "server-only";
import { db } from "./db";
import { kurallar, kuralUygula } from "./kurallar";
import { forumYoneticisi, temsilciIdleri } from "./secim";
import { deftereYaz } from "./defter";
import { gunSonra, suanIso } from "./saat";
import type { Oylama } from "./oylama";

/*
 * KARAR SÜRECİ — ABD yasama sürecinin forumdaki karşılığı
 *
 *   Konu önerisi  (ABD: basit karar)   → Topluluk Oylaması
 *   İlke önerisi (ABD: yasa tasarısı) → Topluluk Oylaması → Yayın Kurulu → Genel Yayın Yönetmeni
 *                                          └ veto → Vetoyu aşma: Topluluk Oylaması (2/3) → Yayın Kurulu (2/3)
 *
 * Tasarım desenleri:
 *  - Command : her öneri bir "süreç" nesnesi olarak saklanır; kuyrukta bekler, geçmişi (denetim izi) tutulur.
 *  - State   : her aşama (ASAMALAR) girişte ne yapacağını ve sonuçta nereye geçileceğini kendisi bilir.
 *  - Registry: öneri türleri (SUREC_TURLERI) yolunu ve kabul edilince ne olacağını kendi kaydında taşır;
 *              yeni bir öneri türü eklemek mevcut kodu değiştirmeyi gerektirmez (Açık/Kapalı ilkesi).
 *
 * Oylamaların sayımı oylama.ts'te, oy emaneti devir.ts'tedir.
 */

export type SurecTuru = "konu_ac" | "konu_kapat" | "mesaj_sil" | "konu_sil" | "konu_duzenle" | "kural_degistir";
export type Asama = "uyeler" | "temsilciler" | "yonetici" | "veto_uyeler" | "veto_temsilciler" | "bitti";
type Sonuc = "kabul" | "red";
/** Oylamanın ya da kararın beklendiği aşamalar */
type AktifAsama = Exclude<Asama, "bitti">;

export type Surec = {
  id: number;
  tur: SurecTuru;
  hedef_id: number | null;
  kategori_id: number | null;
  oneren_id: number;
  veri: string;
  asama: Asama;
  durum: "suruyor" | "kabul" | "red";
  olusturma: string;
  kapanis: string | null;
  yonetici_bitis: string | null;
  gecmis: string;
};

const simdi = suanIso;

// ---------------- Öneri türleri (Registry) ----------------

// ABD'deki karşılıkları: basit karar (tek meclis) · ortak karar (iki meclis) · yasa (iki meclis + başkan)
const BASIT: AktifAsama[] = ["uyeler"];
const ORTAK: AktifAsama[] = ["uyeler", "temsilciler"];
const YASA: AktifAsama[] = ["uyeler", "temsilciler", "yonetici"];

type SurecTanimi = {
  ad: string;
  yol: AktifAsama[];
  /** Öneri kabul edilince platformda ne değişir */
  kabulde?: (s: Surec, veri: Record<string, string>) => void;
  /** Öneri reddedilince ne değişir */
  redde?: (s: Surec) => void;
};

export const SUREC_TURLERI: Record<SurecTuru, SurecTanimi> = {
  konu_ac: {
    ad: "Konu önerisi",
    yol: BASIT,
    kabulde: (s) => s.hedef_id && db.prepare("UPDATE konular SET durum = 'aktif' WHERE id = ?").run(s.hedef_id),
    redde: (s) => s.hedef_id && db.prepare("UPDATE konular SET durum = 'reddedildi' WHERE id = ?").run(s.hedef_id),
  },
  konu_kapat: {
    ad: "Uzlaşma önerisi",
    yol: BASIT,
    kabulde: (s) => {
      db.prepare("UPDATE konular SET durum = 'kapandi' WHERE id = ?").run(s.hedef_id);
      // Aynı konuda yarışan diğer uzlaşma önerileri sona erer
      const digerleri = db
        .prepare("SELECT * FROM surecler WHERE tur = 'konu_kapat' AND hedef_id = ? AND durum = 'suruyor' AND id != ?")
        .all(s.hedef_id, s.id) as Surec[];
      for (const d of digerleri) {
        db.prepare("UPDATE oylamalar SET durum = 'red', kapanis = ? WHERE surec_id = ? AND durum = 'acik'").run(simdi(), d.id);
        gecmiseEkle(d.id, `Konu başka bir uzlaşma önerisiyle (#${s.id}) kapandı.`);
        bitir(d, "red");
      }
    },
  },
  mesaj_sil: {
    ad: "Mesaj silme önerisi",
    yol: ORTAK,
    // Mesaj silinmez, gizlenir; metnin hash'i defterde kalır
    kabulde: (s) => db.prepare("UPDATE mesajlar SET gizleyen_surec_id = ? WHERE id = ?").run(s.id, s.hedef_id),
  },
  konu_sil: {
    ad: "Konu silme önerisi",
    yol: ORTAK,
    kabulde: (s) => db.prepare("UPDATE konular SET durum = 'silindi' WHERE id = ?").run(s.hedef_id),
  },
  konu_duzenle: {
    ad: "Konu düzenleme önerisi",
    yol: ORTAK,
    // Eski hâl konu_surumleri'ne saklanır (Memento): düzenleme geçmişi kaybolmaz
    kabulde: (s, v) => {
      const eski = db.prepare("SELECT baslik, aciklama FROM konular WHERE id = ?").get(s.hedef_id) as {
        baslik: string;
        aciklama: string;
      };
      db.prepare("INSERT INTO konu_surumleri (konu_id, baslik, aciklama, bitis, surec_id) VALUES (?, ?, ?, ?, ?)").run(
        s.hedef_id,
        eski.baslik,
        eski.aciklama,
        simdi(),
        s.id,
      );
      db.prepare("UPDATE konular SET baslik = ?, aciklama = ? WHERE id = ?").run(v.baslik, v.aciklama, s.hedef_id);
    },
  },
  kural_degistir: {
    ad: "İlke önerisi",
    yol: YASA,
    kabulde: (_, v) => kuralUygula(v.anahtar, v.deger),
  },
};

export const ASAMA_ADLARI: Record<Asama, string> = {
  uyeler: "Topluluk Oylaması",
  temsilciler: "Yayın Kurulu",
  yonetici: "Genel Yayın Yönetmeni",
  veto_uyeler: "Vetoyu aşma: Topluluk Oylaması",
  veto_temsilciler: "Vetoyu aşma: Yayın Kurulu",
  bitti: "Sonuç",
};

// ---------------- Okuma ----------------

export function surecGetir(id: number): Surec | undefined {
  return db.prepare("SELECT * FROM surecler WHERE id = ?").get(id) as Surec | undefined;
}

export function hedefSureci(tur: SurecTuru, hedefId: number): Surec | undefined {
  return db
    .prepare("SELECT * FROM surecler WHERE tur = ? AND hedef_id = ? ORDER BY id DESC LIMIT 1")
    .get(tur, hedefId) as Surec | undefined;
}

export function turSurecleri(tur: SurecTuru): (Surec & { oneren: string })[] {
  return db
    .prepare(
      `SELECT s.*, u.takma_ad AS oneren FROM surecler s JOIN kullanicilar u ON u.id = s.oneren_id
       WHERE s.tur = ? ORDER BY s.durum = 'suruyor' DESC, s.id DESC`,
    )
    .all(tur) as (Surec & { oneren: string })[];
}

export function surecGecmisi(surec: Surec): { zaman: string; olay: string }[] {
  return JSON.parse(surec.gecmis);
}

/** Bir konuya bağlı süreçler (konu kapatma/silme/düzenleme + konudaki mesajların silme önerileri). */
export function konuSurecleri(konuId: number): (Surec & { oneren: string })[] {
  return db
    .prepare(
      `SELECT s.*, u.takma_ad AS oneren FROM surecler s JOIN kullanicilar u ON u.id = s.oneren_id
       WHERE (s.tur IN ('konu_kapat','konu_sil','konu_duzenle') AND s.hedef_id = ?)
          OR (s.tur = 'mesaj_sil' AND s.hedef_id IN (SELECT id FROM mesajlar WHERE konu_id = ?))
       ORDER BY s.durum = 'suruyor' DESC, s.id DESC`,
    )
    .all(konuId, konuId) as (Surec & { oneren: string })[];
}

export function acikSurecVarMi(tur: SurecTuru, hedefId: number): boolean {
  return !!db.prepare("SELECT 1 FROM surecler WHERE tur = ? AND hedef_id = ? AND durum = 'suruyor'").get(tur, hedefId);
}

/** Uzlaşmayla kapanan konunun kazanan uzlaşma süreci. */
export function konuUzlasmasi(konuId: number): Surec | undefined {
  return db
    .prepare("SELECT * FROM surecler WHERE tur = 'konu_kapat' AND hedef_id = ? AND durum = 'kabul'")
    .get(konuId) as Surec | undefined;
}

/** Süreç kaydına ve dağıtık deftere yazar. */
export function gecmiseEkle(surecId: number, olay: string) {
  const s = surecGetir(surecId)!;
  const g = [...surecGecmisi(s), { zaman: simdi(), olay }];
  db.prepare("UPDATE surecler SET gecmis = ? WHERE id = ?").run(JSON.stringify(g), surecId);
  deftereYaz("surec", { surec_id: surecId, tur: s.tur, olay });
}

// ---------------- Aşamalar (State) ----------------

type AsamaDurumu = {
  /** Süreç bu aşamaya girince */
  gir: (s: Surec) => void;
  /** Bu aşamanın oylaması (ya da yönetici kararı) sonuçlanınca */
  sonuc: (s: Surec, sonuc: Sonuc) => void;
};

function oylamaAc(s: Surec, asama: Asama, esik: Oylama["esik"], kategoriId: number | null) {
  db.prepare(`INSERT INTO oylamalar (surec_id, asama, esik, kategori_id, baslangic, bitis) VALUES (?, ?, ?, ?, ?, ?)`).run(
    s.id,
    asama,
    esik,
    kategoriId,
    simdi(),
    gunSonra(kurallar().oylamaSuresiGun),
  );
  gecmiseEkle(s.id, `${ASAMA_ADLARI[asama]} başladı.`);
}

/** Yayın Kurulu henüz seçilmemişse kurul aşaması kabul sayılıp geçilir. */
function kurulOylamasiAc(s: Surec, asama: Asama, esik: Oylama["esik"]) {
  if (temsilciIdleri().size === 0) {
    gecmiseEkle(s.id, "Yayın Kurulu henüz oluşmadığı için bu aşama atlandı.");
    return asamaSonucu(surecGetir(s.id)!, "kabul");
  }
  oylamaAc(s, asama, esik, null);
}

/** Olağan yol: red sürecin sonudur, kabul türün yolundaki bir sonraki aşamaya geçirir. */
function yoldaIlerle(s: Surec, sonuc: Sonuc) {
  if (sonuc === "red") return bitir(s, "red");
  const yol = SUREC_TURLERI[s.tur].yol;
  const sonraki = yol[yol.indexOf(s.asama as AktifAsama) + 1];
  return sonraki ? asamayaGec(s, sonraki) : bitir(s, "kabul");
}

function vetoAsilamadi(s: Surec) {
  gecmiseEkle(s.id, "Veto aşılamadı; veto geçerli.");
  bitir(s, "red");
}

const ASAMALAR: Record<AktifAsama, AsamaDurumu> = {
  uyeler: {
    gir: (s) => oylamaAc(s, "uyeler", kurallar().cogunlukTuru, s.kategori_id),
    sonuc: yoldaIlerle,
  },
  temsilciler: {
    gir: (s) => kurulOylamasiAc(s, "temsilciler", kurallar().kurulKabulOrani),
    sonuc: yoldaIlerle,
  },
  yonetici: {
    gir: (s) => {
      if (!forumYoneticisi()) {
        gecmiseEkle(s.id, "Genel Yayın Yönetmeni olmadığı için öneri onaya gerek kalmadan kabul edildi.");
        return bitir(surecGetir(s.id)!, "kabul");
      }
      db.prepare("UPDATE surecler SET yonetici_bitis = ? WHERE id = ?").run(gunSonra(kurallar().yoneticiSuresiGun), s.id);
      gecmiseEkle(s.id, "Öneri Genel Yayın Yönetmeni'nin onayına sunuldu.");
    },
    // Onay (ya da süre dolması) yolu tamamlar; red veto demektir ve vetoyu aşma oylamalarını başlatır
    sonuc: (s, sonuc) => (sonuc === "kabul" ? yoldaIlerle(s, "kabul") : asamayaGec(s, "veto_uyeler")),
  },
  veto_uyeler: {
    gir: (s) => oylamaAc(s, "veto_uyeler", kurallar().vetoAsimOrani, s.kategori_id),
    sonuc: (s, sonuc) => (sonuc === "red" ? vetoAsilamadi(s) : asamayaGec(s, "veto_temsilciler")),
  },
  veto_temsilciler: {
    gir: (s) => kurulOylamasiAc(s, "veto_temsilciler", kurallar().vetoAsimOrani),
    sonuc: (s, sonuc) => {
      if (sonuc === "red") return vetoAsilamadi(s);
      gecmiseEkle(s.id, "Veto aşıldı.");
      bitir(s, "kabul");
    },
  },
};

function asamayaGec(surec: Surec, asama: AktifAsama): void {
  db.prepare("UPDATE surecler SET asama = ? WHERE id = ?").run(asama, surec.id);
  ASAMALAR[asama].gir(surec);
}

/** Sürecin bulunduğu aşama sonuçlandı; sonraki adımı aşamanın kendisi belirler. */
export function asamaSonucu(surec: Surec, sonuc: Sonuc): void {
  if (surec.asama !== "bitti") ASAMALAR[surec.asama].sonuc(surec, sonuc);
}

function bitir(surec: Surec, sonuc: Sonuc): void {
  db.prepare("UPDATE surecler SET asama = 'bitti', durum = ?, kapanis = ? WHERE id = ? AND durum = 'suruyor'").run(
    sonuc,
    simdi(),
    surec.id,
  );
  gecmiseEkle(surec.id, sonuc === "kabul" ? "Öneri kabul edildi ✓" : "Öneri reddedildi.");

  const tanim = SUREC_TURLERI[surec.tur];
  if (sonuc === "kabul") tanim.kabulde?.(surec, JSON.parse(surec.veri));
  else tanim.redde?.(surec);
}

// ---------------- Dışarıya açık işlemler ----------------

export function surecBaslat(
  tur: SurecTuru,
  hedefId: number | null,
  kategoriId: number | null,
  onerenId: number,
  veri: object = {},
): number {
  const ilk = SUREC_TURLERI[tur].yol[0];
  const r = db
    .prepare(
      `INSERT INTO surecler (tur, hedef_id, kategori_id, oneren_id, veri, asama, olusturma)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(tur, hedefId, kategoriId, onerenId, JSON.stringify(veri), ilk, simdi());
  const id = Number(r.lastInsertRowid);
  gecmiseEkle(id, `${SUREC_TURLERI[tur].ad} sunuldu.`);
  asamayaGec(surecGetir(id)!, ilk);
  return id;
}

/** Genel Yayın Yönetmeni'nin kararı. */
export function yoneticiKarari(surecId: number, kullaniciId: number, karar: "onay" | "veto", gerekce: string): string | null {
  const s = surecGetir(surecId);
  if (!s || s.durum !== "suruyor" || s.asama !== "yonetici") return "Bu öneri yönetici onayı beklemiyor.";
  if (forumYoneticisi()?.id !== kullaniciId) return "Bu kararı yalnızca Genel Yayın Yönetmeni verebilir.";

  if (karar === "onay") gecmiseEkle(s.id, "Genel Yayın Yönetmeni onayladı.");
  else gecmiseEkle(s.id, `Genel Yayın Yönetmeni veto etti.${gerekce ? ` Gerekçe: “${gerekce}”` : ""}`);
  asamaSonucu(s, karar === "onay" ? "kabul" : "red");
  return null;
}

/** Süresi içinde karar verilmeyen ilke önerileri kendiliğinden kabul edilir. */
export function yoneticiSuresiDolanlariKapat() {
  for (const s of db
    .prepare("SELECT * FROM surecler WHERE durum = 'suruyor' AND asama = 'yonetici' AND yonetici_bitis <= ?")
    .all(simdi()) as Surec[]) {
    gecmiseEkle(s.id, "Yönetici süresi içinde karar vermediği için öneri kendiliğinden kabul edildi.");
    asamaSonucu(s, "kabul");
  }
}
