import {
  getStatusWorkflowGuide,
  getSuggestedFollowUpForStatus,
  getSuggestedNextActionForStatus,
  STATUS_WORKFLOW_GUIDE
} from "../domain/leadWorkflow.ts";
import {
  compareActiveLeadPriority,
  isFollowUpDueSoon,
  isFollowUpOverdue,
  isFollowUpToday,
  isOpenLead,
  isSameLocalDay
} from "../domain/leadOperations.ts";
import {
  isFinalLeadStatusValue,
  normalizeLeadStatusValue
} from "../domain/lead.ts";
import { toLocalDateTimeInputValue } from "../domain/dateTime.ts";

export function countBy(values) {
  return Object.entries(
    values.reduce((acc, value) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {})
  );
}

export function mostFrequent(values) {
  return countBy(values).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
}

export function getTodayFollowUps(leads) {
  const now = new Date();
  return leads.filter((lead) => isFollowUpToday(lead.followUpAt, lead.status, now));
}

export function getLeadSearchText(lead) {
  return `${lead.customerName} ${lead.serviceType} ${lead.city} ${lead.source}`.toLowerCase();
}

export { toLocalDateTimeInputValue };

export function normalizeLeadStatus(status) {
  return normalizeLeadStatusValue(status);
}

export function isFinalLeadStatus(status) {
  return isFinalLeadStatusValue(status);
}

export {
  STATUS_WORKFLOW_GUIDE,
  compareActiveLeadPriority,
  getStatusWorkflowGuide,
  getSuggestedNextActionForStatus,
  getSuggestedFollowUpForStatus,
  isFollowUpDueSoon,
  isFollowUpOverdue,
  isFollowUpToday,
  isOpenLead,
  isSameLocalDay
};
