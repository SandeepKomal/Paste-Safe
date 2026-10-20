// Lets Paste-Safe open offline and be installed as an app. Only this site's own
// files are cached. Network first, so online visits always get the latest version.

const CACHE = "paste-safe-v2-editorial-hero-scroll";
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon-maskable-512.png",
  "src/main.js",
  "src/example.js",
  "src/core/detect.js",
  "src/core/rules.js",
  "src/core/transform.js",
  "src/core/worker.js",
  "src/ui/clipboard.js",
  "src/ui/dom.js",
  "src/ui/flip.js",
  "src/ui/gate.js",
  "src/ui/netwatch.js",
  "src/ui/peek.js",
  "src/ui/render.js",
  "src/ui/skin-boot.js",
  "src/ui/skin.js",
  "src/ui/scroll-story.js",
  "src/ui/ribbon-hero.js",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req, { ignoreSearch: true })) ?? (await caches.match("index.html")) ?? Response.error()),
  );
});
