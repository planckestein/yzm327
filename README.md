# Ortak Akıl — YZM327

**Kamuoyunun sansürsüz sesi.** Gündemi vatandaşların belirlediği, tartışmayı vatandaşların yürüttüğü ve sonucu vatandaşların oyladığı bağımsız bir kamuoyu platformu. Karar düzeni ABD yasama sistemini örnek alır.

- 📄 **Proje raporu:** [RAPOR.md](RAPOR.md)
- 🛠️ **Ayrıntılı kullanım kılavuzu:** [forum/README.md](forum/README.md)

## Hızlı başlangıç

Gereken tek şey [Node.js](https://nodejs.org) (LTS).

```bash
npm run kurulum    # bağımlılıkları kurar (ilk seferde)
npm run demo       # 6 haftalık örnek platform verisi
npm run dev        # http://localhost:3000
```

Demo hesaplarının hepsinin şifresi `demo1234`. Giriş ekranındaki "Demo hesapları" panelinden tek tıkla girilir.

## Klasör yapısı

```
RAPOR.md        Proje raporu
forum/          Next.js uygulaması
  src/lib/      İş mantığı (oylama, seçim, defter, tehdit, YZ...)
  src/app/      Sayfalar
  scripts/      Demo verisi
```

## Teknolojiler

Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · SQLite (`node:sqlite`) · PWA
