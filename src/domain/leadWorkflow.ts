import {
  DEFAULT_LEAD_STATUS,
  isFinalLeadStatusValue,
  normalizeLeadStatusValue,
  type LeadStatus,
  type NextAction
} from "./lead.ts";
import { toLocalDateTimeInputValue } from "./dateTime.ts";

export type WorkflowTone = "blue" | "amber" | "purple" | "indigo" | "green" | "gray" | "red";

export interface LeadWorkflowGuide {
  title: string;
  description: string;
  suggestedAction: NextAction;
  followUpLabel: string;
  tone: WorkflowTone;
}

export const STATUS_WORKFLOW_GUIDE: Record<LeadStatus, LeadWorkflowGuide> = {
  Nuova: {
    title: "Richiesta appena arrivata",
    description: "La priorità è rispondere al cliente il prima possibile.",
    suggestedAction: "Rispondere al cliente",
    followUpLabel: "oggi",
    tone: "blue"
  },
  "Da rispondere": {
    title: "Il cliente aspetta una risposta",
    description: "Usa questo stato quando hai letto la richiesta ma non hai ancora risposto.",
    suggestedAction: "Rispondere al cliente",
    followUpLabel: "oggi",
    tone: "blue"
  },
  "Info richieste": {
    title: "Mancano informazioni",
    description: "Devi chiedere dati utili come metri quadri, foto, indirizzo, data o dettagli del lavoro.",
    suggestedAction: "Chiedere informazioni mancanti",
    followUpLabel: "oggi o domani",
    tone: "amber"
  },
  "Sopralluogo da fissare": {
    title: "Serve organizzare un sopralluogo",
    description: "La prossima cosa da fare è concordare giorno e orario con il cliente.",
    suggestedAction: "Fissare sopralluogo",
    followUpLabel: "domani",
    tone: "purple"
  },
  "Preventivo da preparare": {
    title: "Hai i dati, devi preparare il prezzo",
    description: "La richiesta è abbastanza chiara: ora devi preparare e inviare il preventivo.",
    suggestedAction: "Preparare preventivo",
    followUpLabel: "oggi o domani",
    tone: "indigo"
  },
  "Preventivo inviato": {
    title: "Preventivo già inviato",
    description: "Il preventivo è stato mandato. Ora conviene programmare un richiamo se il cliente non risponde.",
    suggestedAction: "Fare follow-up",
    followUpLabel: "tra 2-3 giorni",
    tone: "green"
  },
  "In attesa": {
    title: "Stai aspettando il cliente",
    description: "La palla è al cliente. Imposta un promemoria per non dimenticare di ricontattarlo.",
    suggestedAction: "Attendere riscontro",
    followUpLabel: "tra 2 giorni",
    tone: "gray"
  },
  Vinta: {
    title: "Richiesta vinta",
    description: "Il cliente ha accettato. Non serve follow-up commerciale; il prossimo passo sarà organizzare il lavoro.",
    suggestedAction: "Nessuna azione",
    followUpLabel: "nessun promemoria",
    tone: "green"
  },
  Persa: {
    title: "Richiesta persa",
    description: "La richiesta è chiusa. Non serve una prossima azione.",
    suggestedAction: "Nessuna azione",
    followUpLabel: "nessun promemoria",
    tone: "red"
  }
};

function nextDateAt(hour = 10, minute = 0, daysToAdd = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  date.setHours(hour, minute, 0, 0);
  return toLocalDateTimeInputValue(date);
}

function todayOrTomorrowAt(hour = 17, minute = 0): string {
  const date = new Date();

  if (date.getHours() >= hour) {
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);
  } else {
    date.setHours(hour, minute, 0, 0);
  }

  return toLocalDateTimeInputValue(date);
}

export function getStatusWorkflowGuide(status: unknown): LeadWorkflowGuide {
  const normalizedStatus = normalizeLeadStatusValue(status);
  return STATUS_WORKFLOW_GUIDE[normalizedStatus] || STATUS_WORKFLOW_GUIDE[DEFAULT_LEAD_STATUS];
}

export function getSuggestedNextActionForStatus(status: unknown): NextAction {
  return getStatusWorkflowGuide(status).suggestedAction;
}

export function getSuggestedFollowUpForStatus(status: unknown): string {
  const normalizedStatus = normalizeLeadStatusValue(status);

  if (isFinalLeadStatusValue(normalizedStatus)) return "";
  if (normalizedStatus === "Preventivo inviato") return nextDateAt(10, 0, 3);
  if (normalizedStatus === "In attesa") return nextDateAt(10, 0, 2);
  if (normalizedStatus === "Sopralluogo da fissare") return nextDateAt(10, 0, 1);

  return todayOrTomorrowAt(17, 0);
}
