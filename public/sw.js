const CACHE_VERSION = "v2";
const CACHE_PREFIX = "lindio-";
const APP_SHELL_CACHE = `${CACHE_PREFIX}app-shell-${CACHE_VERSION}`;
const STATIC_RUNTIME_CACHE = `${CACHE_PREFIX}static-runtime-${CACHE_VERSION}`;
const OFFLINE_SHELL_URL = "/index.html";

const PRECACHE_URLS = [
  OFFLINE_SHELL_URL,
  "/manifest.webmanifest",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/brand/lindio-logo.png",
  "/brand/lindio-icon.png"
];

const STATIC_PATHS = new Set([
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
  "/manifest.webmanifest"
]);

function isCacheableStaticRequest(request, url) {
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/brand/")) {
    return true;
  }

  return STATIC_PATHS.has(url.pathname) && ["script", "style", "image", "font", "manifest", ""].includes(request.destination);
}

async function cacheSuccessfulResponse(cacheName, request, response) {
  if (!response || !response.ok || response.type !== "basic") {
    return;
  }

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);

    if (response && response.ok && response.type === "basic") {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.put(OFFLINE_SHELL_URL, response.clone());
    }

    return response;
  } catch {
    const shellCache = await caches.open(APP_SHELL_CACHE);
    const cachedShell = await shellCache.match(OFFLINE_SHELL_URL);

    if (cachedShell) {
      return cachedShell;
    }

    return Response.error();
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_RUNTIME_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  await cacheSuccessfulResponse(STATIC_RUNTIME_CACHE, request, response);
  return response;
}

function getSafeNotificationDestination(notification) {
  const candidate = notification?.data?.url;

  if (typeof candidate !== "string" || !candidate.trim()) {
    return "/today";
  }

  try {
    const destination = new URL(candidate, self.location.origin);

    if (destination.origin !== self.location.origin) {
      return "/today";
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/today";
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      const currentCaches = new Set([APP_SHELL_CACHE, STATIC_RUNTIME_CACHE]);

      await Promise.all(
        cacheKeys
          .filter((key) => key.startsWith(CACHE_PREFIX) && !currentCaches.has(key))
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Supabase, APIs and every external origin stay network-only.
  // This service worker never stores authenticated/customer API payloads.
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isCacheableStaticRequest(request, url)) {
    event.respondWith(handleStaticAsset(request));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const destination = getSafeNotificationDestination(event.notification);
  const destinationUrl = new URL(destination, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      for (const client of clientList) {
        const clientUrl = new URL(client.url);

        if (clientUrl.origin !== self.location.origin) {
          continue;
        }

        if ("navigate" in client) {
          await client.navigate(destinationUrl);
        }

        if ("focus" in client) {
          await client.focus();
        }

        return;
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(destinationUrl);
      }
    })()
  );
});
