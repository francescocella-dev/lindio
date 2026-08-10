const KNOWN_CITY_KEYWORDS = [
  "Roma",
  "Milano",
  "Napoli",
  "Torino",
  "Firenze",
  "Bologna",
  "Bari",
  "Palermo",
  "Genova",
  "Venezia",
  "Verona",
  "Padova",
  "Parma",
  "Modena",
  "Reggio Emilia",
  "Perugia",
  "Pescara",
  "Ancona",
  "Cagliari",
  "Catania",
  "Messina",
  "Salerno",
  "Potenza",
  "Matera"
];

const SERVICE_RULES = [
  {
    service: "Pulizia post-ristrutturazione",
    baseValue: 450,
    keywords: [
      "post ristrutturazione",
      "dopo ristrutturazione",
      "dopo lavori",
      "fine lavori",
      "fine cantiere",
      "post cantiere",
      "polvere lavori",
      "polvere dei lavori",
      "muratori",
      "imbiancatura",
      "ristrutturato",
      "ristrutturazione",
      "cantiere"
    ],
    requiredDetails: [
      "Metri quadri",
      "Appartamento vuoto o arredato",
      "Piano e ascensore",
      "Foto o video degli ambienti",
      "Data desiderata",
      "Zona o indirizzo"
    ]
  },
  {
    service: "Pulizia B&B",
    baseValue: 120,
    keywords: [
      "b&b",
      "beb",
      "bed and breakfast",
      "casa vacanza",
      "casa vacanze",
      "affitti brevi",
      "ospiti",
      "check-in",
      "check in",
      "check-out",
      "check out",
      "booking",
      "airbnb"
    ],
    requiredDetails: [
      "Numero camere",
      "Numero bagni",
      "Frequenza dei cambi",
      "Gestione biancheria",
      "Orari check-in/check-out",
      "Zona o indirizzo"
    ]
  },
  {
    service: "Pulizia scale condominiali",
    baseValue: 220,
    keywords: [
      "scale",
      "condominio",
      "condominiale",
      "androne",
      "pianerottoli",
      "scala",
      "palazzo",
      "parti comuni",
      "spazi comuni condominio"
    ],
    requiredDetails: [
      "Numero piani",
      "Numero scale",
      "Frequenza richiesta",
      "Presenza ascensore",
      "Spazi comuni da pulire",
      "Zona o indirizzo"
    ]
  },
  {
    service: "Pulizia uffici",
    baseValue: 300,
    keywords: [
      "ufficio",
      "uffici",
      "studio professionale",
      "studio medico",
      "studio dentistico",
      "azienda",
      "scrivanie",
      "postazioni",
      "sala riunioni"
    ],
    requiredDetails: [
      "Metri quadri",
      "Numero stanze o postazioni",
      "Frequenza richiesta",
      "Orario preferito",
      "Zona o indirizzo"
    ]
  },
  {
    service: "Pulizia locale commerciale",
    baseValue: 280,
    keywords: [
      "negozio",
      "bar",
      "ristorante",
      "locale",
      "palestra",
      "salone",
      "attività commerciale",
      "vetrina",
      "laboratorio",
      "showroom"
    ],
    requiredDetails: [
      "Tipo di locale",
      "Metri quadri",
      "Frequenza richiesta",
      "Orario preferito",
      "Foto o video degli ambienti",
      "Zona o indirizzo"
    ]
  },
  {
    service: "Lavaggio vetrate",
    baseValue: 180,
    keywords: [
      "vetri",
      "vetrate",
      "vetrina",
      "finestre",
      "infissi",
      "vetrata",
      "lavaggio vetri",
      "pulizia vetri"
    ],
    requiredDetails: [
      "Numero vetrate o finestre",
      "Altezza o accessibilità",
      "Interno/esterno",
      "Foto o video",
      "Zona o indirizzo"
    ]
  },
  {
    service: "Sanificazione",
    baseValue: 350,
    keywords: [
      "sanificazione",
      "sanificare",
      "igienizzazione",
      "igienizzare",
      "disinfezione",
      "disinfettare",
      "disinfestazione"
    ],
    requiredDetails: [
      "Tipo di ambiente",
      "Metri quadri",
      "Motivo della sanificazione",
      "Data desiderata",
      "Zona o indirizzo"
    ]
  },
  {
    service: "Pulizia garage / cantina",
    baseValue: 180,
    keywords: [
      "garage",
      "box",
      "cantina",
      "deposito",
      "magazzino",
      "seminterrato",
      "sgombero leggero"
    ],
    requiredDetails: [
      "Metri quadri",
      "Quantità di sporco o oggetti",
      "Foto o video",
      "Accessibilità",
      "Zona o indirizzo"
    ]
  },
  {
    service: "Pulizia divani / tessuti",
    baseValue: 140,
    keywords: [
      "divano",
      "divani",
      "poltrona",
      "poltrone",
      "materasso",
      "materassi",
      "tappeto",
      "tappeti",
      "tessuti",
      "moquette"
    ],
    requiredDetails: [
      "Tipo e numero di elementi",
      "Materiale",
      "Macchie o problemi specifici",
      "Foto",
      "Zona o indirizzo"
    ]
  },
  {
    service: "Pulizia appartamento",
    baseValue: 160,
    keywords: [
      "appartamento",
      "casa",
      "abitazione",
      "stanza",
      "stanze",
      "bagno",
      "bagni",
      "cucina",
      "pulizia casa",
      "pulizie domestiche"
    ],
    requiredDetails: [
      "Metri quadri",
      "Numero stanze",
      "Tipo di pulizia richiesta",
      "Data desiderata",
      "Zona o indirizzo"
    ]
  }
];

const CUSTOMER_TYPE_RULES = [
  {
    type: "Condominio",
    keywords: ["condominio", "amministratore", "scala", "scale", "androne", "pianerottoli", "palazzo"]
  },
  {
    type: "B&B / casa vacanza",
    keywords: ["b&b", "beb", "bed and breakfast", "casa vacanza", "airbnb", "booking", "ospiti", "check-in", "check out"]
  },
  {
    type: "Azienda / ufficio",
    keywords: ["ufficio", "uffici", "azienda", "studio", "postazioni", "sala riunioni"]
  },
  {
    type: "Attività commerciale",
    keywords: ["negozio", "bar", "ristorante", "palestra", "locale", "salone", "showroom", "vetrina"]
  },
  {
    type: "Privato",
    keywords: ["casa", "appartamento", "abitazione", "mio appartamento", "mia casa"]
  }
];

const DETAIL_RULES = [
  {
    label: "Metri quadri indicati",
    test: (message, text) => /\b\d{1,5}\s?(mq|m2|m²|metri quadri|metri)\b/i.test(message)
  },
  {
    label: "Numero stanze/camere indicato",
    test: (message, text) => /\b\d{1,3}\s?(stanze|camere|locali|bagni|bagno)\b/i.test(message)
  },
  {
    label: "Foto/video disponibili",
    test: (message, text) => includesAny(text, ["foto", "fotografie", "immagini", "video", "le mando le foto", "posso mandare foto"])
  },
  {
    label: "Periodo o data indicata",
    test: (message, text) => hasDateOrTimeInfo(message, text)
  },
  {
    label: "Zona o indirizzo indicato",
    test: (message, text) => hasLocationInfo(message, text)
  },
  {
    label: "Frequenza indicata",
    test: (message, text) =>
      includesAny(text, ["ogni settimana", "settimanale", "mensile", "giornaliera", "due volte", "una volta a settimana", "periodica", "ricorrente"])
  },
  {
    label: "Piano/ascensore indicato",
    test: (message, text) => includesAny(text, ["piano", "ascensore", "senza ascensore", "con ascensore", "primo piano", "secondo piano", "terzo piano"])
  },
  {
    label: "Richiesta sopralluogo",
    test: (message, text) => asksForInspection(text)
  },
  {
    label: "Richiesta prezzo/preventivo",
    test: (message, text) => asksForQuote(text)
  },
  {
    label: "Contatto telefonico indicato",
    test: (message) => Boolean(extractPhone(message))
  },
  {
    label: "Email indicata",
    test: (message) => Boolean(extractEmail(message))
  }
];

const WEEKDAY_KEYWORDS = [
  "lunedì",
  "lunedi",
  "martedì",
  "martedi",
  "mercoledì",
  "mercoledi",
  "giovedì",
  "giovedi",
  "venerdì",
  "venerdi",
  "sabato",
  "domenica"
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}

function toTitleCase(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function cleanExtractedText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[,.!?;:]+$/g, "")
    .trim();
}

function scoreKeywords(text, keywords) {
  return keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword) return score;

    if (text.includes(normalizedKeyword)) {
      return score + Math.max(1, normalizedKeyword.split(" ").length);
    }

    return score;
  }, 0);
}

function detectService(message) {
  const text = normalizeText(message);

  const scoredRules = SERVICE_RULES.map((rule) => ({
    ...rule,
    score: scoreKeywords(text, rule.keywords)
  })).sort((a, b) => b.score - a.score);

  const best = scoredRules[0];

  if (!best || best.score === 0) {
    return {
      service: "Pulizia appartamento",
      confidence: 45,
      rule: SERVICE_RULES.find((rule) => rule.service === "Pulizia appartamento")
    };
  }

  return {
    service: best.service,
    confidence: Math.min(95, 55 + best.score * 8),
    rule: best
  };
}

function detectCustomerType(message) {
  const text = normalizeText(message);

  const scoredTypes = CUSTOMER_TYPE_RULES.map((rule) => ({
    ...rule,
    score: scoreKeywords(text, rule.keywords)
  })).sort((a, b) => b.score - a.score);

  const best = scoredTypes[0];

  if (!best || best.score === 0) {
    return "Privato";
  }

  return best.type;
}

function extractEmail(message) {
  const match = String(message || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  return match?.[0] || "";
}

function extractPhone(message) {
  const match = String(message || "").match(/(?:\+39\s?)?(?:3\d{2}|0\d{1,4})[\s.-]?\d{2,4}[\s.-]?\d{3,5}/);

  return match?.[0]?.replace(/\s+/g, " ").trim() || "";
}

function extractCustomerName(message) {
  const original = String(message || "");

  const patterns = [
    /\bmi chiamo\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+){0,2})/i,
    /\bsono\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+){0,2})/i,
    /\bmi contatti\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+){0,2})/i
  ];

  for (const pattern of patterns) {
    const match = original.match(pattern);

    if (match?.[1]) {
      const value = cleanExtractedText(match[1]);

      if (!["Buongiorno", "Salve", "Ciao"].includes(value)) {
        return toTitleCase(value);
      }
    }
  }

  return "";
}

function hasDateOrTimeInfo(message, text = normalizeText(message)) {
  return (
    includesAny(text, [
      "oggi",
      "domani",
      "dopodomani",
      "questa settimana",
      "settimana prossima",
      "entro",
      "prima di",
      "nel weekend",
      "weekend",
      "mattina",
      "pomeriggio",
      "sera",
      "data",
      "giorno"
    ]) ||
    WEEKDAY_KEYWORDS.some((day) => text.includes(normalizeText(day))) ||
    /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/.test(message)
  );
}

function hasLocationInfo(message, text = normalizeText(message)) {
  return (
    KNOWN_CITY_KEYWORDS.some((city) => text.includes(normalizeText(city))) ||
    includesAny(text, ["zona", "indirizzo", "via", "viale", "corso", "piazza", "contrada", "località", "localita", "quartiere", "centro"])
  );
}

function extractLocation(message) {
  const original = String(message || "");
  const text = normalizeText(original);

  const knownCity = KNOWN_CITY_KEYWORDS.find((city) => text.includes(normalizeText(city)));

  const areaPatterns = [
    /\b(?:zona|in zona|quartiere|area)\s+([^,.!?;\n]{2,55})/i,
    /\b(?:via|viale|corso|piazza|contrada|località|localita)\s+([^,.!?;\n]{2,55})/i,
    /\b(?:nei pressi di|vicino a|zona vicino a)\s+([^,.!?;\n]{2,55})/i
  ];

  let area = "";

  for (const pattern of areaPatterns) {
    const match = original.match(pattern);

    if (match?.[1]) {
      area = cleanExtractedText(match[1]);
      break;
    }
  }

  if (knownCity && area) {
    const normalizedArea = normalizeText(area);

    if (!normalizedArea.includes(normalizeText(knownCity))) {
      return `${knownCity} ${area}`;
    }

    return area;
  }

  if (area) return area;

  if (knownCity) return knownCity;

  const genericPlaceMatch = original.match(/\b(?:a|in|su)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ]?[a-zà-ÿ]+){0,2})/);

  if (genericPlaceMatch?.[1]) {
    return cleanExtractedText(genericPlaceMatch[1]);
  }

  return "";
}

function detectUrgency(message) {
  const text = normalizeText(message);

  if (
    includesAny(text, [
      "urgente",
      "urgenza",
      "subito",
      "oggi",
      "domani",
      "entro domani",
      "prima possibile",
      "al piu presto",
      "prima che potete",
      "questa settimana",
      "entro venerdi",
      "entro sabato",
      "entro lunedi"
    ])
  ) {
    return "Alta";
  }

  if (
    includesAny(text, [
      "senza fretta",
      "non ho fretta",
      "quando potete",
      "quando riuscite",
      "piu avanti",
      "prossime settimane",
      "con calma"
    ])
  ) {
    return "Bassa";
  }

  return "Media";
}

function asksForInspection(text) {
  return includesAny(text, [
    "sopralluogo",
    "venire a vedere",
    "passare a vedere",
    "potete passare",
    "venite a vedere",
    "vedere il lavoro",
    "fare un giro",
    "appuntamento"
  ]);
}

function asksForQuote(text) {
  return includesAny(text, [
    "preventivo",
    "prezzo",
    "costo",
    "quanto costa",
    "quanto verrebbe",
    "tariffa",
    "spesa",
    "disponibilita e prezzo"
  ]);
}

function detectPresentDetails(message) {
  const text = normalizeText(message);

  return DETAIL_RULES.filter((rule) => rule.test(message, text)).map((rule) => rule.label);
}

function hasDetail(message, label) {
  const text = normalizeText(message);

  const checks = {
    "Metri quadri": () => /\b\d{1,5}\s?(mq|m2|m²|metri quadri|metri)\b/i.test(message),
    "Numero stanze": () => /\b\d{1,3}\s?(stanze|camere|locali)\b/i.test(message),
    "Numero camere": () => /\b\d{1,3}\s?(camere|stanze)\b/i.test(message),
    "Numero bagni": () => /\b\d{1,3}\s?(bagni|bagno)\b/i.test(message),
    "Foto": () => includesAny(text, ["foto", "immagine", "immagini", "video"]),
    "Foto o video": () => includesAny(text, ["foto", "immagine", "immagini", "video"]),
    "Foto o video degli ambienti": () => includesAny(text, ["foto", "immagine", "immagini", "video"]),
    "Data desiderata": () => hasDateOrTimeInfo(message, text),
    "Zona o indirizzo": () => hasLocationInfo(message, text),
    "Appartamento vuoto o arredato": () => includesAny(text, ["vuoto", "arredato", "mobili", "senza mobili", "con mobili"]),
    "Piano e ascensore": () => includesAny(text, ["piano", "ascensore", "senza ascensore", "con ascensore"]),
    "Frequenza richiesta": () =>
      includesAny(text, ["settimanale", "mensile", "giornaliera", "ogni settimana", "due volte", "una volta", "periodica", "ricorrente"]),
    "Presenza ascensore": () => includesAny(text, ["ascensore", "senza ascensore", "con ascensore"]),
    "Numero piani": () => /\b\d{1,2}\s?(piani|piano)\b/i.test(message),
    "Numero scale": () => /\b\d{1,2}\s?(scale|scala)\b/i.test(message),
    "Spazi comuni da pulire": () => includesAny(text, ["androne", "garage", "scale", "pianerottoli", "cortile", "spazi comuni"]),
    "Gestione biancheria": () => includesAny(text, ["biancheria", "lenzuola", "asciugamani", "lavanderia"]),
    "Orari check-in/check-out": () => includesAny(text, ["check-in", "check in", "check-out", "check out", "ospiti"]),
    "Numero vetrate o finestre": () => /\b\d{1,3}\s?(vetri|vetrate|finestre|vetrine)\b/i.test(message),
    "Altezza o accessibilità": () => includesAny(text, ["alto", "altezza", "scala", "trabattello", "accessibile", "piano terra"]),
    "Interno/esterno": () => includesAny(text, ["interno", "interni", "esterno", "esterni"]),
    "Tipo di ambiente": () => includesAny(text, ["casa", "appartamento", "ufficio", "locale", "negozio", "studio", "condominio"]),
    "Motivo della sanificazione": () => includesAny(text, ["covid", "muffa", "odore", "animali", "igienizzare", "sanificare"]),
    "Tipo e numero di elementi": () => /\b\d{1,3}\s?(divani|divano|poltrone|poltrona|materassi|materasso|tappeti|tappeto)\b/i.test(message),
    "Materiale": () => includesAny(text, ["pelle", "tessuto", "microfibra", "stoffa", "alcantara"]),
    "Macchie o problemi specifici": () => includesAny(text, ["macchia", "macchie", "odore", "sporco", "animali", "urina"]),
    "Tipo di pulizia richiesta": () => includesAny(text, ["ordinaria", "straordinaria", "profonda", "post lavori", "dopo lavori"])
  };

  return checks[label]?.() || false;
}

function detectMissingFields(message, serviceRule) {
  const requiredDetails = serviceRule?.requiredDetails || [];
  const missing = requiredDetails.filter((label) => !hasDetail(message, label));

  return uniqueList(missing).slice(0, 7);
}

function detectSuggestedWorkflow(message, service, missingFields) {
  const text = normalizeText(message);

  if (asksForInspection(text)) {
    return {
      status: "Sopralluogo da fissare",
      nextAction: "Fissare sopralluogo"
    };
  }

  if (missingFields.length >= 3) {
    return {
      status: "Info richieste",
      nextAction: "Chiedere informazioni mancanti"
    };
  }

  if (missingFields.length > 0) {
    return {
      status: "Info richieste",
      nextAction: "Chiedere informazioni mancanti"
    };
  }

  if (asksForQuote(text)) {
    return {
      status: "Preventivo da preparare",
      nextAction: "Preparare preventivo"
    };
  }

  if (includesAny(text, ["mi fate sapere", "potete aiutarmi", "avrei bisogno", "mi servirebbe"])) {
    return {
      status: "Da rispondere",
      nextAction: "Rispondere al cliente"
    };
  }

  return {
    status: "Preventivo da preparare",
    nextAction: "Preparare preventivo"
  };
}

function extractSquareMeters(message) {
  const match = String(message || "").match(/\b(\d{1,5})\s?(mq|m2|m²|metri quadri|metri)\b/i);

  if (!match?.[1]) return 0;

  const value = Number(match[1]);

  return Number.isFinite(value) ? value : 0;
}

function detectEstimatedValue(serviceRule, message, urgency) {
  const baseValue = serviceRule?.baseValue || 160;
  const squareMeters = extractSquareMeters(message);

  let value = baseValue;

  if (squareMeters > 0) {
    if (squareMeters <= 60) value = Math.max(value, baseValue);
    if (squareMeters > 60 && squareMeters <= 120) value = Math.max(value, Math.round(baseValue * 1.25));
    if (squareMeters > 120) value = Math.max(value, Math.round(baseValue * 1.6));
  }

  if (urgency === "Alta") {
    value = Math.round(value * 1.1);
  }

  return value;
}

function buildSummary({ service, city, customerType, urgency, missingFields }) {
  const zoneText = city ? ` in zona ${city}` : "";
  const missingText =
    missingFields.length > 0
      ? ` Mancano ancora: ${missingFields.slice(0, 4).join(", ")}.`
      : " I dati principali sembrano sufficienti per una prima valutazione.";

  return `Richiesta ${customerType.toLowerCase()} per ${service.toLowerCase()}${zoneText}. Urgenza ${urgency.toLowerCase()}.${missingText}`;
}

function buildSuggestedReply({ service, city, missingFields, workflow }) {
  const zoneText = city ? ` in zona ${city}` : "";

  if (workflow.nextAction === "Fissare sopralluogo") {
    return `Buongiorno, grazie per averci contattato. Possiamo aiutarla per ${service.toLowerCase()}${zoneText}. Per valutare bene il lavoro possiamo fissare un sopralluogo: ci può indicare qualche disponibilità nei prossimi giorni?`;
  }

  if (missingFields.length > 0) {
    return `Buongiorno, grazie per averci contattato. Possiamo aiutarla per ${service.toLowerCase()}${zoneText}. Per preparare un preventivo più preciso avrei bisogno di queste informazioni: ${missingFields.join(", ")}. Se riesce, può inviarci anche qualche foto degli ambienti.`;
  }

  return `Buongiorno, grazie per averci contattato. Possiamo aiutarla per ${service.toLowerCase()}${zoneText}. Dai dati ricevuti possiamo preparare una prima valutazione: le facciamo sapere disponibilità e costo indicativo il prima possibile.`;
}

function calculateConfidence({ serviceConfidence, city, detectedDetails, missingFields }) {
  let confidence = serviceConfidence;

  if (city) confidence += 8;
  if (detectedDetails.length >= 3) confidence += 10;
  if (detectedDetails.length >= 5) confidence += 5;
  if (missingFields.length >= 5) confidence -= 10;
  if (missingFields.length <= 2) confidence += 8;

  return Math.max(35, Math.min(96, Math.round(confidence)));
}

export function analyzeLead(message) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const serviceResult = detectService(message);
      const customerType = detectCustomerType(message);
      const city = extractLocation(message);
      const urgency = detectUrgency(message);
      const detectedDetails = detectPresentDetails(message);
      const missingFields = detectMissingFields(message, serviceResult.rule);
      const workflow = detectSuggestedWorkflow(message, serviceResult.service, missingFields);
      const estimatedValue = detectEstimatedValue(serviceResult.rule, message, urgency);
      const customerName = extractCustomerName(message);
      const phone = extractPhone(message);
      const email = extractEmail(message);
      const confidence = calculateConfidence({
        serviceConfidence: serviceResult.confidence,
        city,
        detectedDetails,
        missingFields
      });

      resolve({
        summary: buildSummary({
          service: serviceResult.service,
          city,
          customerType,
          urgency,
          missingFields
        }),
        service_type: serviceResult.service,
        customer_type: customerType,
        city,
        urgency,
        detected_details: uniqueList(detectedDetails),
        missing_fields: missingFields,
        suggested_status: workflow.status,
        next_action: workflow.nextAction,
        suggested_reply: buildSuggestedReply({
          service: serviceResult.service,
          city,
          missingFields,
          workflow
        }),
        estimated_value: estimatedValue,
        confidence,
        customer_name: customerName,
        phone,
        email
      });
    }, 450);
  });
}