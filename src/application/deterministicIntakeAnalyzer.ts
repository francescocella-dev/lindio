import {
  INTAKE_ANALYSIS_SCHEMA_VERSION,
  parseIntakeAnalysisInput,
  parseIntakeAnalysisResult,
  type IntakeAnalysisAssessment,
  type IntakeAnalysisInput,
  type IntakeAnalysisResult,
  type IntakeAnalysisSignal
} from "../domain/intakeAnalysis.ts";
import type { LeadStatus, NextAction, UrgencyLevel } from "../domain/lead.ts";
import type { IntakeAnalyzer } from "./intakeAnalyzer.ts";

const ANALYZER_VERSION = "deterministic-rules-v1";

const KNOWN_CITY_KEYWORDS = [
  "Roma", "Milano", "Napoli", "Torino", "Firenze", "Bologna", "Bari", "Palermo", "Genova",
  "Venezia", "Verona", "Padova", "Parma", "Modena", "Reggio Emilia", "Perugia", "Pescara",
  "Ancona", "Cagliari", "Catania", "Messina", "Salerno", "Potenza", "Matera"
] as const;

interface ServiceRule {
  service: string;
  baseValue: number;
  keywords: readonly string[];
  requiredDetails: readonly string[];
}

interface CustomerTypeRule {
  type: string;
  keywords: readonly string[];
}

interface DetailRule {
  label: string;
  test: (message: string, normalizedText: string) => boolean;
}

interface ServiceDetection {
  serviceType: string;
  rule: ServiceRule | null;
  recognized: boolean;
  ambiguous: boolean;
  candidates: string[];
}

interface WorkflowSuggestion {
  status: LeadStatus;
  nextAction: NextAction;
}

const SERVICE_RULES: readonly ServiceRule[] = [
  {
    service: "Pulizia post-ristrutturazione",
    baseValue: 450,
    keywords: [
      "post ristrutturazione", "dopo ristrutturazione", "dopo lavori", "fine lavori", "fine cantiere",
      "post cantiere", "polvere lavori", "polvere dei lavori", "muratori", "imbiancatura",
      "ristrutturato", "ristrutturazione", "cantiere"
    ],
    requiredDetails: [
      "Metri quadri", "Appartamento vuoto o arredato", "Piano e ascensore", "Foto o video degli ambienti",
      "Data desiderata", "Zona o indirizzo"
    ]
  },
  {
    service: "Pulizia B&B",
    baseValue: 120,
    keywords: [
      "b&b", "beb", "bed and breakfast", "casa vacanza", "casa vacanze", "affitti brevi", "ospiti",
      "check-in", "check in", "check-out", "check out", "booking", "airbnb"
    ],
    requiredDetails: [
      "Numero camere", "Numero bagni", "Frequenza dei cambi", "Gestione biancheria",
      "Orari check-in/check-out", "Zona o indirizzo"
    ]
  },
  {
    service: "Pulizia scale condominiali",
    baseValue: 220,
    keywords: [
      "scale", "condominio", "condominiale", "androne", "pianerottoli", "scala", "palazzo",
      "parti comuni", "spazi comuni condominio"
    ],
    requiredDetails: [
      "Numero piani", "Numero scale", "Frequenza richiesta", "Presenza ascensore",
      "Spazi comuni da pulire", "Zona o indirizzo"
    ]
  },
  {
    service: "Pulizia uffici",
    baseValue: 300,
    keywords: [
      "ufficio", "uffici", "studio professionale", "studio medico", "studio dentistico", "azienda",
      "scrivanie", "postazioni", "sala riunioni"
    ],
    requiredDetails: [
      "Metri quadri", "Numero stanze o postazioni", "Frequenza richiesta", "Orario preferito", "Zona o indirizzo"
    ]
  },
  {
    service: "Pulizia locale commerciale",
    baseValue: 280,
    keywords: [
      "negozio", "bar", "ristorante", "locale", "palestra", "salone", "attività commerciale",
      "vetrina", "laboratorio", "showroom"
    ],
    requiredDetails: [
      "Tipo di locale", "Metri quadri", "Frequenza richiesta", "Orario preferito",
      "Foto o video degli ambienti", "Zona o indirizzo"
    ]
  },
  {
    service: "Lavaggio vetrate",
    baseValue: 180,
    keywords: ["vetri", "vetrate", "vetrina", "finestre", "infissi", "vetrata", "lavaggio vetri", "pulizia vetri"],
    requiredDetails: ["Numero vetrate o finestre", "Altezza o accessibilità", "Interno/esterno", "Foto o video", "Zona o indirizzo"]
  },
  {
    service: "Sanificazione",
    baseValue: 350,
    keywords: ["sanificazione", "sanificare", "igienizzazione", "igienizzare", "disinfezione", "disinfettare", "disinfestazione"],
    requiredDetails: ["Tipo di ambiente", "Metri quadri", "Motivo della sanificazione", "Data desiderata", "Zona o indirizzo"]
  },
  {
    service: "Pulizia garage / cantina",
    baseValue: 180,
    keywords: ["garage", "box", "cantina", "deposito", "magazzino", "seminterrato", "sgombero leggero"],
    requiredDetails: ["Metri quadri", "Quantità di sporco o oggetti", "Foto o video", "Accessibilità", "Zona o indirizzo"]
  },
  {
    service: "Pulizia divani / tessuti",
    baseValue: 140,
    keywords: ["divano", "divani", "poltrona", "poltrone", "materasso", "materassi", "tappeto", "tappeti", "tessuti", "moquette"],
    requiredDetails: ["Tipo e numero di elementi", "Materiale", "Macchie o problemi specifici", "Foto", "Zona o indirizzo"]
  },
  {
    service: "Pulizia appartamento",
    baseValue: 160,
    keywords: ["appartamento", "casa", "abitazione", "stanza", "stanze", "bagno", "bagni", "cucina", "pulizia casa", "pulizie domestiche"],
    requiredDetails: ["Metri quadri", "Numero stanze", "Tipo di pulizia richiesta", "Data desiderata", "Zona o indirizzo"]
  }
];

const CUSTOMER_TYPE_RULES: readonly CustomerTypeRule[] = [
  { type: "Condominio", keywords: ["condominio", "amministratore", "scala", "scale", "androne", "pianerottoli", "palazzo"] },
  { type: "B&B / casa vacanza", keywords: ["b&b", "beb", "bed and breakfast", "casa vacanza", "airbnb", "booking", "ospiti", "check-in", "check out"] },
  { type: "Azienda / ufficio", keywords: ["ufficio", "uffici", "azienda", "studio", "postazioni", "sala riunioni"] },
  { type: "Attività commerciale", keywords: ["negozio", "bar", "ristorante", "palestra", "locale", "salone", "showroom", "vetrina"] },
  { type: "Privato", keywords: ["casa", "appartamento", "abitazione", "mio appartamento", "mia casa"] }
];

const WEEKDAY_KEYWORDS = [
  "lunedì", "lunedi", "martedì", "martedi", "mercoledì", "mercoledi", "giovedì", "giovedi",
  "venerdì", "venerdi", "sabato", "domenica"
] as const;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsKeyword(text: string, keyword: string): boolean {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return false;

  let offset = 0;

  while (offset <= text.length - normalizedKeyword.length) {
    const index = text.indexOf(normalizedKeyword, offset);
    if (index === -1) return false;

    const before = index > 0 ? text[index - 1] : "";
    const afterIndex = index + normalizedKeyword.length;
    const after = afterIndex < text.length ? text[afterIndex] : "";
    const startsAtBoundary = !before || !/[a-z0-9]/i.test(before);
    const endsAtBoundary = !after || !/[a-z0-9]/i.test(after);

    if (startsAtBoundary && endsAtBoundary) return true;
    offset = index + 1;
  }

  return false;
}

function includesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => containsKeyword(text, keyword));
}

function uniqueList(items: readonly string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function cleanExtractedText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[,.!?;:]+$/g, "")
    .trim();
}

function scoreKeywords(text: string, keywords: readonly string[]): number {
  return keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword || !containsKeyword(text, keyword)) return score;
    return score + Math.max(1, normalizedKeyword.split(" ").length);
  }, 0);
}

function detectService(message: string): ServiceDetection {
  const text = normalizeText(message);
  const scoredRules = SERVICE_RULES
    .map((rule) => ({ rule, score: scoreKeywords(text, rule.keywords) }))
    .sort((a, b) => b.score - a.score);

  const best = scoredRules[0];
  const second = scoredRules[1];

  if (!best || best.score === 0) {
    return {
      serviceType: "",
      rule: null,
      recognized: false,
      ambiguous: false,
      candidates: []
    };
  }

  if (second && second.score === best.score) {
    return {
      serviceType: "",
      rule: null,
      recognized: false,
      ambiguous: true,
      candidates: [best.rule.service, second.rule.service]
    };
  }

  return {
    serviceType: best.rule.service,
    rule: best.rule,
    recognized: true,
    ambiguous: false,
    candidates: [best.rule.service]
  };
}

function detectCustomerType(message: string): string {
  const text = normalizeText(message);
  const scoredTypes = CUSTOMER_TYPE_RULES
    .map((rule) => ({ rule, score: scoreKeywords(text, rule.keywords) }))
    .sort((a, b) => b.score - a.score);

  const best = scoredTypes[0];
  const second = scoredTypes[1];

  if (!best || best.score === 0 || (second && second.score === best.score)) {
    return "Non determinato";
  }

  return best.rule.type;
}

function extractEmail(message: string): string {
  const match = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] || "";
}

function extractPhone(message: string): string {
  const match = message.match(/(?:\+39\s?)?(?:3\d{2}|0\d{1,4})[\s.-]?\d{2,4}[\s.-]?\d{3,5}/);
  return match?.[0]?.replace(/\s+/g, " ").trim() || "";
}

function extractCustomerName(message: string): string {
  const patterns = [
    /\bmi chiamo\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+){0,2})/i,
    /\bsono\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+){0,2})/i,
    /\bmi contatti\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+){0,2})/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (!match?.[1]) continue;

    const value = cleanExtractedText(match[1]);
    if (!["Buongiorno", "Salve", "Ciao"].includes(value)) return toTitleCase(value);
  }

  return "";
}

function hasDateOrTimeInfo(message: string, text = normalizeText(message)): boolean {
  return (
    includesAny(text, [
      "oggi", "domani", "dopodomani", "questa settimana", "settimana prossima", "entro", "prima di",
      "nel weekend", "weekend", "mattina", "pomeriggio", "sera", "data", "giorno"
    ]) ||
    WEEKDAY_KEYWORDS.some((day) => text.includes(normalizeText(day))) ||
    /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/.test(message) ||
    /\b(?:alle|ore)\s+\d{1,2}(?::\d{2})?\b/i.test(message)
  );
}

function hasLocationInfo(message: string, text = normalizeText(message)): boolean {
  return (
    KNOWN_CITY_KEYWORDS.some((city) => text.includes(normalizeText(city))) ||
    includesAny(text, ["zona", "indirizzo", "via", "viale", "corso", "piazza", "contrada", "località", "localita", "quartiere", "centro"])
  );
}

function extractLocation(message: string): string {
  const text = normalizeText(message);
  const knownCity = KNOWN_CITY_KEYWORDS.find((city) => text.includes(normalizeText(city)));
  const areaPatterns = [
    /\b(?:zona|in zona|quartiere|area)\s+([^,.!?;\n]{2,55})/i,
    /\b(?:via|viale|corso|piazza|contrada|località|localita)\s+([^,.!?;\n]{2,55})/i,
    /\b(?:nei pressi di|vicino a|zona vicino a)\s+([^,.!?;\n]{2,55})/i
  ];

  let area = "";

  for (const pattern of areaPatterns) {
    const match = message.match(pattern);
    if (!match?.[1]) continue;
    area = cleanExtractedText(match[1]);
    break;
  }

  if (knownCity && area) {
    return normalizeText(area).includes(normalizeText(knownCity)) ? area : `${knownCity} ${area}`;
  }

  if (area) return area;
  if (knownCity) return knownCity;
  return "";
}

function detectUrgency(message: string): UrgencyLevel {
  const text = normalizeText(message);

  if (includesAny(text, [
    "urgente", "urgenza", "subito", "oggi", "domani", "entro domani", "prima possibile", "al piu presto",
    "prima che potete", "questa settimana", "entro venerdi", "entro sabato", "entro lunedi"
  ])) {
    return "Alta";
  }

  if (includesAny(text, [
    "senza fretta", "non ho fretta", "quando potete", "quando riuscite", "piu avanti", "prossime settimane", "con calma"
  ])) {
    return "Bassa";
  }

  return "Media";
}

function asksForInspection(text: string): boolean {
  return includesAny(text, [
    "sopralluogo", "venire a vedere", "passare a vedere", "potete passare", "venite a vedere",
    "vedere il lavoro", "fare un giro", "appuntamento"
  ]);
}

function asksForQuote(text: string): boolean {
  return includesAny(text, [
    "preventivo", "prezzo", "costo", "quanto costa", "quanto verrebbe", "tariffa", "spesa", "disponibilita e prezzo"
  ]);
}

const DETAIL_RULES: readonly DetailRule[] = [
  { label: "Metri quadri indicati", test: (message) => /\b\d{1,5}\s?(mq|m2|m²|metri quadri|metri)\b/i.test(message) },
  { label: "Numero stanze/camere indicato", test: (message) => /\b\d{1,3}\s?(stanze|camere|locali|bagni|bagno|postazioni)\b/i.test(message) },
  { label: "Foto/video disponibili", test: (_message, text) => includesAny(text, ["foto", "fotografie", "immagini", "video", "le mando le foto", "posso mandare foto"]) },
  { label: "Periodo o data indicata", test: (message, text) => hasDateOrTimeInfo(message, text) },
  { label: "Zona o indirizzo indicato", test: (message, text) => hasLocationInfo(message, text) },
  { label: "Frequenza indicata", test: (_message, text) => includesAny(text, ["ogni settimana", "settimanale", "mensile", "giornaliera", "due volte", "una volta a settimana", "periodica", "ricorrente", "ad ogni cambio"]) },
  { label: "Piano/ascensore indicato", test: (_message, text) => includesAny(text, ["piano", "ascensore", "senza ascensore", "con ascensore", "primo piano", "secondo piano", "terzo piano"]) },
  { label: "Richiesta sopralluogo", test: (_message, text) => asksForInspection(text) },
  { label: "Richiesta prezzo/preventivo", test: (_message, text) => asksForQuote(text) },
  { label: "Contatto telefonico indicato", test: (message) => Boolean(extractPhone(message)) },
  { label: "Email indicata", test: (message) => Boolean(extractEmail(message)) }
];

function detectPresentDetails(message: string): string[] {
  const text = normalizeText(message);
  return DETAIL_RULES.filter((rule) => rule.test(message, text)).map((rule) => rule.label);
}

function hasDetail(message: string, label: string): boolean {
  const text = normalizeText(message);
  const checks: Record<string, () => boolean> = {
    "Metri quadri": () => /\b\d{1,5}\s?(mq|m2|m²|metri quadri|metri)\b/i.test(message),
    "Numero stanze": () => /\b\d{1,3}\s?(stanze|camere|locali)\b/i.test(message),
    "Numero camere": () => /\b\d{1,3}\s?(camere|stanze)\b/i.test(message),
    "Numero bagni": () => /\b\d{1,3}\s?(bagni|bagno)\b/i.test(message),
    "Numero stanze o postazioni": () => /\b\d{1,3}\s?(stanze|uffici|locali|postazioni|scrivanie)\b/i.test(message),
    "Foto": () => includesAny(text, ["foto", "immagine", "immagini", "video"]),
    "Foto o video": () => includesAny(text, ["foto", "immagine", "immagini", "video"]),
    "Foto o video degli ambienti": () => includesAny(text, ["foto", "immagine", "immagini", "video"]),
    "Data desiderata": () => hasDateOrTimeInfo(message, text),
    "Zona o indirizzo": () => hasLocationInfo(message, text),
    "Appartamento vuoto o arredato": () => includesAny(text, ["vuoto", "arredato", "mobili", "senza mobili", "con mobili"]),
    "Piano e ascensore": () => includesAny(text, ["piano", "ascensore", "senza ascensore", "con ascensore"]),
    "Frequenza richiesta": () => includesAny(text, ["settimanale", "mensile", "giornaliera", "ogni settimana", "due volte", "una volta", "periodica", "ricorrente", "ad ogni cambio"]),
    "Frequenza dei cambi": () => includesAny(text, ["cambio ospiti", "cambi ospiti", "ad ogni cambio", "ogni cambio", "turnover", "settimanale", "giornaliera"]),
    "Presenza ascensore": () => includesAny(text, ["ascensore", "senza ascensore", "con ascensore"]),
    "Numero piani": () => /\b\d{1,2}\s?(piani|piano)\b/i.test(message),
    "Numero scale": () => /\b\d{1,2}\s?(scale|scala)\b/i.test(message),
    "Spazi comuni da pulire": () => includesAny(text, ["androne", "garage", "scale", "pianerottoli", "cortile", "spazi comuni"]),
    "Gestione biancheria": () => includesAny(text, ["biancheria", "lenzuola", "asciugamani", "lavanderia"]),
    "Orari check-in/check-out": () => includesAny(text, ["check-in", "check in", "check-out", "check out", "ospiti"]),
    "Orario preferito": () => hasDateOrTimeInfo(message, text) || /\b\d{1,2}(?::\d{2})\b/.test(message),
    "Tipo di locale": () => includesAny(text, ["negozio", "bar", "ristorante", "palestra", "salone", "showroom", "laboratorio"]),
    "Numero vetrate o finestre": () => /\b\d{1,3}\s?(vetri|vetrate|finestre|vetrine)\b/i.test(message),
    "Altezza o accessibilità": () => includesAny(text, ["alto", "altezza", "scala", "trabattello", "accessibile", "piano terra"]),
    "Interno/esterno": () => includesAny(text, ["interno", "interni", "esterno", "esterni"]),
    "Tipo di ambiente": () => includesAny(text, ["casa", "appartamento", "ufficio", "locale", "negozio", "studio", "condominio"]),
    "Motivo della sanificazione": () => includesAny(text, ["covid", "muffa", "odore", "animali", "igienizzare", "sanificare"]),
    "Quantità di sporco o oggetti": () => includesAny(text, ["molto sporco", "sporco pesante", "pieno", "scatoloni", "oggetti", "svuotare", "sgombero"]),
    "Accessibilità": () => includesAny(text, ["accesso", "accessibile", "rampa", "piano", "ascensore", "scala", "garage"]),
    "Tipo e numero di elementi": () => /\b\d{1,3}\s?(divani|divano|poltrone|poltrona|materassi|materasso|tappeti|tappeto)\b/i.test(message),
    "Materiale": () => includesAny(text, ["pelle", "tessuto", "microfibra", "stoffa", "alcantara"]),
    "Macchie o problemi specifici": () => includesAny(text, ["macchia", "macchie", "odore", "sporco", "animali", "urina"]),
    "Tipo di pulizia richiesta": () => includesAny(text, ["ordinaria", "straordinaria", "profonda", "post lavori", "dopo lavori"])
  };

  return checks[label]?.() || false;
}

function detectMissingFields(message: string, serviceDetection: ServiceDetection): string[] {
  if (!serviceDetection.rule) {
    return ["Tipo di servizio", "Zona o indirizzo", "Dettagli utili per valutare il lavoro"];
  }

  return uniqueList(
    serviceDetection.rule.requiredDetails.filter((label) => !hasDetail(message, label))
  ).slice(0, 7);
}

function detectSuggestedWorkflow(message: string, serviceRecognized: boolean, missingFields: readonly string[]): WorkflowSuggestion {
  const text = normalizeText(message);

  if (asksForInspection(text)) {
    return { status: "Sopralluogo da fissare", nextAction: "Fissare sopralluogo" };
  }

  if (!serviceRecognized) {
    return { status: "Da rispondere", nextAction: "Rispondere al cliente" };
  }

  if (missingFields.length > 0) {
    return { status: "Info richieste", nextAction: "Chiedere informazioni mancanti" };
  }

  if (asksForQuote(text)) {
    return { status: "Preventivo da preparare", nextAction: "Preparare preventivo" };
  }

  if (includesAny(text, ["mi fate sapere", "potete aiutarmi", "avrei bisogno", "mi servirebbe"])) {
    return { status: "Da rispondere", nextAction: "Rispondere al cliente" };
  }

  return { status: "Preventivo da preparare", nextAction: "Preparare preventivo" };
}

function extractSquareMeters(message: string): number {
  const match = message.match(/\b(\d{1,5})\s?(mq|m2|m²|metri quadri|metri)\b/i);
  if (!match?.[1]) return 0;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 0;
}

function detectEstimatedValue(serviceDetection: ServiceDetection, message: string, urgency: UrgencyLevel): number {
  if (!serviceDetection.rule) return 0;

  const baseValue = serviceDetection.rule.baseValue;
  const squareMeters = extractSquareMeters(message);
  let value = baseValue;

  if (squareMeters > 60 && squareMeters <= 120) value = Math.max(value, Math.round(baseValue * 1.25));
  if (squareMeters > 120) value = Math.max(value, Math.round(baseValue * 1.6));
  if (urgency === "Alta") value = Math.round(value * 1.1);

  return value;
}

function buildSummary(
  serviceDetection: ServiceDetection,
  city: string,
  customerType: string,
  urgency: UrgencyLevel,
  missingFields: readonly string[]
): string {
  const serviceText = serviceDetection.serviceType
    ? serviceDetection.serviceType.toLowerCase()
    : "servizio da determinare";
  const zoneText = city ? ` in zona ${city}` : "";
  const customerText = customerType === "Non determinato"
    ? "con tipo cliente non determinato"
    : `${customerType.toLowerCase()}`;
  const missingText = missingFields.length > 0
    ? ` Da verificare: ${missingFields.slice(0, 4).join(", ")}.`
    : " I principali dati richiesti dalla regola risultano presenti.";

  return `Richiesta ${customerText} per ${serviceText}${zoneText}. Urgenza proposta ${urgency.toLowerCase()}.${missingText}`;
}

function buildSuggestedReply(
  serviceDetection: ServiceDetection,
  city: string,
  missingFields: readonly string[],
  workflow: WorkflowSuggestion
): string {
  if (!serviceDetection.serviceType) {
    return "Buongiorno, grazie per averci contattato. Per capire meglio la richiesta, può indicarci il tipo di servizio di cui ha bisogno, la zona e qualche dettaglio sul lavoro da svolgere?";
  }

  const serviceText = serviceDetection.serviceType.toLowerCase();
  const zoneText = city ? ` in zona ${city}` : "";

  if (workflow.nextAction === "Fissare sopralluogo") {
    return `Buongiorno, grazie per averci contattato. Possiamo aiutarla per ${serviceText}${zoneText}. Per valutare bene il lavoro possiamo fissare un sopralluogo: ci può indicare qualche disponibilità nei prossimi giorni?`;
  }

  if (missingFields.length > 0) {
    return `Buongiorno, grazie per averci contattato. Possiamo aiutarla per ${serviceText}${zoneText}. Per preparare una valutazione più precisa avrei bisogno di queste informazioni: ${missingFields.join(", ")}. Se riesce, può inviarci anche qualche foto degli ambienti.`;
  }

  return `Buongiorno, grazie per averci contattato. Possiamo aiutarla per ${serviceText}${zoneText}. Dai dati ricevuti possiamo preparare una prima valutazione: le facciamo sapere disponibilità e costo indicativo il prima possibile.`;
}

function buildAssessment(
  serviceDetection: ServiceDetection,
  city: string,
  detectedDetails: readonly string[],
  missingFields: readonly string[],
  customerName: string,
  phone: string,
  email: string,
  estimatedValue: number
): IntakeAnalysisAssessment {
  const signals: IntakeAnalysisSignal[] = [];
  let evidenceScore = 0;

  if (serviceDetection.recognized) {
    evidenceScore += 2;
    signals.push({
      code: "service-recognized",
      tone: "positive",
      label: `Servizio riconosciuto tramite regole esplicite: ${serviceDetection.serviceType}`
    });
  } else if (serviceDetection.ambiguous) {
    signals.push({
      code: "service-ambiguous",
      tone: "warning",
      label: `Servizio ambiguo tra: ${serviceDetection.candidates.join(" / ")}`
    });
  } else {
    signals.push({
      code: "service-not-recognized",
      tone: "warning",
      label: "Nessuna regola ha riconosciuto con chiarezza il servizio"
    });
  }

  if (city) {
    evidenceScore += 1;
    signals.push({ code: "location-detected", tone: "positive", label: `Zona rilevata: ${city}` });
  } else {
    signals.push({ code: "location-missing", tone: "warning", label: "Zona o indirizzo non rilevati" });
  }

  if (detectedDetails.length >= 3) {
    evidenceScore += 2;
    signals.push({ code: "details-rich", tone: "positive", label: `${detectedDetails.length} dettagli strutturati rilevati` });
  } else if (detectedDetails.length > 0) {
    evidenceScore += 1;
    signals.push({ code: "details-sparse", tone: "neutral", label: `${detectedDetails.length} dettagli strutturati rilevati` });
  } else {
    signals.push({ code: "details-none", tone: "warning", label: "Pochi dettagli strutturati nel messaggio" });
  }

  if (missingFields.length <= 2) {
    evidenceScore += 1;
    signals.push({ code: "missing-few", tone: "positive", label: `${missingFields.length} informazioni principali ancora da verificare` });
  } else if (missingFields.length >= 5) {
    evidenceScore -= 1;
    signals.push({ code: "missing-many", tone: "warning", label: `${missingFields.length} informazioni principali ancora da verificare` });
  } else {
    signals.push({ code: "missing-some", tone: "neutral", label: `${missingFields.length} informazioni principali ancora da verificare` });
  }

  const contactCount = [customerName, phone, email].filter(Boolean).length;
  if (contactCount > 0) {
    evidenceScore += 1;
    signals.push({ code: "contacts-detected", tone: "positive", label: `${contactCount} dati di contatto rilevati` });
  } else {
    signals.push({ code: "contacts-none", tone: "neutral", label: "Nessun dato di contatto rilevato automaticamente" });
  }

  if (estimatedValue > 0) {
    signals.push({
      code: "rule-based-value",
      tone: "neutral",
      label: "Valore orientativo calcolato da regole statiche: non è un preventivo"
    });
  }

  let level: IntakeAnalysisAssessment["level"] = "low";
  if (serviceDetection.recognized && evidenceScore >= 5 && missingFields.length <= 3) level = "high";
  else if (serviceDetection.recognized && evidenceScore >= 3) level = "medium";

  return { level, signals };
}

export function analyzeIntakeDeterministically(input: unknown): IntakeAnalysisResult {
  const { message } = parseIntakeAnalysisInput(input);
  const serviceDetection = detectService(message);
  const customerType = detectCustomerType(message);
  const city = extractLocation(message);
  const urgency = detectUrgency(message);
  const detectedDetails = uniqueList(detectPresentDetails(message));
  const missingFields = detectMissingFields(message, serviceDetection);
  const workflow = detectSuggestedWorkflow(message, serviceDetection.recognized, missingFields);
  const estimatedValue = detectEstimatedValue(serviceDetection, message, urgency);
  const customerName = extractCustomerName(message);
  const phone = extractPhone(message);
  const email = extractEmail(message);
  const assessment = buildAssessment(
    serviceDetection,
    city,
    detectedDetails,
    missingFields,
    customerName,
    phone,
    email,
    estimatedValue
  );

  return parseIntakeAnalysisResult({
    schemaVersion: INTAKE_ANALYSIS_SCHEMA_VERSION,
    analyzer: {
      kind: "deterministic",
      version: ANALYZER_VERSION,
      privacy: "local"
    },
    summary: buildSummary(serviceDetection, city, customerType, urgency, missingFields),
    serviceType: serviceDetection.serviceType,
    customerType,
    city,
    urgency,
    detectedDetails,
    missingFields,
    suggestedStatus: workflow.status,
    nextAction: workflow.nextAction,
    suggestedReply: buildSuggestedReply(serviceDetection, city, missingFields, workflow),
    estimatedValue,
    customerName,
    phone,
    email,
    assessment
  });
}

export const deterministicIntakeAnalyzer: IntakeAnalyzer = {
  async analyze(input: IntakeAnalysisInput): Promise<IntakeAnalysisResult> {
    return analyzeIntakeDeterministically(input);
  }
};
