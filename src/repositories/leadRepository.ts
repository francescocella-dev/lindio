import type { Lead, LeadDraft } from "../domain/lead.ts";

export interface LeadRepository {
  list(): Promise<Lead[]>;
  create(input: LeadDraft, organizationId: string): Promise<Lead>;
  update(input: LeadDraft, previousLead?: Lead): Promise<Lead>;
}
