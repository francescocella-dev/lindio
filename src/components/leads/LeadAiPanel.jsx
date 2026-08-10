import { useState } from "react";
import Button from "../ui/Button.jsx";

function safeList(items) {
  return Array.isArray(items) ? items : [];
}

async function copyText(text) {
  if (!text) return false;

  try {
    await navigator.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function AnalysisLoading() {
  return (
    <div className="analysis-modal-loading">
      <div className="analysis-loader" />
      <strong>Analisi in corso...</strong>
      <p>Sto leggendo il messaggio per estrarre servizio, zona, urgenza, dati presenti e informazioni mancanti.</p>
    </div>
  );
}

function AnalysisEmpty() {
  return (
    <div className="analysis-modal-empty">
      <strong>Nessuna analisi disponibile</strong>
      <p>Incolla il messaggio ricevuto e premi “Analizza messaggio”.</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

export default function LeadAiPanel({
  analysis,
  isAnalyzing = false,
  onUse,
  onClose,
  variant = "card"
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const success = await copyText(analysis?.suggested_reply);

    if (!success) return;

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function renderContent() {
    if (isAnalyzing) {
      return <AnalysisLoading />;
    }

    if (!analysis) {
      return <AnalysisEmpty />;
    }

    const missingFields = safeList(analysis.missing_fields);
    const detectedDetails = safeList(analysis.detected_details);

    return (
      <>
        <div className="ai-panel-header">
          <span>Analisi locale</span>
          <h2>Analisi della richiesta</h2>
          <p>Controlla i dati trovati: Lindio ti aiuta a compilare, ma l’ultima verifica resta tua.</p>
        </div>

        <div className="ai-summary">
          <span>Riepilogo</span>
          <strong>{analysis.summary || "Nessun riepilogo disponibile."}</strong>
        </div>

        <div className="ai-grid ai-grid-compact">
          <InfoRow label="Servizio" value={analysis.service_type} />
          <InfoRow label="Zona" value={analysis.city} />
          <InfoRow label="Tipo cliente" value={analysis.customer_type} />
          <InfoRow label="Urgenza" value={analysis.urgency} />
          <InfoRow label="Stato suggerito" value={analysis.suggested_status} />
          <InfoRow label="Prossimo passo" value={analysis.next_action} />
          <InfoRow label="Valore stimato" value={analysis.estimated_value ? `${analysis.estimated_value} €` : "-"} />
          <InfoRow label="Affidabilità" value={analysis.confidence ? `${analysis.confidence}%` : "-"} />
        </div>

        {(analysis.customer_name || analysis.phone || analysis.email) && (
          <div className="ai-detected-section">
            <strong>Contatti rilevati</strong>

            <div className="detected-list">
              {analysis.customer_name && <span className="detected-pill">Nome: {analysis.customer_name}</span>}
              {analysis.phone && <span className="detected-pill">Telefono: {analysis.phone}</span>}
              {analysis.email && <span className="detected-pill">Email: {analysis.email}</span>}
            </div>
          </div>
        )}

        <div className="ai-detected-section">
          <strong>Dati trovati nel messaggio</strong>

          {detectedDetails.length > 0 ? (
            <div className="detected-list">
              {detectedDetails.map((item) => (
                <span className="detected-pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="form-hint">Il messaggio contiene pochi dettagli strutturati.</p>
          )}
        </div>

        <div className="ai-missing-section">
          <strong>Dati mancanti</strong>

          {missingFields.length > 0 ? (
            <div className="missing-list">
              {missingFields.map((item) => (
                <span className="missing-pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="form-hint">Non risultano dati mancanti evidenti.</p>
          )}
        </div>

        {analysis.suggested_reply && (
          <div className="ai-box ai-reply-box">
            <strong>Risposta suggerita</strong>
            <p>{analysis.suggested_reply}</p>

            <div className="ai-actions">
              <Button variant="secondary" type="button" onClick={handleCopy}>
                Copia risposta
              </Button>

              {copied && <span className="copy-feedback">Copiata</span>}
            </div>
          </div>
        )}

        {onUse && (
          <div className="ai-modal-actions">
            <Button type="button" onClick={onUse}>
              Usa dati nella richiesta
            </Button>

            {onClose && (
              <Button variant="secondary" type="button" onClick={onClose}>
                Chiudi
              </Button>
            )}
          </div>
        )}
      </>
    );
  }

  if (variant === "modal") {
    return (
      <div className="analysis-modal-overlay" role="dialog" aria-modal="true">
        <div className="analysis-modal-backdrop" onClick={onClose} />

        <aside className="analysis-modal-panel">
          <div className="analysis-modal-topbar">
            <span>Assistente richiesta</span>

            <button className="analysis-modal-close" type="button" onClick={onClose} aria-label="Chiudi analisi">
              ×
            </button>
          </div>

          <div className="analysis-modal-content">{renderContent()}</div>
        </aside>
      </div>
    );
  }

  return <aside className="analysis-card">{renderContent()}</aside>;
}