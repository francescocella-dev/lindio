const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const {
  analyzeIntakeDeterministically
} = require(path.join(buildDir, "application", "deterministicIntakeAnalyzer.js"));

test("analyzer riconosce una richiesta ricca senza esporre una percentuale", () => {
  const result = analyzeIntakeDeterministically({
    message: "Mi chiamo Mario Rossi. Ho un appartamento arredato di 90 mq a Roma, secondo piano con ascensore, dopo lavori. Ho foto e mi servirebbe domani. Potete farmi un preventivo?"
  });

  assert.equal(result.serviceType, "Pulizia post-ristrutturazione");
  assert.match(result.city, /Roma/);
  assert.equal(result.urgency, "Alta");
  assert.equal(result.customerName, "Mario Rossi");
  assert.ok(result.estimatedValue > 0);
  assert.equal(result.analyzer.privacy, "local");
  assert.equal("confidence" in result, false);
  assert.ok(["medium", "high"].includes(result.assessment.level));
});

test("analyzer non inventa servizio e prezzo quando non trova evidenza", () => {
  const result = analyzeIntakeDeterministically({
    message: "Ciao, avrei bisogno di un aiuto. Mi fate sapere quando potete?"
  });

  assert.equal(result.serviceType, "");
  assert.equal(result.customerType, "Non determinato");
  assert.equal(result.estimatedValue, 0);
  assert.equal(result.assessment.level, "low");
  assert.equal(result.suggestedStatus, "Da rispondere");
  assert.match(result.summary, /servizio da determinare/i);
});

test("analyzer segnala un servizio ambiguo invece di scegliere in modo arbitrario", () => {
  const result = analyzeIntakeDeterministically({
    message: "Vorrei pulire una vetrina a Potenza e sapere il prezzo."
  });

  assert.equal(result.serviceType, "");
  assert.equal(result.estimatedValue, 0);
  assert.ok(result.assessment.signals.some((signal) => signal.code === "service-ambiguous"));
});

test("analyzer riconosce dettagli operativi per gli uffici", () => {
  const result = analyzeIntakeDeterministically({
    message: "Pulizia ufficio di 100 mq con 8 postazioni a Matera, due volte a settimana alle 19."
  });

  assert.equal(result.serviceType, "Pulizia uffici");
  assert.match(result.city, /Matera/);
  assert.equal(result.missingFields.includes("Numero stanze o postazioni"), false);
  assert.equal(result.missingFields.includes("Frequenza richiesta"), false);
  assert.equal(result.missingFields.includes("Orario preferito"), false);
});

test("analyzer rende esplicito che il valore è una regola orientativa", () => {
  const result = analyzeIntakeDeterministically({
    message: "Pulizia appartamento di 70 mq a Potenza, 3 stanze, pulizia profonda venerdì."
  });

  assert.ok(result.estimatedValue > 0);
  assert.ok(result.assessment.signals.some((signal) => signal.code === "rule-based-value"));
});

test("analyzer è deterministico a parità di input", () => {
  const input = {
    message: "Sanificazione ufficio di 80 mq a Roma per muffa, domani."
  };

  assert.deepEqual(
    analyzeIntakeDeterministically(input),
    analyzeIntakeDeterministically(input)
  );
});

test("analyzer rifiuta input vuoto prima di eseguire le regole", () => {
  assert.throws(
    () => analyzeIntakeDeterministically({ message: "" }),
    /messaggio/i
  );
});
