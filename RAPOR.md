# Kurultay — Teknik Rapor (özet)

YZM327 · Yazılım Mühendisliği için Yapay Zekâ · 2026–2027 Güz · 9 Ekim 2026

Hazırlayan: Seyyid A. Bozkurt · 24290381

> Raporun tamamı, ekran görüntüleri ve diyagramlarıyla birlikte: **[Kurultay_Teknik_Rapor.pdf](Kurultay_Teknik_Rapor.pdf)**. Bu dosya onun kısa özetidir.

**Kurultay, gündemi üyelerin belirlediği, tartışmayı üyelerin yürüttüğü ve sonucu üyelerin oyladığı sansürsüz bir kamuoyu platformudur.** Adını, eski Türk devletlerinde kağan seçiminin, törenin ve savaş-barış kararlarının konuşulduğu meclisten alır; Göktürk ve Uygur döneminde aynı meclise *toy* denirdi. Ödevin on beş isteğinin tamamı çalışan bir özellikle karşılandı. Karar düzeni ABD yasama sistemini örnek alır.

## Öne çıkanlar

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

## Problem çerçeveleme ve ölçüm (Hafta 2)

İki akıllı bileşen için önce "YZ gerekli mi?" soruldu; cevap "önce kural" oldu. Tehdit denetiminde metrik F0.5'tir, çünkü yanlış alarm sansür demektir.

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

Karışıklık matrisi: 14 DP, 6 YN, 2 YP, 38 DN. Kaçan tehditlerin çoğu örtüktür ("Arabana bomba koyacağım."); tek yanlış alarm türü tehdit alıntılayıp kınayan cümlelerdir. Ölçüm, ünlüyle biten fiil köklerini kaçıran bir hatayı ortaya çıkardı; düzeltildi ve testle korundu.

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

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS · `node:sqlite` (17 tablo, WAL) · PWA. İş mantığı `forum/src/lib/` altında arayüzden bağımsız modüllerdedir. Kod 128 dosya, yaklaşık 11.700 satır.

## Çalıştırma

`Kurultay.cmd`'ye çift tıkla: başlatıcı paketleri kurar, uygulamayı derler, demo verisini hazırlar, masaüstüne simge ekler, telefon için ücretsiz Cloudflare tüneli açar ve Kurultay'ı kendi penceresinde açar. Telefonda uygulamadaki *Telefonda aç* sayfasındaki karekod okutulur. Tanıtım turunun sonundaki canlı gösterim her açılışta kendi oylamasını hazırlar; demo yenilenmeden tekrar izlenebilir.

## YZ kullanım beyanı

Bu projede kod, test, arayüz ve rapor taslağı için Claude Code (Anthropic) kodlama yardımcısı olarak kullanılmıştır. Fikir ve tasarım kararları bana aittir; üretilen her şey çalıştırılarak, testlerle ve ölçümle kontrol edilmiştir.
