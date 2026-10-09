import type { Metadata } from "next";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { SayfaBasligi } from "@/components/ortak/SayfaBasligi";
import { KilimSerit } from "@/components/motif/Motif";

export const metadata: Metadata = { title: "Telefonda aç" };

/**
 * Başlatıcının (scripts/baslat.mjs) açtığı ücretsiz Cloudflare tüneli: "acik" tünel dışarıdan çalışıyor,
 * "engelli" tünel kuruldu ama bu ağ Cloudflare'e bağlanmasına izin vermiyor, "kapali" tünel hiç kurulmadı.
 */
async function tunelDurumu(): Promise<{ durum: "acik" | "engelli"; adres: string } | { durum: "kapali" }> {
  let adres: string;
  try {
    adres = (JSON.parse(fs.readFileSync(path.join(process.cwd(), "veri", "tunel.json"), "utf8")) as { adres: string }).adres;
  } catch {
    return { durum: "kapali" };
  }
  try {
    const r = await fetch(`${adres}/manifest.webmanifest`, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    return { durum: r.ok ? "acik" : "engelli", adres };
  } catch {
    return { durum: "engelli", adres };
  }
}

/** Bu bilgisayarın yerel ağ adresleri (Wi-Fi ve kablolu); sanal ağ bağdaştırıcıları en sona. */
function yerelAdresler(port: string): string[] {
  const sanal = /vethernet|virtual|vmware|wsl|hyper-v|loopback|bluetooth/i;
  return Object.entries(os.networkInterfaces())
    .flatMap(([ad, liste]) => (liste ?? []).filter((a) => a.family === "IPv4" && !a.internal).map((a) => ({ ad, ip: a.address })))
    .sort((a, b) => Number(sanal.test(a.ad)) - Number(sanal.test(b.ad)))
    .map((a) => `http://${a.ip}:${port}`);
}

const karekod = (metin: string) =>
  QRCode.toString(metin, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2b221b", light: "#fbf7ef" } });

export default async function TelefonSayfasi() {
  const port = ((await headers()).get("host") ?? "localhost:3000").split(":")[1] ?? "80";
  const [tunel, yerel] = [await tunelDurumu(), yerelAdresler(port)];
  const [tunelKod, yerelKod] = await Promise.all([
    tunel.durum === "acik" ? karekod(tunel.adres) : null,
    yerel[0] ? karekod(yerel[0]) : null,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <SayfaBasligi ust="Uygulama" baslik="Telefonda aç">
        Telefonun kamerasıyla karekodu okut. Kurultay açılınca tarayıcı menüsünden “Ana ekrana ekle” dersen telefonda da ayrı bir
        uygulama gibi açılır. Bu bilgisayardaki Kurultay açık kaldıkça telefon da bağlanabilir.
      </SayfaBasligi>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="kece-kart flex flex-col overflow-hidden">
          <KilimSerit ilmek={2} />
          <div className="flex flex-1 flex-col gap-3 p-5">
            <div>
              <div className="ust-etiket">Önerilen</div>
              <h2 className="text-lg font-semibold">Her yerden (HTTPS)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Telefonun interneti yeter, aynı ağda olmak gerekmez. Güvenli bağlantı olduğu için telefona tam uygulama olarak eklenir.
                Adres her açılışta değişir.
              </p>
            </div>
            {tunel.durum === "acik" && tunelKod ? (
              <>
                <div className="mx-auto w-56 max-w-full" dangerouslySetInnerHTML={{ __html: tunelKod }} />
                <a href={tunel.adres} className="text-center text-sm font-medium break-all text-vurgu hover:underline">
                  {tunel.adres}
                </a>
              </>
            ) : tunel.durum === "engelli" ? (
              <div className="flex flex-col gap-2 border-l-2 border-al pl-3 text-sm">
                <p>
                  Tünel kuruldu ama bu ağ Cloudflare’e bağlanmasına izin vermiyor (bazı okul ağları 7844 portunu kapatır). İki yol var:
                </p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  <li>Sağdaki aynı Wi-Fi karekodunu dene.</li>
                  <li>
                    Bilgisayarı telefonun kişisel erişim noktasına (hotspot) bağla, bir dakika sonra bu sayfayı yenile. Karekod çıkmazsa
                    Kurultay’ı kapatıp masaüstündeki simgeden yeniden aç.
                  </li>
                </ul>
              </div>
            ) : (
              <p className="border-l-2 border-al pl-3 text-sm">
                Tünel şu an kapalı. Kurultay’ı masaüstündeki simgeden açtığında tünel kendiliğinden kurulur; internet yoksa yalnızca aynı
                Wi-Fi seçeneği çalışır.
              </p>
            )}
          </div>
        </section>

        <section className="kece-kart flex flex-col overflow-hidden">
          <KilimSerit desen="koc" ilmek={2} />
          <div className="flex flex-1 flex-col gap-3 p-5">
            <div>
              <div className="ust-etiket">İnternetsiz</div>
              <h2 className="text-lg font-semibold">Aynı Wi-Fi’dan</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Telefon bu bilgisayarla aynı ağdaysa çalışır. Bazı okul ağları cihazların birbirini görmesini engeller; o zaman soldaki
                adresi kullan.
              </p>
            </div>
            {yerelKod ? (
              <>
                <div className="mx-auto w-56 max-w-full" dangerouslySetInnerHTML={{ __html: yerelKod }} />
                <ul className="flex flex-col items-center gap-0.5 text-sm">
                  {yerel.map((a, i) => (
                    <li key={a} className={i ? "text-muted-foreground" : "font-medium"}>
                      {a}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Bu bilgisayar bir ağa bağlı görünmüyor.</p>
            )}
          </div>
        </section>
      </div>

      <section className="grid gap-6 text-sm md:grid-cols-2">
        <div>
          <h2 className="font-semibold">Android (Chrome)</h2>
          <ol className="mt-1 list-decimal pl-5 text-muted-foreground">
            <li>Karekodu kamerayla okut, bağlantıyı aç.</li>
            <li>Sağ üstteki ⋮ menüsünden “Ana ekrana ekle” ya da “Uygulamayı yükle”yi seç.</li>
            <li>Ana ekrandaki otağ simgesine dokun.</li>
          </ol>
        </div>
        <div>
          <h2 className="font-semibold">iPhone (Safari)</h2>
          <ol className="mt-1 list-decimal pl-5 text-muted-foreground">
            <li>Karekodu kamerayla okut, Safari’de aç.</li>
            <li>Alttaki paylaş düğmesinden “Ana Ekrana Ekle”yi seç.</li>
            <li>Ana ekrandaki otağ simgesine dokun.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
