import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ortak Akıl",
    short_name: "Ortak Akıl",
    description: "Oylamayla yönetilen akran öğrenmesi forumu",
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f2f4",
    theme_color: "#f1f2f4",
    icons: [
      { src: "/ikon/192", sizes: "192x192", type: "image/png" },
      { src: "/ikon/512", sizes: "512x512", type: "image/png" },
      { src: "/ikon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
