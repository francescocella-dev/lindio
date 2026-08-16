const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const {
  parseIntakeAnalysisInput,
  parseIntakeAnalysisResult
} = require(path.join(buildDir, "domain", "intakeAnalysis.js"));

function validResult(overrides = {}) {
  return {
    schemaVersion: 1,
    analyzer: {
      kind: "deterministic",
      version: "deterministic-rules-v1",
      privacy: "local"
    },
    summary: "Richiesta per pulizia appartamento.",
    serviceType: "Pulizia appartamento",
    customerType: "Privato",
    city: "Potenza",
    urgency: "Media",
    detectedDetails: ["Zona o indirizzo indicato"],
    missingFields: ["Metri quadri"],
    suggestedStatus: "Info richieste",
    nextAction: "Chiedere informazioni mancanti",
    suggestedReply: "Buongiorno, ci servono alcune informazioni.",
    estimatedValue: 160,
    customerName: "",
    phone: "",
    email: "",
    assessment: {
      level: "medium",
      signals: [
        {
          code: "service-recognized",
          tone: "positive",
          label: "Servizio riconosciuto"
        }
      ]
    },
    ...overrides
  };
}

test("contratto analyzer normalizza il messaggio in input", () => {
  assert.deepEqual(
    parseIntakeAnalysisInput({ message: "  Pulizia ufficio a Potenza  " }),
    { message: "Pulizia ufficio a Potenza" }
  );
});

test("contratto analyzer rifiuta messaggi vuoti", () => {
  assert.throws(
    () => parseIntakeAnalysisInput({ message: "   " }),
    /messaggio/i
  );
});

test("contratto analyzer accetta un risultato coerente", () => {
  const result = parseIntakeAnalysisResult(validResult());

  assert.equal(result.analyzer.kind, "deterministic");
  assert.equal(result.analyzer.privacy, "local");
  assert.equal(result.assessment.level, "medium");
});

test("contratto analyzer rifiuta output con stato fuori dominio", () => {
  assert.throws(
    () => parseIntakeAnalysisResult(validResult({ suggestedStatus: "Chiusissima" })),
    /stato suggerito/i
  );
});
