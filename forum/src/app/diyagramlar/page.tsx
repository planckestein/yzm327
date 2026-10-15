import type { Metadata } from "next";
import { SayfaBasligi } from "@/components/ortak/SayfaBasligi";
import { Sekil, type SekilVerisi } from "@/components/uml/Sekil";
import { GosterimAnahtari, KULLANIM_ANAHTARI, SINIF_ANAHTARI, SIRA_ANAHTARI } from "@/components/uml/GosterimAnahtari";
import { KULLANIM_SEKILLERI, SINIF_SEKILLERI, SIRA_SEKILLERI } from "./sekiller";
import { SENARYOLAR, SORULAR } from "./metinler";
import { YazdirDugmesi } from "./YazdirDugmesi";

export const metadata: Metadata = { title: "UML diyagramları" };

/*
 * UML diyagramları: kullanım durumu, sınıf ve sıralama. Diyagramlar koddan çıkarıldı ve burada SVG olarak çizilir;
 * aynı veriler teknik raporun UML bölümünde de kullanılır.
 */

function Baslik({ ust, children }: { ust: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t pt-3">
      <span className="ust-etiket">{ust}</span>
      <h2 className="text-2xl font-semibold">{children}</h2>
    </div>
  );
}

const BOLUMLER: { id: string; no: number; ad: string; ust: string; giris: string; sekiller: SekilVerisi[] }[] = [
  {
    id: "kullanim",
    no: 1,
    ad: "Kullanım durumu diyagramları",
    ust: "Kim, ne yapıyor?",
    giris:
      "Sistemi kimin kullandığını ve her birinin ne yaptığını gösterir. Aktörler sistem sınırının dışında, kullanım durumları içindedir.",
    sekiller: KULLANIM_SEKILLERI,
  },
  {
    id: "sinif",
    no: 2,
    ad: "Sınıf diyagramları",
    ust: "Sistem neyden oluşuyor?",
    giris:
      "İlk ikisi alan modelidir: veritabanındaki tablolar, sütunları ve aralarındaki ilişkiler. Son ikisi tasarımdır: modüller, arayüzler ve dersin tasarım desenleri.",
    sekiller: SINIF_SEKILLERI,
  },
  {
    id: "sira",
    no: 3,
    ad: "Sıralama diyagramları",
    ust: "İş nasıl yürüyor?",
    giris:
      "Bir işlemin arayüzden veritabanına kadar hangi fonksiyonlardan, hangi sırayla geçtiği. Soldan sağa: kullanıcı, arayüz, server action, lib modülleri, SQLite.",
    sekiller: SIRA_SEKILLERI,
  },
];

export default function DiyagramlarSayfasi() {
  const tumu = BOLUMLER.flatMap((b) => b.sekiller).length;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
      <SayfaBasligi ust="Ders projesi · UML" baslik="UML diyagramları" sag={<YazdirDugmesi />}>
        Kurultay’ın kullanım durumu, sınıf ve sıralama diyagramları ({tumu} şekil). Hepsi kaynak koddan çıkarıldı: sınıflar veritabanı
        şemasından ve TypeScript tiplerinden, mesajlar gerçek fonksiyon çağrılarından. Her şeklin altında dayandığı dosyalar yazıyor.
      </SayfaBasligi>

      <nav aria-label="Şekiller" data-tur="uml" className="grid gap-6 md:grid-cols-3">
        {BOLUMLER.map((b) => (
          <div key={b.id} className="flex flex-col gap-2">
            <a href={`#${b.id}`} className="font-semibold hover:underline">
              {b.no}. {b.ad}
            </a>
            <ol className="flex flex-col gap-1 text-sm">
              {b.sekiller.map((s) => (
                <li key={s.kod}>
                  <a href={`#${s.kod}`} className="flex gap-2 hover:underline">
                    <span className="w-7 shrink-0 text-vurgu tabular-nums">{s.no}</span>
                    <span>{s.baslik}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </nav>

      <section className="flex flex-col gap-5 print:break-inside-avoid">
        <Baslik ust="Gösterim">İşaretler ne anlatıyor?</Baslik>
        <div className="grid gap-8 lg:grid-cols-3">
          <GosterimAnahtari baslik="Kullanım durumu" ornekler={KULLANIM_ANAHTARI} on="ga-k" />
          <GosterimAnahtari baslik="Sınıf" ornekler={SINIF_ANAHTARI} on="ga-s" />
          <GosterimAnahtari baslik="Sıralama" ornekler={SIRA_ANAHTARI} on="ga-q" />
        </div>
      </section>

      {BOLUMLER.map((b) => (
        <section key={b.id} id={b.id} className="flex scroll-mt-28 flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Baslik ust={b.ust}>
              {b.no}. {b.ad}
            </Baslik>
            <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{b.giris}</p>
          </div>
          {b.sekiller.map((s) => (
            <Sekil key={s.kod} sekil={s} />
          ))}
          {b.id === "kullanim" && <Senaryolar />}
        </section>
      ))}

      <section id="sorular" className="flex scroll-mt-28 flex-col gap-5">
        <Baslik ust="Diyagramları okurken">Sık sorulanlar</Baslik>
        <dl className="grid gap-x-10 md:grid-cols-2">
          {SORULAR.map(([soru, cevap]) => (
            <div key={soru} className="border-t py-3 print:break-inside-avoid">
              <dt className="font-medium">{soru}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{cevap}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function Senaryolar() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold">Kullanım durumu senaryoları</h3>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Diyagramdaki üç temel kullanım durumunun adım adım anlatımı: kimin başlattığı, neyin önceden doğru olması gerektiği, olağan
          akış, ayrılan yollar ve sonuç.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {SENARYOLAR.map((s) => (
          <article key={s.ad} className="kece-kart flex flex-col gap-3 p-4 text-sm print:break-inside-avoid">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-base font-semibold">{s.ad}</h4>
              <span className="shrink-0 text-xs text-muted-foreground">Şekil {s.sekil}</span>
            </div>
            <dl className="flex flex-col gap-2 leading-snug">
              <div>
                <dt className="ust-etiket">Aktörler</dt>
                <dd>{s.aktorler}</dd>
              </div>
              <div>
                <dt className="ust-etiket">Ön koşul</dt>
                <dd>{s.onKosul}</dd>
              </div>
              <div>
                <dt className="ust-etiket">Ana akış</dt>
                <dd>
                  <ol className="ml-4 list-decimal space-y-1">
                    {s.akis.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ol>
                </dd>
              </div>
              <div>
                <dt className="ust-etiket">Alternatif akışlar</dt>
                <dd className="flex flex-col gap-1">
                  {s.alternatif.map((a) => (
                    <span key={a}>{a}</span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="ust-etiket">Son koşul</dt>
                <dd>{s.sonKosul}</dd>
              </div>
              <div>
                <dt className="ust-etiket">Kod</dt>
                <dd className="font-mono text-xs text-muted-foreground">{s.kod}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
