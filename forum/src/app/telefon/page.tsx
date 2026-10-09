import type { Metadata } from "next";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { SayfaBasligi } from "@/components/ortak/SayfaBasligi";
import { KilimSerit } from "@/components/motif/Motif";

export const metadata: Metadata = { title: "Telefonda aç" };

/** Başlatıcının (scripts/baslat.mjs) açtığı ücretsiz Cloudflare tünelinin adresi; tünel kapalıysa null. */
async function tunelAdresi(): Promise<string | null> {
  try {
    const { adres } = JSON.parse(fs.readFileSync(path.join(process.cwd(), "veri", "tunel.json"), "utf8")) as { adres: string };
    const r = await fetch(`${adres}/manifest.webmanifest`, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    return r.ok ? adres : null;
  } catch {
    return null;
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
  const [tunel, yerel] = [await tunelAdresi(), yerelAdresler(port)];
  const [tunelKod, yerelKod] = await Promise.all([tunel ? karekod(tunel) : null, yerel[0] ? karekod(yerel[0]) : null]);

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
                Okul ya da ev Wi-Fi’ı fark etmez; telefonun interneti yeter. Güvenli bağlantı olduğu için telefona tam uygulama olarak
                eklenir. Adres her açılışta değişir.
              </p>
            </div>
            {tunelKod ? (
              <>
                <div className="mx-auto w-56 max-w-full" dangerouslySetInnerHTML={{ __html: tunelKod }} />
                <a href={tunel!} className="text-center text-sm font-medium break-all text-vurgu hover:underline">
                  {tunel}
                </a>
              </>
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
