import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseConfig } from "./supabaseConfig.js";

export { isSupabaseConfigured };

export const supabase = isSupabaseConfigured
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase non configurato. Crea .env.local con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
  );
}
