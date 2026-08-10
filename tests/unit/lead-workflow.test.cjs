const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const {
  normalizeLeadStatusValue,
  isFinalLeadStatusValue,
  LEAD_STATUSES,
  NEXT_ACTIONS
} = require(path.join(buildDir, "domain", "lead.js"));
const {
  getStatusWorkflowGuide,
  getSuggestedFollowUpForStatus
} = require(path.join(buildDir, "domain", "leadWorkflow.js"));

test("mantiene compatibilità con lo stato legacy Follow-up", () => {
  assert.equal(normalizeLeadStatusValue("Follow-up"), "In attesa");
});

test("riconosce soltanto Vinta e Persa come stati finali", () => {
  assert.equal(isFinalLeadStatusValue("Vinta"), true);
  assert.equal(isFinalLeadStatusValue("Persa"), true);
  assert.equal(isFinalLeadStatusValue("Preventivo inviato"), false);
});

test("ogni stato espone una guida con azione appartenente al dominio", () => {
  for (const status of LEAD_STATUSES) {
    const guide = getStatusWorkflowGuide(status);
    assert.equal(NEXT_ACTIONS.includes(guide.suggestedAction), true);
    assert.ok(guide.title.length > 0);
  }
});

test("gli stati finali non generano follow-up", () => {
  assert.equal(getSuggestedFollowUpForStatus("Vinta"), "");
  assert.equal(getSuggestedFollowUpForStatus("Persa"), "");
});
