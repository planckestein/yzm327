import { ImageResponse } from "next/og";

// PWA ikonlarını kodla üretir (ayrı resim dosyası gerekmez): /ikon/192, /ikon/512
export async function GET(_req: Request, { params }: RouteContext<"/ikon/[boyut]">) {
  const boyut = (await params).boyut === "192" ? 192 : 512;
  const s = boyut / 512;

  const sutun = (
    <div style={{ width: 44 * s, height: 190 * s, background: "#ffffff", borderRadius: 6 * s }} />
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1f3a5f",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Meclis binası: çatı, sütunlar, taban */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `${170 * s}px solid transparent`,
            borderRight: `${170 * s}px solid transparent`,
            borderBottom: `${80 * s}px solid #ffffff`,
          }}
        />
        <div style={{ display: "flex", gap: 30 * s, marginTop: 14 * s }}>
          {sutun}
          {sutun}
          {sutun}
          {sutun}
        </div>
        <div style={{ width: 340 * s, height: 30 * s, background: "#ffffff", marginTop: 14 * s, borderRadius: 6 * s }} />
      </div>
    ),
    { width: boyut, height: boyut },
  );
}
