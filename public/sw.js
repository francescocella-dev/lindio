const CACHE_NAME = "lindio-static-v1";

const STATIC_ASSET_PATHS = [
  "/manifest.webmanifest",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/brand/lindio-logo.png",
  "/brand/lindio-icon.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSET_PATHS)).catch(() => null)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
    IMPORTANTISSIMO:
    Supabase e qualunque API esterna devono andare sempre in rete.
    Non devono mai essere servite da cache.
  */
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
    Le pagine HTML della SPA devono essere sempre network-first.
    Questo evita che Netlify mostri una vecchia build dopo refresh.
  */
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );

    return;
  }

  /*
    Cache solo per asset statici generati da Vite.
    Sono sicuri perché hanno nome/hash diverso a ogni build.
  */
  if (
    url.pathname.startsWith("/assets/") ||
    ["script", "style", "image", "font"].includes(request.destination)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);

        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              cache.put(request, response.clone());
            }

            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow("/");
      }

      return null;
    })
  );
});