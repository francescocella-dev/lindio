import { useState } from "react";
import { analyzeLead } from "../../services/intakeAnalysisService.js";
import { LEAD_CHANNELS, LEAD_STATUSES, NEXT_ACTIONS, URGENCY_LEVELS } from "../../utils/constants.js";
import {
  getStatusWorkflowGuide,
  getSuggestedFollowUpForStatus,
  getSuggestedNextActionForStatus,
  isFinalLeadStatus,
  normalizeLeadStatus
} from "../../utils/leadHelpers.js";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";
import Textarea from "../ui/Textarea.jsx";
import LeadAnalysisPanel from "./LeadAnalysisPanel.jsx";
import LeadChannelBadge from "./LeadChannelBadge.jsx";

function getDefaultFollowUp() {
  return getSuggestedFollowUpForStatus("Nuova");
}

function buildInitialLead() {
  return {
    customerName: "",
    phone: "",
    email: "",
    source: "WhatsApp",
    serviceType: "",
    city: "",
    urgency: "Media",
    status: "Nuova",
    nextAction: "Rispondere al cliente",
    followUpAt: getDefaultFollowUp(),
    estimatedValue: "",
    rawMessage: "",
    aiSummary: "",
    aiSuggestedReply: ""
  };
}

function getStatusFromNextAction(nextAction) {
  if (nextAction === "Chiedere informazioni mancanti") return "Info richieste";
  if (nextAction === "Fissare sopralluogo") return "Sopralluogo da fissare";
  if (nextAction === "Preparare preventivo") return "Preventivo da preparare";
  if (nextAction === "Inviare preventivo") return "Preventivo da preparare";
  if (nextAction === "Fare follow-up") return "In attesa";
  if (nextAction === "Attendere riscontro") return "In attesa";
  if (nextAction === "Nessuna azione") return "Vinta";

  return "Da rispondere";
}

function normalizeDraftBeforeSave(lead) {
  return {
    ...lead,
    status: normalizeLeadStatus(lead.status),
    customerName: lead.customerName.trim() || "Cliente da identificare",
    phone: lead.phone.trim(),
    email: lead.email.trim(),
    serviceType: lead.serviceType.trim() || "Servizio da definire",
    city: lead.city.trim() || "Zona da definire",
    estimatedValue: lead.estimatedValue === "" ? 0 : Number(lead.estimatedValue),
    rawMessage: lead.rawMessage.trim()
  };
}

function getAnalysisButtonLabel(isAnalyzing, analysis) {
  if (isAnalyzing) return "Analisi in corso...";
  if (analysis) return "Rivedi analisi";
  return "Analizza messaggio";
}

function WorkflowGuide({ status }) {
  const guide = getStatusWorkflowGuide(status);

  return (
    <div className={`workflow-guide-card workflow-guide-${guide.tone}`}>
      <div>
        <span>Guida rapida</span>
        <strong>{guide.title}</strong>
        <p>{guide.description}</p>
      </div>

      <div className="workflow-guide-suggestion">
        <small>Azione suggerita</small>
        <strong>{guide.suggestedAction}</strong>
        <small>Promemoria: {guide.followUpLabel}</small>
      </div>
    </div>
  );
}

export default function LeadForm({ onSave, isSaving = false }) {
  const [lead, setLead] = useState(() => buildInitialLead());
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [formError, setFormError] = useState("");

  function patch(field, value) {
    setLead((current) => ({ ...current, [field]: value }));

    if (field === "rawMessage") {
      setAnalysis(null);
    }

    setFormError("");
  }

  function handleStatusChange(status) {
    const normalizedStatus = normalizeLeadStatus(status);
    const suggestedAction = getSuggestedNextActionForStatus(normalizedStatus);
    const suggestedFollowUp = getSuggestedFollowUpForStatus(normalizedStatus);

    setLead((current) => ({
      ...current,
      status: normalizedStatus,
      nextAction: suggestedAction,
      followUpAt: suggestedFollowUp
    }));

    setFormError("");
  }

  function handleNextActionChange(nextAction) {
    setLead((current) => ({
      ...current,
      nextAction,
      followUpAt: nextAction === "Nessuna azione" ? "" : current.followUpAt
    }));

    setFormError("");
  }

  async function runAnalysis() {
    if (!lead.rawMessage.trim()) {
      setFormError("Incolla prima il messaggio o scrivi una nota sulla richiesta ricevuta.");
      return;
    }

    setIsAnalysisOpen(true);
    setIsAnalyzing(true);
    setFormError("");

    try {
      const result = await analyzeLead(lead.rawMessage);
      setAnalysis(result);
    } catch (error) {
      setIsAnalysisOpen(false);
      setFormError(
        error?.message ||
        "Non è stato possibile analizzare il messaggio. Puoi comunque compilare e salvare la richiesta manualmente."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function useAnalysis() {
    if (!analysis) return;

    const nextAction = analysis.nextAction || "Rispondere al cliente";
    const status = normalizeLeadStatus(analysis.suggestedStatus || getStatusFromNextAction(nextAction));
    const suggestedFollowUp = getSuggestedFollowUpForStatus(status);

    setLead((current) => ({
      ...current,
      customerName: current.customerName || analysis.customerName || "",
      phone: current.phone || analysis.phone || "",
      email: current.email || analysis.email || "",
      serviceType: current.serviceType || analysis.serviceType || "",
      city: current.city || analysis.city || "",
      urgency: analysis.urgency || current.urgency,
      aiSummary: analysis.summary || "",
      aiSuggestedReply: analysis.suggestedReply || "",
      nextAction,
      status,
      followUpAt: suggestedFollowUp || current.followUpAt,
      estimatedValue: current.estimatedValue || analysis.estimatedValue || ""
    }));

    setIsAnalysisOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!lead.rawMessage.trim() && !lead.customerName.trim()) {
      setFormError("Inserisci almeno il nome cliente oppure il messaggio ricevuto.");
      return;
    }

    setFormError("");

    try {
      await onSave(normalizeDraftBeforeSave(lead));
    } catch (error) {
      setFormError(
        error?.message ||
        "Non è stato possibile salvare la richiesta. Controlla la connessione e riprova."
      );
    }
  }

  const finalStatus = isFinalLeadStatus(lead.status);

  return (
    <>
      <form className="lead-form lead-form-flow new-lead-compact-form" onSubmit={handleSubmit}>
        <section className="form-section form-section-intake new-lead-message-card">
          <div className="form-section-header new-lead-section-header">
            <span className="step-badge">1</span>

            <div>
              <h2>Messaggio ricevuto</h2>
              <p>Incolla il testo del cliente o scrivi una nota veloce dopo una telefonata.</p>
            </div>
          </div>

          <Textarea
            label="Messaggio / nota"
            value={lead.rawMessage}
            onChange={(value) => patch("rawMessage", value)}
            placeholder="Esempio: Ciao, mi servirebbe pulire un appartamento dopo lavori a Roma. Potete farmi sapere disponibilità e prezzo?"
          />

          <div className="new-lead-ai-row">
            <Button variant="secondary" type="button" onClick={runAnalysis} disabled={isAnalyzing}>
              {getAnalysisButtonLabel(isAnalyzing, analysis)}
            </Button>

            {analysis && <span className="new-lead-ai-ready">Analisi locale pronta</span>}
          </div>

          <p className="form-hint">
            L'analisi standard usa regole locali nel browser: il testo non viene inviato a servizi AI esterni.
          </p>

          {formError && <p className="form-error">{formError}</p>}
        </section>

        <section className="form-section new-lead-section">
          <div className="form-section-header new-lead-section-header">
            <span className="step-badge">2</span>

            <div>
              <h2>Canale e cliente</h2>
              <p>Se non conosci tutti i dati, puoi completarli dopo.</p>
            </div>
          </div>

          <div className="new-lead-channel-grid" aria-label="Canale richiesta">
            {LEAD_CHANNELS.map((channel) => (
              <button
                className={`new-lead-channel-card ${lead.source === channel ? "new-lead-channel-card-active" : ""}`}
                key={channel}
                type="button"
                onClick={() => patch("source", channel)}
              >
                <LeadChannelBadge channel={channel} variant="icon" />
                <strong>{channel}</strong>
              </button>
            ))}
          </div>

          <div className="field-grid new-lead-field-grid">
            <Input
              label="Nome cliente"
              value={lead.customerName}
              onChange={(value) => patch("customerName", value)}
              placeholder="Nome o riferimento"
            />

            <Input
              label="Telefono"
              value={lead.phone}
              onChange={(value) => patch("phone", value)}
              placeholder="Numero cliente"
            />

            <Input
              label="Email"
              type="email"
              value={lead.email}
              onChange={(value) => patch("email", value)}
              placeholder="Email opzionale"
            />
          </div>
        </section>

        <section className="form-section new-lead-section">
          <div className="form-section-header new-lead-section-header">
            <span className="step-badge">3</span>

            <div>
              <h2>Richiesta</h2>
              <p>Servizio, zona, urgenza e valore indicativo.</p>
            </div>
          </div>

          <div className="field-grid new-lead-field-grid">
            <Input
              label="Servizio richiesto"
              value={lead.serviceType}
              onChange={(value) => patch("serviceType", value)}
              placeholder="Es. Pulizia appartamento"
            />

            <Input
              label="Zona / città"
              value={lead.city}
              onChange={(value) => patch("city", value)}
              placeholder="Es. Roma"
            />

            <Select
              label="Urgenza"
              value={lead.urgency}
              options={URGENCY_LEVELS}
              onChange={(value) => patch("urgency", value)}
            />

            <Input
              label="Valore stimato"
              type="number"
              min="0"
              value={lead.estimatedValue}
              onChange={(value) => patch("estimatedValue", value)}
              placeholder="Opzionale"
            />
          </div>
        </section>

        <section className="form-section new-lead-section workflow-section">
          <div className="form-section-header new-lead-section-header">
            <span className="step-badge">4</span>

            <div>
              <h2>Prossimo passo</h2>
              <p>Stato, azione e promemoria devono raccontare cosa è successo e cosa fare dopo.</p>
            </div>
          </div>

          <WorkflowGuide status={lead.status} />

          <div className="workflow-fields-grid">
            <div className="guided-field">
              <Select
                label="Stato della richiesta"
                value={normalizeLeadStatus(lead.status)}
                options={LEAD_STATUSES}
                onChange={handleStatusChange}
              />
              <small>A che punto è questa richiesta adesso?</small>
            </div>

            <div className="guided-field">
              <Select
                label="Prossima azione"
                value={lead.nextAction}
                options={NEXT_ACTIONS}
                onChange={handleNextActionChange}
              />
              <small>Cosa devi fare tu come prossimo passo?</small>
            </div>

            <div className="guided-field">
              <Input
                label="Promemoria follow-up"
                type="datetime-local"
                value={lead.followUpAt}
                onChange={(value) => patch("followUpAt", value)}
                disabled={finalStatus}
              />
              <small>
                {finalStatus
                  ? "Richiesta chiusa: non serve un promemoria commerciale."
                  : "Quando vuoi che Lindio ti rimetta davanti questa richiesta?"}
              </small>
            </div>
          </div>
        </section>

        <div className="new-lead-save-bar">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Salvataggio..." : "Salva richiesta"}
          </Button>
        </div>
      </form>

      {isAnalysisOpen && (
        <LeadAnalysisPanel
          analysis={analysis}
          isAnalyzing={isAnalyzing}
          onUse={useAnalysis}
          onClose={() => setIsAnalysisOpen(false)}
          variant="modal"
        />
      )}
    </>
  );
}
