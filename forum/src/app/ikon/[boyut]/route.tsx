import { ImageResponse } from "next/og";
import { otagSvgMetni } from "@/components/motif/OtagCizimi";

// PWA ikonlarını kodla üretir (ayrı resim dosyası gerekmez): /ikon/192, /ikon/256, /ikon/512
// Ak keçe zemin üstünde dokuma otağ; maskelenebilir ikonun güvenli alanında kalacak boyda.
export async function GET(_req: Request, { params }: RouteContext<"/ikon/[boyut]">) {
  const istenen = Number((await params).boyut);
  const boyut = [192, 256, 512].includes(istenen) ? istenen : 512; // 256: masaüstü kısayolunun simgesi (.ico)
  const otag = Math.round(boyut * 0.62);
  const kaynak = `data:image/svg+xml;base64,${Buffer.from(otagSvgMetni(otag)).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#f6efe2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={kaynak} width={otag} height={Math.round((otag * 18) / 28)} alt="" />
      </div>
    ),
    { width: boyut, height: boyut },
  );
}
