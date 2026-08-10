const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const {
  validatePasswordResetRequest,
  validateSignUp
} = require(path.join(buildDir, "domain", "authValidation.js"));

test("normalizza registrazione valida", () => {
  const result = validateSignUp({
    fullName: " Francesco Cella ",
    email: " FRANCESCO@EXAMPLE.COM ",
    password: "password-sicura"
  });

  assert.equal(result.success, true);
  assert.equal(result.data.fullName, "Francesco Cella");
  assert.equal(result.data.email, "francesco@example.com");
});

test("rifiuta password troppo corta in registrazione", () => {
  const result = validateSignUp({
    fullName: "Francesco",
    email: "francesco@example.com",
    password: "corta"
  });

  assert.equal(result.success, false);
  assert.equal(result.issues[0].path, "password");
});

test("valida richiesta di recupero password", () => {
  const result = validatePasswordResetRequest({
    email: "utente@example.com",
    redirectTo: "http://localhost:5173/reset-password"
  });

  assert.equal(result.success, true);
});
