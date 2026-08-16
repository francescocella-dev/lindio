import {
  isLeadStatus,
  isNextAction,
  isUrgencyLevel,
  type LeadStatus,
  type NextAction,
  type UrgencyLevel
} from "./lead.ts";
import {
  type ValidationIssue,
  type ValidationResult,
  unwrapValidation,
  validationFailure,
  validationSuccess
} from "./validation.ts";

export const INTAKE_ANALYSIS_SCHEMA_VERSION = 1 as const;
export const INTAKE_ANALYSIS_MAX_MESSAGE_LENGTH = 12_000;
export const INTAKE_ANALYSIS_QUALITY_LEVELS = ["low", "medium", "high"] as const;
export const INTAKE_ANALYSIS_SIGNAL_TONES = ["positive", "neutral", "warning"] as const;

export type IntakeAnalysisQualityLevel = (typeof INTAKE_ANALYSIS_QUALITY_LEVELS)[number];
export type IntakeAnalysisSignalTone = (typeof INTAKE_ANALYSIS_SIGNAL_TONES)[number];

export interface IntakeAnalysisInput {
  message: string;
}

export interface IntakeAnalysisSignal {
  code: string;
  tone: IntakeAnalysisSignalTone;
  label: string;
}

export interface IntakeAnalysisAssessment {
  level: IntakeAnalysisQualityLevel;
  signals: IntakeAnalysisSignal[];
}

export interface IntakeAnalyzerMetadata {
  kind: "deterministic";
  version: string;
  privacy: "local";
}

export interface IntakeAnalysisResult {
  schemaVersion: typeof INTAKE_ANALYSIS_SCHEMA_VERSION;
  analyzer: IntakeAnalyzerMetadata;
  summary: string;
  serviceType: string;
  customerType: string;
  city: string;
  urgency: UrgencyLevel;
  detectedDetails: string[];
  missingFields: string[];
  suggestedStatus: LeadStatus;
  nextAction: NextAction;
  suggestedReply: string;
  estimatedValue: number;
  customerName: string;
  phone: string;
  email: string;
  assessment: IntakeAnalysisAssessment;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const items = value.map(cleanText);
  if (items.some((item) => !item)) return null;

  return [...new Set(items)];
}

function isQualityLevel(value: unknown): value is IntakeAnalysisQualityLevel {
  return typeof value === "string" && INTAKE_ANALYSIS_QUALITY_LEVELS.includes(value as IntakeAnalysisQualityLevel);
}

function isSignalTone(value: unknown): value is IntakeAnalysisSignalTone {
  return typeof value === "string" && INTAKE_ANALYSIS_SIGNAL_TONES.includes(value as IntakeAnalysisSignalTone);
}

function readSignals(value: unknown): IntakeAnalysisSignal[] | null {
  if (!Array.isArray(value)) return null;

  const signals: IntakeAnalysisSignal[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") return null;

    const source = item as Record<string, unknown>;
    const code = cleanText(source.code);
    const label = cleanText(source.label);

    if (!code || !label || !isSignalTone(source.tone)) return null;

    signals.push({ code, tone: source.tone, label });
  }

  return signals;
}

export function validateIntakeAnalysisInput(input: unknown): ValidationResult<IntakeAnalysisInput> {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const message = cleanText(source.message);
  const issues: ValidationIssue[] = [];

  if (!message) {
    issues.push({
      path: "message",
      code: "required",
      message: "Inserisci un messaggio da analizzare."
    });
  }

  if (message.length > INTAKE_ANALYSIS_MAX_MESSAGE_LENGTH) {
    issues.push({
      path: "message",
      code: "out_of_range",
      message: `Il messaggio supera il limite di ${INTAKE_ANALYSIS_MAX_MESSAGE_LENGTH} caratteri.`
    });
  }

  return issues.length > 0
    ? validationFailure(issues)
    : validationSuccess({ message });
}

export function parseIntakeAnalysisInput(input: unknown): IntakeAnalysisInput {
  return unwrapValidation(
    validateIntakeAnalysisInput(input),
    "Il messaggio da analizzare non è valido."
  );
}

export function validateIntakeAnalysisResult(input: unknown): ValidationResult<IntakeAnalysisResult> {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const analyzerSource = source.analyzer && typeof source.analyzer === "object"
    ? source.analyzer as Record<string, unknown>
    : {};
  const assessmentSource = source.assessment && typeof source.assessment === "object"
    ? source.assessment as Record<string, unknown>
    : {};
  const issues: ValidationIssue[] = [];

  const summary = cleanText(source.summary);
  const serviceType = cleanText(source.serviceType);
  const customerType = cleanText(source.customerType);
  const city = cleanText(source.city);
  const suggestedReply = cleanText(source.suggestedReply);
  const customerName = cleanText(source.customerName);
  const phone = cleanText(source.phone);
  const email = cleanText(source.email);
  const analyzerVersion = cleanText(analyzerSource.version);
  const detectedDetails = readStringList(source.detectedDetails);
  const missingFields = readStringList(source.missingFields);
  const signals = readSignals(assessmentSource.signals);
  const estimatedValue = Number(source.estimatedValue);

  if (source.schemaVersion !== INTAKE_ANALYSIS_SCHEMA_VERSION) {
    issues.push({ path: "schemaVersion", code: "invalid_choice", message: "Versione del contratto di analisi non supportata." });
  }

  if (analyzerSource.kind !== "deterministic" || analyzerSource.privacy !== "local" || !analyzerVersion) {
    issues.push({ path: "analyzer", code: "invalid_type", message: "Metadati dell'analizzatore non validi." });
  }

  if (!summary) {
    issues.push({ path: "summary", code: "required", message: "Il risultato deve contenere un riepilogo." });
  }

  if (!customerType) {
    issues.push({ path: "customerType", code: "required", message: "Il risultato deve indicare il tipo cliente o dichiararlo non determinato." });
  }

  if (!isUrgencyLevel(source.urgency)) {
    issues.push({ path: "urgency", code: "invalid_choice", message: "Urgenza suggerita non valida." });
  }

  if (!isLeadStatus(source.suggestedStatus)) {
    issues.push({ path: "suggestedStatus", code: "invalid_choice", message: "Stato suggerito non valido." });
  }

  if (!isNextAction(source.nextAction)) {
    issues.push({ path: "nextAction", code: "invalid_choice", message: "Prossima azione suggerita non valida." });
  }

  if (!detectedDetails || !missingFields) {
    issues.push({ path: "details", code: "invalid_type", message: "Dettagli rilevati e mancanti devono essere liste di testo valide." });
  }

  if (!Number.isFinite(estimatedValue) || estimatedValue < 0) {
    issues.push({ path: "estimatedValue", code: "invalid_number", message: "Il valore orientativo deve essere un numero maggiore o uguale a zero." });
  }

  if (!suggestedReply) {
    issues.push({ path: "suggestedReply", code: "required", message: "Il risultato deve contenere una risposta suggerita." });
  }

  if (!isQualityLevel(assessmentSource.level) || !signals || signals.length === 0) {
    issues.push({ path: "assessment", code: "invalid_type", message: "La valutazione qualitativa dell'analisi non è valida." });
  }

  if (issues.length > 0) {
    return validationFailure(issues);
  }

  return validationSuccess({
    schemaVersion: INTAKE_ANALYSIS_SCHEMA_VERSION,
    analyzer: {
      kind: "deterministic",
      version: analyzerVersion,
      privacy: "local"
    },
    summary,
    serviceType,
    customerType,
    city,
    urgency: source.urgency as UrgencyLevel,
    detectedDetails: detectedDetails ?? [],
    missingFields: missingFields ?? [],
    suggestedStatus: source.suggestedStatus as LeadStatus,
    nextAction: source.nextAction as NextAction,
    suggestedReply,
    estimatedValue,
    customerName,
    phone,
    email,
    assessment: {
      level: assessmentSource.level as IntakeAnalysisQualityLevel,
      signals: signals ?? []
    }
  });
}

export function parseIntakeAnalysisResult(input: unknown): IntakeAnalysisResult {
  return unwrapValidation(
    validateIntakeAnalysisResult(input),
    "Il risultato dell'analisi non rispetta il contratto previsto."
  );
}
