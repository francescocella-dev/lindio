export const ORGANIZATION_ROLES = ["owner", "member"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export interface UserProfile {
  id: string;
  organizationId: string;
  fullName: string;
  role: OrganizationRole;
  notificationEnabled: boolean;
  notificationMinutesBefore: number;
}

export interface Organization {
  id: string;
  name: string;
  sector: string;
  city: string;
  phone: string;
  email: string;
  address: string;
}

export interface Account {
  profile: UserProfile;
  organization: Organization | null;
}

export interface AccountUpdateInput {
  organizationId: string;
  profile: Pick<UserProfile, "fullName" | "notificationEnabled" | "notificationMinutesBefore">;
  organization: Omit<Organization, "id">;
}

export interface AccountBootstrapInput {
  fullName: string;
  organizationName: string;
  sector: string;
  city: string;
}

export class AccountSetupRequiredError extends Error {
  readonly code = "ACCOUNT_SETUP_REQUIRED";

  constructor() {
    super("Completa la configurazione iniziale dell'azienda.");
    this.name = "AccountSetupRequiredError";
  }
}

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return typeof value === "string" && ORGANIZATION_ROLES.includes(value as OrganizationRole);
}

export function isAccountSetupRequiredError(error: unknown): error is AccountSetupRequiredError {
  return error instanceof AccountSetupRequiredError;
}
