import { createSupabaseLeadRepository } from "../repositories/supabaseLeadRepository.ts";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

function getRepository() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase non è configurato.");
  }

  return createSupabaseLeadRepository(supabase);
}

export async function fetchSupabaseLeads() {
  return getRepository().list();
}

export async function createSupabaseLead(lead, organizationId) {
  return getRepository().create(lead, organizationId);
}

export async function updateSupabaseLead(updatedLead, previousLead) {
  return getRepository().update(updatedLead, previousLead);
}
