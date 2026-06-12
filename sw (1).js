// Service Worker — Yoga e Ciência Dashboard
// Faz cache do "shell" do app (ícones/manifest) para abrir rápido e funcionar
// como app instalável. O HTML usa estratégia "network-first": sempre busca a
// versão mais nova primeiro, e só usa o cache se estiver offline. Os dados
// (vendas/meta) sempre vêm da rede (Apps Script), nunca do cache.

const CACHE_NAME = "yc-dashboard-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca cacheia chamadas à API (Apps Script) — sempre busca dados frescos
  if (url.hostname.includes("script.google") || url.hostname.includes("googleusercontent")) {
    return; // deixa passar direto para a rede
  }

  const isHTML = event.request.mode === "navigate" ||
                 url.pathname.endsWith("/") ||
                 url.pathname.endsWith(".html");

  if (isHTML) {
    // Network-first: sempre tenta buscar a versão mais nova do HTML.
    // Só cai para o cache se estiver offline.
    event.respondWith(
      fetch(event.request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Para ícones/manifest: cache-first com fallback de rede
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});
