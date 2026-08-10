import type { AuthActionResult } from "../domain/auth.ts";
import { parsePasswordResetRequest, parseSignUp } from "../domain/authValidation.ts";

interface SupabaseErrorLike {
  message?: string;
}

interface SupabaseAuthResult {
  data: {
    session?: unknown | null;
    user?: { email?: string | null } | null;
  };
  error: SupabaseErrorLike | null;
}

interface SupabaseAuthPort {
  signUp(input: Record<string, unknown>): PromiseLike<SupabaseAuthResult>;
  resetPasswordForEmail(email: string, options?: Record<string, unknown>): PromiseLike<{ error: SupabaseErrorLike | null }>;
}

export interface SupabaseAuthClientPort {
  auth: SupabaseAuthPort;
}

function throwIfError(error: SupabaseErrorLike | null): void {
  if (!error) return;
  throw new Error(error.message || "Errore di autenticazione non specificato.");
}

export function createSupabaseAuthRepository(client: SupabaseAuthClientPort) {
  return {
    async signUp(input: unknown): Promise<AuthActionResult> {
      const registration = parseSignUp(input);
      const result = await client.auth.signUp({
        email: registration.email,
        password: registration.password,
        options: {
          data: {
            full_name: registration.fullName
          }
        }
      });

      throwIfError(result.error);

      return {
        hasSession: Boolean(result.data.session),
        userEmail: result.data.user?.email || registration.email
      };
    },

    async requestPasswordReset(input: unknown): Promise<void> {
      const request = parsePasswordResetRequest(input);
      const result = await client.auth.resetPasswordForEmail(request.email, {
        redirectTo: request.redirectTo
      });

      throwIfError(result.error);
    }
  };
}
