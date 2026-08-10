const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const { validateLeadDraft, parseLeadDraft } = require(path.join(buildDir, "domain", "leadValidation.js"));
const { DomainValidationError } = require(path.join(buildDir, "domain", "validation.js"));

function validLead(overrides = {}) {
  return {
    customerName: "Mario Rossi",
    phone: "3331234567",
    email: "mario@example.com",
    source: "WhatsApp",
    serviceType: "Pulizia appartamento",
    city: "Potenza",
    address: "",
    urgency: "Media",
    status: "Nuova",
    nextAction: "Rispondere al cliente",
    followUpAt: "2026-08-11T10:00",
    estimatedValue: 250,
    rawMessage: "Richiesta ricevuta via WhatsApp",
    aiSummary: "",
    aiSuggestedReply: "",
    ...overrides
  };
}

test("normalizza i campi testuali mantenendo il contratto dominio", () => {
  const result = validateLeadDraft(validLead({ customerName: "  Mario Rossi  ", city: "  Potenza " }));

  assert.equal(result.success, true);
  assert.equal(result.data.customerName, "Mario Rossi");
  assert.equal(result.data.city, "Potenza");
  assert.equal(result.data.estimatedValue, 250);
});

test("richiede almeno nome cliente o messaggio", () => {
  const result = validateLeadDraft(validLead({ customerName: "", rawMessage: "" }));

  assert.equal(result.success, false);
  assert.equal(result.issues[0].code, "required");
});

test("rifiuta enum non appartenenti al dominio", () => {
  const result = validateLeadDraft(validLead({ status: "Inventato", urgency: "Urgentissima" }));

  assert.equal(result.success, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path).sort(),
    ["status", "urgency"]
  );
});

test("rifiuta valore stimato negativo e follow-up non valido", () => {
  const result = validateLeadDraft(validLead({ estimatedValue: -10, followUpAt: "domani mattina" }));

  assert.equal(result.success, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path).sort(),
    ["estimatedValue", "followUpAt"]
  );
});

test("parseLeadDraft espone un errore strutturato e leggibile", () => {
  assert.throws(
    () => parseLeadDraft(validLead({ email: "email-non-valida" })),
    (error) => {
      assert.equal(error instanceof DomainValidationError, true);
      assert.equal(error.issues[0].path, "email");
      assert.match(error.message, /email/i);
      return true;
    }
  );
});
