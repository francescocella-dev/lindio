import EmptyState from "../ui/EmptyState.jsx";
import LeadCard from "./LeadCard.jsx";

export default function LeadList({ leads, mode = "active" }) {
  if (leads.length === 0) {
    return <EmptyState title="Nessuna richiesta trovata" message="Prova a cambiare filtro o ricerca." />;
  }

  return (
    <div className="requests-list">
      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} mode={mode} />
      ))}
    </div>
  );
}