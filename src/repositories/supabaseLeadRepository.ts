import { toDatabaseDateTime, toLocalDateTimeInputValue } from "../domain/dateTime.ts";
import {
  DEFAULT_LEAD_CHANNEL,
  DEFAULT_LEAD_STATUS,
  DEFAULT_NEXT_ACTION,
  DEFAULT_URGENCY_LEVEL,
  isLeadChannel,
  isLeadStatus,
  isNextAction,
  isUrgencyLevel,
  type Lead,
  type LeadDraft,
  type LeadNote
} from "../domain/lead.ts";
import { toLeadPersistenceInput } from "../domain/leadValidation.ts";
import type { LeadRepository } from "./leadRepository.ts";

interface SupabaseErrorLike {
  message?: string;
}

interface SupabaseResult<T = unknown> {
  data: T;
  error: SupabaseErrorLike | null;
}

export interface SupabaseClientPort {
  from(table: string): any;
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<SupabaseResult>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nonNegativeNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(number, 0) : 0;
}

function mapNoteRow(value: unknown): LeadNote {
  const row = asRecord(value);

  return {
    ...(stringValue(row.id) ? { id: stringValue(row.id) } : {}),
    date: stringValue(row.created_at),
    text: stringValue(row.note)
  };
}

function mapLeadRow(value: unknown, notes: LeadNote[] = []): Lead {
  const row = asRecord(value);
  const source = isLeadChannel(row.source) ? row.source : DEFAULT_LEAD_CHANNEL;
  const urgency = isUrgencyLevel(row.urgency) ? row.urgency : DEFAULT_URGENCY_LEVEL;
  const status = isLeadStatus(row.status) ? row.status : DEFAULT_LEAD_STATUS;
  const nextAction = isNextAction(row.next_action) ? row.next_action : DEFAULT_NEXT_ACTION;

  return {
    id: stringValue(row.id),
    customerName: stringValue(row.customer_name),
    phone: stringValue(row.customer_phone),
    email: stringValue(row.customer_email),
    source,
    serviceType: stringValue(row.service_type),
    city: stringValue(row.city),
    address: stringValue(row.address),
    urgency,
    status,
    nextAction,
    followUpAt: toLocalDateTimeInputValue(row.follow_up_at),
    estimatedValue: nonNegativeNumber(row.estimated_value),
    rawMessage: stringValue(row.raw_message),
    aiSummary: stringValue(row.ai_summary),
    aiSuggestedReply: stringValue(row.ai_suggested_reply),
    notes,
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at)
  };
}

function mapLeadToRpcPayload(input: unknown): Record<string, string> {
  const lead = toLeadPersistenceInput(input);

  return {
    customer_name: lead.customerName,
    customer_phone: lead.phone,
    customer_email: lead.email,
    source: lead.source,
    service_type: lead.serviceType,
    city: lead.city,
    address: lead.address,
    urgency: lead.urgency,
    status: lead.status,
    next_action: lead.nextAction,
    follow_up_at: toDatabaseDateTime(lead.followUpAt) || "",
    estimated_value: String(lead.estimatedValue),
    raw_message: lead.rawMessage,
    ai_summary: lead.aiSummary,
    ai_suggested_reply: lead.aiSuggestedReply
  };
}

function isSameNote(a: LeadNote, b: LeadNote): boolean {
  return a.id && b.id
    ? a.id === b.id
    : a.text === b.text && a.date === b.date;
}

function getNewNotes(previousLead: Lead | undefined, updatedLead: LeadDraft): string[] {
  const previousNotes = Array.isArray(previousLead?.notes) ? previousLead.notes : [];
  const updatedNotes = Array.isArray(updatedLead.notes) ? updatedLead.notes : [];

  return updatedNotes
    .filter((note) => {
      if (note.id) return false;
      return !previousNotes.some((previousNote) => isSameNote(previousNote, note));
    })
    .map((note) => note.text.trim())
    .filter(Boolean);
}

function throwIfError(error: SupabaseErrorLike | null): void {
  if (!error) return;
  throw new Error(error.message || "Errore Supabase non specificato.");
}

export function createSupabaseLeadRepository(client: SupabaseClientPort): LeadRepository {
  return {
    async list(): Promise<Lead[]> {
      const leadsResult = await client
        .from("leads")
        .select("*")
        .order("follow_up_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      throwIfError(leadsResult.error);

      const leadRows = Array.isArray(leadsResult.data) ? leadsResult.data : [];
      const leadIds = leadRows.map((lead: unknown) => stringValue(asRecord(lead).id)).filter(Boolean);

      if (leadIds.length === 0) return [];

      const notesResult = await client
        .from("lead_notes")
        .select("*")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false });

      throwIfError(notesResult.error);

      const notesByLead = (Array.isArray(notesResult.data) ? notesResult.data : []).reduce(
        (acc: Record<string, LeadNote[]>, note: unknown) => {
          const row = asRecord(note);
          const leadId = stringValue(row.lead_id);
          if (!leadId) return acc;
          if (!acc[leadId]) acc[leadId] = [];
          acc[leadId].push(mapNoteRow(row));
          return acc;
        },
        {}
      );

      return leadRows.map((lead: unknown) => {
        const id = stringValue(asRecord(lead).id);
        return mapLeadRow(lead, notesByLead[id] || []);
      });
    },

    async create(input: LeadDraft, organizationId: string): Promise<Lead> {
      if (!organizationId) {
        throw new Error("Organization ID mancante. Impossibile creare la richiesta.");
      }

      const result = await client.rpc("create_lead_with_initial_note", {
        p_organization_id: organizationId,
        p_lead: mapLeadToRpcPayload(input),
        p_initial_note: "Richiesta creata"
      });

      throwIfError(result.error);

      const data = asRecord(result.data);
      const notes = Array.isArray(data.notes) ? data.notes.map(mapNoteRow) : [];
      return mapLeadRow(data.lead, notes);
    },

    async update(input: LeadDraft, previousLead?: Lead): Promise<Lead> {
      if (!input.id) {
        throw new Error("ID richiesta mancante. Impossibile salvare le modifiche.");
      }

      const result = await client.rpc("update_lead_with_notes", {
        p_lead_id: input.id,
        p_lead: mapLeadToRpcPayload(input),
        p_new_notes: getNewNotes(previousLead, input)
      });

      throwIfError(result.error);

      const data = asRecord(result.data);
      const notes = Array.isArray(data.notes) ? data.notes.map(mapNoteRow) : [];
      return mapLeadRow(data.lead, notes);
    }
  };
}
