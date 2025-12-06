const STATIC_CACHE = "static-v1";
const PAGE_CACHE = "pages-v1";
const API_CACHE = "api-v1";

const STATIC_ASSETS = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== STATIC_CACHE &&
                key !== PAGE_CACHE &&
                key !== API_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  // 1. Static Next.js assets (JS/CSS/fonts)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((response) => {
              cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
        }),
      ),
    );
    return;
  }

  // 2. Navegações de página (app shell)
  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(PAGE_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(async () => {
            const cached = await cache.match(request);
            if (cached) return cached;
            return caches.match("/offline.html");
          }),
      ),
    );
    return;
  }

  // 3. APIs da aplicação → NetworkFirst
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(async () => {
            const cached = await cache.match(request);
            if (cached) return cached;
            throw new Error("Network error and no cached API response");
          }),
      ),
    );
    return;
  }
});

