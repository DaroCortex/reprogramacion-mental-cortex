import assert from "node:assert/strict";
import {
  selectActiveDailyTemplates,
  shouldSkipDailyPrecheck
} from "../src/daily-precheck.js";

const templates = [
  { id: "plan-1", text: "Respirar" },
  { id: "custom-1", text: "Caminar" }
];

assert.deepEqual(
  selectActiveDailyTemplates(templates, null),
  templates,
  "without an explicit active list all server templates remain available"
);
assert.deepEqual(
  selectActiveDailyTemplates(templates, ["custom-1"]),
  [templates[1]],
  "the precheck must honor the active template list"
);
assert.deepEqual(
  selectActiveDailyTemplates(templates, []),
  [],
  "an explicit empty active list means that the student has no goals"
);
assert.equal(shouldSkipDailyPrecheck([]), true);
assert.equal(shouldSkipDailyPrecheck([templates[0]]), false);

console.log("daily precheck tests passed");
