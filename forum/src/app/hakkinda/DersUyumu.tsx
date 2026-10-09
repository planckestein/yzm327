import { ontolojiOlcumu, tehditOlcumu } from "@/lib/olcum";
import { cn } from "@/lib/utils";

/*
 * "Nasıl işliyor?" sayfasındaki ders uyumu bölümü: Yazılım Tasarım Desenleri dersinin yedi başlığı ve
 * Hafta 2 (Problem Çerçeveleme) ölçümleri. Ölçüm tabloları her açılışta yeniden hesaplanır.
 */

// [ders planındaki başlık, platformdaki karşılığı, dosyalar]
const DESENLER: [string, string, string][] = [
  [
    "Desen kavramı ve tarihçe",
    "Kodda her desen adıyla işaretli. Ekip içinde ortak sözlük: “aşamalar State ile yönetiliyor” demek yeterli.",
    "lib/*.ts başlık yorumları",
  ],
  [
    "SOLID ilkeleri",
    "Tek sorumluluk: 532 satırlık oylama dosyası süreç, oylama ve oy emaneti olarak üçe bölündü. Açık/Kapalı: yeni bir öneri türü ya da eşik eklemek mevcut kodu değiştirmez.",
    "surec.ts · oylama.ts · devir.ts",
  ],
  [
    "Yaratımsal desenler",
    "Singleton: tek veritabanı bağlantısı. Registry + Factory: öneri türleri ve YZ özetleyicileri kayıt defterinden seçilir.",
    "db.ts · surec.ts · yz.ts",
  ],
  [
    "Yapısal desenler",
    "Facade: YZ Analist’in tek kapısı. Adapter: Ollama API’si özetleyici arayüzüne uyarlanır. Proxy: veritabanı ilk kullanımda açılır. Composite: bölüm ağacı. Decorator: kalabalık görünümü gerçek sayımı sarar.",
    "yz.ts · db.ts · ontoloji.ts · oylama.ts",
  ],
  [
    "Davranışsal desenler",
    "State: karar aşamaları. Strategy: eşik hesapları. Chain of Responsibility: uygunluk denetimi. Command: her öneri geçmişi tutulan bir süreç kaydı. Memento: düzenlenen konunun eski hâli.",
    "surec.ts · kurallar.ts · uygunluk.ts",
  ],
  [
    "YZ ve veriye özgü desenler",
    "Cascade: önce yerel dil modeli, yanıt yoksa kural. Heuristic Benchmark: kural tabanlı temel çizgi ve ölçüm. Pipeline: her modül aynı Türkçe ön işlemeden geçer. Explainable Predictions: uygunluk puanı gerekçesiyle yazılır.",
    "yz.ts · olcum.ts · metin.ts",
  ],
  [
    "Anti-desenler",
    "Giderdiklerimiz: God Object, üç kez kopyalanmış metin normalleştirme, uzun switch zincirleri. Bilerek eklemediklerimiz: Builder, Prototype, Flyweight, Bridge, Visitor, Mediator. Bu platformda çözdükleri bir sorun yok; eklemek altın çekiç olurdu.",
    "npm test · birim testleri",
  ],
];

// Hafta 2: tek sayfalık problem tanım kanvası, tehdit denetimi için
const KANVAS: [string, string][] = [
  ["İş hedefi", "Tehdidi durdurmak, başka hiçbir sözü durdurmamak (sansür yok)."],
  ["Karar", "Her mesaj gönderilirken: engelle ya da yayınla."],
  ["Görev", "İkili sınıflandırma: metin → tehdit / değil. “YZ gerekli mi?” ağacına göre kural yeterli; etiketli veri yok."],
  ["Veri", "60 cümlelik etiketli set, yazılı etiket kılavuzuyla. Kişisel veri yok."],
  ["Metrik", "F0.5 (kesinliğe ağırlık): yanlış alarm sansür demektir. Koruyucu metrik: duyarlılık."],
  ["Temel çizgi", "Rastgele, çoğunluk sınıfı, naif anahtar kelime (aşağıda)."],
  ["Kısıtlar", "Ücretsiz, dış API yok, anında yanıt, açıklanabilir: engellenen cümle kullanıcıya gösterilir."],
  ["Risk", "Kaçan tehdidi topluluk oylamayla gizleyebilir (insan döngüde). Yanlış alarmda ise kişi sözünü hiç söyleyemez; bu yüzden F0.5."],
];

const yuzde = (x: number) => `%${Math.round(x * 100)}`;
const iki = (x: number) => x.toFixed(2).replace(".", ",");

function Tablo({ basliklar, satirlar }: { basliklar: string[]; satirlar: { vurgu: boolean; hucreler: string[] }[] }) {
  // Dar ekranda geniş tablo kendi içinde kayar; sayfa yana kaymaz
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-y border-foreground text-sm tabular-nums", basliklar.length > 3 && "min-w-[460px]")}>
        <thead className="text-left text-[11px] text-muted-foreground">
          <tr className="border-b">
            {basliklar.map((b, i) => (
              <th key={b} className={cn("py-2 pr-3 font-medium", i > 0 && "text-right")}>
                {b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {satirlar.map(({ vurgu, hucreler }) => (
            <tr key={hucreler[0]} className={cn(vurgu && "font-semibold text-foreground")}>
              {hucreler.map((h, i) => (
                <td key={i} className={cn("py-2 pr-3", i > 0 && "text-right", !vurgu && "text-muted-foreground")}>
                  {h}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DersUyumu() {
  const t = tehditOlcumu();
  const o = ontolojiOlcumu();
  const cogunluk = t.satirlar.find((s) => s.yontem === "Çoğunluk sınıfı")!;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="border-b pb-2 text-2xl font-semibold">Yazılım tasarım desenleri</h3>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Ders planındaki yedi başlığın platformdaki karşılığı. Ders örnekleri Python ile yazılıyor; desenler dilden bağımsız olduğu için
          platform TypeScript ile yazıldı ve aynı desenler aynı adlarla uygulandı.
        </p>
        <ol className="divide-y border-y border-foreground">
          {DESENLER.map(([baslik, karsilik, dosya], i) => (
            <li key={baslik} className="grid gap-1 py-3 md:grid-cols-[2rem_minmax(0,0.8fr)_minmax(0,1.6fr)_11rem] md:gap-4">
              <span className="text-lg leading-6 font-semibold text-vurgu tabular-nums">{i + 1}</span>
              <span className="leading-6 font-semibold">{baslik}</span>
              <span className="text-sm leading-6 text-muted-foreground">{karsilik}</span>
              <span className="font-mono text-[11px] leading-6 text-muted-foreground md:text-right">{dosya}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="border-b pb-2 text-2xl font-semibold">Problem çerçeveleme ve ölçüm (Hafta 2)</h3>
        <p className="max-w-3xl text-sm text-muted-foreground">
          “YZ gerekli mi?” sorusuna platformun iki akıllı bileşeni için de “önce kural” cevabını verdik: basit bir kural işi görüyor,
          etiketli Türkçe veri yok ve kararı yine insanlar veriyor. Kural bir yenilgi değil, ileride bir modelin geçmesi gereken temel
          çizgidir. Bu yüzden kuralları en basit yöntemlerle aynı veride ölçtük (<code className="text-xs">npm run olcum</code>).
        </p>

        <dl className="grid gap-x-6 gap-y-3 border-y border-foreground py-4 sm:grid-cols-2 lg:grid-cols-4">
          {KANVAS.map(([ad, metin], i) => (
            <div key={ad}>
              <dt className="text-xs font-medium text-vurgu">
                {i + 1}. {ad}
              </dt>
              <dd className="mt-0.5 text-sm leading-snug">{metin}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="text-lg font-semibold">Tehdit denetimi · {t.ornek} etiketli cümle</div>
            <Tablo
              basliklar={["Yöntem", "Doğruluk", "Kesinlik", "Duyarlılık", "F0.5"]}
              satirlar={t.satirlar.map((s) => ({
                vurgu: s.yontem === "Bizim kural",
                hucreler: [s.yontem, yuzde(s.dogruluk), iki(s.kesinlik), iki(s.duyarlilik), iki(s.f05)],
              }))}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Doğruluk tuzağı: hiçbir tehdidi yakalamayan çoğunluk sınıfı bile {yuzde(cogunluk.dogruluk)} doğruluk alıyor; bu yüzden F0.5’e
              bakıyoruz. Ölçüm, ünlüyle biten fiil köklerinin (“bıçaklarım”) hiç yakalanmadığını ortaya çıkardı; düzelttik. Kalan{" "}
              {t.hatalar.length} hatanın çoğu örtük tehdit (“arabana bomba koyacağım”); bunları yakalamak için bir modelin bu tabloyu geçmesi
              gerekir.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="text-lg font-semibold">
              Bölüm önerisi · {o.ornek} konu, {o.sinif} bölüm
            </div>
            <Tablo
              basliklar={["Yöntem", "Doğruluk", "Makro F1"]}
              satirlar={o.satirlar.map((s) => ({
                vurgu: s.yontem === "Bizim kural",
                hucreler: [s.yontem, yuzde(s.dogruluk), iki(s.makroF1)],
              }))}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Bölümler dengesiz olduğu için makro F1 kullanıyoruz: küçük bölümler de eşit söz sahibi. Sınırlılık: anahtar kelimeleri ve demo
              konularını aynı ekip yazdı, sonuç iyimserdir. Gerçek kullanıcı konularıyla yeniden ölçülmeli.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
