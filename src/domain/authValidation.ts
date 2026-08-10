import type { PasswordResetRequest, SignUpInput } from "./auth.ts";
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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateSignUp(input: unknown): ValidationResult<SignUpInput> {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const email = cleanText(source.email).toLowerCase();
  const password = typeof source.password === "string" ? source.password : "";
  const fullName = cleanText(source.fullName);
  const issues: ValidationIssue[] = [];

  if (!fullName) {
    issues.push({ path: "fullName", code: "required", message: "Inserisci il tuo nome." });
  }

  if (!email || !isValidEmail(email)) {
    issues.push({ path: "email", code: "invalid_email", message: "Inserisci un indirizzo email valido." });
  }

  if (password.length < 8) {
    issues.push({ path: "password", code: "out_of_range", message: "La password deve contenere almeno 8 caratteri." });
  }

  if (issues.length > 0) {
    return validationFailure(issues);
  }

  return validationSuccess({ email, password, fullName });
}

export function parseSignUp(input: unknown): SignUpInput {
  return unwrapValidation(validateSignUp(input), "I dati di registrazione non sono validi.");
}

export function validatePasswordResetRequest(input: unknown): ValidationResult<PasswordResetRequest> {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const email = cleanText(source.email).toLowerCase();
  const redirectTo = cleanText(source.redirectTo);
  const issues: ValidationIssue[] = [];

  if (!email || !isValidEmail(email)) {
    issues.push({ path: "email", code: "invalid_email", message: "Inserisci un indirizzo email valido." });
  }

  if (!redirectTo) {
    issues.push({ path: "redirectTo", code: "required", message: "URL di recupero mancante." });
  }

  if (issues.length > 0) {
    return validationFailure(issues);
  }

  return validationSuccess({ email, redirectTo });
}

export function parsePasswordResetRequest(input: unknown): PasswordResetRequest {
  return unwrapValidation(
    validatePasswordResetRequest(input),
    "La richiesta di recupero password non è valida."
  );
}
