import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// Tek dosyalık SQLite veritabanı: forum/veri/forum.db (kurulum gerekmez, ücretsiz).
// Şema değişirse eski veritabanını silin (veri klasörü); ilk açılışta yeniden oluşur.
// Klasör bağlantı açılırken belirlenir; testler böylece geçici bir klasörde boş bir veritabanıyla çalışır.
function ac(): DatabaseSync {
  const klasor = path.join(process.cwd(), "veri");
  fs.mkdirSync(klasor, { recursive: true });
  const db = new DatabaseSync(path.join(klasor, "forum.db"), { timeout: 5000 });
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  semaKur(db);
  return db;
}

function semaKur(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kullanicilar (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      ad            TEXT NOT NULL,
      soyad         TEXT NOT NULL,
      takma_ad      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      adres         TEXT NOT NULL,
      dogum_tarihi  TEXT NOT NULL,
      sifre_hash    TEXT NOT NULL,
      rol           TEXT NOT NULL DEFAULT 'uye',   -- uye | bilirkisi | yz
      olusturma     TEXT NOT NULL                  -- ISO zaman
    );

    CREATE TABLE IF NOT EXISTS oturumlar (
      token         TEXT PRIMARY KEY,
      kullanici_id  INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
      bitis         TEXT NOT NULL
    );

    -- Ontoloji: kategori ağacı. Her kategorinin anahtar kelimeleri uygunluk ölçümünde kullanılır.
    CREATE TABLE IF NOT EXISTS kategoriler (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      ust_id             INTEGER REFERENCES kategoriler(id),
      ad                 TEXT NOT NULL,
      aciklama           TEXT NOT NULL,
      anahtar_kelimeler  TEXT NOT NULL,   -- virgülle ayrılmış, küçük harf
      kurallar           TEXT NOT NULL DEFAULT ''
    );

    -- "Konuyla ilgili" kullanıcılar = konunun kategorisini (veya bir üst kategorisini) takip edenler
    CREATE TABLE IF NOT EXISTS takipler (
      kullanici_id  INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
      kategori_id   INTEGER NOT NULL REFERENCES kategoriler(id),
      PRIMARY KEY (kullanici_id, kategori_id)
    );

    CREATE TABLE IF NOT EXISTS konular (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      kategori_id      INTEGER NOT NULL REFERENCES kategoriler(id),
      ust_konu_id      INTEGER REFERENCES konular(id),   -- doluysa alt konudur
      baslik           TEXT NOT NULL,
      aciklama         TEXT NOT NULL,
      acan_id          INTEGER NOT NULL REFERENCES kullanicilar(id),
      durum            TEXT NOT NULL DEFAULT 'oylamada', -- oylamada | aktif | reddedildi | kapandi | silindi
      uygunluk_puani   INTEGER NOT NULL,
      uygunluk_rapor   TEXT NOT NULL,                    -- JSON: notlar
      olusturma        TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS konular_kategori ON konular(kategori_id, durum);
    CREATE INDEX IF NOT EXISTS konular_ust ON konular(ust_konu_id);

    -- Karar süreci (ABD yasama sürecinin karşılığı): bir öneri aşama aşama ilerler
    --   konu önerisi:  uyeler
    --   ilke önerisi: uyeler → temsilciler → yonetici (→ veto ise veto_uyeler → veto_temsilciler)
    CREATE TABLE IF NOT EXISTS surecler (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      tur             TEXT NOT NULL,              -- konu_ac | kural_degistir | ...
      hedef_id        INTEGER,                    -- ilgili kayıt (ör. konu id)
      kategori_id     INTEGER,                    -- NULL = forum geneli (tüm üyeler)
      oneren_id       INTEGER NOT NULL REFERENCES kullanicilar(id),
      veri            TEXT NOT NULL DEFAULT '{}', -- JSON (ör. kural anahtarı + yeni değer + gerekçe)
      asama           TEXT NOT NULL,
      durum           TEXT NOT NULL DEFAULT 'suruyor', -- suruyor | kabul | red
      olusturma       TEXT NOT NULL,
      kapanis         TEXT,
      yonetici_bitis  TEXT,
      gecmis          TEXT NOT NULL DEFAULT '[]'  -- JSON: [{zaman, olay}]
    );
    CREATE INDEX IF NOT EXISTS surecler_hedef ON surecler(tur, hedef_id);

    -- Bir sürecin her oylama aşaması
    CREATE TABLE IF NOT EXISTS oylamalar (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      surec_id     INTEGER NOT NULL REFERENCES surecler(id),
      asama        TEXT NOT NULL,              -- uyeler | temsilciler | veto_uyeler | veto_temsilciler
      esik         TEXT NOT NULL,              -- salt | basit | 1/2 | 3/5 | 2/3
      kategori_id  INTEGER,                    -- üye oylamasında kimlerin oy vereceğini belirler
      baslangic    TEXT NOT NULL,
      bitis        TEXT NOT NULL,
      durum        TEXT NOT NULL DEFAULT 'acik',  -- acik | kabul | red
      kapanis      TEXT
    );
    CREATE INDEX IF NOT EXISTS oylamalar_surec ON oylamalar(surec_id);

    -- Temsilci ve yönetici seçimi: sürekli destek usulü
    CREATE TABLE IF NOT EXISTS adaylar (
      kullanici_id  INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
      makam         TEXT NOT NULL,             -- temsilci | yonetici
      kategori_id   INTEGER NOT NULL DEFAULT 0, -- temsilci için ana kategori; yönetici için 0
      zaman         TEXT NOT NULL,
      PRIMARY KEY (kullanici_id, makam)
    );
    CREATE TABLE IF NOT EXISTS destekler (
      destekleyen_id  INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
      aday_id         INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
      makam           TEXT NOT NULL,
      zaman           TEXT NOT NULL,
      PRIMARY KEY (destekleyen_id, aday_id, makam)
    );

    -- Tartışma mesajları. Silinmez; ancak oylamayla gizlenebilir (metin korunur, hash'i defterde kalır)
    CREATE TABLE IF NOT EXISTS mesajlar (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      konu_id            INTEGER NOT NULL REFERENCES konular(id),
      yazan_id           INTEGER NOT NULL REFERENCES kullanicilar(id),
      yanit_id           INTEGER REFERENCES mesajlar(id),
      icerik             TEXT NOT NULL,
      olusturma          TEXT NOT NULL,
      gizleyen_surec_id  INTEGER REFERENCES surecler(id)
    );
    CREATE INDEX IF NOT EXISTS mesajlar_konu ON mesajlar(konu_id);

    -- Konu düzenlemelerinde eski sürümler saklanır
    CREATE TABLE IF NOT EXISTS konu_surumleri (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      konu_id    INTEGER NOT NULL REFERENCES konular(id),
      baslik     TEXT NOT NULL,
      aciklama   TEXT NOT NULL,
      bitis      TEXT NOT NULL,     -- bu sürümün geçerliliğinin bittiği an
      surec_id   INTEGER NOT NULL REFERENCES surecler(id)
    );

    -- Uzlaşmayla kapanan konularda azınlık görüşü (karşı oy gerekçesi)
    CREATE TABLE IF NOT EXISTS serhler (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      konu_id    INTEGER NOT NULL REFERENCES konular(id),
      yazan_id   INTEGER NOT NULL REFERENCES kullanicilar(id),
      icerik     TEXT NOT NULL,
      olusturma  TEXT NOT NULL,
      UNIQUE (konu_id, yazan_id)
    );

    -- Etki takibi: kurum hesaplarının uzlaşılan konulara verdiği resmî tepkiler (geçmişiyle birlikte)
    CREATE TABLE IF NOT EXISTS kurum_tepkileri (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      konu_id    INTEGER NOT NULL REFERENCES konular(id),
      kurum_id   INTEGER NOT NULL REFERENCES kullanicilar(id),
      durum      TEXT NOT NULL,   -- inceleniyor | gundemde | uygulandi | reddedildi
      aciklama   TEXT NOT NULL,
      zaman      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS kurum_tepkileri_konu ON kurum_tepkileri(konu_id);

    -- Dağıtık defter: değiştirilemez olay zinciri
    CREATE TABLE IF NOT EXISTS defter (
      sira         INTEGER PRIMARY KEY AUTOINCREMENT,
      zaman        TEXT NOT NULL,
      tur          TEXT NOT NULL,
      veri         TEXT NOT NULL,
      onceki_hash  TEXT NOT NULL,
      hash         TEXT NOT NULL
    );

    -- Oylamayla değiştirilmiş kural değerleri (değiştirilmeyenler kurallar.ts'deki varsayılandır)
    CREATE TABLE IF NOT EXISTS kural_degerleri (
      anahtar  TEXT PRIMARY KEY,
      deger    TEXT NOT NULL
    );

    -- Her satır 1 oydur. vekil_id doluysa bu oyu, oyunu devrettiği kişi kullanmıştır.
    CREATE TABLE IF NOT EXISTS oylar (
      oylama_id     INTEGER NOT NULL REFERENCES oylamalar(id),
      kullanici_id  INTEGER NOT NULL REFERENCES kullanicilar(id),
      secim         TEXT NOT NULL CHECK (secim IN ('evet','hayir')),
      vekil_id      INTEGER REFERENCES kullanicilar(id),
      zaman         TEXT NOT NULL,
      PRIMARY KEY (oylama_id, kullanici_id)
    );

    -- Oy devri: kategori bazlı, alt kategorileri de kapsar. kategori_id = 0 → tüm forum (ilke önerileri dahil)
    CREATE TABLE IF NOT EXISTS devirler (
      veren_id     INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
      kategori_id  INTEGER NOT NULL,
      alan_id      INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
      zaman        TEXT NOT NULL,
      PRIMARY KEY (veren_id, kategori_id)
    );
  `);

  const bos = db.prepare("SELECT COUNT(*) AS n FROM kategoriler").get() as { n: number };
  if (bos.n === 0) kategorileriTohumla(db);
}

type TohumKategori = { ad: string; aciklama: string; kelimeler: string; kurallar?: string; alt?: TohumKategori[] };

// Başlangıç ontolojisi: ülke gündeminin bölümleri. Yeni bölümler ileride oylamayla eklenebilir.
// Anahtar kelimeler uygunluk raporunda (bir önerinin bölüme ne kadar uyduğu) kullanılır.
const TOHUM: TohumKategori[] = [
  {
    ad: "Anayasa ve Hukuk",
    aciklama: "Anayasa, yargı, yasalar ve temel haklar.",
    kelimeler: "anayasa,hukuk,yargı,mahkeme,yasa,kanun,hak,adalet,hakim,hâkim,savcı,dava,ceza,seçim",
    kurallar: "Hukuki iddialar mümkünse ilgili madde ya da kararla desteklenmelidir.",
    alt: [
      { ad: "Yargı Bağımsızlığı", aciklama: "Hâkim atamaları, yargı kurulları ve mahkemelerin tarafsızlığı.", kelimeler: "yargı,hakim,hâkim,savcı,mahkeme,bağımsız,atama,kurul,tarafsız" },
      { ad: "Temel Haklar", aciklama: "Eşitlik, toplanma, gösteri ve ayrımcılık yasağı.", kelimeler: "hak,özgürlük,eşitlik,ayrımcılık,toplantı,gösteri,din,vicdan,engelli,kadın" },
    ],
  },
  {
    ad: "İfade Özgürlüğü ve Basın",
    aciklama: "Basın özgürlüğü, sansür, erişim engelleri ve gazetecilik.",
    kelimeler: "ifade,basın,gazeteci,sansür,yayın,medya,haber,erişim engel,sosyal medya,özgürlük,dezenformasyon,yasak",
    kurallar: "Kurultay’da tehdit dışında her ifade serbesttir.",
  },
  {
    ad: "Ekonomi ve Çalışma Hayatı",
    aciklama: "Enflasyon, ücretler, vergiler, istihdam ve bütçe.",
    kelimeler: "ekonomi,enflasyon,ücret,vergi,bütçe,işsiz,istihdam,emekli,maaş,fiyat,kira,faiz,esnaf,çiftçi,tarım",
    alt: [
      { ad: "Ücretler ve İstihdam", aciklama: "Asgari ücret, emeklilik, sendikalar ve çalışma koşulları.", kelimeler: "asgari ücret,maaş,işsiz,istihdam,sendika,çalışma,mesai,emekli,işçi,uzaktan çalışma" },
      { ad: "Vergi ve Bütçe", aciklama: "Vergi adaleti, kamu harcamaları ve bütçe şeffaflığı.", kelimeler: "vergi,bütçe,harcama,borç,kdv,gelir,şeffaf,kamu ihale" },
    ],
  },
  {
    ad: "Eğitim",
    aciklama: "Okullar, sınav sistemi, öğretmenler ve üniversiteler.",
    kelimeler: "eğitim,okul,öğretmen,öğrenci,sınav,üniversite,müfredat,ders,veli,dershane",
    alt: [
      { ad: "Sınav Sistemi", aciklama: "Merkezi sınavlar, dershaneler ve fırsat eşitliği.", kelimeler: "sınav,lgs,yks,puan,dershane,kurs,test,eşitlik" },
      { ad: "Yükseköğretim", aciklama: "Üniversiteler, burslar, yurtlar ve akademik özgürlük.", kelimeler: "üniversite,burs,yurt,akademi,akademisyen,harç,rektör,kampüs" },
    ],
  },
  {
    ad: "Sağlık",
    aciklama: "Hastaneler, sağlık çalışanları, ilaç ve sağlık sigortası.",
    kelimeler: "sağlık,hastane,doktor,hekim,ilaç,hasta,randevu,sigorta,aşı,hemşire,acil,şiddet",
  },
  {
    ad: "Çevre ve Enerji",
    aciklama: "İklim krizi, enerji dönüşümü, su ve doğanın korunması.",
    kelimeler: "çevre,iklim,enerji,karbon,kömür,güneş,rüzgar,orman,su,kuraklık,atık,geri dönüşüm,maden,santral",
  },
  {
    ad: "Dijital Haklar ve Teknoloji",
    aciklama: "İnternet özgürlüğü, kişisel veriler ve yapay zekanın düzenlenmesi.",
    kelimeler: "dijital,internet,veri,gizlilik,yapay zeka,algoritma,siber,teknoloji,platform,kişisel veri,yüz tanıma",
    alt: [
      { ad: "Veri Gizliliği", aciklama: "Kişisel verilerin korunması, gözetim ve izleme.", kelimeler: "veri,gizlilik,kişisel,izleme,kamera,yüz tanıma,gözetim,sızıntı" },
      { ad: "Yapay Zeka Düzenlemesi", aciklama: "Kamuda algoritmalar, şeffaflık ve hesap verebilirlik.", kelimeler: "yapay zeka,algoritma,otomasyon,yz,model,şeffaf,hesap verebilir" },
    ],
  },
  {
    ad: "Şehirler ve Ulaşım",
    aciklama: "Toplu taşıma, konut, deprem hazırlığı ve kent planlaması.",
    kelimeler: "şehir,kent,ulaşım,toplu taşıma,metro,otobüs,trafik,konut,kira,deprem,imar,bisiklet,belediye",
  },
  {
    ad: "Güvenlik ve Göç",
    aciklama: "Göç politikası, sınır güvenliği, asayiş, suç ve ceza, askerlik ve savunma.",
    kelimeler: "göç,göçmen,mülteci,sığınmacı,sınır,güvenlik,asayiş,polis,bekçi,suç,ceza,idam,terör,asker,askerlik,bedelli,savunma,silah",
  },
  {
    ad: "Aile ve Toplum",
    aciklama: "Aile politikaları, nüfus, din ve değerler, çocuk ve gençlik.",
    kelimeler: "aile,nüfus,doğum,çocuk,evlilik,boşanma,anne,baba,din,inanç,değer,gelenek,ahlak,gençlik,kreş,sosyal medya",
  },
  {
    ad: "Kurultay Hakkında",
    aciklama: "Platformun yayın ilkeleri, oylama düzeni ve işleyişi üzerine tartışmalar.",
    kelimeler: "platform,kurultay,oylama,ilke,kurul,yayın,moderasyon,azınlık,çoğunluk,yönetmen",
    kurallar: "Yayın ilkelerini değiştirmek için Kararlar sayfasından ilke önerisi yapılır.",
  },
];

function kategorileriTohumla(db: DatabaseSync) {
  const ekle = db.prepare(
    "INSERT INTO kategoriler (ust_id, ad, aciklama, anahtar_kelimeler, kurallar) VALUES (?, ?, ?, ?, ?)",
  );
  const yaz = (k: TohumKategori, ustId: number | null) => {
    const id = Number(ekle.run(ustId, k.ad, k.aciklama, k.kelimeler, k.kurallar ?? "").lastInsertRowid);
    k.alt?.forEach((a) => yaz(a, id));
  };
  TOHUM.forEach((k) => yaz(k, null));
}

/** Tüm tabloları siler ve şemayı baştan kurar (yalnızca demo betiği için; sunucu açıkken de çalışır). */
export function veritabaniniSifirla() {
  const d = baglanti();
  const tablolar = (d.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]).map(
    (t) => t.name,
  );
  d.exec("PRAGMA foreign_keys = OFF;");
  for (const t of tablolar) d.exec(`DROP TABLE IF EXISTS "${t}"`);
  d.exec("PRAGMA foreign_keys = ON;");
  semaKur(d);
}

// Bağlantı ilk kullanımda açılır (derleme sırasında açılmaz) ve
// geliştirme modunda sayfa yenilendikçe tekrar açılmaz.
const g = globalThis as unknown as { __forumDb?: DatabaseSync };
function baglanti() {
  return g.__forumDb ?? (g.__forumDb = ac());
}

export const db = new Proxy({} as DatabaseSync, {
  get(_hedef, alan) {
    const d = baglanti();
    const deger = Reflect.get(d, alan, d);
    return typeof deger === "function" ? deger.bind(d) : deger;
  },
});
