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
        return JSON.parse(window.localStorage.getItem(SENT_REMINDERS_KEY) || "{}");
    } catch {
        return {};
    }
}

function writeSentReminders(value) {
    if (!canUseStorage()) return;

    try {
        window.localStorage.setItem(SENT_REMINDERS_KEY, JSON.stringify(value));
    } catch {
        // Non blocchiamo l'app se lo storage non è disponibile.
    }
}

function isFinalLead(lead) {
    return ["Vinta", "Persa"].includes(lead.status);
}

function getReminderId(lead) {
    return `${lead.id}:${lead.followUpAt}`;
}

function getMinutesBefore(profile) {
    const value = Number(profile?.notificationMinutesBefore ?? 30);

    if (!Number.isFinite(value) || value < 0) {
        return 30;
    }

    return value;
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

async function showWithNotificationConstructor(title, options = {}) {
    const notification = new window.Notification(title, getBaseNotificationOptions(options));

    notification.onclick = () => {
        window.focus();
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

    /*
      In una PWA proviamo prima il Service Worker.
      Se non è pronto o non funziona, usiamo la Notification API diretta.
    */
    try {
        return await showWithServiceWorker(title, options);
    } catch (serviceWorkerError) {
        try {
            return await showWithNotificationConstructor(title, options);
        } catch (directError) {
            return {
                sent: false,
                mode: "none",
                reason: `Non è stato possibile mostrare la notifica. Controlla che le notifiche siano abilitate nel browser e nelle impostazioni del sistema.`
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
        body: "Perfetto: i promemoria sono attivi su questo dispositivo.",
        tag: `lindio-test-${Date.now()}`
    });

    return {
        sent: result.sent,
        reason: result.sent
            ? "Notifica di test inviata correttamente."
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

    const now = new Date();
    const minutesBefore = getMinutesBefore(profile);
    const windowMs = minutesBefore * 60 * 1000;
    const toleranceAfterMs = 10 * 60 * 1000;

    const sentReminders = readSentReminders();
    const nextSentReminders = { ...sentReminders };

    let sentCount = 0;
    let checkedCount = 0;

    for (const lead of leads) {
        if (!lead.followUpAt || isFinalLead(lead)) continue;

        checkedCount += 1;

        const dueDate = new Date(lead.followUpAt);

        if (Number.isNaN(dueDate.getTime())) continue;

        const diff = dueDate.getTime() - now.getTime();

        const shouldNotify =
            minutesBefore === 0
                ? diff <= 0 && diff >= -toleranceAfterMs
                : diff <= windowMs && diff >= -toleranceAfterMs;

        if (!shouldNotify) continue;

        const reminderId = getReminderId(lead);

        if (sentReminders[reminderId]) continue;

        const customerName = lead.customerName || "Cliente";
        const action = lead.nextAction || "Azione da completare";

        const result = await showBrowserNotification(`Promemoria: ${customerName}`, {
            body: `${action} · ${dueDate.toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit"
            })}`,
            tag: reminderId
        });

        if (result.sent) {
            sentCount += 1;
            nextSentReminders[reminderId] = new Date().toISOString();
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