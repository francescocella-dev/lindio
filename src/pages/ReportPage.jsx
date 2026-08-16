import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState.jsx";
import LeadStatusBadge from "../components/leads/LeadStatusBadge.jsx";
import {
  isFinalLeadStatus,
  isFollowUpDueSoon,
  isFollowUpOverdue,
  isOpenLead,
  normalizeLeadStatus
} from "../utils/leadHelpers.js";
import { LEAD_STATUSES } from "../utils/constants.js";

const PERIODS = [
  { label: "Tutto", value: "all" },
  { label: "Ultimi 30 giorni", value: "30" },
  { label: "Ultimi 7 giorni", value: "7" }
];

const OPEN_STATUSES = LEAD_STATUSES.filter((status) => !isFinalLeadStatus(status));

function toDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameOrAfter(date, minDate) {
  if (!date || !minDate) return true;

  return date.getTime() >= minDate.getTime();
}

function getEstimatedValue(lead) {
  const value = Number(lead.estimatedValue);

  return Number.isFinite(value) ? value : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatPercent(value) {
  return `${Math.round(value || 0)}%`;
}

function buildFilteredLeads(leads, period) {
  if (period === "all") return leads;

  const days = Number(period);
  const minDate = new Date();

  minDate.setDate(minDate.getDate() - days);
  minDate.setHours(0, 0, 0, 0);

  return leads.filter((lead) => {
    const date = toDate(lead.createdAt || lead.updatedAt || lead.followUpAt);

    return isSameOrAfter(date, minDate);
  });
}

function buildBreakdown(leads, key, fallback = "Non specificato") {
  const counts = leads.reduce((acc, lead) => {
    const value = lead[key] || fallback;

    acc[value] = (acc[value] || 0) + 1;

    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function buildStatusBreakdown(leads) {
  const counts = leads.reduce((acc, lead) => {
    const status = normalizeLeadStatus(lead.status);

    acc[status] = (acc[status] || 0) + 1;

    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function getMostUsed(items, fallback = "-") {
  const cleanItems = items.filter(Boolean);

  if (!cleanItems.length) return fallback;

  const counts = cleanItems.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;

    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || fallback;
}

function buildReport(leads) {
  const now = new Date();
  const total = leads.length;
  const won = leads.filter((lead) => normalizeLeadStatus(lead.status) === "Vinta");
  const lost = leads.filter((lead) => normalizeLeadStatus(lead.status) === "Persa");
  const open = leads.filter(isOpenLead);
  const overdue = open.filter((lead) =>
    isFollowUpOverdue(lead.followUpAt, lead.status, now)
  );
  const dueSoon = open.filter((lead) =>
    isFollowUpDueSoon(lead.followUpAt, lead.status, now, 2)
  );
  const quotesSent = open.filter((lead) => normalizeLeadStatus(lead.status) === "Preventivo inviato");
  const infoMissing = open.filter((lead) => normalizeLeadStatus(lead.status) === "Info richieste");
  const waiting = open.filter((lead) => normalizeLeadStatus(lead.status) === "In attesa");

  const closedTotal = won.length + lost.length;
  const conversionRate = closedTotal > 0 ? (won.length / closedTotal) * 100 : 0;

  const openValue = open.reduce((totalValue, lead) => totalValue + getEstimatedValue(lead), 0);
  const wonValue = won.reduce((totalValue, lead) => totalValue + getEstimatedValue(lead), 0);

  return {
    total,
    won: won.length,
    lost: lost.length,
    open: open.length,
    overdue: overdue.length,
    dueSoon: dueSoon.length,
    quotesSent: quotesSent.length,
    infoMissing: infoMissing.length,
    waiting: waiting.length,
    conversionRate,
    openValue,
    wonValue,
    mostUsedChannel: getMostUsed(leads.map((lead) => lead.source)),
    mostRequestedService: getMostUsed(leads.map((lead) => lead.serviceType)),
    channelBreakdown: buildBreakdown(leads, "source"),
    serviceBreakdown: buildBreakdown(leads, "serviceType"),
    statusBreakdown: buildStatusBreakdown(leads)
  };
}

function getMainInsight(report) {
  if (report.total === 0) {
    return {
      tone: "blue",
      icon: "✓",
      title: "Non ci sono ancora dati da analizzare",
      text: "Quando inserirai le prime richieste, qui vedrai canali migliori, servizi più richiesti e punti da seguire."
    };
  }

  if (report.overdue > 0) {
    return {
      tone: "red",
      icon: "!",
      title: "Priorità: promemoria scaduti",
      text: `Ci sono ${report.overdue} promemoria scaduti. Prima di guardare i numeri generali, conviene recuperare queste richieste.`
    };
  }

  if (report.quotesSent > 0) {
    return {
      tone: "amber",
      icon: "!",
      title: "Priorità: preventivi inviati",
      text: `Hai ${report.quotesSent} preventivi inviati. Il rischio è lasciarli fermi senza un richiamo programmato.`
    };
  }

  if (report.open > 0) {
    return {
      tone: "blue",
      icon: "✓",
      title: "Richieste aperte sotto controllo",
      text: `Hai ${report.open} richieste aperte. Il canale più usato è ${report.mostUsedChannel} e il servizio più richiesto è ${report.mostRequestedService}.`
    };
  }

  return {
    tone: "green",
    icon: "✓",
    title: "Situazione ordinata",
    text: `Non risultano richieste aperte nel periodo selezionato. Il tasso di chiusura è ${formatPercent(report.conversionRate)}.`
  };
}

function MetricCard({ label, value, hint, tone = "blue" }) {
  return (
    <article className={`report-metric-card report-metric-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <p>{hint}</p>}
    </article>
  );
}

function InsightCard({ report }) {
  const insight = getMainInsight(report);

  return (
    <section className={`report-action-card report-action-card-${insight.tone}`}>
      <div className="report-action-icon">{insight.icon}</div>

      <div>
        <span>Analisi rapida</span>
        <h2>{insight.title}</h2>
        <p>{insight.text}</p>
      </div>
    </section>
  );
}

function OperationalFocus({ report }) {
  const items = [
    {
      label: "Promemoria scaduti",
      value: report.overdue,
      hint: "Da richiamare prima",
      tone: report.overdue > 0 ? "red" : "green"
    },
    {
      label: "In scadenza",
      value: report.dueSoon,
      hint: "Entro 48 ore",
      tone: report.dueSoon > 0 ? "amber" : "blue"
    },
    {
      label: "Preventivi inviati",
      value: report.quotesSent,
      hint: "Da non lasciare fermi",
      tone: report.quotesSent > 0 ? "amber" : "blue"
    },
    {
      label: "Info mancanti",
      value: report.infoMissing,
      hint: "Dati da completare",
      tone: report.infoMissing > 0 ? "red" : "green"
    }
  ];

  return (
    <section className="report-focus-card">
      <div className="report-focus-copy">
        <span>Priorità operative</span>
        <h2>Dove intervenire</h2>
        <p>
          Ecco i punti che possono far perdere opportunità o rallentare il lavoro.
        </p>
      </div>

      <div className="report-focus-grid">
        {items.map((item) => (
          <article className={`report-focus-item report-focus-item-${item.tone}`} key={item.label}>
            <strong>{item.value}</strong>

            <div>
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BreakdownCard({ title, subtitle, items, type = "default" }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="report-panel-card">
      <div className="report-panel-header">
        <div>
          <span>{subtitle}</span>
          <h2>{title}</h2>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="report-bar-list">
          {items.slice(0, 6).map((item) => {
            const width = Math.max(8, Math.round((item.value / max) * 100));

            return (
              <div className="report-bar-item" key={item.label}>
                <div className="report-bar-label">
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                </div>

                <div className="report-bar-track">
                  <i className={`report-bar-fill report-bar-fill-${type}`} style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="report-muted-text">Non ci sono dati sufficienti.</p>
      )}
    </section>
  );
}

function StatusBreakdownCard({ items }) {
  const orderedItems = [...items].sort((a, b) => {
    const indexA = OPEN_STATUSES.indexOf(a.label);
    const indexB = OPEN_STATUSES.indexOf(b.label);

    if (indexA === -1 && indexB === -1) return b.value - a.value;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  const max = Math.max(...orderedItems.map((item) => item.value), 1);

  return (
    <section className="report-panel-card">
      <div className="report-panel-header">
        <div>
          <span>Avanzamento</span>
          <h2>Stato richieste</h2>
        </div>
      </div>

      {orderedItems.length > 0 ? (
        <div className="report-status-list">
          {orderedItems.map((item) => {
            const width = Math.max(8, Math.round((item.value / max) * 100));

            return (
              <div className="report-status-item" key={item.label}>
                <div className="report-status-row">
                  <LeadStatusBadge status={item.label} />
                  <strong>{item.value}</strong>
                </div>

                <div className="report-bar-track">
                  <i className="report-bar-fill report-bar-fill-status" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="report-muted-text">Non ci sono stati da mostrare.</p>
      )}
    </section>
  );
}

function AdviceCard({ report }) {
  return (
    <section className="report-panel-card report-advice-card">
      <div className="report-panel-header">
        <div>
          <span>Decisioni</span>
          <h2>Cosa fare nei prossimi giorni</h2>
        </div>
      </div>

      <div className="report-advice-list">
        <p>
          <strong>1. Parti dai punti critici.</strong>
          <span> Promemoria scaduti, preventivi inviati e informazioni mancanti sono le prime cose da sistemare.</span>
        </p>

        <p>
          <strong>2. Proteggi il canale migliore.</strong>
          <span> Se {report.mostUsedChannel} porta richieste, rendi più veloce l’inserimento da quel canale.</span>
        </p>

        <p>
          <strong>3. Standardizza il servizio più richiesto.</strong>
          <span> {report.mostRequestedService} può diventare il primo modello di risposta o preventivo.</span>
        </p>
      </div>
    </section>
  );
}

export default function ReportPage() {
  const { leads } = useOutletContext();
  const [period, setPeriod] = useState("all");

  const filteredLeads = useMemo(() => buildFilteredLeads(leads, period), [leads, period]);
  const report = useMemo(() => buildReport(filteredLeads), [filteredLeads]);

  return (
    <section className="page report-page report-operational-page">
      <header className="page-header report-page-header report-operational-header">
        <div>
          <span>Report</span>
          <h1>Controllo operativo</h1>
          <p>
            Capisci cosa sta funzionando, quali punti stanno rallentando il lavoro e dove conviene
            intervenire.
          </p>
        </div>

        <div className="report-period-tabs" aria-label="Filtro periodo">
          {PERIODS.map((item) => (
            <button
              className={period === item.value ? "report-period-tab report-period-tab-active" : "report-period-tab"}
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {filteredLeads.length === 0 ? (
        <EmptyState
          title="Nessuna richiesta nel periodo selezionato"
          message="Cambia periodo oppure inserisci una nuova richiesta per iniziare a generare report utili."
        >
          <Link className="button button-primary" to="/leads/new">
            Nuova richiesta
          </Link>
        </EmptyState>
      ) : (
        <>
          <InsightCard report={report} />

          <section className="report-metric-grid report-metric-grid-compact" aria-label="Indicatori principali">
            <MetricCard label="Richieste" value={report.total} hint="Nel periodo" tone="blue" />
            <MetricCard label="Aperte" value={report.open} hint="Da gestire" tone="amber" />
            <MetricCard
              label="Tasso chiusura"
              value={formatPercent(report.conversionRate)}
              hint={`${report.won} vinte · ${report.lost} perse`}
              tone="green"
            />
            <MetricCard label="Valore aperto" value={formatCurrency(report.openValue)} hint="Opportunità vive" tone="indigo" />
          </section>

          <OperationalFocus report={report} />

          <section className="report-two-columns">
            <BreakdownCard
              title="Canali migliori"
              subtitle="Origine richieste"
              items={report.channelBreakdown}
              type="channel"
            />

            <BreakdownCard
              title="Servizi richiesti"
              subtitle="Domanda clienti"
              items={report.serviceBreakdown}
              type="service"
            />
          </section>

          <section className="report-two-columns report-bottom-columns">
            <StatusBreakdownCard items={report.statusBreakdown} />
            <AdviceCard report={report} />
          </section>
        </>
      )}
    </section>
  );
}