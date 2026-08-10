const STATUS_META = {
  Nuova: {
    label: "Nuova",
    tone: "blue"
  },
  "Da rispondere": {
    label: "Da rispondere",
    tone: "blue"
  },
  "Info richieste": {
    label: "Info richieste",
    tone: "amber"
  },
  "Sopralluogo da fissare": {
    label: "Sopralluogo",
    tone: "purple"
  },
  "Preventivo da preparare": {
    label: "Preventivo da preparare",
    tone: "amber"
  },
  "Preventivo inviato": {
    label: "Preventivo inviato",
    tone: "indigo"
  },
  "In attesa": {
    label: "In attesa",
    tone: "gray"
  },
  Vinta: {
    label: "Vinta",
    tone: "green"
  },
  Persa: {
    label: "Persa",
    tone: "red"
  }
};

export default function LeadStatusBadge({ status }) {
  const normalizedStatus = status === "Follow-up" ? "In attesa" : status;

  const meta = STATUS_META[normalizedStatus] || {
    label: normalizedStatus || "Da definire",
    tone: "gray"
  };

  return <span className={`status-badge status-badge-${meta.tone}`}>{meta.label}</span>;
}