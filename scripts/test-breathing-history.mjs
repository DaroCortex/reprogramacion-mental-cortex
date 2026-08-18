import assert from "node:assert/strict";
import handler from "../api/integrations/student-breathing-history.js";
import { buildBreathingHistory } from "../lib/breathing-history.js";

const invokeHandler = async (req) => {
  const response = { statusCode: 200, payload: null };
  const res = {
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(payload) {
      response.payload = payload;
      return this;
    }
  };
  await handler(req, res);
  return response;
};

const history = buildBreathingHistory(
  {
    totalSessions: 4,
    totalRounds: 10,
    totalBreaths: 410,
    firstSessionAt: "2026-08-01T12:00:00.000Z",
    lastSessionAt: "2026-08-18T12:00:00.000Z",
    lastActivityAt: "2026-08-18T12:00:00.000Z",
    sessionsByDay: {
      "2026-08-01": 2,
      "2026-08-13": 1,
      "2026-08-18": 1
    },
    apneaRoundSums: [120, 180, 240],
    apneaRoundCounts: [2, 2, 2],
    apneaByDay: {
      "2026-08-18": { sessions: 1, times: [55, 80, 120], best: 120 }
    },
    recentSessions: [
      {
        sessionType: "breathing",
        completedAt: "2026-08-18T12:00:00.000Z",
        date: "2026-08-18",
        durationSeconds: 1500,
        completedRounds: 3,
        plannedRounds: 3,
        breathsDoneTotal: 120,
        apneaByRound: [55, 80, 120]
      },
      {
        sessionType: "color-vision",
        completedAt: "2026-08-17T12:00:00.000Z",
        durationSeconds: 30,
        colorVision: { hits: 10 }
      }
    ]
  },
  new Date("2026-08-18T15:00:00.000Z")
);

assert.equal(history.totalSessions, 4);
assert.equal(history.activeDays, 3);
assert.equal(history.sessionsLast7Days, 2);
assert.equal(history.sessionsLast30Days, 4);
assert.equal(history.apneaCount, 3);
assert.equal(history.averageApneaSeconds, 85);
assert.equal(history.bestApneaSeconds, 120);
assert.equal(history.recentSessions.length, 1);
assert.deepEqual(history.recentSessions[0].apneaByRound, [55, 80, 120]);

const previousIntegrationKey = process.env.RM_USAGE_INTEGRATION_KEY;
delete process.env.RM_USAGE_INTEGRATION_KEY;
const missingConfig = await invokeHandler({ method: "POST", headers: {}, body: { slug: "test" } });
assert.equal(missingConfig.statusCode, 503);

process.env.RM_USAGE_INTEGRATION_KEY = "integration-test-key";
const unauthorized = await invokeHandler({
  method: "POST",
  headers: { authorization: "Bearer wrong-key" },
  body: { slug: "test" }
});
assert.equal(unauthorized.statusCode, 401);

if (previousIntegrationKey === undefined) delete process.env.RM_USAGE_INTEGRATION_KEY;
else process.env.RM_USAGE_INTEGRATION_KEY = previousIntegrationKey;

console.log("breathing history contract: ok");
