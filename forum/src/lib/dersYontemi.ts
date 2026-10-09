/*
 * Dersin yöntemi: Hafta 1'de verilen CRISP-ML(Q) döngüsü ve Hafta 2'nin problem çerçeveleme ilkeleri.
 * Projenin her aşamada neyi nasıl yaptığını tek yerde tutar; tanıtım turu, "Nasıl işliyor?" sayfası
 * ve teknik rapor aynı metni buradan alır.
 */

/** Ders notlarındaki cümleler (Hafta 2, 3. ve 4. slayt). */
export const DERS_SLOGANI = "Önce doğru problemi bul, sonra problemi doğru çöz.";
export const CRISP_TANIMI = "CRISP-ML(Q): 6 aşamalı, kalite güvenceli döngü";

export type CrispAsamasi = {
  ad: string;
  /** Turdaki tek satırlık özet */
  kisa: string;
  /** Bu projede yapılan */
  metin: string;
  /** Aşamanın kalite güvencesi (Q) */
  kalite: string;
  /** Dosya ya da komut */
  dayanak: string;
};

export const CRISP_ASAMALARI: CrispAsamasi[] = [
  {
    ad: "İş ve veriyi anlama",
    kisa: "kanvas, paydaşlar, kısıtlar",
    metin:
      "Ödevin on beş isteği bir iş hedefine çevrildi: kamuoyu sansürsüz tartışsın, sonuca varsın, sonuç karar vericilere ulaşsın. Paydaşlar ve kısıtlar en başta yazıldı, iki akıllı bileşen için “YZ gerekli mi?” sorusu soruldu ve tek sayfalık kanvas dolduruldu.",
    kalite: "İsteklerin her biri bir özelliğe ve tura bağlandı; açıkta istek kalmadı.",
    dayanak: "Nasıl işliyor? · istekler ve kanvas",
  },
  {
    ad: "Veri hazırlama",
    kisa: "etiketli setler, Türkçe ön işleme",
    metin:
      "Etiketli Türkçe veri olmadığı için iki küçük set hazırlandı: yazılı etiket kılavuzuyla 60 cümlelik tehdit seti ve 63 konuluk bölüm seti. Bütün metinler aynı Türkçe ön işleme hattından geçer; I/İ tuzağı tr-TR küçültmeyle çözüldü.",
    kalite: "Test seti kodda sabittir, her ölçüm aynı veride yapılır; ön işleme birim testiyle korunur.",
    dayanak: "etiketliVeri.ts · metin.ts",
  },
  {
    ad: "Model geliştirme",
    kisa: "önce kural, yerel model isteğe bağlı",
    metin:
      "Yelpazenin solundan başlandı: tehdit denetimi ve bölüm önerisi kural tabanlıdır; ucuz, anında ve açıklanabilirdir. YZ Analist önce bilgisayardaki ücretsiz yerel modeli dener, yanıt yoksa kurala düşer (Cascade).",
    kalite: "Her karar gerekçesiyle gösterilir: engellenen cümle ve uygunluk puanının nedeni yazılır.",
    dayanak: "tehdit.ts · uygunluk.ts · yz.ts",
  },
  {
    ad: "Model değerlendirme",
    kisa: "temel çizgi merdiveni, F0.5",
    metin:
      "Rastgele, çoğunluk sınıfı, naif anahtar kelime ve bizim kural aynı sette yarışır. Dengesiz veride doğruluk yanılttığı için tehditte F0.5, bölümlerde makro F1 kullanıldı; karışıklık matrisi çıkarıldı, üç hata örneği okundu.",
    kalite: "Ölçüm, kuraldaki gerçek bir hatayı yakaladı; düzeltildi ve testle korundu.",
    dayanak: "npm run olcum",
  },
  {
    ad: "Dağıtım",
    kisa: "tek tıkla bilgisayar, karekodla telefon",
    metin:
      "Kurultay.cmd paketleri kurar, uygulamayı derler, demo verisini hazırlar ve Kurultay’ı kendi penceresinde açar. Telefon aynı Wi-Fi’dan ya da ücretsiz HTTPS tüneliyle karekodla bağlanır, uygulama ana ekrana eklenir.",
    kalite: "Kaynak değiştiyse yeniden derlenir; tünel aracı imzası doğrulanmadan çalıştırılmaz.",
    dayanak: "scripts/baslat.mjs · /telefon",
  },
  {
    ad: "İzleme ve bakım",
    kisa: "her açılışta ölçüm ve zincir denetimi",
    metin:
      "Ölçüm tabloları bu sayfa her açıldığında yeniden hesaplanır; Açık Arşiv’in hash zinciri arşiv sayfası her açıldığında baştan doğrulanır. Kuralın kaçırdığı bir tehdidi topluluk oylamayla gizleyebilir: insan döngüdedir.",
    kalite: "Karar motoru 15 birim testiyle korunur; her değişiklikten sonra npm test çalışır.",
    dayanak: "olcum.ts · defter.ts · npm test",
  },
];

/** Döngünün ortasındaki Q: her aşamanın kontrolü. */
export const KALITE_GUVENCESI =
  "Döngünün ortasında kalite güvencesi var: TypeScript tip denetimi, ESLint, 15 birim testi, ölçüm betiği ve Açık Arşiv’in hash zinciri. Bir aşama kendi kontrolünden geçmeden sonrakine geçilmedi.";

/** [hafta, ilke, bu projedeki karşılığı] */
export const DERS_ILKELERI: [string, string, string][] = [
  ["Hafta 1", "YZ sistemi ≠ model", "Yapay zekâ platformun küçük bir parçası; asıl iş oylamada, arşivde ve arayüzde. YZ hiçbir zaman karar vermez, oy kullanmaz."],
  ["Hafta 1", "CRISP-ML(Q) döngüsü", "Proje altı aşamayla yürütüldü; her aşamanın kalite kontrolü var."],
  ["Hafta 1", "Teknik borç faiz işletir", "532 satırlık oylama dosyası üçe bölündü, üç kopya metin temizliği tek hatta birleşti, davranış testlerle korundu."],
  ["Hafta 2", "YZ gerekli mi?", "Karar ağacı iki bileşen için de “kural yazın” dedi: basit kural işi görüyor, etiketli veri yok."],
  ["Hafta 2", "İş hedefi → karar → görev", "Tehdit: engelle ya da yayınla (ikili sınıflandırma). Bölüm: konuyu nereye koyalım (çok sınıflı, Lab 2’deki talep yönlendirmenin aynısı)."],
  ["Hafta 2", "Doğruluk tuzağı, eşik bir iş kararıdır", "Yanlış alarm sansür demek: F0.5 ve koruyucu metrik olarak duyarlılık. Dengesiz bölümlerde makro F1."],
  ["Hafta 2", "Baseline olmadan sayı anlamsız", "Rastgele, çoğunluk sınıfı ve naif anahtar kelime aynı sette ölçüldü."],
  ["Hafta 2", "Kısıtlar ve paydaşlar en başta", "Ücretsiz, dış API yok, anında, açıklanabilir; kişisel bilgiler yalnızca sahibine görünür."],
  ["Hafta 2", "Tek sayfalık kanvas ve ön-otopsi", "İki bileşen için sekiz kutu dolduruldu; riskler ve önlemleri raporda."],
  ["Hafta 2", "Lab 2 çıktıları", "Veri özeti, baseline tablosu, karışıklık matrisi, üç hata örneği, kural modülü ve testleri."],
  ["Hafta 2", "YZ kullanım beyanı", "Teknik raporda."],
];
