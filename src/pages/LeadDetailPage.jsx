import { Link, useOutletContext, useParams } from "react-router-dom";
import LeadDetail from "../components/leads/LeadDetail.jsx";
import LeadStatusBadge from "../components/leads/LeadStatusBadge.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";

export default function LeadDetailPage() {
  const { id } = useParams();
  const { leads, updateLead } = useOutletContext();
  const lead = leads.find((item) => item.id === id);

  if (!lead) {
    return (
      <section className="page">
        <EmptyState title="Richiesta non trovata" message="La richiesta selezionata non esiste nei dati mock." />

        <Link className="button button-secondary" to="/leads">
          Torna alle richieste
        </Link>
      </section>
    );
  }

  return (
    <section className="page">
      <header className="page-header detail-page-header">
        <div>
          <span>Scheda richiesta</span>

          <div className="detail-title-row">
            <h1>{lead.customerName || "Cliente da identificare"}</h1>
            <LeadStatusBadge status={lead.status} />
          </div>

          <p>
            {lead.serviceType || "Servizio da definire"} · {lead.city || "Zona da definire"}
          </p>
        </div>

        <div className="page-header-actions">
          <Link className="button button-secondary" to="/leads">
            Torna alla lista
          </Link>

          <Link className="button button-primary" to="/leads/new">
            + Nuova richiesta
          </Link>
        </div>
      </header>

      <LeadDetail lead={lead} onUpdate={updateLead} />
    </section>
  );
}