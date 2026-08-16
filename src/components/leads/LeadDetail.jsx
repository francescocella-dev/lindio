import { useState } from "react";
import { LEAD_CHANNELS, LEAD_STATUSES, NEXT_ACTIONS, URGENCY_LEVELS } from "../../utils/constants.js";
import { formatDateTime } from "../../utils/formatDate.js";
import {
  getStatusWorkflowGuide,
  getSuggestedFollowUpForStatus,
  getSuggestedNextActionForStatus,
  isFinalLeadStatus,
  normalizeLeadStatus,
  toLocalDateTimeInputValue
} from "../../utils/leadHelpers.js";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";
import Textarea from "../ui/Textarea.jsx";
import LeadChannelBadge from "./LeadChannelBadge.jsx";
import LeadNotes from "./LeadNotes.jsx";
import LeadStatusBadge from "./LeadStatusBadge.jsx";

function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return "-";
  }

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(number);
}

function getDateTimeInputValue(value) {
  return toLocalDateTimeInputValue(value);
}

function addSystemNote(lead, text) {
  return {
    ...lead,
    notes: [
      {
        date: new Date().toISOString(),
        text
      },
      ...(Array.isArray(lead.notes) ? lead.notes : [])
    ]
  };
}

async function copyToClipboard(text) {
  if (!text) return false;

  try {
    await navigator.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function buildEditDraft(lead) {
  return {
    customerName: lead.customerName || "",
    phone: lead.phone || "",
    email: lead.email || "",
    source: lead.source || "WhatsApp",
    serviceType: lead.serviceType || "",
    city: lead.city || "",
    urgency: lead.urgency || "Media",
    estimatedValue: lead.estimatedValue || "",
    rawMessage: lead.rawMessage || ""
  };
}

function normalizeDraftForSave(draft) {
  return {
    customerName: draft.customerName.trim() || "Cliente da identificare",
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    source: draft.source || "WhatsApp",
    serviceType: draft.serviceType.trim() || "Servizio da definire",
    city: draft.city.trim() || "Zona da definire",
    urgency: draft.urgency || "Media",
    estimatedValue: draft.estimatedValue === "" ? 0 : Number(draft.estimatedValue),
    rawMessage: draft.rawMessage.trim()
  };
}

function getInitials(name) {
  const cleanName = String(name || "").trim();

  if (!cleanName) return "CL";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function WorkflowGuide({ status }) {
  const guide = getStatusWorkflowGuide(status);

  return (
    <div className={`detail-workflow-guide detail-workflow-${guide.tone}`}>
      <div>
        <span>Guida</span>
        <strong>{guide.title}</strong>
        <p>{guide.description}</p>
      </div>

      <div className="detail-workflow-action">
        <small>Azione suggerita</small>
        <strong>{guide.suggestedAction}</strong>
        <small>Promemoria: {guide.followUpLabel}</small>
      </div>
    </div>
  );
}

function ReadonlyInfo({ label, value, href }) {
  const content = value || "-";

  return (
    <div className="detail-info-line">
      <span>{label}</span>

      {href && value ? (
        <a href={href}>
          <strong>{content}</strong>
        </a>
      ) : (
        <strong>{content}</strong>
      )}
    </div>
  );
}

function EditChannelButton({ channel, active, onClick }) {
  return (
    <button
      className={`detail-edit-channel ${active ? "detail-edit-channel-active" : ""}`}
      type="button"
      onClick={onClick}
    >
      <LeadChannelBadge channel={channel} variant="icon" />
      <strong>{channel}</strong>
    </button>
  );
}

export default function LeadDetail({ lead, onUpdate }) {
  const [copied, setCopied] = useState(false);
  const [isEditingData, setIsEditingData] = useState(false);
  const [editDraft, setEditDraft] = useState(() => buildEditDraft(lead));
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
  const [workflowError, setWorkflowError] = useState("");

  function openEdit() {
    setEditDraft(buildEditDraft(lead));
    setEditError("");
    setIsEditingData(true);
  }

  function closeEdit() {
    setEditDraft(buildEditDraft(lead));
    setEditError("");
    setIsEditingData(false);
  }

  function patchDraft(field, value) {
    setEditDraft((current) => ({ ...current, [field]: value }));
    setEditError("");
  }

  async function saveEditedData() {
    const normalizedDraft = normalizeDraftForSave(editDraft);

    setIsSavingEdit(true);
    setEditError("");

    try {
      const updatedLead = addSystemNote(
        {
          ...lead,
          ...normalizedDraft
        },
        "Dati richiesta aggiornati"
      );

      await Promise.resolve(onUpdate(updatedLead));
      setIsEditingData(false);
    } catch (error) {
      setEditError(error?.message || "Non è stato possibile salvare le modifiche.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function updateWorkflow(patch, noteText = "") {
    if (isSavingWorkflow) return;

    const baseLead = {
      ...lead,
      ...patch
    };
    const updatedLead = noteText ? addSystemNote(baseLead, noteText) : baseLead;

    setIsSavingWorkflow(true);
    setWorkflowError("");

    try {
      await Promise.resolve(onUpdate(updatedLead));
    } catch (error) {
      setWorkflowError(error?.message || "Non è stato possibile salvare il workflow.");
    } finally {
      setIsSavingWorkflow(false);
    }
  }

  function handleStatusChange(status) {
    const normalizedStatus = normalizeLeadStatus(status);
    const suggestedAction = getSuggestedNextActionForStatus(normalizedStatus);
    const suggestedFollowUp = getSuggestedFollowUpForStatus(normalizedStatus);

    void updateWorkflow(
      {
        status: normalizedStatus,
        nextAction: suggestedAction,
        followUpAt: suggestedFollowUp
      },
      `Stato aggiornato: ${normalizedStatus}`
    );
  }

  function handleNextActionChange(nextAction) {
    void updateWorkflow(
      {
        nextAction,
        followUpAt: nextAction === "Nessuna azione" ? "" : lead.followUpAt
      },
      `Prossima azione aggiornata: ${nextAction}`
    );
  }

  function handleFollowUpChange(followUpAt) {
    void updateWorkflow({ followUpAt });
  }

  function markAsWon() {
    void updateWorkflow(
      {
        status: "Vinta",
        nextAction: "Nessuna azione",
        followUpAt: ""
      },
      "Richiesta segnata come vinta"
    );
  }

  function markAsLost() {
    void updateWorkflow(
      {
        status: "Persa",
        nextAction: "Nessuna azione",
        followUpAt: ""
      },
      "Richiesta segnata come persa"
    );
  }

  async function handleCopyReply() {
    const success = await copyToClipboard(lead.aiSuggestedReply);

    if (!success) return;

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const normalizedStatus = normalizeLeadStatus(lead.status);
  const finalStatus = isFinalLeadStatus(normalizedStatus);

  return (
    <div className="detail-layout detail-layout-improved detail-layout-operational">
      <Card title="Prossimo passo" className="detail-priority-card detail-card-order-1 detail-operational-card">
        <div className="detail-status-strip">
          <LeadStatusBadge status={normalizedStatus} />
          <LeadChannelBadge channel={lead.source} variant="compact" />
        </div>

        <div className="detail-next-action-focus">
          <span>Da fare</span>
          <strong>{lead.nextAction || "Da definire"}</strong>
          <small>
            {lead.followUpAt
              ? `Promemoria: ${formatDateTime(lead.followUpAt)}`
              : "Nessun promemoria impostato"}
          </small>
        </div>

        <div className="detail-mini-kpis">
          <div>
            <span>Urgenza</span>
            <strong>{lead.urgency || "-"}</strong>
          </div>

          <div>
            <span>Valore</span>
            <strong>{formatCurrency(lead.estimatedValue)}</strong>
          </div>
        </div>

        <WorkflowGuide status={normalizedStatus} />

        <div className="detail-workflow-fields">
          <Select
            label="Stato richiesta"
            value={normalizedStatus}
            options={LEAD_STATUSES}
            onChange={handleStatusChange}
            disabled={isSavingWorkflow}
          />

          <Select
            label="Prossima azione"
            value={lead.nextAction || getSuggestedNextActionForStatus(normalizedStatus)}
            options={NEXT_ACTIONS}
            onChange={handleNextActionChange}
            disabled={isSavingWorkflow}
          />

          <Input
            label="Promemoria follow-up"
            type="datetime-local"
            value={getDateTimeInputValue(lead.followUpAt)}
            onChange={handleFollowUpChange}
            disabled={finalStatus || isSavingWorkflow}
          />
        </div>

        {workflowError && <p className="form-error">{workflowError}</p>}
        {isSavingWorkflow && <p className="form-hint">Salvataggio workflow...</p>}

        <div className="split-actions detail-result-actions">
          <Button variant="success" type="button" onClick={markAsWon} disabled={isSavingWorkflow}>
            Segna vinta
          </Button>

          <Button variant="danger" type="button" onClick={markAsLost} disabled={isSavingWorkflow}>
            Segna persa
          </Button>
        </div>
      </Card>

      <Card title="Dati richiesta" className="detail-card-order-2 detail-data-card">
        <div className="detail-card-toolbar">
          <div className="customer-mini-header detail-customer-header">
            <div className="customer-avatar">{getInitials(lead.customerName)}</div>

            <div>
              <strong>{lead.customerName || "Cliente da identificare"}</strong>
              <span>{lead.serviceType || "Servizio da definire"}</span>
            </div>
          </div>

          {!isEditingData && (
            <Button variant="secondary" type="button" onClick={openEdit}>
              Modifica dati
            </Button>
          )}
        </div>

        {isEditingData ? (
          <div className="detail-edit-form">
            <div className="detail-edit-grid">
              <Input
                label="Nome cliente"
                value={editDraft.customerName}
                onChange={(value) => patchDraft("customerName", value)}
                placeholder="Nome o riferimento"
              />

              <Input
                label="Telefono"
                value={editDraft.phone}
                onChange={(value) => patchDraft("phone", value)}
                placeholder="Numero cliente"
              />

              <Input
                label="Email"
                type="email"
                value={editDraft.email}
                onChange={(value) => patchDraft("email", value)}
                placeholder="Email cliente"
              />

              <Input
                label="Servizio richiesto"
                value={editDraft.serviceType}
                onChange={(value) => patchDraft("serviceType", value)}
                placeholder="Es. Pulizia appartamento"
              />

              <Input
                label="Zona / città"
                value={editDraft.city}
                onChange={(value) => patchDraft("city", value)}
                placeholder="Es. Roma"
              />

              <Select
                label="Urgenza"
                value={editDraft.urgency}
                options={URGENCY_LEVELS}
                onChange={(value) => patchDraft("urgency", value)}
              />

              <Input
                label="Valore stimato"
                type="number"
                min="0"
                value={editDraft.estimatedValue}
                onChange={(value) => patchDraft("estimatedValue", value)}
                placeholder="Opzionale"
              />
            </div>

            <div className="detail-edit-channel-grid" aria-label="Canale richiesta">
              {LEAD_CHANNELS.map((channel) => (
                <EditChannelButton
                  key={channel}
                  channel={channel}
                  active={editDraft.source === channel}
                  onClick={() => patchDraft("source", channel)}
                />
              ))}
            </div>

            <Textarea
              label="Messaggio originale"
              value={editDraft.rawMessage}
              onChange={(value) => patchDraft("rawMessage", value)}
              placeholder="Messaggio ricevuto dal cliente o nota iniziale"
            />

            {editError && <p className="form-error">{editError}</p>}

            <div className="detail-edit-actions">
              <Button type="button" onClick={saveEditedData} disabled={isSavingEdit}>
                {isSavingEdit ? "Salvataggio..." : "Salva modifiche"}
              </Button>

              <Button variant="secondary" type="button" onClick={closeEdit} disabled={isSavingEdit}>
                Annulla
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="detail-info-grid">
              <ReadonlyInfo
                label="Telefono"
                value={lead.phone}
                href={lead.phone ? `tel:${lead.phone.replace(/\s/g, "")}` : ""}
              />

              <ReadonlyInfo label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : ""} />
              <ReadonlyInfo label="Canale" value={lead.source} />
              <ReadonlyInfo label="Zona / città" value={lead.city} />
              <ReadonlyInfo label="Servizio" value={lead.serviceType} />
              <ReadonlyInfo label="Ultimo aggiornamento" value={formatDateTime(lead.updatedAt)} />
            </div>
          </>
        )}
      </Card>

      {!isEditingData && (
        <Card title="Messaggio originale" className="detail-card-order-3 detail-message-card">
          {lead.rawMessage ? (
            <div className="message-box detail-message-box">{lead.rawMessage}</div>
          ) : (
            <div className="empty-state">
              <strong>Nessun messaggio originale</strong>
              <p>Puoi aggiungerlo premendo “Modifica dati”.</p>
            </div>
          )}
        </Card>
      )}

      <Card title="Risposta suggerita" className="detail-card-order-4 detail-ai-reply-card">
        {lead.aiSuggestedReply ? (
          <>
            {lead.aiSummary && (
              <div className="ai-summary-mini">
                <span>Riepilogo</span>
                <p>{lead.aiSummary}</p>
              </div>
            )}

            <div className="ai-box detail-reply-box">
              <p>{lead.aiSuggestedReply}</p>

              <div className="ai-actions">
                <Button variant="secondary" type="button" onClick={handleCopyReply}>
                  Copia risposta
                </Button>

                {copied && <span className="copy-feedback">Copiata</span>}
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <strong>Nessuna risposta suggerita</strong>
            <p>Le richieste create con AI mock mostreranno qui una bozza copiabile.</p>
          </div>
        )}
      </Card>

      <LeadNotes lead={lead} onUpdate={onUpdate} />
    </div>
  );
}