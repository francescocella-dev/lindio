const STORAGE_VERSION = "3";

const KEYS = {
  login: "lindio_mock_login",
  leads: "lindio_mock_leads",
  version: "lindio_mock_version",
  seededAt: "lindio_mock_seeded_at"
};

function canUseStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function safeRead(key, fallback) {
  if (!canUseStorage()) return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistenza mock: se localStorage non è disponibile, l'app resta comunque usabile.
  }
}

function safeRemove(key) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nessuna azione necessaria in modalità mock.
  }
}

function isValidLead(lead) {
  return Boolean(
    lead &&
    typeof lead === "object" &&
    typeof lead.id === "string" &&
    typeof lead.customerName === "string" &&
    typeof lead.status === "string"
  );
}

function isValidLeadList(leads) {
  return Array.isArray(leads) && leads.every(isValidLead);
}

function getTodayKey() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function getStoredLogin() {
  return safeRead(KEYS.login, false) === true;
}

export function setStoredLogin(value) {
  safeWrite(KEYS.login, Boolean(value));
}

export function getStoredLeads(fallbackLeads = []) {
  const fallback = Array.isArray(fallbackLeads) ? fallbackLeads : [];

  if (!canUseStorage()) {
    return fallback;
  }

  const currentVersion = window.localStorage.getItem(KEYS.version);

  if (currentVersion !== STORAGE_VERSION) {
    safeRemove(KEYS.leads);
    window.localStorage.setItem(KEYS.version, STORAGE_VERSION);
    window.localStorage.setItem(KEYS.seededAt, getTodayKey());
    return fallback;
  }

  const storedLeads = safeRead(KEYS.leads, null);

  if (!isValidLeadList(storedLeads)) {
    setStoredLeads(fallback);
    return fallback;
  }

  return storedLeads;
}

export function setStoredLeads(leads) {
  if (!Array.isArray(leads)) return;

  safeWrite(KEYS.leads, leads);
}

export function resetStoredMockData() {
  safeRemove(KEYS.leads);

  if (canUseStorage()) {
    window.localStorage.setItem(KEYS.version, STORAGE_VERSION);
    window.localStorage.setItem(KEYS.seededAt, getTodayKey());
  }
}

export function clearStoredSession() {
  safeRemove(KEYS.login);
}