import { Link } from "react-router-dom";
import { formatDateTime } from "../../utils/formatDate.js";
import { normalizeLeadStatus } from "../../utils/leadHelpers.js";
import LeadChannelBadge from "./LeadChannelBadge.jsx";
import LeadStatusBadge from "./LeadStatusBadge.jsx";

function isDueToday(value) {
  if (!value) return false;

  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isOverdue(value, status) {
  if (!value || ["Vinta", "Persa"].includes(normalizeLeadStatus(status))) return false;

  return new Date(value).getTime() < new Date().getTime() && !isDueToday(value);
}

function formatCompactDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function formatCompactTime(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getTimeMeta(lead) {
  const status = normalizeLeadStatus(lead.status);

  if (status === "Vinta") {
    return {
      label: "Vinta",
      detail: formatCompactDate(lead.updatedAt || lead.createdAt),
      tone: "won"
    };
  }

  if (status === "Persa") {
    return {
      label: "Persa",
      detail: formatCompactDate(lead.updatedAt || lead.createdAt),
      tone: "lost"
    };
  }

  if (isOverdue(lead.followUpAt, status)) {
    return {
      label: "Scaduta",
      detail: formatDateTime(lead.followUpAt),
      tone: "overdue"
    };
  }

  if (isDueToday(lead.followUpAt)) {
    return {
      label: "Oggi",
      detail: formatCompactTime(lead.followUpAt),
      tone: "today"
    };
  }

  if (lead.followUpAt) {
    return {
      label: formatCompactDate(lead.followUpAt),
      detail: formatCompactTime(lead.followUpAt),
      tone: "neutral"
    };
  }

  return {
    label: "Nessuna data",
    detail: "",
    tone: "neutral"
  };
}

function getMetaLine(lead) {
  return [lead.serviceType || "Servizio da definire", lead.city || "Zona da definire"].filter(Boolean).join(" · ");
}

export default function LeadCard({ lead, mode = "active" }) {
  const status = normalizeLeadStatus(lead.status);
  const timeMeta = getTimeMeta(lead);
  const archived = mode === "archived";
  const overdue = timeMeta.tone === "overdue";

  return (
    <Link
      className={`request-row ${archived ? "request-row-archived" : ""} ${
        overdue ? "request-row-overdue" : ""
      }`}
      to={`/leads/${lead.id}`}
    >
      <div className="request-channel-cell">
        <LeadChannelBadge channel={lead.source} variant="icon" />
      </div>

      <div className="request-main">
        <div className="request-title-line">
          <strong>{lead.customerName || "Cliente da identificare"}</strong>
          <LeadStatusBadge status={status} />
        </div>

        <span className="request-meta-line">{getMetaLine(lead)}</span>

        <div className="request-action-line">
          <span>{lead.nextAction || "Prossima azione da definire"}</span>
        </div>
      </div>

      <div className="request-side">
        <span className={`request-time-pill request-time-${timeMeta.tone}`}>{timeMeta.label}</span>
        {timeMeta.detail && <small>{timeMeta.detail}</small>}
      </div>

      <span className="request-open-arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}