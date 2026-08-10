export interface AuthUserIdentity {
  id: string;
  email: string;
  fullName: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
}

export interface PasswordResetRequest {
  email: string;
  redirectTo: string;
}

export interface AuthActionResult {
  hasSession: boolean;
  userEmail: string;
}
