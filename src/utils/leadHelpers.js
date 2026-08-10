import {
  getStatusWorkflowGuide,
  getSuggestedFollowUpForStatus,
  getSuggestedNextActionForStatus,
  STATUS_WORKFLOW_GUIDE
} from "../domain/leadWorkflow.ts";
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
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");

  return leads.filter((lead) => lead.followUpAt?.startsWith(today));
}

export function isOpenLead(lead) {
  return !isFinalLeadStatusValue(lead.status);
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
  getStatusWorkflowGuide,
  getSuggestedNextActionForStatus,
  getSuggestedFollowUpForStatus
};
