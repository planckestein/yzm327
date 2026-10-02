import type { NextConfig } from "next";

// Telefondan HTTPS ile açmak için ücretsiz Cloudflare tüneli (*.trycloudflare.com) kullanılır.
// Next.js güvenlik gereği başka adreslerden gelen istekleri reddeder; tünel adresine izin veriyoruz.
// Aynı Wi-Fi'daki telefondan açmak için yerel ağ adresleri de izinli.
const TUNEL = ["*.trycloudflare.com", "172.*.*.*", "192.168.*.*", "10.*.*.*"];

const nextConfig: NextConfig = {
  allowedDevOrigins: TUNEL,
  experimental: {
    serverActions: { allowedOrigins: TUNEL },
  },
  // Eski sayfa adresleri yeni yerlerine
  async redirects() {
    return [
      { source: "/surec/:id", destination: "/karar/:id", permanent: true },
      { source: "/kural/:id", destination: "/karar/:id", permanent: true },
      { source: "/kurallar", destination: "/kararlar?s=kurallar", permanent: true },
      { source: "/yonetim", destination: "/topluluk", permanent: true },
      { source: "/graf", destination: "/topluluk/graf", permanent: true },
      { source: "/defter", destination: "/topluluk/defter", permanent: true },
    ];
  },
};

export default nextConfig;
