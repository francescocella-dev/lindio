import { Link } from "react-router-dom";
import { formatDateTime } from "../../utils/formatDate.js";
import LeadStatusBadge from "../leads/LeadStatusBadge.jsx";

export default function RecentLeads({ leads }) {
  return (
    <section className="recent-leads-card">
      <div className="section-title-row">
        <div>
          <span>Ultimi inserimenti</span>
          <h2>Richieste recenti</h2>
        </div>

        <Link to="/leads" className="text-link">
          Apri lista
        </Link>
      </div>

      <div className="recent-leads-list">
        {leads.map((lead) => (
          <Link className="recent-lead-item" to={`/leads/${lead.id}`} key={lead.id}>
            <div>
              <strong>{lead.customerName || "Cliente da identificare"}</strong>
              <span>
                {lead.serviceType} · {lead.city}
              </span>
              <small>{formatDateTime(lead.createdAt)}</small>
            </div>

            <LeadStatusBadge status={lead.status} />
          </Link>
        ))}
      </div>
    </section>
  );
}