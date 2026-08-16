import { useState } from "react";
import Button from "../ui/Button.jsx";

function safeList(items) {
  return Array.isArray(items) ? items : [];
}

function getQualityLabel(level) {
  if (level === "high") return "Alta";
  if (level === "medium") return "Media";
  return "Bassa";
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
      <p>Sto applicando regole locali al messaggio per estrarre dati e suggerire il prossimo passo.</p>
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

function SignalPill({ signal }) {
  const className = signal.tone === "warning" ? "missing-pill" : "detected-pill";
  return <span className={className}>{signal.label}</span>;
}

export default function LeadAnalysisPanel({
  analysis,
  isAnalyzing = false,
  onUse,
  onClose,
  variant = "card"
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const success = await copyText(analysis?.suggestedReply);

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

    const missingFields = safeList(analysis.missingFields);
    const detectedDetails = safeList(analysis.detectedDetails);
    const signals = safeList(analysis.assessment?.signals);
    const qualityLabel = getQualityLabel(analysis.assessment?.level);

    return (
      <>
        <div className="ai-panel-header">
          <span>Analisi deterministica locale</span>
          <h2>Analisi della richiesta</h2>
          <p>
            Lindio applica regole esplicite nel browser. Nessun messaggio viene inviato a un provider AI
            esterno e la verifica finale resta sempre tua.
          </p>
        </div>

        <div className="ai-summary">
          <span>Riepilogo</span>
          <strong>{analysis.summary || "Nessun riepilogo disponibile."}</strong>
        </div>

        <div className="ai-grid ai-grid-compact">
          <InfoRow label="Servizio" value={analysis.serviceType || "Da determinare"} />
          <InfoRow label="Zona" value={analysis.city || "Da verificare"} />
          <InfoRow label="Tipo cliente" value={analysis.customerType} />
          <InfoRow label="Urgenza proposta" value={analysis.urgency} />
          <InfoRow label="Stato suggerito" value={analysis.suggestedStatus} />
          <InfoRow label="Prossimo passo" value={analysis.nextAction} />
          <InfoRow
            label="Valore orientativo (regola)"
            value={analysis.estimatedValue > 0 ? `${analysis.estimatedValue} €` : "Non stimato"}
          />
          <InfoRow label="Qualità analisi" value={qualityLabel} />
        </div>

        <div className="ai-detected-section">
          <strong>Perché Lindio propone questi dati</strong>
          <p className="form-hint">
            La qualità è una valutazione euristica a fasce, non una probabilità statistica.
          </p>

          <div className="detected-list">
            {signals.map((signal) => (
              <SignalPill signal={signal} key={`${signal.code}-${signal.label}`} />
            ))}
          </div>
        </div>

        {(analysis.customerName || analysis.phone || analysis.email) && (
          <div className="ai-detected-section">
            <strong>Contatti rilevati</strong>

            <div className="detected-list">
              {analysis.customerName && <span className="detected-pill">Nome: {analysis.customerName}</span>}
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
          <strong>Dati da verificare</strong>

          {missingFields.length > 0 ? (
            <div className="missing-list">
              {missingFields.map((item) => (
                <span className="missing-pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="form-hint">Le regole non evidenziano informazioni principali mancanti.</p>
          )}
        </div>

        {analysis.suggestedReply && (
          <div className="ai-box ai-reply-box">
            <strong>Risposta suggerita</strong>
            <p>{analysis.suggestedReply}</p>

            <div className="ai-actions">
              <Button variant="secondary" type="button" onClick={handleCopy}>
                Copia risposta
              </Button>

              {copied && <span className="copy-feedback">Copiata</span>}
            </div>
          </div>
        )}

        <p className="form-hint">
          Motore: {analysis.analyzer?.version || "regole locali"}. Le proposte restano modificabili prima del salvataggio.
        </p>

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
