import { isFinalLeadStatusValue } from "./lead.ts";

export const DEFAULT_REMINDER_MINUTES_BEFORE = 30;
export const MAX_REMINDER_MINUTES_BEFORE = 1440;
export const REMINDER_LATE_TOLERANCE_MINUTES = 10;

export interface ReminderLeadLike {
  id: string;
  status: unknown;
  followUpAt?: string | null;
}

export interface ReminderProfileLike {
  notificationMinutesBefore?: unknown;
}

export interface ReminderDecision {
  considered: boolean;
  shouldNotify: boolean;
  reminderId: string;
  dueAtMs: number | null;
  reason:
    | "no-follow-up"
    | "final-lead"
    | "invalid-follow-up"
    | "already-sent"
    | "too-early"
    | "too-late"
    | "due";
}

export function getReminderMinutesBefore(profile: ReminderProfileLike | null | undefined): number {
  const value = Number(profile?.notificationMinutesBefore ?? DEFAULT_REMINDER_MINUTES_BEFORE);

  if (!Number.isInteger(value) || value < 0 || value > MAX_REMINDER_MINUTES_BEFORE) {
    return DEFAULT_REMINDER_MINUTES_BEFORE;
  }

  return value;
}

export function getReminderId(lead: ReminderLeadLike): string {
  return `${lead.id}:${lead.followUpAt || ""}`;
}

export function buildLeadReminderPath(leadId: string): string {
  const normalizedLeadId = String(leadId || "").trim();

  if (!normalizedLeadId) {
    return "/today";
  }

  return `/leads/${encodeURIComponent(normalizedLeadId)}`;
}

function normalizeNowMs(now: number | Date): number {
  const value = now instanceof Date ? now.getTime() : now;

  return Number.isFinite(value) ? value : Date.now();
}

export function getReminderDecision(
  lead: ReminderLeadLike,
  profile: ReminderProfileLike | null | undefined,
  now: number | Date = Date.now(),
  sentReminders: Readonly<Record<string, string>> = {}
): ReminderDecision {
  const reminderId = getReminderId(lead);

  if (!lead.followUpAt) {
    return {
      considered: false,
      shouldNotify: false,
      reminderId,
      dueAtMs: null,
      reason: "no-follow-up"
    };
  }

  if (isFinalLeadStatusValue(lead.status)) {
    return {
      considered: false,
      shouldNotify: false,
      reminderId,
      dueAtMs: null,
      reason: "final-lead"
    };
  }

  const dueAtMs = Date.parse(lead.followUpAt);

  if (!Number.isFinite(dueAtMs)) {
    return {
      considered: true,
      shouldNotify: false,
      reminderId,
      dueAtMs: null,
      reason: "invalid-follow-up"
    };
  }

  if (sentReminders[reminderId]) {
    return {
      considered: true,
      shouldNotify: false,
      reminderId,
      dueAtMs,
      reason: "already-sent"
    };
  }

  const nowMs = normalizeNowMs(now);
  const minutesBefore = getReminderMinutesBefore(profile);
  const earlyWindowMs = minutesBefore * 60 * 1000;
  const lateToleranceMs = REMINDER_LATE_TOLERANCE_MINUTES * 60 * 1000;
  const diffMs = dueAtMs - nowMs;

  if (diffMs < -lateToleranceMs) {
    return {
      considered: true,
      shouldNotify: false,
      reminderId,
      dueAtMs,
      reason: "too-late"
    };
  }

  if (minutesBefore === 0 ? diffMs > 0 : diffMs > earlyWindowMs) {
    return {
      considered: true,
      shouldNotify: false,
      reminderId,
      dueAtMs,
      reason: "too-early"
    };
  }

  return {
    considered: true,
    shouldNotify: true,
    reminderId,
    dueAtMs,
    reason: "due"
  };
}
