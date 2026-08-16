const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const {
  ApplicationError,
  toApplicationError
} = require(path.join(buildDir, "application", "applicationError.js"));
const {
  DomainValidationError
} = require(path.join(buildDir, "domain", "validation.js"));

test("toApplicationError preserva gli errori applicativi tipizzati", () => {
  const original = new ApplicationError("CONFLICT", "Conflitto", { retryable: true });
  const result = toApplicationError(original);

  assert.equal(result, original);
  assert.equal(result.code, "CONFLICT");
  assert.equal(result.retryable, true);
});

test("toApplicationError traduce gli errori di validazione del dominio", () => {
  const domainError = new DomainValidationError("Input invalido", [
    { path: "email", code: "invalid_email", message: "Email non valida" }
  ]);

  const result = toApplicationError(domainError);

  assert.equal(result.code, "VALIDATION");
  assert.equal(result.message, "Email non valida");
});
