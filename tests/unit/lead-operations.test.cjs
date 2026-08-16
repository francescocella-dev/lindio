const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.LINDIO_TEST_BUILD_DIR;
const {
  compareActiveLeadPriority,
  isFollowUpDueSoon,
  isFollowUpOverdue,
  isFollowUpToday,
  isOpenLead
} = require(path.join(buildDir, "domain", "leadOperations.js"));

const now = new Date("2026-08-10T15:00:00+02:00");

function lead(overrides = {}) {
  return {
    status: "Da rispondere",
    followUpAt: "2026-08-10T10:00:00+02:00",
    createdAt: "2026-08-09T10:00:00+02:00",
    ...overrides
  };
}

test("un follow-up di oggi resta nella categoria oggi anche se l'orario è passato", () => {
  const item = lead();

  assert.equal(isFollowUpToday(item.followUpAt, item.status, now), true);
  assert.equal(isFollowUpOverdue(item.followUpAt, item.status, now), false);
});

test("un follow-up di ieri è scaduto", () => {
  const item = lead({ followUpAt: "2026-08-09T18:00:00+02:00" });

  assert.equal(isFollowUpOverdue(item.followUpAt, item.status, now), true);
});

test("le richieste finali non generano scadenze operative", () => {
  const item = lead({ status: "Vinta", followUpAt: "2026-08-09T18:00:00+02:00" });

  assert.equal(isOpenLead(item), false);
  assert.equal(isFollowUpOverdue(item.followUpAt, item.status, now), false);
  assert.equal(isFollowUpToday(item.followUpAt, item.status, now), false);
});

test("dueSoon usa la stessa semantica locale e ignora le richieste chiuse", () => {
  assert.equal(
    isFollowUpDueSoon("2026-08-12T14:00:00+02:00", "In attesa", now, 2),
    true
  );
  assert.equal(
    isFollowUpDueSoon("2026-08-12T14:00:00+02:00", "Persa", now, 2),
    false
  );
});

test("l'ordinamento operativo mette prima scadute, poi oggi, poi future", () => {
  const items = [
    lead({ followUpAt: "2026-08-11T09:00:00+02:00" }),
    lead({ followUpAt: "2026-08-10T16:00:00+02:00" }),
    lead({ followUpAt: "2026-08-09T16:00:00+02:00" })
  ];

  const sorted = [...items].sort((a, b) => compareActiveLeadPriority(a, b, now));

  assert.equal(sorted[0].followUpAt, "2026-08-09T16:00:00+02:00");
  assert.equal(sorted[1].followUpAt, "2026-08-10T16:00:00+02:00");
  assert.equal(sorted[2].followUpAt, "2026-08-11T09:00:00+02:00");
});
