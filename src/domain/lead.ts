export const LEAD_STATUSES = [
  "Nuova",
  "Da rispondere",
  "Info richieste",
  "Sopralluogo da fissare",
  "Preventivo da preparare",
  "Preventivo inviato",
  "In attesa",
  "Vinta",
  "Persa"
] as const;

export const LEAD_CHANNELS = [
  "WhatsApp",
  "Telefono",
  "Email",
  "Instagram",
  "Facebook",
  "Sito/Form",
  "Altro"
] as const;

export const URGENCY_LEVELS = ["Bassa", "Media", "Alta"] as const;

export const NEXT_ACTIONS = [
  "Rispondere al cliente",
  "Chiamare cliente",
  "Chiedere informazioni mancanti",
  "Fissare sopralluogo",
  "Preparare preventivo",
  "Inviare preventivo",
  "Fare follow-up",
  "Attendere riscontro",
  "Nessuna azione"
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadChannel = (typeof LEAD_CHANNELS)[number];
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];
export type NextAction = (typeof NEXT_ACTIONS)[number];

export interface LeadNote {
  id?: string;
  date: string;
  text: string;
}

export interface Lead {
  id: string;
  version: number;
  customerName: string;
  phone: string;
  email: string;
  source: LeadChannel;
  serviceType: string;
  city: string;
  address: string;
  urgency: UrgencyLevel;
  status: LeadStatus;
  nextAction: NextAction;
  followUpAt: string;
  estimatedValue: number;
  rawMessage: string;
  aiSummary: string;
  aiSuggestedReply: string;
  notes: LeadNote[];
  createdAt: string;
  updatedAt: string;
}

export type LeadDraft = Omit<Lead, "id" | "version" | "notes" | "createdAt" | "updatedAt"> & {
  id?: string;
  notes?: LeadNote[];
  createdAt?: string;
  updatedAt?: string;
};

export interface LeadPersistenceInput {
  customerName: string;
  phone: string;
  email: string;
  source: LeadChannel;
  serviceType: string;
  city: string;
  address: string;
  urgency: UrgencyLevel;
  status: LeadStatus;
  nextAction: NextAction;
  followUpAt: string;
  estimatedValue: number;
  rawMessage: string;
  aiSummary: string;
  aiSuggestedReply: string;
}

export const DEFAULT_LEAD_STATUS: LeadStatus = "Nuova";
export const DEFAULT_LEAD_CHANNEL: LeadChannel = "WhatsApp";
export const DEFAULT_URGENCY_LEVEL: UrgencyLevel = "Media";
export const DEFAULT_NEXT_ACTION: NextAction = "Rispondere al cliente";

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && LEAD_STATUSES.includes(value as LeadStatus);
}

export function isLeadChannel(value: unknown): value is LeadChannel {
  return typeof value === "string" && LEAD_CHANNELS.includes(value as LeadChannel);
}

export function isUrgencyLevel(value: unknown): value is UrgencyLevel {
  return typeof value === "string" && URGENCY_LEVELS.includes(value as UrgencyLevel);
}

export function isNextAction(value: unknown): value is NextAction {
  return typeof value === "string" && NEXT_ACTIONS.includes(value as NextAction);
}

export function normalizeLeadStatusValue(value: unknown): LeadStatus {
  if (value === "Follow-up") {
    return "In attesa";
  }

  return isLeadStatus(value) ? value : DEFAULT_LEAD_STATUS;
}

export function isFinalLeadStatusValue(value: unknown): boolean {
  const status = normalizeLeadStatusValue(value);
  return status === "Vinta" || status === "Persa";
}
