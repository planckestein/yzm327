import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kurultay",
    short_name: "Kurultay",
    description: "Oylamayla yönetilen akran öğrenmesi forumu",
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: "#f5efe3",
    theme_color: "#f5efe3",
    icons: [
      { src: "/ikon/192", sizes: "192x192", type: "image/png" },
      { src: "/ikon/512", sizes: "512x512", type: "image/png" },
      { src: "/ikon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
