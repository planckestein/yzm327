/*
 * DEMO VERİSİ — Kurultay'ı yaklaşık 6 haftadır yayındaymış gibi doldurur (hocanın önizlemesi için).
 *
 * Çalıştırma (sunucu kapalıyken):  npm run demo
 *
 * Mevcut veritabanını SİLER ve baştan kurar. Tüm olaylar uygulamanın kendi fonksiyonlarıyla, gerçek
 * kurallardan geçerek oluşturulur (oylar, Yayın Kurulu, veto, kurum tepkileri, defter kayıtları…);
 * yalnızca saat geriye alınır. Ülke kurgusaldır; gerçek kişi, parti ya da kurum adı kullanılmaz.
 * Tüm demo hesaplarının şifresi (kurum hesapları dahil): demo1234
 */
import fs from "node:fs";
import path from "node:path";
import { db, veritabaniniSifirla } from "../src/lib/db";
import { saatiAyarla } from "../src/lib/saat";
import { kullaniciOlustur } from "../src/lib/kullanicilar";
import { tumKategoriler, takipDegistir, takipEdiyorMu } from "../src/lib/ontoloji";
import { konuOner } from "../src/lib/konular";
import { kurallar } from "../src/lib/kurallar";
import { acikOylama, oyDurumu, oyKullan, suresiDolanlariKapat, type Secim } from "../src/lib/oylama";
import { hedefSureci, surecBaslat, surecGetir, yoneticiKarari } from "../src/lib/surec";
import { devret } from "../src/lib/devir";
import { adayOl, destekDegistir } from "../src/lib/secim";
import { konuDuzenlemeOner, konuSilmeOner, mesajSilmeOner, mesajYaz, serhYaz, uzlasmaOner } from "../src/lib/tartisma";
import { tepkiBildir } from "../src/lib/etki";
import { defterDogrula } from "../src/lib/defter";
import { ozetiPaylas, yzKullanicisi } from "../src/lib/yz";
import { DEMO_TAKMA_ADLARI } from "../src/lib/demoHesaplari";
import { deftereYaz } from "../src/lib/defter";
import { EK_KONULAR, type EkKonu } from "./demoEkKonular";

// ---------------- Saat ----------------
const bugun = new Date();
bugun.setHours(0, 0, 0, 0);
const T0 = bugun.getTime() - 42 * 86400_000; // 6 hafta önce
let an = T0;
let tohum = 7;
const rastgele = (min: number, max: number) => {
  tohum = (tohum * 1103515245 + 12345) % 2147483648;
  return min + (tohum % (max - min + 1));
};
function zamanAyarla(g: number, saat: number) {
  an = Math.max(an, T0 + g * 86400_000 + saat * 3600_000 + rastgele(0, 40) * 60_000);
  saatiAyarla(new Date(an));
  suresiDolanlariKapat(); // sanki biri siteyi ziyaret etmiş gibi
}

// Zamanlanmış olaylar (ek konular, mesajları, uzlaşmaları): ana senaryo ilerledikçe sırası gelenler işlenir
type Olay = { gun: number; saat: number; sira: number; isle: () => void };
const bekleyen: Olay[] = [];
let olaySira = 0;
function planla(g: number, saat: number, isle: () => void) {
  bekleyen.push({ gun: g, saat, sira: olaySira++, isle });
  bekleyen.sort((a, b) => a.gun * 24 + a.saat - (b.gun * 24 + b.saat) || a.sira - b.sira);
}
function olaylariIsle(g: number, saat: number) {
  while (bekleyen.length && bekleyen[0].gun * 24 + bekleyen[0].saat <= g * 24 + saat) {
    const o = bekleyen.shift()!;
    zamanAyarla(o.gun, o.saat);
    o.isle();
  }
}

function gun(g: number, saat = 9) {
  olaylariIsle(g, saat);
  zamanAyarla(g, saat);
}
function ilerle(dkMin = 5, dkMax = 90) {
  an += rastgele(dkMin, dkMax) * 60_000;
  saatiAyarla(new Date(an));
}

// ---------------- Yardımcılar ----------------
const id: Record<string, number> = {};
const kat = (ad: string) => {
  const k = tumKategoriler().find((x) => x.ad === ad);
  if (!k) throw new Error(`Bölüm yok: ${ad}`);
  return k.id;
};
const hatalar: string[] = [];

function takip(kim: string, ...kategoriler: string[]) {
  for (const k of kategoriler) if (!takipEdiyorMu(id[kim], kat(k))) takipDegistir(id[kim], kat(k));
}

/** Açık oylamada sırayla oy kullanır. Henüz katılmamış olanlar, oy hakkı olmayanlar ve adına zaten oy kullanılmış olanlar atlanır. */
function oyla(surecId: number, oylar: [string, Secim][]) {
  const oylama = acikOylama(surecId);
  if (!oylama) return hatalar.push(`#${surecId}: açık oylama yok`);
  for (const [kim, secim] of oylar) {
    if (id[kim] === undefined || oyDurumu(oylama, id[kim]).tur !== "oy_verebilir") continue;
    ilerle(3, 60);
    if (oyKullan(oylama.id, id[kim], secim)) break; // oylama kapandı
  }
}

// Oy hakkı olan herkes (vatandaşlar + uzmanlar; kurum hesapları ve YZ oy kullanamaz)
const HERKES = [
  "zeynep_k", "mert_yilmaz", "elif_demir", "can_ozturk", "ayse_aydin", "burak_sahin", "deniz_arslan", "selin_kurt",
  "emre_celik", "ipek_yildiz", "kaan_dogan", "hakan_ay", "gizem_tas", "prof_leyla", "dr_murat", "doc_nese", "onur_polat", "yavuz_er",
  "oguz_karaca", "fatma_yalcin", "serdar_gunay", "levent_aksoy", "nur_ozcan",
];

/** Herkes (oy hakkı olan) "evet" der; `hayir` listesindekiler önce "hayır" der. Sonuç kesinleşince durur. */
function herkesEvet(surecId: number, hayir: string[] = [], haric: string[] = []) {
  oyla(surecId, [
    ...hayir.map((k) => [k, "hayir"] as [string, Secim]),
    ...HERKES.filter((k) => !hayir.includes(k) && !haric.includes(k)).map((k) => [k, "evet"] as [string, Secim]),
  ]);
}

function beklenen(surecId: number, durum: string, asama?: string) {
  const s = surecGetir(surecId)!;
  if (s.durum !== durum || (asama && s.asama !== asama))
    hatalar.push(`#${surecId} (${s.tur}): beklenen ${durum}/${asama ?? "-"}, olan ${s.durum}/${s.asama}`);
}

async function uye(takma_ad: string, ad: string, soyad: string, adres: string, dogum: string, rol = "uye") {
  ilerle(10, 120);
  const r = await kullaniciOlustur({ ad, soyad, takma_ad, adres, dogum_tarihi: dogum, sifre: "demo1234", rol });
  if ("hata" in r) throw new Error(`${takma_ad}: ${r.hata}`);
  id[takma_ad] = r.id;
}

/** Kurum hesabı: ad + soyad alanlarında kurumun adı tutulur (ör. "Eğitim" + "Bakanlığı"). */
async function kurum(takma_ad: string, ad: string, soyad: string) {
  await uye(takma_ad, ad, soyad, "Kurumsal hesap", "1990-01-01", "resmi");
}

function konu(kim: string, kategori: string, baslik: string, aciklama: string, ustKonuId: number | null = null) {
  ilerle();
  const r = konuOner({ kategoriId: kat(kategori), ustKonuId, baslik, aciklama, onerenId: id[kim] });
  if ("hata" in r) throw new Error(`${baslik}: ${r.hata}`);
  return { konuId: r.id, surecId: hedefSureci("konu_ac", r.id)!.id };
}

const mesajIdleri: Record<string, number> = {};
/** Mesaj yazar; `etiket` verilirse sonra yanıt/silme için kullanılabilir. */
function mesaj(konuId: number, kim: string, icerik: string, yanit?: string, etiket?: string) {
  ilerle(15, 240);
  const r = mesajYaz(konuId, id[kim], icerik, yanit ? mesajIdleri[yanit] : null);
  if ("hata" in r) throw new Error(`mesaj (${kim}): ${r.hata}`);
  if (etiket) mesajIdleri[etiket] = r.id;
}

function sonuc<T extends { hata: string } | { id: number }>(r: T): number {
  if ("hata" in r) throw new Error(r.hata);
  return r.id;
}

async function yzOzet(konuId: number) {
  ilerle(30, 120);
  const r = await ozetiPaylas(konuId);
  if ("hata" in r) hatalar.push(`YZ özeti (konu ${konuId}): ${r.hata}`);
}

function kuralOner(kim: string, anahtar: string, deger: unknown, gerekce: string) {
  ilerle();
  const eski = (kurallar() as Record<string, unknown>)[anahtar];
  return surecBaslat("kural_degistir", null, null, id[kim], { anahtar, eski, deger, gerekce });
}

function tepki(kurumAd: string, konuId: number, durum: string, aciklama: string) {
  ilerle(60, 300);
  sonuc(tepkiBildir(konuId, id[kurumAd], durum, aciklama));
}

/** Ek konuyu önerir, oylatır; mesajlarını, uzlaşmasını ve kurum tepkisini ilerideki günlere planlar. */
function ekKonuBaslat(e: EkKonu) {
  const k = konu(e.kim, e.bolum, e.baslik, e.aciklama);
  if (e.sonuc === "oylamada") {
    oyla(k.surecId, [[e.kim, "evet"]]);
    return beklenen(k.surecId, "suruyor");
  }
  if (e.sonuc === "red") {
    oyla(k.surecId, [[e.kim, "evet"], ...HERKES.filter((x) => x !== e.kim).map((x) => [x, "hayir"] as [string, Secim])]);
    return beklenen(k.surecId, "red");
  }
  herkesEvet(k.surecId);
  beklenen(k.surecId, "kabul");

  const mesajlar = e.mesajlar ?? [];
  mesajlar.forEach(([kim, metin, yanit], i) =>
    planla(e.gun + Math.floor(i / 2), e.saat + 1 + (i % 2) * 4, () =>
      mesaj(k.konuId, kim, metin, yanit !== undefined ? `ek${k.konuId}_${yanit}` : undefined, `ek${k.konuId}_${i}`),
    ),
  );
  // Gizleme önerisi: tartışma bittikten sonra açılır ve oylamada reddedilir (sansür yok)
  if (e.gizleme) {
    const g = e.gizleme;
    const gizlemeGunu = e.gun + Math.ceil(mesajlar.length / 2) + 1;
    planla(gizlemeGunu, 10, () => {
      const s = sonuc(mesajSilmeOner(mesajIdleri[`ek${k.konuId}_${g.mesaj}`], id[g.kim], g.gerekce));
      oyla(s, g.oylar);
      beklenen(s, "red");
    });
    g.ardindan?.forEach(([kim, metin], i) => planla(gizlemeGunu, 14 + i * 3, () => mesaj(k.konuId, kim, metin)));
  }
  if (e.sonuc === "kapandi" && e.uzlasma) {
    const uzlasmaGunu = e.gun + Math.ceil(mesajlar.length / 2) + 2;
    const [uKim, uMetin] = e.uzlasma;
    planla(uzlasmaGunu, 11, () => {
      const u = sonuc(uzlasmaOner(k.konuId, id[uKim], uMetin));
      herkesEvet(u, e.uzlasmaHayir ?? []);
      beklenen(u, "kabul");
    });
    e.serhler?.forEach(([kim, metin], i) =>
      planla(uzlasmaGunu + 1, 10 + i * 2, () => sonuc(serhYaz(k.konuId, id[kim], metin))),
    );
    if (e.tepki) {
      const [kurumAd, durum, aciklama] = e.tepki;
      planla(uzlasmaGunu + 1, 15, () => tepki(kurumAd, k.konuId, durum, aciklama));
    }
  }
}

// ---------------- Kendi hesaplarını koruma ----------------
type KorunanHesap = {
  ad: string;
  soyad: string;
  takma_ad: string;
  adres: string;
  dogum_tarihi: string;
  sifre_hash: string;
  olusturma: string;
  oturumlar: { token: string; bitis: string }[];
  takipler: string[]; // bölüm adları
};

/** Demo listesinde olmayan hesapları okur (veritabanı henüz yoksa boş döner). */
function kendiHesaplariniAl(): KorunanHesap[] {
  try {
    const yer = DEMO_TAKMA_ADLARI.map(() => "?").join(",");
    const hesaplar = db
      .prepare(
        `SELECT id, ad, soyad, takma_ad, adres, dogum_tarihi, sifre_hash, olusturma FROM kullanicilar
         WHERE rol = 'uye' AND takma_ad NOT IN (${yer})`,
      )
      .all(...DEMO_TAKMA_ADLARI) as (Omit<KorunanHesap, "oturumlar" | "takipler"> & { id: number })[];
    return hesaplar.map(({ id: kid, ...h }) => ({
      ...h,
      oturumlar: db.prepare("SELECT token, bitis FROM oturumlar WHERE kullanici_id = ?").all(kid) as { token: string; bitis: string }[],
      takipler: (
        db
          .prepare("SELECT k.ad FROM takipler t JOIN kategoriler k ON k.id = t.kategori_id WHERE t.kullanici_id = ?")
          .all(kid) as { ad: string }[]
      ).map((r) => r.ad),
    }));
  } catch {
    return [];
  }
}

function kendiHesaplariniGeriYukle(hesaplar: KorunanHesap[]) {
  for (const h of hesaplar) {
    const r = db
      .prepare(
        `INSERT INTO kullanicilar (ad, soyad, takma_ad, adres, dogum_tarihi, sifre_hash, rol, olusturma)
         VALUES (?, ?, ?, ?, ?, ?, 'uye', ?)`,
      )
      .run(h.ad, h.soyad, h.takma_ad, h.adres, h.dogum_tarihi, h.sifre_hash, h.olusturma);
    const yeniId = Number(r.lastInsertRowid);
    for (const o of h.oturumlar)
      db.prepare("INSERT INTO oturumlar (token, kullanici_id, bitis) VALUES (?, ?, ?)").run(o.token, yeniId, o.bitis);
    for (const b of h.takipler) {
      const k = tumKategoriler().find((x) => x.ad === b);
      if (k) db.prepare("INSERT OR IGNORE INTO takipler (kullanici_id, kategori_id) VALUES (?, ?)").run(yeniId, k.id);
    }
    deftereYaz("uye_katildi", { takma_ad: h.takma_ad });
  }
}

// ================= SENARYO =================
async function main() {
  // Kendi açtığın hesapları (demo listesinde olmayanlar) oturumları ve takipleriyle birlikte sakla
  fs.mkdirSync(path.join(process.cwd(), "veri"), { recursive: true });
  // Betik yarıda kalırsa hesaplar kaybolmasın diye sıfırlamadan önce dosyaya da yazılır; bir sonraki çalıştırma oradan da okur
  const yedekDosya = path.join(process.cwd(), "veri", "korunan-hesaplar.json");
  const korunan = kendiHesaplariniAl();
  if (fs.existsSync(yedekDosya))
    for (const h of JSON.parse(fs.readFileSync(yedekDosya, "utf8")) as KorunanHesap[])
      if (!korunan.some((k) => k.takma_ad === h.takma_ad)) korunan.push(h);
  fs.writeFileSync(yedekDosya, JSON.stringify(korunan));

  // Veritabanını sıfırla (dosyayı silmek yerine tabloları temizler; sunucu açıkken de çalışır)
  veritabaniniSifirla();
  EK_KONULAR.forEach((e) => planla(e.gun, e.saat, () => ekKonuBaslat(e)));

  // ---- 1. hafta: platform yayına giriyor ----
  gun(0, 10);
  await uye("zeynep_k", "Zeynep", "Kaya", "Kadıköy, İstanbul", "1991-04-12"); // gazeteci
  await uye("selin_kurt", "Selin", "Kurt", "Selçuklu, Konya", "1989-03-22"); // avukat
  await uye("prof_leyla", "Leyla", "Tan", "Çankaya, Ankara", "1968-02-14", "bilirkisi"); // anayasa hukukçusu
  await uye("elif_demir", "Elif", "Demir", "Bornova, İzmir", "1986-01-27"); // öğretmen
  await uye("mert_yilmaz", "Mert", "Yılmaz", "Keçiören, Ankara", "1993-11-03"); // inşaat mühendisi
  await uye("hakan_ay", "Hakan", "Ay", "Gebze, Kocaeli", "1984-06-09"); // fabrika işçisi
  ilerle();
  yzKullanicisi(); // YZ Analist platforma katılır
  gun(1, 9);
  await uye("can_ozturk", "Can", "Öztürk", "Nilüfer, Bursa", "2003-07-19"); // üniversite öğrencisi
  await uye("ayse_aydin", "Ayşe", "Aydın", "Konak, İzmir", "1990-09-08"); // hemşire
  await uye("burak_sahin", "Burak", "Şahin", "Tepebaşı, Eskişehir", "1979-05-30"); // esnaf
  await uye("deniz_arslan", "Deniz", "Arslan", "Muratpaşa, Antalya", "1995-12-01"); // yazılımcı
  await uye("emre_celik", "Emre", "Çelik", "Seyhan, Adana", "1982-08-15"); // çiftçi
  await uye("ipek_yildiz", "İpek", "Yıldız", "Odunpazarı, Eskişehir", "1958-06-06"); // emekli öğretmen
  await uye("dr_murat", "Murat", "Ergin", "Beşiktaş, İstanbul", "1975-10-10", "bilirkisi"); // ekonomist
  await uye("doc_nese", "Neşe", "Akın", "Atakum, Samsun", "1980-09-17", "bilirkisi"); // iklim bilimci

  takip("zeynep_k", "İfade Özgürlüğü ve Basın", "Anayasa ve Hukuk", "Kurultay Hakkında", "Eğitim");
  takip("selin_kurt", "Anayasa ve Hukuk", "İfade Özgürlüğü ve Basın", "Kurultay Hakkında", "Dijital Haklar ve Teknoloji");
  takip("prof_leyla", "Anayasa ve Hukuk", "İfade Özgürlüğü ve Basın");
  takip("elif_demir", "Eğitim", "İfade Özgürlüğü ve Basın", "Sağlık");
  takip("mert_yilmaz", "Ekonomi ve Çalışma Hayatı", "Dijital Haklar ve Teknoloji", "Şehirler ve Ulaşım", "Kurultay Hakkında");
  takip("hakan_ay", "Ekonomi ve Çalışma Hayatı", "Şehirler ve Ulaşım");
  takip("can_ozturk", "Çevre ve Enerji", "Eğitim", "Şehirler ve Ulaşım", "İfade Özgürlüğü ve Basın");
  takip("ayse_aydin", "Sağlık", "Ekonomi ve Çalışma Hayatı");
  takip("burak_sahin", "Ekonomi ve Çalışma Hayatı", "Şehirler ve Ulaşım");
  takip("deniz_arslan", "Dijital Haklar ve Teknoloji", "İfade Özgürlüğü ve Basın", "Şehirler ve Ulaşım");
  takip("emre_celik", "Çevre ve Enerji", "Ekonomi ve Çalışma Hayatı", "Eğitim");
  takip("ipek_yildiz", "Eğitim", "Sağlık", "İfade Özgürlüğü ve Basın");
  takip("dr_murat", "Ekonomi ve Çalışma Hayatı");
  takip("doc_nese", "Çevre ve Enerji");

  // İlk gündem: sınav sistemi (manşet olacak)
  gun(1, 14);
  const A = konu(
    "elif_demir",
    "Sınav Sistemi",
    "Merkezi sınavlar kaldırılsın, yerine okul içi değerlendirme mi gelsin?",
    "Her yıl yüz binlerce çocuk tek bir sınav günü için yıllarca dershaneye gidiyor. Ailelerin bütçesi, çocukların ruh sağlığı ve fırsat eşitliği bu sistemle zarar görüyor. Merkezi sınavlar kaldırılıp yerine okul içi, süreç odaklı bir değerlendirme gelebilir mi? Artıları, eksileri ve geçiş planı ne olmalı?",
  );
  herkesEvet(A.surecId);
  beklenen(A.surecId, "kabul");

  // Seçimler: Genel Yayın Yönetmeni ve Yayın Kurulu
  gun(2, 11);
  adayOl(id.zeynep_k, "yonetici", 0);
  adayOl(id.mert_yilmaz, "yonetici", 0);
  adayOl(id.selin_kurt, "temsilci", kat("Anayasa ve Hukuk"));
  adayOl(id.prof_leyla, "temsilci", kat("Anayasa ve Hukuk"));
  adayOl(id.can_ozturk, "temsilci", kat("İfade Özgürlüğü ve Basın"));
  adayOl(id.ipek_yildiz, "temsilci", kat("İfade Özgürlüğü ve Basın"));
  adayOl(id.hakan_ay, "temsilci", kat("Ekonomi ve Çalışma Hayatı"));
  adayOl(id.dr_murat, "temsilci", kat("Ekonomi ve Çalışma Hayatı"));
  adayOl(id.burak_sahin, "temsilci", kat("Ekonomi ve Çalışma Hayatı"));
  adayOl(id.elif_demir, "temsilci", kat("Eğitim"));
  adayOl(id.ayse_aydin, "temsilci", kat("Sağlık"));
  adayOl(id.doc_nese, "temsilci", kat("Çevre ve Enerji"));
  adayOl(id.emre_celik, "temsilci", kat("Çevre ve Enerji"));
  adayOl(id.deniz_arslan, "temsilci", kat("Dijital Haklar ve Teknoloji"));
  const destek = (kim: string, ...adaylar: string[]) =>
    adaylar.forEach((a) => {
      ilerle(5, 45);
      const h = destekDegistir(id[kim], id[a]);
      if (h) hatalar.push(`destek ${kim}→${a}: ${h}`);
    });
  destek("selin_kurt", "zeynep_k", "prof_leyla", "can_ozturk", "deniz_arslan");
  destek("prof_leyla", "zeynep_k", "selin_kurt", "can_ozturk");
  destek("zeynep_k", "selin_kurt", "prof_leyla", "can_ozturk", "ipek_yildiz", "elif_demir");
  destek("elif_demir", "zeynep_k", "can_ozturk", "ipek_yildiz", "ayse_aydin");
  destek("mert_yilmaz", "hakan_ay", "dr_murat", "deniz_arslan");
  destek("hakan_ay", "zeynep_k", "burak_sahin");
  gun(3, 10);
  destek("can_ozturk", "zeynep_k", "doc_nese", "emre_celik", "elif_demir");
  destek("ayse_aydin", "zeynep_k", "hakan_ay", "dr_murat");
  destek("burak_sahin", "mert_yilmaz", "dr_murat");
  destek("deniz_arslan", "zeynep_k", "can_ozturk");
  destek("emre_celik", "mert_yilmaz", "hakan_ay", "dr_murat", "doc_nese");
  destek("ipek_yildiz", "zeynep_k", "can_ozturk", "elif_demir", "ayse_aydin");
  destek("dr_murat", "zeynep_k");
  destek("doc_nese", "zeynep_k", "emre_celik");

  // Kurumlar platforma katılıyor: "burayı okumak zorundayız"
  gun(3, 15);
  await kurum("egitim_bakanligi", "Eğitim", "Bakanlığı");
  mesaj(A.konuId, "elif_demir", "Ben ortaokulda öğretmenim. Sekizinci sınıfta müfredat fiilen askıya alınıyor; ders yerine test tekniği öğretiyoruz. Çocuklar öğrenmiyor, eleniyor.", undefined, "a1");
  mesaj(A.konuId, "burak_sahin", "Ben iki çocuk okutuyorum, dershaneye ayda maaşımın üçte birini veriyorum. Ama sınav kalkarsa torpil başlamaz mı? Okul içi not dediğiniz şey kimin elinde olacak?", "a1", "a2");
  mesaj(A.konuId, "ipek_yildiz", "Otuz beş yıl öğretmenlik yaptım. Okul içi değerlendirme ancak öğretmene güvenilen, denetimi şeffaf bir sistemde işler. Aksi hâlde Burak Bey’in endişesi çok haklı.", "a2");
  mesaj(A.konuId, "can_ozturk", "Sınavı ben geçtim ama arkadaşlarımın yarısı dershaneye gidemediği için geride kaldı. Bu sistem zaten eşit değil; eşitmiş gibi görünüyor.");

  gun(4, 10);
  await kurum("calisma_bakanligi", "Çalışma ve Sosyal Güvenlik", "Bakanlığı");
  await uye("kaan_dogan", "Kaan", "Doğan", "Ortahisar, Trabzon", "2004-10-10"); // öğrenci
  await uye("gizem_tas", "Gizem", "Taş", "Karşıyaka, İzmir", "1988-05-05"); // veli
  takip("kaan_dogan", "Şehirler ve Ulaşım", "Eğitim", "Dijital Haklar ve Teknoloji", "Kurultay Hakkında");
  takip("gizem_tas", "Eğitim", "Sağlık");
  await uye("onur_polat", "Onur", "Polat", "Şahinbey, Gaziantep", "1992-02-02");
  takip("onur_polat", "İfade Özgürlüğü ve Basın", "Ekonomi ve Çalışma Hayatı");
  destek("kaan_dogan", "zeynep_k", "deniz_arslan", "elif_demir");
  destek("gizem_tas", "zeynep_k", "elif_demir", "ayse_aydin");
  adayOl(id.kaan_dogan, "temsilci", kat("Şehirler ve Ulaşım"));
  destek("mert_yilmaz", "kaan_dogan");
  destek("deniz_arslan", "kaan_dogan");
  destek("hakan_ay", "kaan_dogan");

  // Asgari ücret
  const B = konu(
    "hakan_ay",
    "Ücretler ve İstihdam",
    "Asgari ücret yılda iki kez, gerçekleşen enflasyona göre güncellensin",
    "Yılda bir kez yapılan zam, altı ay içinde enflasyona yeniliyor. Asgari ücretin temmuz ayında da gerçekleşen enflasyon oranında otomatik güncellenmesini öneriyorum. Pazarlık masasında işçinin elini güçlendirmek değil, en azından alım gücünü korumak istiyoruz.",
  );
  herkesEvet(B.surecId);
  beklenen(B.surecId, "kabul");
  mesaj(B.konuId, "hakan_ay", "Fabrikada on iki yıldır çalışıyorum. Ocakta zam alıyoruz, haziranda aynı parayla yarım market arabası doldurabiliyoruz. Otomatik güncelleme istemek lüks değil.", undefined, "b1");
  mesaj(B.konuId, "burak_sahin", "Ben küçük bir kırtasiye işletiyorum, iki çalışanım var. Yılda iki zam bizi batırır. Büyük şirketle bakkalı aynı kefeye koyamazsınız.", "b1", "b2");
  mesaj(B.konuId, "dr_murat", "Veriler, yılda iki kez ara güncelleme yapan ülkelerde istihdam kaybının sınırlı kaldığını gösteriyor; ama bir koşulla: küçük işletmelere geçici sigorta primi desteği. Tartışmayı 'ya işçi ya esnaf' diye değil, bu destekle birlikte kurmalıyız.", "b2", "b3");

  // İfade özgürlüğü: erişim engelleri
  gun(5, 11);
  await kurum("dijital_komisyon", "Meclis Dijital Haklar", "Komisyonu");
  const C = konu(
    "selin_kurt",
    "İfade Özgürlüğü ve Basın",
    "Erişim engeli kararları hâkim onayı olmadan verilemesin",
    "Bugün haber sitelerine ve sosyal medya içeriklerine idari kararla, saatler içinde erişim engeli getirilebiliyor. Kararın gerekçesi çoğu zaman yayımlanmıyor bile. Her erişim engelinin 24 saat içinde bağımsız bir hâkimin onayına sunulmasını ve gerekçenin kamuya açılmasını öneriyorum.",
  );
  herkesEvet(C.surecId);
  beklenen(C.surecId, "kabul");
  mesaj(C.konuId, "selin_kurt", "Avukat olarak son bir yılda müvekkillerimin yirmiden fazla haberine erişim engeli geldi. Hiçbirinde gerekçeyi göremedik. İtiraz etmek için bile neye itiraz ettiğimizi bilmiyoruz.", undefined, "c1");
  mesaj(C.konuId, "prof_leyla", "Anayasal açıdan mesele açık: ifade özgürlüğüne her müdahale bir yargı güvencesine bağlanmalıdır. İdari tedbir ancak geçici olabilir ve derhâl hâkim denetimine girmelidir. Gerekçenin yayımlanması da ölçülülük denetiminin ön şartıdır.", "c1", "c2");
  mesaj(C.konuId, "zeynep_k", "Gazeteci olarak ekleyeyim: engellenen haberlerin çoğu yolsuzluk ve ihale haberleri. Bu bir güvenlik meselesi değil, hesap sorma meselesi.");
  mesaj(C.konuId, "onur_polat", "Bu komisyon zaten beceriksiz, kimseyi dinlemez. Burada yazdıklarımızı okuyan bile yok, boşuna uğraşıyorsunuz.", undefined, "c4");

  gun(6, 10);
  mesaj(C.konuId, "dijital_komisyon", "Komisyonumuz bu tartışmayı takip ediyor. Erişim engeli kararlarının yargı denetimine bağlanmasına ilişkin önerileri bir sonraki çalışma dönemimizin gündemine almayı değerlendiriyoruz. Burada varılacak uzlaşma metnini resmî olarak inceleyeceğiz.", "c4", "c5");
  mesaj(C.konuId, "deniz_arslan", "@onur_polat görüyorsun ki okuyorlar :) Şimdi mesele yanıtın sözde kalıp kalmayacağı.", "c5");

  // Farklı siyasi görüşlerden üyeler katılıyor (sağ, piyasa yanlısı, merkez)
  gun(6, 15);
  await uye("oguz_karaca", "Oğuz", "Karaca", "Yahşihan, Kırıkkale", "1966-03-18"); // emekli astsubay, milliyetçi-muhafazakâr
  await uye("serdar_gunay", "Serdar", "Günay", "Ataşehir, İstanbul", "1985-07-04"); // girişimci, serbest piyasa yanlısı
  await uye("levent_aksoy", "Levent", "Aksoy", "Osmangazi, Bursa", "1962-12-09"); // emekli banka müdürü, merkezde
  takip("oguz_karaca", "Güvenlik ve Göç", "Anayasa ve Hukuk", "Eğitim", "Aile ve Toplum", "Şehirler ve Ulaşım", "Kurultay Hakkında");
  takip("serdar_gunay", "Ekonomi ve Çalışma Hayatı", "Dijital Haklar ve Teknoloji", "Çevre ve Enerji", "Güvenlik ve Göç");
  takip("levent_aksoy", "Ekonomi ve Çalışma Hayatı", "Anayasa ve Hukuk", "Güvenlik ve Göç", "Aile ve Toplum", "Dijital Haklar ve Teknoloji", "Kurultay Hakkında");
  // Yeni bölümleri eski üyelerin bir kısmı da takip ediyor
  takip("selin_kurt", "Güvenlik ve Göç");
  takip("deniz_arslan", "Güvenlik ve Göç");
  takip("hakan_ay", "Güvenlik ve Göç");
  takip("mert_yilmaz", "Güvenlik ve Göç");
  takip("prof_leyla", "Güvenlik ve Göç");
  takip("zeynep_k", "Güvenlik ve Göç");
  takip("gizem_tas", "Aile ve Toplum");
  takip("ipek_yildiz", "Aile ve Toplum");
  takip("ayse_aydin", "Aile ve Toplum");
  takip("elif_demir", "Aile ve Toplum");
  takip("emre_celik", "Aile ve Toplum");
  destek("oguz_karaca", "mert_yilmaz");
  destek("serdar_gunay", "mert_yilmaz");
  destek("levent_aksoy", "zeynep_k");

  // Çevre
  gun(7, 10);
  await kurum("cevre_bakanligi", "Çevre ve İklim", "Bakanlığı");
  const D = konu(
    "can_ozturk",
    "Çevre ve Enerji",
    "Kömür santralleri 2035’e kadar kapatılsın, bölgeye adil geçiş fonu kurulsun",
    "Kömür santralleri hem iklim hem halk sağlığı için en pahalı enerji kaynağı. 2035’e kadar kademeli olarak kapatılmalarını, santral bölgelerindeki işçiler için yeniden eğitim ve gelir desteği sağlayan bir adil geçiş fonu kurulmasını öneriyorum.",
  );
  herkesEvet(D.surecId);
  beklenen(D.surecId, "kabul");
  mesaj(D.konuId, "doc_nese", "Santrallerin çevresindeki ilçelerde solunum yolu hastalıkları ülke ortalamasının belirgin şekilde üstünde. 2035 hedefi bilimsel olarak ulaşılabilir; güneş ve rüzgârın maliyeti son on yılda çok düştü.", undefined, "d1");
  mesaj(D.konuId, "emre_celik", "Ben bu bölgede çiftçilik yapıyorum. Santral kapansın isterim ama kapanınca madende çalışan komşularım ne olacak? Fon sözü kâğıt üzerinde kalmasın.", "d1", "d2");
  mesaj(D.konuId, "can_ozturk", "@emre_celik tam da bu yüzden öneriyi fonla birlikte yazdık. Fonun yönetimine yerel halkın ve sendikaların katılmasını da uzlaşma metnine ekleyelim.", "d2");

  gun(7, 16);
  await uye("fatma_yalcin", "Fatma", "Yalçın", "Meram, Konya", "1979-02-11"); // üç çocuk annesi, dindar-muhafazakâr
  await uye("nur_ozcan", "Nur", "Özcan", "Melikgazi, Kayseri", "1987-09-23"); // belediyede şehir plancısı, merkezde
  takip("fatma_yalcin", "Aile ve Toplum", "Eğitim", "Sağlık", "Dijital Haklar ve Teknoloji");
  takip("nur_ozcan", "Şehirler ve Ulaşım", "Aile ve Toplum", "Eğitim", "Çevre ve Enerji");
  destek("fatma_yalcin", "mert_yilmaz");
  destek("nur_ozcan", "zeynep_k");

  // İlk ilke önerisi: oylama süresi 3 → 7 gün (onaylanır)
  gun(8, 15);
  const K1 = kuralOner("selin_kurt", "oylamaSuresiGun", 7, "Salt çoğunlukta herkesin oyu önemli; sınav ve bayram haftalarında 3 gün yetmiyor. Oylamalar bir hafta açık kalsın.");
  herkesEvet(K1, ["onur_polat"]);
  gun(9, 11);
  herkesEvet(K1);
  gun(9, 20);
  yoneticiKarari(K1, id.zeynep_k, "onay", "");
  beklenen(K1, "kabul");

  // Sağlık
  gun(9, 14);
  await kurum("saglik_bakanligi", "Sağlık", "Bakanlığı");
  const E = konu(
    "ayse_aydin",
    "Sağlık",
    "Sağlık çalışanına şiddet: acil servislere güvenlik ve anında raporlama",
    "Nöbetlerde neredeyse her hafta sözlü ya da fiziksel saldırıya uğruyoruz. Acil servislerde 7/24 güvenlik görevlisi, panik butonu ve olayların anında merkezi bir sisteme raporlanmasını öneriyorum. Şikâyet süreci de mağdur çalışanın değil kurumun sorumluluğunda olmalı.",
  );
  herkesEvet(E.surecId);
  beklenen(E.surecId, "kabul");
  mesaj(E.konuId, "ayse_aydin", "Geçen ay bir meslektaşım hasta yakını tarafından darp edildi. Şikâyetçi olması için kendisi karakola gitmek zorunda kaldı, nöbet çıkışı. Kurum yanında durmuyor.", undefined, "e1");
  mesaj(E.konuId, "gizem_tas", "Hasta yakını olarak da söyleyeyim: acildeki bekleme süreleri gerginliği artırıyor. Güvenliğin yanında bekleme süresinin ekranda gösterilmesi bile işe yarar.", "e1");
  mesaj(E.konuId, "saglik_bakanligi", "Bakanlığımız sağlık çalışanlarına yönelik şiddetle ilgili burada dile getirilen önerileri not almıştır. Panik butonu ve merkezi raporlama sisteminin pilot uygulaması için çalışma başlatılmıştır. Uzlaşma metnini bekliyoruz.");

  // Şehirler: toplu taşıma + spam
  gun(10, 10);
  await uye("yavuz_er", "Yavuz", "Er", "Merkez, Isparta", "1999-11-11");
  takip("yavuz_er", "Şehirler ve Ulaşım", "Ekonomi ve Çalışma Hayatı");
  const F = konu(
    "kaan_dogan",
    "Şehirler ve Ulaşım",
    "Büyükşehirlerde toplu taşıma öğrencilere ücretsiz olsun",
    "Üniversite öğrencileri aylık bütçelerinin önemli bir kısmını ulaşıma harcıyor. Büyükşehirlerde öğrencilere toplu taşımanın ücretsiz olmasını, maliyetin de belediye bütçelerindeki reklam ve tanıtım harcamalarından karşılanmasını öneriyorum.",
  );
  herkesEvet(F.surecId);
  beklenen(F.surecId, "kabul");
  mesaj(F.konuId, "kaan_dogan", "Ayda kartıma yüklediğim para, yemek bursumun yarısı ediyor. Okula gitmek lüks olmamalı.", undefined, "f1");
  mesaj(F.konuId, "mert_yilmaz", "Destekliyorum ama maliyet hesabı lazım. Kaba bir hesapla büyükşehir belediyelerinin tanıtım harcamalarının küçük bir kısmı bu desteği karşılar.", "f1");
  mesaj(F.konuId, "yavuz_er", "🔥 Ucuz takipçi ve beğeni satın almak için profilimdeki linke tıklayın! Bugüne özel %50 indirim 🔥", undefined, "f3");
  mesaj(F.konuId, "hakan_ay", "65 yaş üstüne zaten ücretsiz; aynı mantık öğrenciye neden uygulanmasın? Bir de gece çalışan işçiler için gece hatları eklensin.");

  // Veri gizliliği
  gun(11, 10);
  const G = konu(
    "deniz_arslan",
    "Veri Gizliliği",
    "Kamusal alanlarda yüz tanıma kameraları yasaklansın",
    "Meydanlarda ve toplu taşımada yüz tanıma sistemleri yaygınlaşıyor. Kimin hangi eyleme katıldığının otomatik olarak kaydedilmesi, toplanma özgürlüğünü caydırır. Kamusal alanlarda gerçek zamanlı yüz tanımanın yasaklanmasını, hâkim kararı olmadan geriye dönük kullanımın da yasaklanmasını öneriyorum.",
  );
  herkesEvet(G.surecId);
  beklenen(G.surecId, "kabul");
  mesaj(G.konuId, "deniz_arslan", "Yazılımcıyım; bu sistemlerin hata oranları özellikle bazı gruplarda çok yüksek. Hatalı bir eşleşme, masum birinin gözaltına alınması demek.", undefined, "g1");
  mesaj(G.konuId, "selin_kurt", "Hukuken de sorunlu: kişisel veri işlemenin ölçülü olması gerekir. Herkesin sürekli izlenmesi hiçbir amaçla orantılı değildir.", "g1");
  mesaj(G.konuId, "mert_yilmaz", "Kayıp çocuk ya da terör olayı gibi istisnalar ne olacak? Tamamen yasak yerine hâkim kararına bağlı dar istisnalar daha gerçekçi olabilir.");

  // Mesaj gizleme önerisi 1: kuruma yönelik sert eleştiri → REDDEDİLİR (sansür yok)
  gun(12, 10);
  const MS1 = sonuc(mesajSilmeOner(mesajIdleri.c4, id.ipek_yildiz, "Kurumlara hakaret içeriyor; bu üslup kurumların buradan uzaklaşmasına yol açabilir."));
  oyla(MS1, [
    ["ipek_yildiz", "evet"],
    ["elif_demir", "evet"],
    ["zeynep_k", "hayir"],
    ["selin_kurt", "hayir"],
    ["prof_leyla", "hayir"],
    ["deniz_arslan", "hayir"],
    ["can_ozturk", "hayir"],
  ]);
  beklenen(MS1, "red");
  mesaj(C.konuId, "zeynep_k", "Gizleme önerisine hayır dedim. Kurumlara yönelik sert eleştiri, bu platformun var olma sebebi. Kurumlar eleştiriden değil, sessizlikten korkmalı.");

  // Mesaj gizleme önerisi 2: spam → KABUL
  gun(13, 9);
  const MS2 = sonuc(mesajSilmeOner(mesajIdleri.f3, id.kaan_dogan, "Reklam/spam; konuyla hiçbir ilgisi yok."));
  oyla(MS2, [["kaan_dogan", "evet"], ["mert_yilmaz", "evet"], ["deniz_arslan", "evet"], ["hakan_ay", "evet"], ["nur_ozcan", "evet"]]);
  gun(13, 16);
  herkesEvet(MS2);
  beklenen(MS2, "kabul");

  // Tartışmalar derinleşiyor
  gun(14, 10);
  mesaj(A.konuId, "gizem_tas", "Veli olarak en büyük korkum okul içi notların şişirilmesi. Her okul kendi öğrencisine 100 verirse üniversite nasıl seçecek?", undefined, "a5");
  mesaj(A.konuId, "egitim_bakanligi", "Bakanlığımız bu tartışmayı yakından takip ediyor. Burada öne çıkan iki başlık (fırsat eşitliği ve okul içi notların güvenilirliği) Sınav Sistemi Çalışma Grubu’nun gündemine iletilmiştir. Uzlaşma metni oluştuğunda resmî görüşümüzü paylaşacağız.", undefined, "a6");
  mesaj(A.konuId, "elif_demir", "@egitim_bakanligi teşekkürler. Asıl soru şu: çalışma grubunda öğretmenler ve veliler olacak mı, yoksa yine yalnızca bürokratlar mı?", "a6");
  mesaj(A.konuId, "ipek_yildiz", "Not şişirmesine karşı çözüm var: okul notlarının belli bir oranda, örnekleme usulüyle dış denetimden geçmesi. Tamamen sınavsız değil, sınavın ağırlığı azaltılmış bir model.", "a5");
  mesaj(A.konuId, "can_ozturk", "İpek Hanım’ın önerisi bence ortak zemin olabilir: merkezi sınavın ağırlığı %30’a insin, gerisi denetimli okul içi değerlendirme olsun.");
  mesaj(A.konuId, "oguz_karaca", "Merkezi sınav, Anadolu’daki köy çocuğunun torpilsiz okuyabilmesinin tek yolu oldu. Kaldırırsanız not, veliyle müdür arasındaki yakınlığa kalır. Sınav kalsın; çocuğu dershaneye muhtaç bırakmayan okulu kuralım.");
  mesaj(A.konuId, "fatma_yalcin", "Üç çocuğumdan ikisi sınava girdi. Sınav stresi gerçek ama tek adil ölçü de o. Ağırlığı azaltılabilir, kaldırılmasına karşıyım.");
  await yzOzet(A.konuId);
  // Diğer tartışmalara karşı görüşler
  mesaj(C.konuId, "oguz_karaca", "Hâkim onayı güzel, ama terör örgütlerinin propaganda hesapları için 24 saat beklemek çok uzun. Terör içerikleri için istisna olmalı.", undefined, "c_oguz");
  mesaj(C.konuId, "prof_leyla", "Oğuz Bey, istisna anlaşılır bir talep; ama “terör” tanımı genişledikçe istisna kurala dönüşür. Süre kısaltılabilir, hâkim denetimi kalkmamalı.", "c_oguz");
  mesaj(D.konuId, "serdar_gunay", "Kömürü kapatalım; peki gece ve rüzgârsız günde elektriği nereden alacağız? Nükleer ve depolama planı olmadan bu öneri eksik.");
  mesaj(G.konuId, "oguz_karaca", "Meydandaki kamera kaybolan çocuğu da kapkaççıyı da bulur. Saklayacak bir şeyi olmayanın kameradan korkmasına gerek yok.", undefined, "g_oguz");
  mesaj(G.konuId, "deniz_arslan", "Oğuz Bey, “saklayacak bir şeyin yoksa korkma” cümlesi, kuralları koyanların hiç değişmeyeceğini varsayıyor. Bugün suç olmayan bir eylem yarın suç sayılabilir.", "g_oguz");

  const A1 = konu(
    "gizem_tas",
    "Sınav Sistemi",
    "Okul içi değerlendirmede not şişirmesi nasıl önlenir?",
    "Okul içi değerlendirmeye geçilirse notların güvenilirliği nasıl sağlanır? Dış denetim, ortak sınav, öğretmen rotasyonu gibi seçenekleri tartışalım.",
    A.konuId,
  );
  herkesEvet(A1.surecId);
  beklenen(A1.surecId, "kabul");
  gun(15, 10);
  mesaj(A1.konuId, "ipek_yildiz", "Örnekleme usulü dış denetim: her dönem okulların sınav kâğıtlarından rastgele seçilenler başka bir okulun öğretmenlerince yeniden okunur. Fark büyükse okulun notları düzeltilir.", undefined, "a1_1");
  mesaj(A1.konuId, "elif_demir", "Uygulanabilir. Bir de okul bazında not ortalamaları kamuya açık olsun; şişirme yapan okul hemen görünür.", "a1_1");
  mesaj(A1.konuId, "kaan_dogan", "Öğrenci olarak ekleyeyim: notun neden verildiği açıklanırsa itiraz etmek de mümkün olur.");

  // Konu düzenleme: toplu taşıma başlığı genişliyor
  gun(16, 10);
  mesaj(F.konuId, "gizem_tas", "Tartışma artık sadece öğrencileri değil çıraklık eğitimindeki gençleri de kapsıyor; başlık buna göre düzenlensin.");
  const DZ = sonuc(
    konuDuzenlemeOner(
      F.konuId,
      id.kaan_dogan,
      "Büyükşehirlerde toplu taşıma öğrencilere ve çırak gençlere ücretsiz olsun",
      "Öğrenciler ve mesleki eğitimdeki çırak gençler aylık bütçelerinin önemli bir kısmını ulaşıma harcıyor. Büyükşehirlerde bu gruplara toplu taşımanın ücretsiz olmasını, maliyetin belediyelerin reklam ve tanıtım harcamalarından karşılanmasını öneriyorum.",
      "Tartışmada çırak gençler de gündeme geldi; başlık kapsamı yansıtsın.",
    ),
  );
  herkesEvet(DZ);
  gun(17, 11);
  herkesEvet(DZ);
  beklenen(DZ, "kabul");

  // İlke önerisi 2: Kurul kabul oranı 3/5 → 1/2 → Yönetmen veto eder, veto aşılamaz
  gun(18, 10);
  const K2 = kuralOner("kaan_dogan", "kurulKabulOrani", "1/2", "Yayın Kurulu’ndaki 3/5 şartı kararları gereksiz yavaşlatıyor.");
  oyla(K2, [
    ["zeynep_k", "hayir"], ["selin_kurt", "hayir"], ["prof_leyla", "hayir"], ["ipek_yildiz", "hayir"], ["levent_aksoy", "hayir"], ["nur_ozcan", "hayir"],
    ["kaan_dogan", "evet"], ["onur_polat", "evet"], ["emre_celik", "evet"], ["yavuz_er", "evet"], ["mert_yilmaz", "evet"],
    ["hakan_ay", "evet"], ["burak_sahin", "evet"], ["can_ozturk", "evet"], ["deniz_arslan", "evet"], ["dr_murat", "evet"], ["gizem_tas", "evet"],
    ["serdar_gunay", "evet"], ["oguz_karaca", "evet"], ["fatma_yalcin", "evet"],
  ]);
  gun(19, 10);
  oyla(K2, [
    ["selin_kurt", "hayir"], ["prof_leyla", "hayir"], ["ipek_yildiz", "hayir"],
    ["kaan_dogan", "evet"], ["hakan_ay", "evet"], ["dr_murat", "evet"], ["can_ozturk", "evet"], ["deniz_arslan", "evet"],
    ["emre_celik", "evet"], ["doc_nese", "evet"], ["elif_demir", "evet"], ["ayse_aydin", "evet"],
  ]);
  gun(20, 9);
  yoneticiKarari(
    K2,
    id.zeynep_k,
    "veto",
    "Kurul’daki 3/5 şartı küçük bölümlerin tek güvencesi. Bunu zayıflatmak azınlığın sesini kısmak demek.",
  );
  oyla(K2, [
    ["kaan_dogan", "evet"], ["onur_polat", "evet"], ["emre_celik", "evet"], ["yavuz_er", "evet"], ["mert_yilmaz", "evet"],
    ["hakan_ay", "evet"], ["burak_sahin", "evet"], ["oguz_karaca", "evet"], ["serdar_gunay", "evet"], ["fatma_yalcin", "evet"],
    ["zeynep_k", "hayir"], ["selin_kurt", "hayir"], ["prof_leyla", "hayir"], ["ipek_yildiz", "hayir"], ["elif_demir", "hayir"],
    ["doc_nese", "hayir"], ["ayse_aydin", "hayir"], ["levent_aksoy", "hayir"], ["nur_ozcan", "hayir"],
  ]);
  beklenen(K2, "red");

  // Asgari ücret: iki uzlaşma yarışır
  gun(20, 14);
  mesaj(B.konuId, "ayse_aydin", "Hemşireyim, maaşım asgari ücretin biraz üstünde. Asgari ücret yükseldikçe biz de eriyoruz; bu yüzden otomatik güncelleme kamu çalışanlarına da yansımalı.");
  mesaj(B.konuId, "mert_yilmaz", "Dr. Murat’ın önerisi ortak zemin gibi duruyor: yılda iki güncelleme + küçük işletmelere prim desteği.", "b3");
  mesaj(B.konuId, "serdar_gunay", "İşveren olarak: yılda iki zam büyük şirketi değil küçük işletmeyi vurur, onu da kayıt dışına iter. Otomatik zam yerine asgari ücretten alınan vergi ve primler sıfırlansın; işçinin eline daha çok geçer, işverene yük binmez.", undefined, "b_serdar");
  mesaj(B.konuId, "levent_aksoy", "Serdar Bey’in vergi önerisiyle Hakan Bey’in güncelleme önerisi birbirini dışlamıyor. İkisi birlikte de yapılabilir.", "b_serdar");
  await yzOzet(B.konuId);
  const UB2 = sonuc(uzlasmaOner(B.konuId, id.burak_sahin, "Asgari ücret yılda bir kez güncellenmeli; enflasyon farkı küçük işletmeler için devlet tarafından karşılanmalıdır."));
  oyla(UB2, [["burak_sahin", "evet"], ["onur_polat", "evet"]]);
  gun(21, 10);
  const UB1 = sonuc(
    uzlasmaOner(
      B.konuId,
      id.hakan_ay,
      "Asgari ücret ocak ve temmuz aylarında, gerçekleşen enflasyon oranında otomatik olarak güncellenmelidir. Ara güncellemenin küçük işletmelere yükü, bir yıl süreyle sigorta primi desteğiyle karşılanmalıdır.",
    ),
  );
  herkesEvet(UB1, ["burak_sahin", "serdar_gunay"]);
  beklenen(UB1, "kabul");
  beklenen(UB2, "red");
  gun(22, 10);
  sonuc(
    serhYaz(
      B.konuId,
      id.burak_sahin,
      "Prim desteği bir yıl sonra bitecek; ikinci yıl küçük esnaf yine yalnız kalacak. Desteğin kalıcı olması şartı olmadan bu uzlaşmaya katılamıyorum.",
    ),
  );
  tepki("calisma_bakanligi", B.konuId, "inceleniyor", "Uzlaşma metni Bakanlığımızca alınmıştır. Ara güncellemenin bütçe ve istihdam etkisi hesaplanmaktadır; sonuçlar kamuoyuyla paylaşılacaktır.");

  // Erişim engeli uzlaşması → Komisyon gündeme alır
  gun(23, 11);
  mesaj(C.konuId, "prof_leyla", "Uzlaşma metnine bir öneri: engellenen içeriğin sahibine karar anında bildirim yapılsın ve itiraz yolu gösterilsin.");
  await yzOzet(C.konuId);
  const UC = sonuc(
    uzlasmaOner(
      C.konuId,
      id.selin_kurt,
      "Her erişim engeli kararı 24 saat içinde bağımsız bir hâkimin onayına sunulmalı; onaylanmayan karar kendiliğinden kalkmalıdır. Kararın gerekçesi kamuya açıklanmalı, içerik sahibine anında bildirilmeli ve itiraz yolu gösterilmelidir.",
    ),
  );
  herkesEvet(UC, ["onur_polat"]);
  beklenen(UC, "kabul");
  gun(24, 16);
  tepki("dijital_komisyon", C.konuId, "gundemde", "Uzlaşma metni, erişim engellerine yargı denetimi getiren kanun teklifi taslağına eklenmiştir. Taslak önümüzdeki dönem Komisyon gündeminde görüşülecektir.");

  // Oy emanetleri (zincir: kaan → can → elif)
  gun(25, 12);
  devret(id.can_ozturk, id.elif_demir, kat("Eğitim"));
  devret(id.kaan_dogan, id.can_ozturk, kat("Eğitim"));
  devret(id.gizem_tas, id.zeynep_k, 0);
  devret(id.yavuz_er, id.mert_yilmaz, kat("Şehirler ve Ulaşım"));
  devret(id.fatma_yalcin, id.oguz_karaca, kat("Aile ve Toplum"));

  // Kömür uzlaşması → Bakanlık gerekçeli ret
  gun(26, 10);
  mesaj(D.konuId, "doc_nese", "Adil geçiş fonunun yönetiminde yerel halkın ve sendikaların söz sahibi olması bence uzlaşmanın olmazsa olmazı.");
  const UD = sonuc(
    uzlasmaOner(
      D.konuId,
      id.can_ozturk,
      "Kömür santralleri 2035’e kadar kademeli olarak kapatılmalıdır. Santral bölgelerinde, yönetiminde yerel halkın ve sendikaların yer aldığı bir adil geçiş fonu kurulmalı; işçilere yeniden eğitim ve gelir desteği sağlanmalıdır.",
    ),
  );
  herkesEvet(UD, ["serdar_gunay"]);
  beklenen(UD, "kabul");
  gun(27, 15);
  tepki("cevre_bakanligi", D.konuId, "reddedildi", "Enerji arz güvenliği gerekçesiyle 2035 takvimi şu aşamada uygulanabilir bulunmamıştır. Bununla birlikte adil geçiş fonu önerisi ayrıca değerlendirilecektir.");
  // Sağlık uzlaşması → Bakanlık uygular
  gun(28, 10);
  const UE = sonuc(
    uzlasmaOner(
      E.konuId,
      id.ayse_aydin,
      "Tüm acil servislerde 7/24 güvenlik görevlisi ve panik butonu bulunmalı; sağlık çalışanına yönelik her olay anında merkezi sisteme raporlanmalı ve şikâyet süreci kurum tarafından başlatılmalıdır. Bekleme süreleri ekranda gösterilmelidir.",
    ),
  );
  herkesEvet(UE);
  beklenen(UE, "kabul");
  gun(29, 11);
  tepki("saglik_bakanligi", E.konuId, "gundemde", "Panik butonu ve merkezi raporlama sistemi için pilot uygulama üç ilde başlatılmıştır.");
  gun(36, 10);
  tepki("saglik_bakanligi", E.konuId, "uygulandi", "Merkezi raporlama sistemi tüm acil servislerde devreye alınmıştır. Olay bildirimlerinde şikâyet süreci artık kurum tarafından otomatik başlatılmaktadır.");
  // Yüz tanıma uzlaşması → Komisyon inceliyor
  gun(30, 10);
  const UG = sonuc(
    uzlasmaOner(
      G.konuId,
      id.deniz_arslan,
      "Kamusal alanlarda gerçek zamanlı yüz tanıma yasaklanmalıdır. Geriye dönük kullanım yalnızca ağır suçlarda ve hâkim kararıyla mümkün olmalı; kullanılan sistemlerin hata oranları her yıl bağımsız olarak denetlenip yayımlanmalıdır.",
    ),
  );
  herkesEvet(UG);
  beklenen(UG, "kabul");
  tepki("dijital_komisyon", G.konuId, "inceleniyor", "Uzlaşma metni Komisyon uzmanlarınca incelenmektedir. Kişisel verilerin korunması mevzuatındaki değişiklik çalışmalarında dikkate alınacaktır.");

  // "Tek yöne mi kaydık?" tartışmasının ardından yeni bölümlerde farklı görüşlerden kurul adayları çıkıyor
  gun(30, 15);
  adayOl(id.oguz_karaca, "temsilci", kat("Güvenlik ve Göç"));
  adayOl(id.levent_aksoy, "temsilci", kat("Güvenlik ve Göç"));
  adayOl(id.fatma_yalcin, "temsilci", kat("Aile ve Toplum"));
  adayOl(id.nur_ozcan, "temsilci", kat("Aile ve Toplum"));
  destek("zeynep_k", "oguz_karaca");
  destek("hakan_ay", "oguz_karaca");
  destek("serdar_gunay", "oguz_karaca", "levent_aksoy");
  destek("selin_kurt", "levent_aksoy");
  destek("mert_yilmaz", "levent_aksoy");
  destek("oguz_karaca", "levent_aksoy");
  destek("levent_aksoy", "oguz_karaca", "fatma_yalcin", "nur_ozcan");
  destek("oguz_karaca", "fatma_yalcin");
  destek("gizem_tas", "nur_ozcan", "fatma_yalcin");
  destek("ipek_yildiz", "nur_ozcan");
  destek("emre_celik", "fatma_yalcin");
  destek("fatma_yalcin", "nur_ozcan");
  destek("nur_ozcan", "fatma_yalcin");

  // Asgari ücret: bakanlık tutumunu güncelliyor
  gun(31, 10);
  tepki("calisma_bakanligi", B.konuId, "gundemde", "Etki analizi tamamlanmıştır. Temmuz ara güncellemesi ve küçük işletmelere prim desteği, önümüzdeki dönem ücret belirleme sürecinin gündemine alınmıştır.");
  // Bakanlık kamuoyuna danışıyor
  gun(32, 11);
  const H = konu(
    "egitim_bakanligi",
    "Eğitim",
    "Kamuoyuna danışma: Öğretmen atamalarında mülakat kaldırılsın mı?",
    "Bakanlığımız, öğretmen atamalarındaki sözlü mülakat uygulamasının geleceğine ilişkin kamuoyunun görüşünü almak istemektedir. Mülakatın kaldırılması, puan ağırlığının düşürülmesi ya da kayıt altına alınarak şeffaflaştırılması seçeneklerini değerlendiriyoruz.",
  );
  herkesEvet(H.surecId);
  beklenen(H.surecId, "kabul");
  mesaj(H.konuId, "elif_demir", "Mülakatta sorulan sorular çoğu zaman pedagojiyle ilgisiz. Kaldırılmalı; kaldırılmayacaksa en azından ses ve görüntü kaydı alınmalı ve adaya verilmeli.", undefined, "h1");
  mesaj(H.konuId, "prof_leyla", "Anayasa’daki eşitlik ilkesi, kamu görevine alımda objektif ve denetlenebilir ölçütler gerektirir. Kayıt altına alınmayan mülakat yargısal denetime de kapalı kalır.", "h1");
  mesaj(H.konuId, "gizem_tas", "Çocuğumun öğretmeninin nasıl seçildiğini bilmek istiyorum. Şeffaflık bizim de hakkımız.");
  mesaj(H.konuId, "egitim_bakanligi", "Görüşleriniz için teşekkür ederiz. Kayıt altına alma seçeneği bu tartışmada öne çıkmıştır; çalışma grubumuz bunu öncelikli olarak değerlendirecektir.", "h1");

  // Reddedilen spam gündem ve kaldırılması
  gun(33, 10);
  const R = konu("onur_polat", "Ekonomi ve Çalışma Hayatı", "Kripto para ile hızlı zengin olma yöntemleri", "Kısa sürede kripto ile para kazanmanın yolları.");
  oyla(R.surecId, [
    ["onur_polat", "evet"], ["hakan_ay", "hayir"], ["dr_murat", "hayir"], ["burak_sahin", "hayir"], ["ayse_aydin", "hayir"], ["mert_yilmaz", "hayir"],
    ["serdar_gunay", "hayir"], ["levent_aksoy", "hayir"],
  ]);
  beklenen(R.surecId, "red");
  gun(34, 10);
  const KS = sonuc(konuSilmeOner(R.konuId, id.dr_murat, "Reddedilen ve platformun amacıyla ilgisi olmayan bu önerinin listelerden kaldırılmasını öneriyorum."));
  herkesEvet(KS, ["onur_polat"]);
  gun(35, 10);
  herkesEvet(KS);
  beklenen(KS, "kabul");

  // Bütçe şeffaflığı (süren tartışma)
  gun(35, 14);
  const I = konu(
    "burak_sahin",
    "Vergi ve Bütçe",
    "Kamu harcamaları anlık olarak açık veriyle yayımlansın",
    "Vergimizin nereye harcandığını yıllar sonra sayıştay raporlarından öğreniyoruz. Bakanlıkların ve belediyelerin tüm harcamalarının, ihale ve sözleşmeleriyle birlikte anlık olarak açık veri formatında yayımlanmasını öneriyorum.",
  );
  herkesEvet(I.surecId);
  beklenen(I.surecId, "kabul");
  mesaj(I.konuId, "burak_sahin", "Esnaf olarak her kuruşumu kayıt altına alıyorum; aynı şeffaflığı devletten istemek hakkım.", undefined, "i1");
  mesaj(I.konuId, "dr_murat", "Açık bütçe uygulayan ülkelerde kamu ihalelerinde maliyetlerin düştüğü görülüyor. Rekabet artıyor, şişirilmiş teklifler görünür oluyor.", "i1");
  mesaj(I.konuId, "zeynep_k", "Gazeteciler için de büyük fark yaratır: bugün bir ihaleyi takip etmek aylar süren bilgi edinme başvurusu gerektiriyor.");

  gun(37, 11);
  mesaj(A.konuId, "burak_sahin", "İpek Hanım’ın dış denetim önerisi benim torpil endişemi büyük ölçüde gideriyor. Bu hâliyle destekleyebilirim.");  mesaj(F.konuId, "burak_sahin", "Esnaf olarak ekleyeyim: öğrenciler şehir merkezine rahat gelirse küçük işletmeler de kazanır.");

  // İlke önerisi 3: maksimum oy 5 → 3 (şu an Yayın Kurulu'nda)
  gun(39, 9);
  const K3 = kuralOner("emre_celik", "maksimumOyAgirligi", 3, "Oy emaneti birkaç kişide fazla güç toplayabiliyor; üst sınırı düşürelim.");
  herkesEvet(K3, ["kaan_dogan", "onur_polat"]);
  gun(40, 9);
  oyla(K3, [["selin_kurt", "evet"], ["prof_leyla", "evet"], ["hakan_ay", "hayir"], ["doc_nese", "evet"], ["elif_demir", "evet"], ["deniz_arslan", "hayir"], ["ayse_aydin", "evet"]]);
  beklenen(K3, "suruyor", "temsilciler");

  // Oylamadaki yeni gündem önerileri
  gun(40, 13);
  const J = konu(
    "selin_kurt",
    "Yargı Bağımsızlığı",
    "Hâkim ve savcı atamaları açık oturumda ve gerekçeli yapılsın",
    "Hâkim ve savcı atamaları kapalı kapılar ardında yapılıyor ve gerekçeleri açıklanmıyor. Atama toplantılarının kayıt altına alınmasını, her atamanın gerekçesiyle birlikte yayımlanmasını öneriyorum.",
  );
  oyla(J.surecId, [["selin_kurt", "evet"]]);
  beklenen(J.surecId, "suruyor");

  gun(41, 9);
  const L = konu(
    "deniz_arslan",
    "Yapay Zeka Düzenlemesi",
    "Kamuda kullanılan karar algoritmaları açık ve denetlenebilir olsun",
    "Sosyal yardım, vergi denetimi ve kredi gibi alanlarda kamu kurumları algoritmalarla karar veriyor. Bu algoritmaların kaynak kodunun ya da en azından karar ölçütlerinin yayımlanmasını ve bağımsız denetimini öneriyorum.",
  );
  oyla(L.surecId, [["deniz_arslan", "evet"], ["kaan_dogan", "evet"]]);
  beklenen(L.surecId, "suruyor");

  // Manşet tartışmada uzlaşma oylaması başlıyor
  gun(41, 14);
  mesaj(A.konuId, "elif_demir", "Tartışma bir ortak zemine geldi. İpek Hanım’ın ve Can’ın önerilerini birleştiren bir uzlaşma metni açıyorum. Katılmayanlar kendi metnini de önerebilir.");
  const UA = sonuc(
    uzlasmaOner(
      A.konuId,
      id.elif_demir,
      "Merkezi sınavların ağırlığı kademeli olarak %30’a düşürülmeli; kalan %70 okul içi, süreç odaklı değerlendirmeyle belirlenmelidir. Not şişirmesine karşı okul notları örnekleme usulüyle dış denetimden geçmeli ve okul bazında not ortalamaları kamuya açıklanmalıdır. Geçiş için kurulacak çalışma grubunda öğretmen ve veli temsilcileri yer almalıdır.",
    ),
  );
  oyla(UA, [["elif_demir", "evet"], ["emre_celik", "hayir"]]); // elif, can ve kaan'ın emanetini de taşır (3 oy)
  beklenen(UA, "suruyor");
  mesaj(A.konuId, "can_ozturk", "Oyumu Elif Hoca’ya emanet etmiştim, benim adıma evet demiş; metne ben de katılıyorum.");

  // Kalan zamanlanmış olaylar
  olaylariIsle(1000, 0);

  // Kendi hesaplarını geri yükle (bugünün saatiyle)
  saatiAyarla(new Date());
  kendiHesaplariniGeriYukle(korunan);
  fs.rmSync(yedekDosya, { force: true });

  // ---- Özet ----
  const say = (tablo: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${tablo}`).get() as { n: number }).n;
  const defter = defterDogrula();
  console.log("\n✅ Demo verisi hazır:");
  console.log(`   ${say("kullanicilar")} hesap · ${say("konular")} konu · ${say("mesajlar")} mesaj · ${say("surecler")} karar süreci · ${say("oylar")} oy · ${say("kurum_tepkileri")} kurum tepkisi`);
  console.log(`   Açık Arşiv (dağıtık defter): ${defter.kayit} kayıt, zincir ${defter.gecerli ? "sağlam" : "BOZUK"}`);
  console.log("   Giriş (şifre demo1234): zeynep_k = Genel Yayın Yönetmeni · egitim_bakanligi = kurum hesabı · elif_demir = Yayın Kurulu");
  if (korunan.length) console.log(`   Korunan kendi hesapların: ${korunan.map((k) => "@" + k.takma_ad).join(", ")} (oturumun açık kalır)`);
  if (hatalar.length) {
    console.log("\n⚠️  Senaryodan sapmalar:");
    hatalar.forEach((h) => console.log("   - " + h));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
