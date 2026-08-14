import assert from "node:assert/strict";
import {
  isTemplateActive,
  removeTemplateFromFutureRoutine
} from "../src/modules/daily/daily-routine.js";

const templateId = "task-a";
const today = "2026-08-14";
const original = {
  days: {
    "2026-08-13": { items: [{ id: "past-a", templateId, status: "done" }] },
    [today]: { items: [{ id: "today-a", templateId, status: "done" }] },
    "2026-08-15": { items: [{ id: "future-a", templateId, status: "pending" }] }
  },
  activeTemplateIds: null
};

const updated = removeTemplateFromFutureRoutine({
  store: original,
  templateId,
  effectiveAfterKey: today,
  knownTemplateIds: [templateId, "task-b"]
});

assert.equal(updated.days["2026-08-13"].items.length, 1);
assert.equal(updated.days[today].items.length, 1);
assert.equal(updated.days["2026-08-15"].items.length, 0);
assert.deepEqual(updated.activeTemplateIds, ["task-b"]);
assert.equal(isTemplateActive(updated, templateId), false);
assert.equal(isTemplateActive(updated, "task-b"), true);
assert.deepEqual(original.activeTemplateIds, null);
assert.equal(original.days["2026-08-15"].items.length, 1);

console.log("daily routine tests passed");
