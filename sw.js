// Service worker: tutto in cache all'installazione, poi prima la cache e poi la rete.
const V = "3dea2b56"; // aggiornato da deno task release
const FILES = [
  "./",
  "index.html",
  "app.css",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "src/main.js",
  "src/ui.js",
  "src/store.js",
  "src/stats.js",
  "src/map.js",
  "src/i18n.js",
  "src/lang/it.js",
  "data/countries.js",
  "data/world.js",
];
const CACHE = `tandr-${V}`;

self.addEventListener("install", (e) =>
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))).then(() =>
      self.skipWaiting()
    ),
  ));
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() =>
      self.clients.claim()
    ),
  ));
self.addEventListener("fetch", (e) => e.respondWith(caches.match(e.request).then((r) => r ?? fetch(e.request))));
