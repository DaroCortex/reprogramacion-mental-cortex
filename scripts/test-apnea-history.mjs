import assert from "node:assert/strict";
import {
  areEquivalentApneaSessions,
  filterUnsyncedLocalApneaSessions
} from "../lib/apnea-history.js";

const serverSession = {
  date: "2026-08-04",
  startedAt: "2026-08-04T06:35:22.637Z",
  completedAt: "2026-08-04T07:03:07.851Z",
  apneaByRound: [172, 190, 197, 227, 242]
};

const synchronizedLocalSession = {
  date: "2026-08-04",
  completedAt: "2026-08-04T07:03:08.114Z",
  apneaByRound: [172, 190, 197, 227, 242]
};

assert.equal(
  areEquivalentApneaSessions(synchronizedLocalSession, serverSession),
  true,
  "the same synchronized session must be recognized"
);
assert.deepEqual(
  filterUnsyncedLocalApneaSessions([synchronizedLocalSession], [serverSession]),
  [],
  "a synchronized local session must not duplicate the five server apneas"
);

const pendingLocalSession = {
  date: "2026-08-04",
  completedAt: "2026-08-04T08:15:00.000Z",
  apneaByRound: [180, 200, 210, 230, 250]
};
assert.deepEqual(
  filterUnsyncedLocalApneaSessions([pendingLocalSession], [serverSession]),
  [pendingLocalSession],
  "a genuinely pending local session must remain visible"
);

const sameRoundsMuchLater = {
  date: "2026-08-04",
  completedAt: "2026-08-04T12:03:07.851Z",
  apneaByRound: [172, 190, 197, 227, 242]
};
assert.equal(
  areEquivalentApneaSessions(sameRoundsMuchLater, serverSession),
  false,
  "two distinct sessions with the same round values must not be collapsed"
);

console.log("apnea history tests passed");
