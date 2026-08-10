import type { Account } from "../domain/account.ts";
import { parseAccountUpdate } from "../domain/accountValidation.ts";

export interface StringStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEMO_ACCOUNT_STORAGE_KEY = "lindio_demo_account_v1";

export const DEFAULT_DEMO_ACCOUNT: Account = {
  profile: {
    id: "demo-user",
    organizationId: "demo-organization",
    fullName: "Mario Rossi",
    role: "owner",
    notificationEnabled: false,
    notificationMinutesBefore: 30
  },
  organization: {
    id: "demo-organization",
    name: "Impresa Rossi",
    sector: "Pulizie e servizi",
    city: "Roma",
    phone: "+39 333 210 8844",
    email: "info@impresarossi.example",
    address: "Roma e provincia"
  }
};

function cloneDefaultAccount(): Account {
  return {
    profile: { ...DEFAULT_DEMO_ACCOUNT.profile },
    organization: DEFAULT_DEMO_ACCOUNT.organization
      ? { ...DEFAULT_DEMO_ACCOUNT.organization }
      : null
  };
}

function readAccount(storage: StringStoragePort): Account {
  const raw = storage.getItem(DEMO_ACCOUNT_STORAGE_KEY);
  if (!raw) return cloneDefaultAccount();

  try {
    const parsed = JSON.parse(raw) as Account;
    if (!parsed?.profile || !parsed.organization) return cloneDefaultAccount();
    return parsed;
  } catch {
    return cloneDefaultAccount();
  }
}

export function createDemoAccountRepository(storage: StringStoragePort) {
  return {
    getAccount(): Account {
      return readAccount(storage);
    },

    updateAccount(input: unknown): Account {
      const account = parseAccountUpdate(input);
      const current = readAccount(storage);
      const next: Account = {
        profile: {
          ...current.profile,
          fullName: account.profile.fullName,
          notificationEnabled: account.profile.notificationEnabled,
          notificationMinutesBefore: account.profile.notificationMinutesBefore
        },
        organization: {
          id: current.organization?.id || "demo-organization",
          ...account.organization
        }
      };

      storage.setItem(DEMO_ACCOUNT_STORAGE_KEY, JSON.stringify(next));
      return next;
    },

    resetAccount(): Account {
      storage.removeItem(DEMO_ACCOUNT_STORAGE_KEY);
      return cloneDefaultAccount();
    }
  };
}
