export type ValidationIssueCode =
  | "required"
  | "invalid_choice"
  | "invalid_email"
  | "invalid_number"
  | "invalid_datetime"
  | "out_of_range"
  | "invalid_type";

export interface ValidationIssue {
  path: string;
  code: ValidationIssueCode;
  message: string;
}

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; issues: ValidationIssue[] };

export class DomainValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = "DomainValidationError";
    this.issues = issues;
  }
}

export function validationSuccess<T>(data: T): ValidationResult<T> {
  return { success: true, data };
}

export function validationFailure<T = never>(issues: ValidationIssue[]): ValidationResult<T> {
  return { success: false, issues };
}

export function unwrapValidation<T>(result: ValidationResult<T>, message: string): T {
  if (result.success) {
    return result.data;
  }

  throw new DomainValidationError(result.issues[0]?.message || message, result.issues);
}

export function getFirstValidationMessage(error: unknown, fallback: string): string {
  if (error instanceof DomainValidationError) {
    return error.issues[0]?.message || error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
