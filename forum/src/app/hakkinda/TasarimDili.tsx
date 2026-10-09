import { KilimSerit, Motif } from "@/components/motif/Motif";
import { OtagCizimi } from "@/components/motif/OtagCizimi";
import { BOLUM_MOTIFI, DESENLER } from "@/components/motif/desenler";
import { KullaniciAvatar } from "@/components/ortak/KullaniciAvatar";

/** Eski Türklerde yönler renklerle anılırdı; arayüzün renk sistemi bu beşlidir. */
const YON_RENKLERI = [
  { renk: "var(--kara)", ad: "Kara", yon: "kuzey", is: "yazı ve çizgiler" },
  { renk: "var(--kizil)", ad: "Kızıl", yon: "güney", is: "hayır oyu, kilim kuşağı" },
  { renk: "var(--ak)", ad: "Ak", yon: "batı", is: "keçe zemin" },
  { renk: "var(--gok)", ad: "Gök", yon: "doğu", is: "Eğitim bölümü, YZ Analist" },
  { renk: "var(--sari)", ad: "Sarı", yon: "merkez", is: "tündük, seçim vurgusu" },
];

const ORNEK_UYELER = ["elif_demir", "oguz_karaca", "selin_kurt", "hakan_ay", "fatma_yalcin", "can_ozturk"];

export function TasarimDili() {
  const bolumler = Object.entries(BOLUM_MOTIFI);
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
          <p>
            <b>Kurultay</b>, Türk devletlerinde kağan seçiminin, törenin ve savaş-barış kararlarının konuşulduğu meclistir. Göktürk ve
            Uygur döneminde aynı meclise <i>toy</i> denirdi (Orhun harfleriyle <span className="orhun text-base">𐱃𐰆𐰖</span>). Toplantı
            otağda yapılır, kararı tek kişi değil meclis verirdi. Platform da böyle çalışır: gündem, tartışma ve karar üyelerindir.
          </p>
          <p className="text-muted-foreground">
            Arayüz bu yüzden bir otağın içi gibi tasarlandı: zemin keçe, kenarlar kilim şeridi, her bölümün bir kilim motifi, her üyenin bir
            tamgası var. Motifler dokuma ızgarasında, ilmek ilmek çizildi. Siyasi okunabilecek semboller (bozkurt, Kayı tamgası, üç hilal)
            bilerek kullanılmadı; platform her görüşe eşit uzaklıkta durmalı.
          </p>
        </div>
        <OtagCizimi className="mx-auto w-48" />
      </div>

      <div>
        <h3 className="text-lg font-semibold">Dört yön ve merkez</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Eski Türkler yönleri renkle anardı: Karadeniz kuzeydeki, Akdeniz batıdaki deniz demektir. Arayüzün beş temel rengi bunlardır;
          diğer bölüm renkleri Anadolu kilimlerinin kök boyalarından (çivit, yaşıl, al, mor, gül, kahve) gelir.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {YON_RENKLERI.map((r) => (
            <li key={r.ad} className="flex flex-col gap-1.5">
              <span className="h-10 rounded-[3px] border" style={{ background: r.renk }} />
              <span className="text-sm font-semibold">
                {r.ad} <span className="font-normal text-muted-foreground">· {r.yon}</span>
              </span>
              <span className="text-xs text-muted-foreground">{r.is}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Bölüm motifleri</h3>
        <p className="mt-1 text-sm text-muted-foreground">Her ana bölüm, anlamı konusuna yakın bir kilim motifiyle anılır.</p>
        <ul className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {bolumler.map(([bolum, { motif, renk }]) => (
            <li key={bolum} className="flex gap-3">
              <Motif ad={motif} renk={renk} className="size-9" />
              <div>
                <div className="text-sm font-semibold">
                  {DESENLER[motif].ad} <span className="font-normal text-muted-foreground">· {bolum}</span>
                </div>
                <div className="text-xs leading-snug text-muted-foreground">{DESENLER[motif].anlam}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Tamgalar</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Eski Türklerde her boyun bir damgası (tamga) vardı; mal ve belgeler onunla imzalanırdı. Burada her üyenin tamgası takma adından
          üretilir: bir gövde, bir ek ve bir boya. Aynı ad her zaman aynı tamgayı verir.
        </p>
        <ul className="mt-3 flex flex-wrap gap-4">
          {ORNEK_UYELER.map((ad) => (
            <li key={ad} className="flex items-center gap-2 text-sm">
              <KullaniciAvatar ad={ad} boyut="lg" />@{ad}
            </li>
          ))}
        </ul>
      </div>
      <KilimSerit desen="koc" ilmek={2} />
    </div>
  );
}
