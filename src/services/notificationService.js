import {
  buildLeadReminderPath,
  getReminderDecision
} from "../domain/reminderPolicy.ts";

const SENT_REMINDERS_KEY = "lindio_sent_reminders";

function canUseNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function canUseStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function readSentReminders() {
  if (!canUseStorage()) return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SENT_REMINDERS_KEY) || "{}");

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function writeSentReminders(value) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(SENT_REMINDERS_KEY, JSON.stringify(value));
  } catch {
    // Notification bookkeeping must never block the application.
  }
}

function getBaseNotificationOptions(options = {}) {
  return {
    icon: "/brand/lindio-icon.png",
    badge: "/brand/lindio-icon.png",
    ...options
  };
}

function getDiagnostics() {
  return {
    supported: canUseNotifications(),
    permission: canUseNotifications() ? window.Notification.permission : "unsupported",
    secureContext: typeof window !== "undefined" ? window.isSecureContext : false,
    serviceWorkerSupported: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    protocol: typeof window !== "undefined" ? window.location.protocol : "",
    visibility: typeof document !== "undefined" ? document.visibilityState : ""
  };
}

function waitForServiceWorkerReady(timeoutMs = 2500) {
  if (!("serviceWorker" in navigator)) {
    return Promise.reject(new Error("Service worker non supportato."));
  }

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("Service worker non pronto.")), timeoutMs);
    })
  ]);
}

function getSafeClientDestination(options) {
  const candidate = options?.data?.url;

  if (typeof candidate !== "string" || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "";
  }

  return candidate;
}

async function showWithNotificationConstructor(title, options = {}) {
  const notification = new window.Notification(title, getBaseNotificationOptions(options));
  const destination = getSafeClientDestination(options);

  notification.onclick = () => {
    window.focus();

    if (destination) {
      window.location.assign(destination);
    }

    notification.close();
  };

  return {
    sent: true,
    mode: "Notification API diretta"
  };
}

async function showWithServiceWorker(title, options = {}) {
  const registration = await waitForServiceWorkerReady();

  await registration.showNotification(title, getBaseNotificationOptions(options));

  return {
    sent: true,
    mode: "Service Worker"
  };
}

async function showBrowserNotification(title, options = {}) {
  const diagnostics = getDiagnostics();

  if (!diagnostics.supported) {
    return {
      sent: false,
      mode: "none",
      reason: "Questo browser non supporta le notifiche."
    };
  }

  if (!diagnostics.secureContext) {
    return {
      sent: false,
      mode: "none",
      reason: "Le notifiche richiedono HTTPS oppure localhost."
    };
  }

  if (window.Notification.permission !== "granted") {
    return {
      sent: false,
      mode: "none",
      reason: `Permesso notifiche non valido: ${window.Notification.permission}.`
    };
  }

  try {
    return await showWithServiceWorker(title, options);
  } catch {
    try {
      return await showWithNotificationConstructor(title, options);
    } catch {
      return {
        sent: false,
        mode: "none",
        reason: "Non è stato possibile mostrare la notifica. Controlla le autorizzazioni del browser e del sistema."
      };
    }
  }
}

export function getNotificationPermission() {
  if (!canUseNotifications()) {
    return "unsupported";
  }

  return window.Notification.permission;
}

export function getNotificationDebugInfo() {
  return getDiagnostics();
}

export async function requestReminderPermission() {
  if (!canUseNotifications()) {
    return "unsupported";
  }

  if (window.Notification.permission === "granted") {
    return "granted";
  }

  if (window.Notification.permission === "denied") {
    return "denied";
  }

  return window.Notification.requestPermission();
}

export async function sendTestNotification() {
  const permission = await requestReminderPermission();

  if (permission !== "granted") {
    return {
      sent: false,
      reason: "Le notifiche non sono autorizzate. Consenti le notifiche dal browser e riprova."
    };
  }

  const result = await showBrowserNotification("Notifica Lindio attiva", {
    body: "I promemoria locali possono essere mostrati mentre Lindio è in esecuzione su questo dispositivo.",
    tag: `lindio-test-${Date.now()}`,
    data: {
      url: "/settings"
    }
  });

  return {
    sent: result.sent,
    reason: result.sent
      ? "Notifica di test inviata correttamente su questo dispositivo."
      : result.reason
  };
}

export async function checkReminderNotifications(leads, profile) {
  if (!canUseNotifications()) {
    return {
      checked: false,
      sent: 0,
      reason: "Notifiche non supportate da questo browser."
    };
  }

  if (!profile?.notificationEnabled) {
    return {
      checked: false,
      sent: 0,
      reason: "Notifiche promemoria disattivate."
    };
  }

  if (window.Notification.permission !== "granted") {
    return {
      checked: false,
      sent: 0,
      reason: "Notifiche non autorizzate dal browser."
    };
  }

  const now = Date.now();
  const sentReminders = readSentReminders();
  const nextSentReminders = { ...sentReminders };

  let sentCount = 0;
  let checkedCount = 0;

  for (const lead of leads) {
    const decision = getReminderDecision(lead, profile, now, nextSentReminders);

    if (decision.considered) {
      checkedCount += 1;
    }

    if (!decision.shouldNotify || decision.dueAtMs === null) {
      continue;
    }

    const dueDate = new Date(decision.dueAtMs);
    const customerName = lead.customerName || "Cliente";
    const action = lead.nextAction || "Azione da completare";

    const result = await showBrowserNotification(`Promemoria: ${customerName}`, {
      body: `${action} · ${dueDate.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit"
      })}`,
      tag: decision.reminderId,
      data: {
        url: buildLeadReminderPath(lead.id)
      }
    });

    if (result.sent) {
      sentCount += 1;
      nextSentReminders[decision.reminderId] = new Date(now).toISOString();
    }
  }

  writeSentReminders(nextSentReminders);

  return {
    checked: true,
    sent: sentCount,
    reason:
      sentCount > 0
        ? `${sentCount} notifica inviata.`
        : `Nessun promemoria da notificare ora. Richieste controllate: ${checkedCount}.`
  };
}
