// Lets Paste-Safe open offline and be installed as an app. Only this site's own
// files are cached. Network first, so online visits always get the latest version.

// The Pages workflow appends the deployed commit, so each deploy gets a fresh cache.
const CACHE = "paste-safe-2.1.0";
const FILES = [
  "./",
  "index.html",
  "privacy.html",
  "terms.html",
  "manifest.webmanifest",
  "css/style.css",
  "assets/logo.svg",
  "assets/favicon.png",
  "assets/apple-touch-icon.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon-maskable-512.png",
  "src/main.js",
  "src/legal.js",
  "src/coverage.js",
  "src/example.js",
  "src/version.js",
  "src/core/detect.js",
  "src/core/rules.js",
  "src/core/transform.js",
  "src/core/worker.js",
  "src/ui/clipboard.js",
  "src/ui/dom.js",
  "src/ui/motion.js",
  "src/ui/netwatch.js",
  "src/ui/peek.js",
  "src/ui/render.js",
  "src/ui/privacy-reel.js",
  "src/ui/scroll-story.js",
  "src/ui/store.js",
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
