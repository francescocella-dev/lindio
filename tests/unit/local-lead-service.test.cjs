const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const { createLead, updateLead } = require(path.join(buildDir, "application", "localLeadService.js"));

function draft(overrides = {}) {
  return {
    customerName: "Cliente locale",
    phone: "",
    email: "",
    source: "Telefono",
    serviceType: "Pulizia ufficio",
    city: "Potenza",
    address: "",
    urgency: "Media",
    status: "Nuova",
    nextAction: "Rispondere al cliente",
    followUpAt: "2026-08-11T10:00",
    estimatedValue: 100,
    rawMessage: "Telefonata ricevuta",
    aiSummary: "",
    aiSuggestedReply: "",
    ...overrides
  };
}

test("createLead usa il dominio validato e aggiunge la nota iniziale", () => {
  const lead = createLead(draft({ customerName: "  Cliente locale  " }));

  assert.match(lead.id, /^lead-/);
  assert.equal(lead.version, 1);
  assert.equal(lead.customerName, "Cliente locale");
  assert.equal(lead.notes[0].text, "Richiesta creata");
});

test("createLead non permette alla modalità locale di bypassare la validazione", () => {
  assert.throws(
    () => createLead(draft({ estimatedValue: -1 })),
    /maggiore o uguale a zero/i
  );
});

test("updateLead conserva identità e data di creazione", () => {
  const original = createLead(draft());
  const updated = updateLead([original], {
    ...original,
    status: "In attesa",
    nextAction: "Attendere riscontro"
  })[0];

  assert.equal(updated.id, original.id);
  assert.equal(updated.createdAt, original.createdAt);
  assert.equal(updated.version, 2);
  assert.equal(updated.status, "In attesa");
});
