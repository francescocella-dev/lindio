import { expect, test } from "@playwright/test";

async function waitForServiceWorkerControl(page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;

    if (navigator.serviceWorker.controller) {
      return registration.scope;
    }

    await new Promise((resolve) => {
      const timeout = window.setTimeout(resolve, 5000);

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          window.clearTimeout(timeout);
          resolve();
        },
        { once: true }
      );
    });

    return registration.scope;
  });
}

test("production PWA registers, matches manifest assets and serves the shell offline", async ({ page, context }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Entra in Lindio" })).toBeVisible();

  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Manifest request failed with ${response.status}`);
    }

    return response.json();
  });

  expect(manifest.name).toBe("Lindio");
  expect(manifest.start_url).toBe("/today");
  expect(manifest.scope).toBe("/");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: "/icon-192.png", sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ src: "/icon-512.png", sizes: "512x512", type: "image/png" })
    ])
  );

  const iconDimensions = await page.evaluate(async () => {
    const dimensions = {};

    for (const src of ["/icon-192.png", "/icon-512.png"]) {
      const response = await fetch(src, { cache: "no-store" });
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      dimensions[src] = [bitmap.width, bitmap.height];
      bitmap.close();
    }

    return dimensions;
  });

  expect(iconDimensions["/icon-192.png"]).toEqual([192, 192]);
  expect(iconDimensions["/icon-512.png"]).toEqual([512, 512]);

  await waitForServiceWorkerControl(page);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Entra in Lindio" })).toBeVisible();

  const pwaState = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const cacheNames = await caches.keys();
    const cacheEntries = {};

    for (const cacheName of cacheNames) {
      if (!cacheName.startsWith("lindio-")) continue;

      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      cacheEntries[cacheName] = requests.map((request) => request.url);
    }

    return {
      controlled: Boolean(navigator.serviceWorker.controller),
      scope: registration.scope,
      origin: window.location.origin,
      cacheNames,
      cacheEntries
    };
  });

  expect(pwaState.controlled).toBe(true);
  expect(pwaState.scope).toBe(`${pwaState.origin}/`);
  expect(pwaState.cacheNames).toContain("lindio-app-shell-v2");
  expect(pwaState.cacheNames).toContain("lindio-static-runtime-v2");
  expect(pwaState.cacheEntries["lindio-app-shell-v2"]).toContain(`${pwaState.origin}/index.html`);

  const cachedUrls = Object.values(pwaState.cacheEntries).flat();
  expect(cachedUrls.length).toBeGreaterThan(0);
  expect(cachedUrls.every((url) => url.startsWith(pwaState.origin))).toBe(true);
  expect(cachedUrls.some((url) => url.includes("supabase"))).toBe(false);

  await context.setOffline(true);

  try {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Entra in Lindio" })).toBeVisible();
    await expect(page.getByText("Demo locale", { exact: true })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
