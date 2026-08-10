import {
  DEFAULT_LEAD_CHANNEL,
  DEFAULT_LEAD_STATUS,
  DEFAULT_NEXT_ACTION,
  DEFAULT_URGENCY_LEVEL,
  isLeadChannel,
  isLeadStatus,
  isNextAction,
  isUrgencyLevel,
  type LeadDraft,
  type LeadNote,
  type LeadPersistenceInput
} from "./lead.ts";
import { isValidDateTime } from "./dateTime.ts";
import {
  type ValidationIssue,
  type ValidationResult,
  unwrapValidation,
  validationFailure,
  validationSuccess
} from "./validation.ts";

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNonNegativeNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function isValidOptionalEmail(value: string): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeNotes(value: unknown): LeadNote[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((note) => {
    if (!note || typeof note !== "object") return [];

    const source = note as Record<string, unknown>;
    const text = cleanText(source.text);
    const date = typeof source.date === "string" ? source.date : "";

    if (!text || !date) return [];

    return [{
      ...(typeof source.id === "string" && source.id ? { id: source.id } : {}),
      date,
      text
    }];
  });
}

export function validateLeadDraft(input: unknown): ValidationResult<LeadDraft> {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const issues: ValidationIssue[] = [];

  const customerName = cleanText(source.customerName);
  const rawMessage = cleanText(source.rawMessage);
  const email = cleanText(source.email);
  const followUpAt = cleanText(source.followUpAt);
  const estimatedValue = readNonNegativeNumber(source.estimatedValue);

  if (!customerName && !rawMessage) {
    issues.push({
      path: "customerName",
      code: "required",
      message: "Inserisci almeno il nome cliente oppure il messaggio ricevuto."
    });
  }

  if (!isValidOptionalEmail(email)) {
    issues.push({
      path: "email",
      code: "invalid_email",
      message: "Inserisci un indirizzo email valido oppure lascia il campo vuoto."
    });
  }

  if (followUpAt && !isValidDateTime(followUpAt)) {
    issues.push({
      path: "followUpAt",
      code: "invalid_datetime",
      message: "Il promemoria indicato non contiene una data e un orario validi."
    });
  }

  if (estimatedValue === null) {
    issues.push({
      path: "estimatedValue",
      code: "invalid_number",
      message: "Il valore stimato deve essere un numero maggiore o uguale a zero."
    });
  }

  if (source.source !== undefined && !isLeadChannel(source.source)) {
    issues.push({
      path: "source",
      code: "invalid_choice",
      message: "Il canale selezionato non è supportato."
    });
  }

  if (source.urgency !== undefined && !isUrgencyLevel(source.urgency)) {
    issues.push({
      path: "urgency",
      code: "invalid_choice",
      message: "Il livello di urgenza selezionato non è supportato."
    });
  }

  if (source.status !== undefined && !isLeadStatus(source.status) && source.status !== "Follow-up") {
    issues.push({
      path: "status",
      code: "invalid_choice",
      message: "Lo stato selezionato non è supportato."
    });
  }

  if (source.nextAction !== undefined && !isNextAction(source.nextAction)) {
    issues.push({
      path: "nextAction",
      code: "invalid_choice",
      message: "La prossima azione selezionata non è supportata."
    });
  }

  if (issues.length > 0) {
    return validationFailure(issues);
  }

  const normalized: LeadDraft = {
    customerName: customerName || "Cliente da identificare",
    phone: cleanText(source.phone),
    email,
    source: isLeadChannel(source.source) ? source.source : DEFAULT_LEAD_CHANNEL,
    serviceType: cleanText(source.serviceType) || "Servizio da definire",
    city: cleanText(source.city) || "Zona da definire",
    address: cleanText(source.address),
    urgency: isUrgencyLevel(source.urgency) ? source.urgency : DEFAULT_URGENCY_LEVEL,
    status: source.status === "Follow-up"
      ? "In attesa"
      : isLeadStatus(source.status) ? source.status : DEFAULT_LEAD_STATUS,
    nextAction: isNextAction(source.nextAction) ? source.nextAction : DEFAULT_NEXT_ACTION,
    followUpAt,
    estimatedValue: estimatedValue ?? 0,
    rawMessage,
    aiSummary: cleanText(source.aiSummary),
    aiSuggestedReply: cleanText(source.aiSuggestedReply),
    notes: normalizeNotes(source.notes)
  };

  if (typeof source.id === "string" && source.id) normalized.id = source.id;
  if (typeof source.createdAt === "string" && source.createdAt) normalized.createdAt = source.createdAt;
  if (typeof source.updatedAt === "string" && source.updatedAt) normalized.updatedAt = source.updatedAt;

  return validationSuccess(normalized);
}

export function parseLeadDraft(input: unknown): LeadDraft {
  return unwrapValidation(
    validateLeadDraft(input),
    "I dati della richiesta non sono validi."
  );
}

export function toLeadPersistenceInput(input: unknown): LeadPersistenceInput {
  const lead = parseLeadDraft(input);

  return {
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
    followUpAt: lead.followUpAt,
    estimatedValue: lead.estimatedValue,
    rawMessage: lead.rawMessage,
    aiSummary: lead.aiSummary,
    aiSuggestedReply: lead.aiSuggestedReply
  };
}
