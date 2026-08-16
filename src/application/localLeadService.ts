import { normalizeLocalDateTime } from "../domain/dateTime.ts";
import type { Lead, LeadDraft, LeadNote } from "../domain/lead.ts";
import { parseLeadDraft } from "../domain/leadValidation.ts";

function nowIso(): string {
  return new Date().toISOString();
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `lead-${crypto.randomUUID()}`;
  }

  return `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentLocalDateTime(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds())
  ].join("");
}

export interface NormalizeLeadOptions {
  keepId?: boolean;
  keepDates?: boolean;
}

export function normalizeLead(input: unknown, options: NormalizeLeadOptions = {}): Lead {
  const lead = parseLeadDraft(input);
  const now = nowIso();
  const fallbackFollowUp = currentLocalDateTime();

  return {
    id: options.keepId && lead.id ? lead.id : createId(),
    version: 1,
    customerName: lead.customerName,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    serviceType: lead.serviceType,
    city: lead.city,
    address: lead.address,
    urgency: lead.urgency,
    status: lead.status,
    nextAction: lead.nextAction,
    followUpAt: normalizeLocalDateTime(lead.followUpAt, fallbackFollowUp),
    estimatedValue: lead.estimatedValue,
    rawMessage: lead.rawMessage,
    aiSummary: lead.aiSummary,
    aiSuggestedReply: lead.aiSuggestedReply,
    notes: Array.isArray(lead.notes) ? lead.notes : [],
    createdAt: options.keepDates && lead.createdAt ? lead.createdAt : now,
    updatedAt: now
  };
}

export function createLead(input: unknown): Lead {
  const now = nowIso();
  const normalized = normalizeLead(input);

  return {
    ...normalized,
    notes: [
      {
        date: now,
        text: "Richiesta creata"
      },
      ...normalized.notes
    ],
    createdAt: now,
    updatedAt: now
  };
}

export function updateLead(leads: Lead[], updatedLead: unknown): Lead[] {
  const normalized = normalizeLead(updatedLead, {
    keepId: true,
    keepDates: true
  });

  return leads.map((lead) => {
    if (lead.id !== normalized.id) return lead;

    return {
      ...lead,
      ...normalized,
      version: Math.max(Number(lead.version) || 1, 1) + 1,
      updatedAt: nowIso()
    };
  });
}

export function addLeadNote(lead: Lead, noteText: unknown): Lead {
  const text = typeof noteText === "string" ? noteText.trim() : "";

  if (!text) return lead;

  const note: LeadNote = {
    date: nowIso(),
    text
  };

  return {
    ...lead,
    notes: [note, ...(Array.isArray(lead.notes) ? lead.notes : [])],
    updatedAt: nowIso()
  };
}

export type { Lead, LeadDraft };
