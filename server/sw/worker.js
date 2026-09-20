// cally service worker. Step 1: make the app installable and keep the shell available.
// Hashed build assets are immutable, so cache first is safe; everything else goes to the network.
const SHELL = "cally-shell-v1";
const ASSET = /^\/(_nuxt|fonts|icons)\//;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  if (!ASSET.test(url.pathname)) return;

  event.respondWith(
    caches.open(SHELL).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    }),
  );
});
