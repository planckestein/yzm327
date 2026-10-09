# Kurultay — Teknik Rapor (özet)

YZM327 · Yazılım Mühendisliği için Yapay Zekâ · 2026–2027 Güz · 9 Ekim 2026

Hazırlayan: Seyyid A. Bozkurt · 24290381

> Raporun tamamı, ekran görüntüleri ve diyagramlarıyla birlikte: **[Kurultay_Teknik_Rapor.pdf](Kurultay_Teknik_Rapor.pdf)**. Bu dosya onun kısa özetidir.

**Kurultay, gündemi üyelerin belirlediği, tartışmayı üyelerin yürüttüğü ve sonucu üyelerin oyladığı sansürsüz bir kamuoyu platformudur.** Adını, eski Türk devletlerinde kağan seçiminin, törenin ve savaş-barış kararlarının konuşulduğu meclisten alır; Göktürk ve Uygur döneminde aynı meclise *toy* denirdi. Ödevin on beş isteğinin tamamı çalışan bir özellikle karşılandı. Karar düzeni ABD yasama sistemini örnek alır.

## Öne çıkanlar

- **Dersin yöntemiyle.** Proje CRISP-ML(Q) döngüsüyle yürütüldü; her aşamanın kalite kontrolü var.
- **Her şey oylamayla.** Gündem, alt konu, gizleme, düzenleme, uzlaşma ve ilke değişikliği oylanır; görevliler de seçilir.
- **Sansür yok.** Tek yasak gerçek tehdittir (ABD 1. Değişikliği). Mesajlar silinmez.
- **Çoğunluk azınlığı ezemez.** Kurulda her bölüm eşit temsil edilir, kabul için 3/5 gerekir; azınlık görüşü kalıcıdır.
- **Ölçülmüş kurallar.** Tehdit denetimi F0.5 = 0,83 (naif yöntem 0,44); bölüm önerisi makro F1 = 0,69.
- **Tasarım desenleri adlarıyla.** Dersin yedi başlığı kodda karşılık buldu; karar motoru 15 birim testiyle korunur.
- **Tek tıkla.** Masaüstündeki simge Kurultay'ı kendi penceresinde açar; telefon karekodla bağlanır.
- **Sıfır maliyet.** Ücretli servis ya da dış API yok.

## Ödevin istekleri ve karşılıkları

| # | İstek | Karşılığı |
| --- | --- | --- |
| 1 | Giriş ekranı; ad soyad, adres, doğum tarihi, takma ad, şifre | Kayıt ve giriş; bcrypt. Adres ve doğum tarihi yalnızca sahibine görünür. |
| 2 | Herkes konu açabilir; kabul için çoğunluk | Gündem önerisi Topluluk Oylaması'na çıkar; salt çoğunlukla açılır. |
| 3 | Konuyu ilgilendirenler oylar | Oy hakkı, konunun bölümünü takip edenlerindir. |
| 4 | Alt konular önerilebilir | Açık her konuya alt konu önerilir ve oylanır. |
| 5 | Silme ve düzenleme teklif edilebilir | Kaldırmayı herkes, düzenlemeyi konuyu açan önerir; iki aşamalı oylama. |
| 6 | Tartışmalar silinmez; silme oylamaya çıkar | Mesajlar silinemez; en fazla oylamayla gizlenir, kaydı kalır. |
| 7 | Konu sonunda uzlaşma; farklı fikirler oylanır | Yarışan uzlaşma önerileri; katılmayanlar azınlık görüşü yazar. |
| 8 | Her şey oylamayla | Bütün değişiklikler bir süreçtir ve oylanır. |
| 9 | Yönetmelik, roller ve ontoloji | Oylamayla değişen Yayın İlkeleri; altı rol; 11 + 8 bölümlük ağaç ve uygunluk puanı. |
| 10 | Çoğunluk azınlığı ezmesin | Eşit temsil, 3/5, kalıcı azınlık görüşü, emanet tavanı. |
| 11 | Bazıları daha eşit; oy havalesi | Bölüm bazında, zincirleme oy emaneti; kişi başı en fazla 5 oy. |
| 12 | Bilgili kullanıcılar; API ile bağlı YZ | Uzman rolü ve YZ Analist (kural tabanlı; isteğe bağlı yerel Ollama). |
| 13 | İnsanları grafta tut | Etkileşim, emanet ve destek ağları kuvvet yönlü graf olarak çizilir. |
| 14 | Dağıtık defter | SHA-256 hash zinciri; her açılışta doğrulanır, indirilebilir. |
| 15 | Uygulama + web sitesi | Web sitesi, masaüstü uygulama penceresi ve telefona kurulan PWA. |

## Karar düzeni

| ABD | Kurultay |
| --- | --- |
| Temsilciler Meclisi | Topluluk Oylaması (salt çoğunluk) |
| Senato (eyalet başına 2) | Yayın Kurulu (bölüm başına 2, kabul için 3/5) |
| Başkan: imza ya da veto | Genel Yayın Yönetmeni: onay ya da veto (3 gün sessizlik onay) |
| Vetonun 2/3 ile aşılması | Vetoyu aşma: Topluluk ve Kurul, ikisinde de 2/3 |
| 1. Değişiklik (tek istisna: gerçek tehdit) | Tehdit dışında sansür yok |

Salt çoğunlukta *n* oy verenlerin değil konuyla ilgili bütün üyelerin sayısıdır: `salt = ⌊n/2⌋ + 1`, `3/5 = ⌈3n/5⌉`, `2/3 = ⌈2n/3⌉`. Sonuç kesinleşince oylama erken kapanır. Eşiklerin hepsi oylamayla değiştirilebilir.

## Yöntem: CRISP-ML(Q) döngüsü (Hafta 1–2)

Hoca, projenin dersin yöntemiyle yürütülmesini istedi: *"Önce doğru problemi bul, sonra problemi doğru çöz."* Kurultay, Hafta 1'de verilen altı aşamalı, kalite güvenceli döngüyle geliştirildi.

| Aşama | Bu projede yapılan | Kalite güvencesi (Q) |
| --- | --- | --- |
| 1. İş ve veriyi anlama | 15 istek bir iş hedefine çevrildi; paydaşlar, kısıtlar, "YZ gerekli mi?", 8 kutulu kanvas, ön-otopsi | Her istek bir özelliğe ve tura bağlandı |
| 2. Veri hazırlama | 60 cümlelik tehdit seti (yazılı etiket kılavuzu), 63 konuluk bölüm seti; tek Türkçe ön işleme hattı (I/İ tuzağı çözüldü) | Sabit test seti; ön işleme testle korunur |
| 3. Model geliştirme | Yelpazenin solundan: kural tabanlı, açıklanabilir; YZ Analist'te yerel model → kural (Cascade) | Her kararın gerekçesi gösterilir |
| 4. Model değerlendirme | Temel çizgi merdiveni, F0.5 ve makro F1, karışıklık matrisi, 3 hata örneği | Ölçüm gerçek bir hatayı yakaladı, düzeltildi |
| 5. Dağıtım | Tek tıkla başlatıcı, telefon için karekod ve HTTPS tüneli | Değişince yeniden derleme; tünel aracının imzası doğrulanır |
| 6. İzleme ve bakım | Ölçüm tabloları ve hash zinciri her açılışta yeniden hesaplanır; kaçan tehdidi topluluk gizler | 15 birim testi her değişiklikte çalışır |

Hafta 1'in öteki iki ilkesi de karşılandı: **YZ sistemi ≠ model** (YZ kodu ~670 satır, kod tabanının ~%6'sı; YZ karar vermez) ve **teknik borç** (God Object bölündü, kopya kod birleşti, davranış testlerle korundu). Uygulamanın "Nasıl işliyor?" sayfasında aynı tablo durur; tanıtım turunun yedinci adımı bunu gösterir.

## Problem çerçeveleme ve ölçüm (Hafta 2)

İki akıllı bileşen için önce "YZ gerekli mi?" soruldu; cevap "önce kural" oldu. Her ikisi de çerçeveleme hunisinden (iş hedefi → karar → tahmin → görev) geçirildi; paydaşlar, kısıtlar, üç katmanlı metrik ve ön-otopsi raporda tablolarıyla yer alır. Eşik bir iş kararıdır: tehdit denetiminde metrik F0.5'tir, çünkü yanlış alarm sansür demektir; kaçan tehdit ise topluluk oylamasıyla geri alınabilir. Bölüm önerisi, Lab 2'deki belediye talep yönlendirme vakasıyla aynı biçimdedir (metin → K birimden biri, makro F1).

| Tehdit denetimi (60 cümle) | Doğruluk | Kesinlik | Duyarlılık | F0.5 |
| --- | --- | --- | --- | --- |
| Rastgele (oranla) | %52 | 0,29 | 0,30 | 0,29 |
| Çoğunluk sınıfı | %67 | 0,00 | 0,00 | 0,00 |
| Naif anahtar kelime | %57 | 0,41 | 0,65 | 0,44 |
| **Kurultay kuralı** | **%87** | **0,88** | **0,70** | **0,83** |

| Bölüm önerisi (63 konu, 11 bölüm) | Doğruluk | Makro F1 |
| --- | --- | --- |
| Rastgele (oranla) | %21 | 0,15 |
| Çoğunluk sınıfı | %19 | 0,03 |
| **Kurultay kuralı** | **%68** | **0,69** |

Karışıklık matrisi: 14 DP, 6 YN, 2 YP, 38 DN. Kaçan tehditlerin çoğu örtüktür ("Arabana bomba koyacağım."); tek yanlış alarm türü tehdit alıntılayıp kınayan cümlelerdir. Ölçüm, ünlüyle biten fiil köklerini kaçıran bir hatayı ortaya çıkardı; düzeltildi ve testle korundu. Lab 2 çıktılarının hepsi (veri özeti, aptal ve kural baseline'ları, sabit test seti, karışıklık matrisi, üç hata örneği, yeşil testler, kanvas, YZ kullanım beyanı) raporda bir kontrol listesiyle gösterilir.

## Tasarım desenleri

| Ders başlığı | Karşılığı |
| --- | --- |
| SOLID | 532 satırlık oylama dosyası süreç, oylama ve emanet olarak üçe bölündü; yeni öneri türü = yeni kayıt. |
| Yaratımsal | Singleton (veritabanı), Registry + Factory (öneri türleri, YZ özetleyicileri). |
| Yapısal | Facade (YZ Analist), Adapter (Ollama), Proxy (gecikmeli bağlantı), Composite (bölüm ağacı), Decorator (kalabalık görünümü). |
| Davranışsal | State (karar aşamaları), Strategy (eşikler), Chain of Responsibility (uygunluk), Command (süreç kaydı), Memento (eski sürümler). |
| YZ'ye özgü | Cascade (yerel model → kural), Heuristic Benchmark (ölçüm), Pipeline (Türkçe ön işleme). |
| Anti-desenler | God Object, kopya normalleştirme ve uzun switch zincirleri giderildi; gereksiz desenler bilerek eklenmedi. |

## Tasarım dili: otağ ve kilim

Arayüz kurultayın toplandığı otağın içi gibi tasarlandı: keçe zemin, kilim şeritleri, eski Türklerin dört yön renkleri (kara, kızıl, ak, gök ve merkezde sarı), her ana bölüme bir kilim motifi (muska, kuş, bereket, yıldız, pıtrak, hayat ağacı, göz, su yolu, koçboynuzu, elibelinde, otağ) ve her üyeye takma adından üretilen bir tamga. Motifler dokuma ızgarasında ilmek ilmek tanımlanır. Siyasi okunabilecek semboller bilerek kullanılmadı.

## Teknik yapı

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS · `node:sqlite` (17 tablo, WAL) · PWA. İş mantığı `forum/src/lib/` altında arayüzden bağımsız modüllerdedir. Kod 130 dosya, yaklaşık 12.000 satır.

## Çalıştırma

`Kurultay.cmd`'ye çift tıkla: başlatıcı paketleri kurar, uygulamayı derler, demo verisini hazırlar, masaüstüne simge ekler, telefon için ücretsiz Cloudflare tüneli açar ve Kurultay'ı kendi penceresinde açar. Telefonda uygulamadaki *Telefonda aç* sayfasındaki karekod okutulur. Tanıtım turunun sonundaki canlı gösterim her açılışta kendi oylamasını hazırlar; demo yenilenmeden tekrar izlenebilir.

## YZ kullanım beyanı

Bu projede kod, test, arayüz ve rapor taslağı için Claude Code (Anthropic) kodlama yardımcısı olarak kullanılmıştır. Fikir ve tasarım kararları bana aittir; üretilen her şey çalıştırılarak, testlerle ve ölçümle kontrol edilmiştir.
