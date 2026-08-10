import {
  AccountSetupRequiredError,
  isOrganizationRole,
  type Account,
  type AccountBootstrapInput,
  type AccountUpdateInput,
  type Organization,
  type UserProfile
} from "../domain/account.ts";
import { parseAccountBootstrap, parseAccountUpdate } from "../domain/accountValidation.ts";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

interface SupabaseResult<T = unknown> {
  data: T;
  error: SupabaseErrorLike | null;
}

export interface SupabaseRpcClientPort {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<SupabaseResult>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function mapAccountData(value: unknown): Account {
  const data = asRecord(value);
  const profileSource = asRecord(data.profile);
  const organizationSource = data.organization ? asRecord(data.organization) : null;

  const profile: UserProfile = {
    id: stringValue(profileSource.id),
    organizationId: stringValue(profileSource.organization_id),
    fullName: stringValue(profileSource.full_name),
    role: isOrganizationRole(profileSource.role) ? profileSource.role : "member",
    notificationEnabled: Boolean(profileSource.notification_enabled),
    notificationMinutesBefore: Number(profileSource.notification_minutes_before ?? 30)
  };

  const organization: Organization | null = organizationSource
    ? {
        id: stringValue(organizationSource.id),
        name: stringValue(organizationSource.name),
        sector: stringValue(organizationSource.sector),
        city: stringValue(organizationSource.city),
        phone: stringValue(organizationSource.phone),
        email: stringValue(organizationSource.email),
        address: stringValue(organizationSource.address)
      }
    : null;

  return { profile, organization };
}

function throwIfError(error: SupabaseErrorLike | null): void {
  if (!error) return;

  if (error.message?.includes("Organization membership not found")) {
    throw new AccountSetupRequiredError();
  }

  throw new Error(error.message || "Errore Supabase non specificato.");
}

export function createSupabaseAccountRepository(client: SupabaseRpcClientPort) {
  return {
    async getAccount(): Promise<Account> {
      const result = await client.rpc("get_my_account");
      throwIfError(result.error);
      return mapAccountData(result.data);
    },

    async bootstrapAccount(input: AccountBootstrapInput): Promise<Account> {
      const bootstrap = parseAccountBootstrap(input);
      const result = await client.rpc("bootstrap_my_organization", {
        p_full_name: bootstrap.fullName,
        p_organization_name: bootstrap.organizationName,
        p_sector: bootstrap.sector,
        p_city: bootstrap.city
      });

      throwIfError(result.error);
      return mapAccountData(result.data);
    },

    async updateAccount(input: AccountUpdateInput): Promise<Account> {
      const account = parseAccountUpdate(input);

      const result = await client.rpc("update_my_account", {
        p_organization_id: account.organizationId,
        p_full_name: account.profile.fullName,
        p_notification_enabled: account.profile.notificationEnabled,
        p_notification_minutes_before: account.profile.notificationMinutesBefore,
        p_organization_name: account.organization.name,
        p_sector: account.organization.sector,
        p_city: account.organization.city,
        p_phone: account.organization.phone,
        p_email: account.organization.email,
        p_address: account.organization.address
      });

      throwIfError(result.error);
      return mapAccountData(result.data);
    }
  };
}
