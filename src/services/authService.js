import { createSupabaseAccountRepository } from "../repositories/supabaseAccountRepository.ts";
import { createSupabaseAuthRepository } from "../repositories/supabaseAuthRepository.ts";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Accesso non configurato. Controlla le variabili ambiente.");
  }
}

function getAccountRepository() {
  ensureSupabase();
  return createSupabaseAccountRepository(supabase);
}

function getAuthRepository() {
  ensureSupabase();
  return createSupabaseAuthRepository(supabase);
}

export async function getCurrentSession() {
  ensureSupabase();

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export function subscribeToAuthChanges(callback) {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signInWithEmailPassword(email, password) {
  ensureSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmailPassword(input) {
  return getAuthRepository().signUp(input);
}

export async function requestPasswordReset(input) {
  return getAuthRepository().requestPasswordReset(input);
}

export async function signOutFromSupabase() {
  ensureSupabase();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function updateUserPassword(newPassword) {
  ensureSupabase();

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchProfileWithOrganization() {
  return getAccountRepository().getAccount();
}

export async function bootstrapAccount(input) {
  return getAccountRepository().bootstrapAccount(input);
}

export async function updateAccountProfile({ organizationId, profile, organization }) {
  return getAccountRepository().updateAccount({
    organizationId,
    profile,
    organization
  });
}
