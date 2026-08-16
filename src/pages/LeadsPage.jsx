import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import LeadList from "../components/leads/LeadList.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import {
  compareActiveLeadPriority,
  isFinalLeadStatus,
  isFollowUpOverdue,
  isOpenLead,
  normalizeLeadStatus
} from "../utils/leadHelpers.js";

const ACTIVE_FILTERS = [
  {
    label: "Tutte",
    match: () => true
  },
  {
    label: "Da rispondere",
    match: (lead) => ["Nuova", "Da rispondere"].includes(normalizeLeadStatus(lead.status))
  },
  {
    label: "Info richieste",
    match: (lead) => normalizeLeadStatus(lead.status) === "Info richieste"
  },
  {
    label: "Sopralluoghi",
    match: (lead) => normalizeLeadStatus(lead.status) === "Sopralluogo da fissare"
  },
  {
    label: "Preventivi",
    match: (lead) =>
      ["Preventivo da preparare", "Preventivo inviato"].includes(normalizeLeadStatus(lead.status))
  },
  {
    label: "Scadute",
    match: (lead) => isFollowUpOverdue(lead.followUpAt, lead.status)
  },
  {
    label: "In attesa",
    match: (lead) => normalizeLeadStatus(lead.status) === "In attesa"
  }
];

const ARCHIVED_FILTERS = [
  {
    label: "Archiviate",
    match: () => true
  },
  {
    label: "Vinte",
    match: (lead) => normalizeLeadStatus(lead.status) === "Vinta"
  },
  {
    label: "Perse",
    match: (lead) => normalizeLeadStatus(lead.status) === "Persa"
  }
];

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function isQuoteLead(lead) {
  return ["Preventivo da preparare", "Preventivo inviato"].includes(normalizeLeadStatus(lead.status));
}

function sortActiveLeads(leads) {
  const now = new Date();
  return [...leads].sort((a, b) => compareActiveLeadPriority(a, b, now));
}

function sortArchivedLeads(leads) {
  return [...leads].sort((a, b) => {
    return (
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
    );
  });
}

function matchesSearch(lead, query) {
  const search = normalize(query);

  if (!search) return true;

  const haystack = [
    lead.customerName,
    lead.phone,
    lead.email,
    lead.source,
    lead.serviceType,
    lead.city,
    lead.status,
    lead.nextAction,
    lead.rawMessage
  ]
    .map(normalize)
    .join(" ");

  return haystack.includes(search);
}

function buildSummary(openLeads, archivedLeads) {
  return {
    open: openLeads.length,
    toReply: openLeads.filter((lead) => ["Nuova", "Da rispondere"].includes(normalizeLeadStatus(lead.status))).length,
    overdue: openLeads.filter((lead) => isFollowUpOverdue(lead.followUpAt, lead.status)).length,
    quotes: openLeads.filter(isQuoteLead).length,
    archived: archivedLeads.length
  };
}

export default function LeadsPage() {
  const { leads, isDataLoading, dataError, reloadLeads } = useOutletContext();

  const [mode, setMode] = useState("active");
  const [activeFilter, setActiveFilter] = useState("Tutte");
  const [query, setQuery] = useState("");

  const normalizedLeads = useMemo(
    () =>
      leads.map((lead) => ({
        ...lead,
        status: normalizeLeadStatus(lead.status)
      })),
    [leads]
  );

  const openLeads = useMemo(() => normalizedLeads.filter(isOpenLead), [normalizedLeads]);
  const archivedLeads = useMemo(
    () => normalizedLeads.filter((lead) => isFinalLeadStatus(lead.status)),
    [normalizedLeads]
  );

  const summary = useMemo(() => buildSummary(openLeads, archivedLeads), [openLeads, archivedLeads]);

  const filters = mode === "active" ? ACTIVE_FILTERS : ARCHIVED_FILTERS;
  const baseLeads = mode === "active" ? openLeads : archivedLeads;
  const sorter = mode === "active" ? sortActiveLeads : sortArchivedLeads;

  const filteredLeads = useMemo(() => {
    const selectedFilter = filters.find((filter) => filter.label === activeFilter) || filters[0];

    return sorter(baseLeads)
      .filter((lead) => selectedFilter.match(lead))
      .filter((lead) => matchesSearch(lead, query));
  }, [baseLeads, activeFilter, query, filters, sorter]);

  function switchMode(nextMode) {
    setMode(nextMode);
    setActiveFilter(nextMode === "active" ? "Tutte" : "Archiviate");
  }

  return (
    <section className="page leads-page leads-inbox-page">
      <header className="page-header leads-page-header leads-inbox-header">
        <div>
          <span>Richieste</span>
          <h1>Richieste clienti</h1>
        </div>

        <Link className="button button-primary leads-header-action" to="/leads/new">
          + Nuova richiesta
        </Link>
      </header>

      {dataError && (
        <div className="app-alert app-alert-error">
          <strong>Errore caricamento</strong>
          <span>{dataError}</span>
          {reloadLeads && (
            <Button variant="secondary" type="button" onClick={reloadLeads}>
              Riprova
            </Button>
          )}
        </div>
      )}

      <section className="leads-overview-grid leads-inbox-summary" aria-label="Riepilogo richieste">
        <article>
          <span>Da gestire</span>
          <strong>{summary.open}</strong>
        </article>

        <article>
          <span>Da rispondere</span>
          <strong>{summary.toReply}</strong>
        </article>

        <article className={summary.overdue > 0 ? "summary-danger" : ""}>
          <span>Scadute</span>
          <strong>{summary.overdue}</strong>
        </article>

        <article>
          <span>Preventivi</span>
          <strong>{summary.quotes}</strong>
        </article>
      </section>

      <section className="leads-inbox-panel">
        <div className="leads-mode-tabs" aria-label="Vista richieste">
          <button
            className={mode === "active" ? "leads-mode-tab leads-mode-tab-active" : "leads-mode-tab"}
            type="button"
            onClick={() => switchMode("active")}
          >
            <span>Da gestire</span>
            <strong>{summary.open}</strong>
          </button>

          <button
            className={mode === "archived" ? "leads-mode-tab leads-mode-tab-active" : "leads-mode-tab"}
            type="button"
            onClick={() => switchMode("archived")}
          >
            <span>Archiviate</span>
            <strong>{summary.archived}</strong>
          </button>
        </div>

        <div className="leads-toolbar leads-inbox-toolbar">
          <div className="leads-search">
            <Input
              label="Cerca"
              value={query}
              onChange={setQuery}
              placeholder="Cliente, servizio, città, telefono..."
            />
          </div>

          <div className="lead-filter-wrap" aria-label="Filtri richieste">
            <div className="lead-filter-row">
              {filters.map((filter) => {
                const count = baseLeads.filter(filter.match).length;
                const isActive = activeFilter === filter.label;

                return (
                  <button
                    className={`lead-filter-chip ${isActive ? "lead-filter-chip-active" : ""}`}
                    key={filter.label}
                    type="button"
                    onClick={() => setActiveFilter(filter.label)}
                  >
                    <span>{filter.label}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {isDataLoading ? (
        <EmptyState title="Caricamento richieste" message="Sto recuperando le richieste salvate su Supabase..." />
      ) : filteredLeads.length > 0 ? (
        <>
          <div className="list-result-line">
            <strong>{filteredLeads.length}</strong>
            <span>
              {mode === "active"
                ? filteredLeads.length === 1
                  ? "richiesta da gestire"
                  : "richieste da gestire"
                : filteredLeads.length === 1
                  ? "richiesta archiviata"
                  : "richieste archiviate"}
            </span>
          </div>

          <LeadList leads={filteredLeads} mode={mode} />
        </>
      ) : leads.length === 0 ? (
        <EmptyState
          title="Nessuna richiesta ancora inserita"
          message="Inserisci la prima richiesta ricevuta da WhatsApp, telefono, email o social."
        >
          <Link className="button button-primary" to="/leads/new">
            + Inserisci la prima richiesta
          </Link>
        </EmptyState>
      ) : (
        <EmptyState
          title={mode === "active" ? "Nessuna richiesta da gestire" : "Nessuna richiesta archiviata"}
          message={
            mode === "active"
              ? "Non ci sono richieste aperte con questi filtri."
              : "Le richieste segnate come vinte o perse compariranno qui."
          }
        />
      )}
    </section>
  );
}