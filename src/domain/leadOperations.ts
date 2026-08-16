import { isFinalLeadStatusValue, type LeadStatus } from "./lead.ts";

export interface LeadOperationalView {
  status: LeadStatus | string;
  followUpAt?: string;
  createdAt?: string;
}

function toValidDate(value: unknown): Date | null {
  if (!value) return null;

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(value: Date): Date {
  const date = new Date(value.getTime());
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isSameLocalDay(value: unknown, targetDate: Date = new Date()): boolean {
  const date = toValidDate(value);
  if (!date) return false;

  return (
    date.getFullYear() === targetDate.getFullYear() &&
    date.getMonth() === targetDate.getMonth() &&
    date.getDate() === targetDate.getDate()
  );
}

export function isOpenLead(lead: Pick<LeadOperationalView, "status">): boolean {
  return !isFinalLeadStatusValue(lead.status);
}

export function isFollowUpToday(
  value: unknown,
  status: unknown,
  now: Date = new Date()
): boolean {
  if (isFinalLeadStatusValue(status)) return false;
  return isSameLocalDay(value, now);
}

export function isFollowUpOverdue(
  value: unknown,
  status: unknown,
  now: Date = new Date()
): boolean {
  if (isFinalLeadStatusValue(status)) return false;

  const date = toValidDate(value);
  if (!date) return false;

  return date.getTime() < startOfLocalDay(now).getTime();
}

export function isFollowUpDueSoon(
  value: unknown,
  status: unknown,
  now: Date = new Date(),
  days = 2
): boolean {
  if (isFinalLeadStatusValue(status)) return false;

  const date = toValidDate(value);
  if (!date) return false;

  const limit = new Date(now.getTime());
  limit.setDate(limit.getDate() + Math.max(days, 0));

  return date.getTime() >= now.getTime() && date.getTime() <= limit.getTime();
}

export function compareActiveLeadPriority(
  a: LeadOperationalView,
  b: LeadOperationalView,
  now: Date = new Date()
): number {
  const aOverdue = isFollowUpOverdue(a.followUpAt, a.status, now);
  const bOverdue = isFollowUpOverdue(b.followUpAt, b.status, now);

  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

  const aToday = isFollowUpToday(a.followUpAt, a.status, now);
  const bToday = isFollowUpToday(b.followUpAt, b.status, now);

  if (aToday !== bToday) return aToday ? -1 : 1;

  const aDate = toValidDate(a.followUpAt);
  const bDate = toValidDate(b.followUpAt);
  const aTime = aDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bTime = bDate?.getTime() ?? Number.MAX_SAFE_INTEGER;

  if (aTime !== bTime) return aTime - bTime;

  const aCreatedAt = toValidDate(a.createdAt)?.getTime() ?? 0;
  const bCreatedAt = toValidDate(b.createdAt)?.getTime() ?? 0;
  return bCreatedAt - aCreatedAt;
}
