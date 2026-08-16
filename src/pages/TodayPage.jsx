import { Link, useOutletContext } from "react-router-dom";
import RecentLeads from "../components/dashboard/RecentLeads.jsx";
import StatCard from "../components/dashboard/StatCard.jsx";
import TodayTaskList from "../components/dashboard/TodayTaskList.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Button from "../components/ui/Button.jsx";
import {
  compareActiveLeadPriority,
  isFollowUpOverdue,
  isFollowUpToday,
  isOpenLead
} from "../utils/leadHelpers.js";

function buildDashboardData(leads) {
  const now = new Date();
  const openLeads = leads.filter(isOpenLead);

  const todayTasks = openLeads
    .filter((lead) =>
      isFollowUpToday(lead.followUpAt, lead.status, now) ||
      isFollowUpOverdue(lead.followUpAt, lead.status, now)
    )
    .sort((a, b) => compareActiveLeadPriority(a, b, now));

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  return {
    newLeads: leads.filter((lead) => ["Nuova", "Da rispondere"].includes(lead.status)).length,
    todayFollowUps: openLeads.filter((lead) =>
      isFollowUpToday(lead.followUpAt, lead.status, now)
    ).length,
    overdue: openLeads.filter((lead) =>
      isFollowUpOverdue(lead.followUpAt, lead.status, now)
    ).length,
    quotes: leads.filter((lead) => ["Preventivo da preparare", "Preventivo inviato"].includes(lead.status)).length,
    waiting: leads.filter((lead) => lead.status === "In attesa").length,
    openLeads: openLeads.length,
    todayTasks,
    recentLeads
  };
}

function getTodayLabel() {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(new Date());
}

export default function TodayPage() {
  const { leads, profile, organization, isDataLoading, dataError, reloadLeads } = useOutletContext();
  const dashboard = buildDashboardData(leads);

  const firstName = profile?.fullName?.split(" ")[0] || "Mario";
  const organizationName = organization?.name || "Impresa Rossi";

  return (
    <section className="page today-page">
      <header className="today-hero">
        <div>
          <span>{getTodayLabel()}</span>
          <h1>Ciao {firstName}, cosa devi fare oggi?</h1>
          <p>Controlla follow-up, richieste da rispondere e preventivi da preparare per {organizationName}.</p>
        </div>

        <Link className="button button-primary today-hero-action" to="/leads/new">
          + Nuova richiesta
        </Link>
      </header>

      {dataError && (
        <div className="app-alert app-alert-error">
          <strong>Errore dati</strong>
          <span>{dataError}</span>
          {reloadLeads && (
            <Button variant="secondary" type="button" onClick={reloadLeads}>
              Riprova
            </Button>
          )}
        </div>
      )}

      <section className="today-stats-grid" aria-label="Riepilogo di oggi">
        <StatCard label="Nuove" value={dashboard.newLeads} hint="Da leggere o rispondere" tone="blue" />
        <StatCard label="Follow-up oggi" value={dashboard.todayFollowUps} hint="Clienti da ricontattare" tone="green" />
        <StatCard label="Scadute" value={dashboard.overdue} hint="Azioni da recuperare" tone={dashboard.overdue > 0 ? "red" : "gray"} />
        <StatCard label="Preventivi" value={dashboard.quotes} hint="Da preparare o inviati" tone="amber" />
      </section>

      {isDataLoading ? (
        <EmptyState title="Caricamento dashboard" message="Sto recuperando richieste e follow-up da Supabase..." />
      ) : leads.length === 0 ? (
        <EmptyState
          title="La dashboard è ancora vuota"
          message="Quando inserirai la prima richiesta, qui vedrai follow-up, richieste da rispondere e attività del giorno."
        >
          <Link className="button button-primary" to="/leads/new">
            + Inserisci la prima richiesta
          </Link>
        </EmptyState>
      ) : (
        <div className="today-grid">
          <TodayTaskList leads={dashboard.todayTasks} />

          <aside className="today-side-panel">
            <section className="today-insight-card">
              <span>Focus rapido</span>
              <h2>{dashboard.openLeads} richieste aperte</h2>
              <p>
                Le richieste aperte sono quelle ancora da gestire. La priorità è non lasciare senza
                risposta chi ha già scritto o chi aspetta un preventivo.
              </p>

              <div className="today-mini-metrics">
                <div>
                  <strong>{dashboard.waiting}</strong>
                  <span>in attesa</span>
                </div>

                <div>
                  <strong>{dashboard.quotes}</strong>
                  <span>preventivi</span>
                </div>
              </div>
            </section>

            <RecentLeads leads={dashboard.recentLeads} />
          </aside>
        </div>
      )}
    </section>
  );
}