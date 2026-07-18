/* Service worker: cachea la cáscara de la app y los tiles ya vistos. */
const VERSION = "mapa-squad-v2";
const CACHE_SHELL = VERSION + "-shell";
const CACHE_TILES = VERSION + "-tiles";

const SHELL = [
  "./",
  "index.html",
  "css/estilo.css",
  "js/vendor/leaflet/leaflet.css",
  "js/vendor/leaflet/leaflet.js",
  "js/firebase-config.js",
  "js/datos-mapas.js",
  "js/data/lugares-chernarus.js",
  "js/data/instalaciones-chernarus.js",
  "js/data/instalaciones-livonia.js",
  "js/data/instalaciones-sakhal.js",
  "js/app.js",
  "manifest.webmanifest",
  "assets/iconos/icono-192.png",
  "assets/iconos/icono-512.png",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(CACHE_SHELL).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== "GET") return;

  // Tiles del mapa: primero cache, si no red (y se guarda para offline)
  if (url.hostname === "static.xam.nu") {
    ev.respondWith(
      caches.open(CACHE_TILES).then(async (cache) => {
        const enCache = await cache.match(ev.request);
        if (enCache) return enCache;
        try {
          const resp = await fetch(ev.request);
          if (resp.ok || resp.type === "opaque") cache.put(ev.request, resp.clone());
          return resp;
        } catch (e) {
          return new Response("", { status: 504 });
        }
      })
    );
    return;
  }

  // Firebase y demás dominios: directo a la red
  if (url.origin !== location.origin) return;

  // Cáscara propia: red primero con respaldo en cache (para offline)
  ev.respondWith(
    fetch(ev.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE_SHELL).then((c) => c.put(ev.request, copia));
        return resp;
      })
      .catch(() =>
        caches.match(ev.request).then((r) => r || caches.match("index.html"))
      )
  );
});
