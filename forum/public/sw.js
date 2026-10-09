// Kurultay service worker — uygulamanın telefona kurulabilmesini sağlar.
// İnternet yoksa kullanıcıya basit bir "çevrimdışı" sayfası gösterir.

const CEVRIMDISI_HTML = `<!doctype html><html lang="tr"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Çevrimdışı</title>
<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#f5efe3;color:#2b221b;text-align:center">
<div><h1>Kurultay</h1><p>İnternet bağlantısı yok. Bağlantı gelince tekrar dene.</p></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(
    fetch(e.request).catch(
      () => new Response(CEVRIMDISI_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
