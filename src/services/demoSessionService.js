import {
  createDemoAccountRepository,
  DEFAULT_DEMO_ACCOUNT
} from "../repositories/demoAccountRepository.ts";

const DEMO_SESSION_KEY = "lindio_demo_session_v1";

function getSessionStorage() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function getLocalStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function getDemoRepository() {
  const storage = getLocalStorage();

  if (!storage) {
    return null;
  }

  return createDemoAccountRepository(storage);
}

export function isDemoSessionActive() {
  return getSessionStorage()?.getItem(DEMO_SESSION_KEY) === "active";
}

export function startDemoSession() {
  getSessionStorage()?.setItem(DEMO_SESSION_KEY, "active");
}

export function endDemoSession() {
  getSessionStorage()?.removeItem(DEMO_SESSION_KEY);
}

export function getDemoUser() {
  return {
    id: DEFAULT_DEMO_ACCOUNT.profile.id,
    email: "demo@lindio.local",
    user_metadata: {
      full_name: DEFAULT_DEMO_ACCOUNT.profile.fullName
    }
  };
}

export function getDemoAccount() {
  return getDemoRepository()?.getAccount() || DEFAULT_DEMO_ACCOUNT;
}

export function updateDemoAccount(input) {
  const repository = getDemoRepository();

  if (!repository) {
    throw new Error("La persistenza locale della demo non è disponibile in questo browser.");
  }

  return repository.updateAccount(input);
}

export function resetDemoAccount() {
  return getDemoRepository()?.resetAccount() || DEFAULT_DEMO_ACCOUNT;
}
