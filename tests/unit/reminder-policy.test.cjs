const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const {
  buildLeadReminderPath,
  getReminderDecision,
  getReminderId,
  getReminderMinutesBefore
} = require(path.join(buildDir, "domain", "reminderPolicy.js"));

const NOW = new Date("2026-08-17T10:00:00+02:00");

function lead(overrides = {}) {
  return {
    id: "lead-123",
    status: "Da rispondere",
    followUpAt: "2026-08-17T10:30:00+02:00",
    ...overrides
  };
}

test("normalizza preferenze reminder fuori contratto al default", () => {
  assert.equal(getReminderMinutesBefore({ notificationMinutesBefore: -1 }), 30);
  assert.equal(getReminderMinutesBefore({ notificationMinutesBefore: 1441 }), 30);
  assert.equal(getReminderMinutesBefore({ notificationMinutesBefore: 15.5 }), 30);
  assert.equal(getReminderMinutesBefore({ notificationMinutesBefore: 60 }), 60);
});

test("una richiesta senza follow-up non entra nel controllo reminder", () => {
  const decision = getReminderDecision(lead({ followUpAt: "" }), { notificationMinutesBefore: 30 }, NOW);

  assert.equal(decision.considered, false);
  assert.equal(decision.shouldNotify, false);
  assert.equal(decision.reason, "no-follow-up");
});

test("una richiesta finale non genera reminder", () => {
  const decision = getReminderDecision(lead({ status: "Vinta" }), { notificationMinutesBefore: 30 }, NOW);

  assert.equal(decision.considered, false);
  assert.equal(decision.shouldNotify, false);
  assert.equal(decision.reason, "final-lead");
});

test("un follow-up non valido viene ignorato in modo deterministico", () => {
  const decision = getReminderDecision(lead({ followUpAt: "not-a-date" }), { notificationMinutesBefore: 30 }, NOW);

  assert.equal(decision.considered, true);
  assert.equal(decision.shouldNotify, false);
  assert.equal(decision.reason, "invalid-follow-up");
});

test("il reminder scatta quando entra nella finestra configurata", () => {
  const decision = getReminderDecision(lead(), { notificationMinutesBefore: 30 }, NOW);

  assert.equal(decision.shouldNotify, true);
  assert.equal(decision.reason, "due");
});

test("il reminder non scatta prima della finestra configurata", () => {
  const decision = getReminderDecision(
    lead({ followUpAt: "2026-08-17T10:31:00+02:00" }),
    { notificationMinutesBefore: 30 },
    NOW
  );

  assert.equal(decision.shouldNotify, false);
  assert.equal(decision.reason, "too-early");
});

test("alla scadenza non anticipa la notifica", () => {
  const before = getReminderDecision(
    lead({ followUpAt: "2026-08-17T10:01:00+02:00" }),
    { notificationMinutesBefore: 0 },
    NOW
  );
  const due = getReminderDecision(
    lead({ followUpAt: "2026-08-17T10:00:00+02:00" }),
    { notificationMinutesBefore: 0 },
    NOW
  );

  assert.equal(before.reason, "too-early");
  assert.equal(due.reason, "due");
  assert.equal(due.shouldNotify, true);
});

test("un reminder oltre la tolleranza di dieci minuti non viene recuperato", () => {
  const decision = getReminderDecision(
    lead({ followUpAt: "2026-08-17T09:49:59+02:00" }),
    { notificationMinutesBefore: 30 },
    NOW
  );

  assert.equal(decision.shouldNotify, false);
  assert.equal(decision.reason, "too-late");
});

test("la deduplicazione usa lead e follow-up e blocca il secondo invio", () => {
  const item = lead();
  const reminderId = getReminderId(item);
  const decision = getReminderDecision(
    item,
    { notificationMinutesBefore: 30 },
    NOW,
    { [reminderId]: "2026-08-17T09:59:00.000Z" }
  );

  assert.equal(decision.shouldNotify, false);
  assert.equal(decision.reason, "already-sent");
});

test("il deep-link reminder codifica l'id e ha un fallback sicuro", () => {
  assert.equal(buildLeadReminderPath("lead/with spaces"), "/leads/lead%2Fwith%20spaces");
  assert.equal(buildLeadReminderPath("  "), "/today");
});
