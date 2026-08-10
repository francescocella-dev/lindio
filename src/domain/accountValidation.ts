import type { AccountBootstrapInput, AccountUpdateInput } from "./account.ts";
import {
  type ValidationIssue,
  type ValidationResult,
  unwrapValidation,
  validationFailure,
  validationSuccess
} from "./validation.ts";

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidOptionalEmail(value: string): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateAccountBootstrap(input: unknown): ValidationResult<AccountBootstrapInput> {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const fullName = cleanText(source.fullName);
  const organizationName = cleanText(source.organizationName);
  const sector = cleanText(source.sector);
  const city = cleanText(source.city);
  const issues: ValidationIssue[] = [];

  if (!fullName) {
    issues.push({ path: "fullName", code: "required", message: "Inserisci il tuo nome." });
  }

  if (!organizationName) {
    issues.push({ path: "organizationName", code: "required", message: "Inserisci il nome dell'azienda." });
  }

  if (!sector) {
    issues.push({ path: "sector", code: "required", message: "Inserisci il settore dell'azienda." });
  }

  if (!city) {
    issues.push({ path: "city", code: "required", message: "Inserisci la città o area operativa." });
  }

  if (issues.length > 0) {
    return validationFailure(issues);
  }

  return validationSuccess({ fullName, organizationName, sector, city });
}

export function parseAccountBootstrap(input: unknown): AccountBootstrapInput {
  return unwrapValidation(
    validateAccountBootstrap(input),
    "I dati della configurazione iniziale non sono validi."
  );
}

export function validateAccountUpdate(input: unknown): ValidationResult<AccountUpdateInput> {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const profile = source.profile && typeof source.profile === "object"
    ? source.profile as Record<string, unknown>
    : {};
  const organization = source.organization && typeof source.organization === "object"
    ? source.organization as Record<string, unknown>
    : {};

  const issues: ValidationIssue[] = [];
  const organizationId = cleanText(source.organizationId);
  const fullName = cleanText(profile.fullName) || "Utente";
  const organizationName = cleanText(organization.name) || "Azienda";
  const organizationEmail = cleanText(organization.email);
  const minutes = Number(profile.notificationMinutesBefore ?? 30);

  if (!organizationId) {
    issues.push({
      path: "organizationId",
      code: "required",
      message: "Azienda mancante. Impossibile salvare."
    });
  }

  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
    issues.push({
      path: "profile.notificationMinutesBefore",
      code: "out_of_range",
      message: "Il preavviso delle notifiche deve essere compreso tra 0 e 1440 minuti."
    });
  }

  if (!isValidOptionalEmail(organizationEmail)) {
    issues.push({
      path: "organization.email",
      code: "invalid_email",
      message: "Inserisci un indirizzo email aziendale valido oppure lascia il campo vuoto."
    });
  }

  if (issues.length > 0) {
    return validationFailure(issues);
  }

  return validationSuccess({
    organizationId,
    profile: {
      fullName,
      notificationEnabled: Boolean(profile.notificationEnabled),
      notificationMinutesBefore: minutes
    },
    organization: {
      name: organizationName,
      sector: cleanText(organization.sector),
      city: cleanText(organization.city),
      phone: cleanText(organization.phone),
      email: organizationEmail,
      address: cleanText(organization.address)
    }
  });
}

export function parseAccountUpdate(input: unknown): AccountUpdateInput {
  return unwrapValidation(
    validateAccountUpdate(input),
    "I dati dell'account non sono validi."
  );
}
