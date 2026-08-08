import assert from "node:assert/strict";
import { mergeStudentsFromSnapshot } from "../lib/r2.js";

const jsonClone = (value) => JSON.parse(JSON.stringify(value));
const mergeAfterSerialization = (baseline, desired, latest) =>
  mergeStudentsFromSnapshot(
    jsonClone(baseline),
    jsonClone(desired),
    jsonClone(latest)
  );

const baseline = [
  {
    slug: "alumno",
    email: "alumno@example.com",
    updatedAt: "2026-07-27T18:24:07.000Z",
    audioWorkflow: {
      beginnerAudioKey: "beginner-v1.mp3",
      beginnerAltAudioKey: "beginner-alt-v1.mp3"
    },
    auth: {
      sessions: [
        {
          tokenHash: "session-a",
          lastUsedAt: "2026-07-27T18:23:30.000Z"
        }
      ]
    }
  }
];

const audioUpdate = [
  {
    ...baseline[0],
    updatedAt: "2026-07-27T18:24:12.130Z",
    audioWorkflow: {
      ...baseline[0].audioWorkflow,
      beginnerAltAudioKey: "beginner-alt-v2.mp3"
    }
  }
];

const concurrentSessionUpdate = [
  {
    ...baseline[0],
    updatedAt: "2026-07-27T18:24:12.273Z",
    auth: {
      sessions: [
        {
          tokenHash: "session-a",
          lastUsedAt: "2026-07-27T18:24:12.273Z"
        }
      ]
    }
  }
];

const audioMergedAfterSession = mergeAfterSerialization(
  baseline,
  audioUpdate,
  concurrentSessionUpdate
);
assert.equal(
  audioMergedAfterSession[0].audioWorkflow.beginnerAltAudioKey,
  "beginner-alt-v2.mp3"
);
assert.equal(
  audioMergedAfterSession[0].auth.sessions[0].lastUsedAt,
  "2026-07-27T18:24:12.273Z"
);
assert.equal(audioMergedAfterSession[0].updatedAt, "2026-07-27T18:24:12.273Z");

const sessionMergedAfterAudio = mergeAfterSerialization(
  baseline,
  concurrentSessionUpdate,
  audioUpdate
);
assert.equal(
  sessionMergedAfterAudio[0].audioWorkflow.beginnerAltAudioKey,
  "beginner-alt-v2.mp3"
);
assert.equal(
  sessionMergedAfterAudio[0].auth.sessions[0].lastUsedAt,
  "2026-07-27T18:24:12.273Z"
);
assert.equal(sessionMergedAfterAudio[0].updatedAt, "2026-07-27T18:24:12.273Z");

const deleted = mergeAfterSerialization(
  [...baseline, { slug: "eliminado", email: "old@example.com" }],
  baseline,
  [...concurrentSessionUpdate, { slug: "eliminado", email: "old@example.com" }]
);
assert.equal(deleted.some((student) => student.slug === "eliminado"), false);

const previousBreathingSession = {
  sessionType: "breathing",
  date: "2026-08-07",
  completedAt: "2026-08-07T11:12:53.390Z",
  apneaByRound: [137, 144, 138, 151, 155]
};
const latestBreathingSession = {
  sessionType: "breathing",
  date: "2026-08-08",
  completedAt: "2026-08-08T11:07:34.070Z",
  apneaByRound: [126, 130, 142]
};
const breathingBaseline = [
  {
    slug: "romina",
    usage: {
      lastActivityAt: previousBreathingSession.completedAt,
      practiceActivityByDay: { "2026-08-07": 1 },
      lastSession: previousBreathingSession,
      recentSessions: [previousBreathingSession],
      apneaByDay: {
        "2026-08-07": {
          sessions: 1,
          times: previousBreathingSession.apneaByRound,
          lastAt: previousBreathingSession.completedAt
        }
      }
    }
  }
];
const staleActivityUpdate = jsonClone(breathingBaseline);
staleActivityUpdate[0].usage.lastActivityAt = latestBreathingSession.completedAt;
staleActivityUpdate[0].usage.practiceActivityByDay["2026-08-08"] = 1;
const latestBreathingUpdate = jsonClone(breathingBaseline);
latestBreathingUpdate[0].usage.lastSession = latestBreathingSession;
latestBreathingUpdate[0].usage.recentSessions = [
  latestBreathingSession,
  previousBreathingSession
];
latestBreathingUpdate[0].usage.apneaByDay["2026-08-08"] = {
  sessions: 1,
  times: latestBreathingSession.apneaByRound,
  lastAt: latestBreathingSession.completedAt
};

const breathingMergedAfterStaleActivity = mergeAfterSerialization(
  breathingBaseline,
  staleActivityUpdate,
  latestBreathingUpdate
);
assert.deepEqual(
  breathingMergedAfterStaleActivity[0].usage.recentSessions,
  latestBreathingUpdate[0].usage.recentSessions,
  "an unrelated stale write must preserve the latest session history"
);
assert.deepEqual(
  breathingMergedAfterStaleActivity[0].usage.lastSession,
  latestBreathingSession,
  "an unrelated stale write must preserve the complete latest session"
);
assert.deepEqual(
  breathingMergedAfterStaleActivity[0].usage.apneaByDay["2026-08-08"].times,
  [126, 130, 142],
  "the server apnea summary must remain aligned with the latest session"
);

console.log("students concurrency merge: ok");
