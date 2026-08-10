const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const { validateAccountBootstrap, validateAccountUpdate } = require(path.join(buildDir, "domain", "accountValidation.js"));

function validAccount(overrides = {}) {
  return {
    organizationId: "11111111-1111-1111-1111-111111111111",
    profile: {
      fullName: "Francesco",
      notificationEnabled: true,
      notificationMinutesBefore: 30
    },
    organization: {
      name: "Impresa Demo",
      sector: "Pulizie",
      city: "Potenza",
      phone: "",
      email: "info@example.com",
      address: ""
    },
    ...overrides
  };
}

test("normalizza account valido", () => {
  const result = validateAccountUpdate(validAccount());

  assert.equal(result.success, true);
  assert.equal(result.data.profile.notificationMinutesBefore, 30);
  assert.equal(result.data.organization.name, "Impresa Demo");
});

test("accetta promemoria esattamente alla scadenza", () => {
  const input = validAccount();
  input.profile.notificationMinutesBefore = 0;

  const result = validateAccountUpdate(input);
  assert.equal(result.success, true);
  assert.equal(result.data.profile.notificationMinutesBefore, 0);
});

test("rifiuta preavviso fuori dai vincoli PostgreSQL", () => {
  const input = validAccount();
  input.profile.notificationMinutesBefore = -1;

  const result = validateAccountUpdate(input);
  assert.equal(result.success, false);
  assert.equal(result.issues[0].path, "profile.notificationMinutesBefore");
});

test("rifiuta email aziendale non valida", () => {
  const input = validAccount();
  input.organization.email = "non-email";

  const result = validateAccountUpdate(input);
  assert.equal(result.success, false);
  assert.equal(result.issues[0].path, "organization.email");
});

test("valida i dati minimi di onboarding", () => {
  const result = validateAccountBootstrap({
    fullName: " Francesco ",
    organizationName: " Impresa Cella ",
    sector: " Pulizie ",
    city: " Potenza "
  });

  assert.equal(result.success, true);
  assert.equal(result.data.fullName, "Francesco");
  assert.equal(result.data.organizationName, "Impresa Cella");
});
