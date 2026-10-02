import { defterDogrula, tumDefter } from "@/lib/defter";

// Defterin tamamını indirir: herkes kendi kopyasını saklayıp doğrulayabilir.
export async function GET() {
  const govde = JSON.stringify(
    {
      aciklama: "Ortak Akıl dağıtık defteri. hash = SHA-256(onceki_hash|zaman|tur|veri)",
      dogrulama: defterDogrula(),
      kayitlar: tumDefter(),
    },
    null,
    2,
  );
  return new Response(govde, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ortak-akil-defter.json"`,
    },
  });
}
