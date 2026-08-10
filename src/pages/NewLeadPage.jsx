import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import LeadForm from "../components/leads/LeadForm.jsx";

export default function NewLeadPage() {
  const { addLead } = useOutletContext();
  const navigate = useNavigate();

  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(lead) {
    setIsSaving(true);
    setSaveError("");

    try {
      const created = await addLead(lead);
      navigate(`/leads/${created.id}`);
    } catch (error) {
      setSaveError(
        error?.message ||
          "Non è stato possibile salvare la richiesta. Controlla la connessione o le policy Supabase."
      );
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="page new-lead-page">
      <header className="page-header new-lead-page-header">
        <div>
          <span>Nuova richiesta</span>
          <h1>Registra una richiesta cliente</h1>
        </div>
      </header>

      {saveError && (
        <div className="app-alert app-alert-error">
          <strong>Errore salvataggio</strong>
          <span>{saveError}</span>
        </div>
      )}

      <LeadForm onSave={handleSave} isSaving={isSaving} />
    </section>
  );
}