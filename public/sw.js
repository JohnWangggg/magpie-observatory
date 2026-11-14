/* Magpie Observatory — minimal service worker.
   Enough for PWA installability: precaches the app shell once, then serves
   network-first with a cache fallback. The snapshot APIs stay uncached. */
const CACHE = "magpie-observatory-v2";
const SHELL = [
  "./", "index.html", "manifest.webmanifest",
  "assets/app.css", "assets/app.js", "assets/app-plus.js", "assets/data.js",
  "assets/icon.svg", "assets/icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match("./")))
  );
});
