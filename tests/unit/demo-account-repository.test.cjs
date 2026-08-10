const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const {
  createDemoAccountRepository,
  DEFAULT_DEMO_ACCOUNT
} = require(path.join(buildDir, "repositories", "demoAccountRepository.js"));

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

test("demo parte da un account sintetico completo", () => {
  const repository = createDemoAccountRepository(memoryStorage());
  const account = repository.getAccount();

  assert.equal(account.profile.role, "owner");
  assert.equal(account.organization.name, DEFAULT_DEMO_ACCOUNT.organization.name);
});

test("demo salva le impostazioni usando la stessa validazione account", () => {
  const repository = createDemoAccountRepository(memoryStorage());
  const account = repository.updateAccount({
    organizationId: "demo-organization",
    profile: {
      fullName: "Operatore Demo",
      notificationEnabled: true,
      notificationMinutesBefore: 0
    },
    organization: {
      name: "Demo Aggiornata",
      sector: "Pulizie",
      city: "Potenza",
      phone: "",
      email: "",
      address: ""
    }
  });

  assert.equal(account.profile.notificationMinutesBefore, 0);
  assert.equal(repository.getAccount().organization.name, "Demo Aggiornata");
});
