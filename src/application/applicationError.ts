import { DomainValidationError } from "../domain/validation.ts";

export const APPLICATION_ERROR_CODES = [
  "VALIDATION",
  "AUTHORIZATION",
  "NOT_FOUND",
  "CONFLICT",
  "UNAVAILABLE",
  "UNKNOWN"
] as const;

export type ApplicationErrorCode = (typeof APPLICATION_ERROR_CODES)[number];

export interface ApplicationErrorOptions {
  cause?: unknown;
  retryable?: boolean;
}

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly retryable: boolean;

  constructor(code: ApplicationErrorCode, message: string, options: ApplicationErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ApplicationError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

export function toApplicationError(
  error: unknown,
  fallbackMessage = "Si è verificato un errore durante l’operazione."
): ApplicationError {
  if (isApplicationError(error)) return error;

  if (error instanceof DomainValidationError) {
    return new ApplicationError(
      "VALIDATION",
      error.issues[0]?.message || error.message || "I dati inseriti non sono validi.",
      { cause: error }
    );
  }

  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();

    if (normalized.includes("row-level security") || normalized.includes("permission denied")) {
      return new ApplicationError(
        "AUTHORIZATION",
        "Operazione bloccata dalle regole di sicurezza del workspace.",
        { cause: error }
      );
    }

    return new ApplicationError("UNKNOWN", error.message || fallbackMessage, { cause: error });
  }

  return new ApplicationError("UNKNOWN", fallbackMessage, { cause: error });
}

export function getApplicationErrorMessage(
  error: unknown,
  fallbackMessage = "Si è verificato un errore durante l’operazione."
): string {
  return toApplicationError(error, fallbackMessage).message;
}
