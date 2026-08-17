const PWA_STATUS_EVENT = "lindio:pwa-status";

function emitPwaStatus(detail) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }

  window.dispatchEvent(new CustomEvent(PWA_STATUS_EVENT, { detail }));
}

export async function registerLindioServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    const result = {
      registered: false,
      state: "unsupported"
    };

    emitPwaStatus(result);
    return result;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none"
    });

    const result = {
      registered: true,
      state: "registered",
      scope: registration.scope
    };

    emitPwaStatus(result);

    // The update check is best-effort: a transient failure must never block the app.
    registration.update().catch((error) => {
      console.warn("Lindio service worker update check failed", error);
    });

    return result;
  } catch (error) {
    console.warn("Lindio service worker registration failed", error);

    const result = {
      registered: false,
      state: "failed",
      reason: error?.message || "Service worker registration failed."
    };

    emitPwaStatus(result);
    return result;
  }
}
