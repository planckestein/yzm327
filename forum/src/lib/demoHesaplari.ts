/*
 * Demo hesapları: `npm run demo` bu hesapları oluşturur (şifre: demo1234).
 * Bu listede olmayan hesaplar (kendi açtığın hesap) demo yenilense bile korunur.
 */

export const DEMO_SIFRESI = "demo1234";

/** Giriş ekranında tek tıkla girilebilen öne çıkan demo hesapları */
export const ONE_CIKAN_DEMO_HESAPLARI: { takma_ad: string; aciklama: string }[] = [
  { takma_ad: "zeynep_k", aciklama: "Genel Yayın Yönetmeni · gazeteci" },
  { takma_ad: "elif_demir", aciklama: "Öğretmen · Yayın Kurulu (Eğitim)" },
  { takma_ad: "selin_kurt", aciklama: "Avukat · Yayın Kurulu (Hukuk)" },
  { takma_ad: "hakan_ay", aciklama: "İşçi · Yayın Kurulu (Ekonomi)" },
  { takma_ad: "can_ozturk", aciklama: "Üniversite öğrencisi" },
  { takma_ad: "burak_sahin", aciklama: "Esnaf · sık sık azınlıkta" },
  { takma_ad: "prof_leyla", aciklama: "Uzman · anayasa hukukçusu" },
  { takma_ad: "oguz_karaca", aciklama: "Emekli astsubay · milliyetçi-muhafazakâr" },
  { takma_ad: "fatma_yalcin", aciklama: "Üç çocuk annesi · dindar-muhafazakâr" },
  { takma_ad: "serdar_gunay", aciklama: "Girişimci · serbest piyasa yanlısı" },
  { takma_ad: "levent_aksoy", aciklama: "Emekli banka müdürü · merkezde" },
  { takma_ad: "egitim_bakanligi", aciklama: "Kurum hesabı" },
  { takma_ad: "dijital_komisyon", aciklama: "Kurum hesabı" },
];

/** Demo betiğinin oluşturduğu tüm hesaplar */
export const DEMO_TAKMA_ADLARI = [
  "zeynep_k", "selin_kurt", "prof_leyla", "elif_demir", "mert_yilmaz", "hakan_ay", "can_ozturk", "ayse_aydin",
  "burak_sahin", "deniz_arslan", "emre_celik", "ipek_yildiz", "dr_murat", "doc_nese", "kaan_dogan", "gizem_tas",
  "onur_polat", "yavuz_er", "oguz_karaca", "fatma_yalcin", "serdar_gunay", "levent_aksoy", "nur_ozcan", "egitim_bakanligi", "calisma_bakanligi", "dijital_komisyon", "cevre_bakanligi",
  "saglik_bakanligi", "yz_bilirkisi",
];
