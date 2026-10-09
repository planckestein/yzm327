# Kurultay — YZM327

**Kamuoyunun sansürsüz sesi.** Gündemi vatandaşların belirlediği, tartışmayı vatandaşların yürüttüğü ve sonucu vatandaşların oyladığı bağımsız bir kamuoyu platformu. Karar düzeni ABD yasama sistemini örnek alır.

- 📄 **Teknik rapor:** [Kurultay_Teknik_Rapor.pdf](Kurultay_Teknik_Rapor.pdf) (özeti: [RAPOR.md](RAPOR.md))
- 🛠️ **Ayrıntılı kullanım kılavuzu:** [forum/README.md](forum/README.md)

## Açmak

Gereken tek şey [Node.js](https://nodejs.org) (LTS). Proje klasöründeki **`Kurultay.cmd`** dosyasına çift tıkla. İlk açılışta paketleri kurar, uygulamayı derler, demo verisini hazırlar, masaüstüne otağ simgeli **Kurultay** kısayolunu ekler ve Kurultay'ı kendi penceresinde açar. Sonraki açılışlarda masaüstündeki simge yeter.

- **Telefonda:** uygulamada sağ üstteki telefon simgesi (*Telefonda aç*) karekod gösterir; okut, açılınca tarayıcı menüsünden *Ana ekrana ekle*.
- **Demoyu sıfırlamak:** `Kurultay (demo verisini yenile).cmd`. Kendi açtığın hesaplar korunur.
- Konsol penceresi açık kaldıkça Kurultay çalışır; kapatınca Kurultay da kapanır.

## Geliştirici komutları

```bash
npm run baslat     # Kurultay.cmd ile aynı: kur, derle, aç
npm run kurulum    # bağımlılıkları kurar (ilk seferde)
npm run demo       # 6 haftalık örnek platform verisi
npm run dev        # http://localhost:3000
npm test           # birim testleri
npm run olcum      # kuralların temel çizgilerle ölçümü
```

Demo hesaplarının hepsinin şifresi `demo1234`. Giriş ekranındaki "Demo hesapları" panelinden tek tıkla girilir.

## Klasör yapısı

```
Kurultay.cmd    Çift tıkla aç (başlatıcı)
RAPOR.md        Raporun özeti; tamamı Kurultay_Teknik_Rapor.pdf
forum/          Next.js uygulaması
  src/lib/      İş mantığı (oylama, seçim, defter, tehdit, YZ...)
  src/app/      Sayfalar
  scripts/      Başlatıcı, demo verisi ve ölçüm raporu
  tests/        Birim testleri
```

## Teknolojiler

Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · SQLite (`node:sqlite`) · PWA
