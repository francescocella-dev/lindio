import { Link } from "react-router-dom";
import EmptyState from "../ui/EmptyState.jsx";
import LeadChannelBadge from "../leads/LeadChannelBadge.jsx";
import LeadStatusBadge from "../leads/LeadStatusBadge.jsx";

function isSameDay(value, targetDate = new Date()) {
  if (!value) return false;

  const date = new Date(value);

  return (
    date.getFullYear() === targetDate.getFullYear() &&
    date.getMonth() === targetDate.getMonth() &&
    date.getDate() === targetDate.getDate()
  );
}

function isOverdue(value) {
  if (!value) return false;

  const date = new Date(value);
  const today = new Date();

  return date.getTime() < today.getTime() && !isSameDay(value, today);
}

function formatTaskTime(value) {
  if (!value) {
    return {
      label: "Da pianificare",
      value: "—",
      tone: "neutral"
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      label: "Da controllare",
      value: "—",
      tone: "neutral"
    };
  }

  const time = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

  const day = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short"
  }).format(date);

  if (isOverdue(value)) {
    return {
      label: "Scaduto",
      value: `${day}`,
      tone: "overdue"
    };
  }

  if (isSameDay(value)) {
    return {
      label: "Oggi",
      value: time,
      tone: "today"
    };
  }

  return {
    label: "Follow-up",
    value: day,
    tone: "neutral"
  };
}

function getCustomerName(lead) {
  return lead.customerName || "Cliente da identificare";
}

function getActionLabel(lead) {
  return lead.nextAction || "Definire prossimo passo";
}

function getMetaLine(lead) {
  return [lead.serviceType, lead.city].filter(Boolean).join(" · ");
}

export default function TodayTaskList({ leads }) {
  const visibleLeads = leads.slice(0, 7);
  const overdueCount = leads.filter((lead) => isOverdue(lead.followUpAt)).length;

  return (
    <section className="today-task-card today-task-card-priority">
      <div className="section-title-row today-priority-title-row">
        <div>
          <span>Priorità di oggi</span>
          <h2>Attività da gestire</h2>
          <p>Parti da qui: richieste da recuperare, clienti da ricontattare e prossimi passi.</p>
        </div>

        <div className="today-priority-actions">
          <div className="today-priority-count">
            <strong>{leads.length}</strong>
            <span>priorità</span>
          </div>

          <Link to="/leads" className="text-link">
            Vedi tutte
          </Link>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="today-priority-warning">
          <strong>{overdueCount}</strong>
          <span>
            {overdueCount === 1
              ? "attività è scaduta e va recuperata."
              : "attività sono scadute e vanno recuperate."}
          </span>
        </div>
      )}

      {visibleLeads.length > 0 ? (
        <div className="dashboard-task-list">
          {visibleLeads.map((lead) => {
            const timing = formatTaskTime(lead.followUpAt);
            const overdue = timing.tone === "overdue";
            const metaLine = getMetaLine(lead);

            return (
              <Link
                className={`dashboard-task-row ${overdue ? "dashboard-task-row-overdue" : ""}`}
                to={`/leads/${lead.id}`}
                key={lead.id}
              >
                <div className="dashboard-task-icon">
                  <LeadChannelBadge channel={lead.source} variant="icon" />
                </div>

                <div className="dashboard-task-main">
                  <div className="dashboard-task-title-line">
                    <strong>{getCustomerName(lead)}</strong>
                    {metaLine && <span>{metaLine}</span>}
                  </div>

                  <p>{getActionLabel(lead)}</p>
                </div>

                <div className="dashboard-task-side">
                  <span className={`dashboard-task-time dashboard-task-time-${timing.tone}`}>
                    {timing.value}
                  </span>

                  <div className="dashboard-task-desktop-status">
                    <LeadStatusBadge status={lead.status} />
                  </div>
                </div>
              </Link>
            );
          })}

          {leads.length > visibleLeads.length && (
            <Link className="today-task-more" to="/leads">
              +{leads.length - visibleLeads.length} altre attività nella lista richieste
            </Link>
          )}
        </div>
      ) : (
        <EmptyState
          title="Nessuna priorità per oggi"
          message="Non ci sono follow-up o richieste scadute. Puoi inserire una nuova richiesta oppure controllare la lista completa."
        >
          <Link className="button button-secondary" to="/leads">
            Apri richieste
          </Link>
        </EmptyState>
      )}
    </section>
  );
}