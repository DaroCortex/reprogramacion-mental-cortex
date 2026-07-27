import assert from "node:assert/strict";
import { mergeStudentsFromSnapshot } from "../lib/r2.js";

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

const audioMergedAfterSession = mergeStudentsFromSnapshot(
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

const sessionMergedAfterAudio = mergeStudentsFromSnapshot(
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

const deleted = mergeStudentsFromSnapshot(
  [...baseline, { slug: "eliminado", email: "old@example.com" }],
  baseline,
  [...concurrentSessionUpdate, { slug: "eliminado", email: "old@example.com" }]
);
assert.equal(deleted.some((student) => student.slug === "eliminado"), false);

console.log("students concurrency merge: ok");
