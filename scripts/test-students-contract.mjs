import assert from "node:assert/strict";
import { buildPublicStudentsPayload } from "../api/students.js";

const payload = buildPublicStudentsPayload(
  [
    {
      name: "Gabriela Test",
      slug: "gabriela-test",
      email: "private@example.com",
      token: "private-token",
      features: {
        beginnerReprogrammingEnabled: true,
        advancedPlaybackProfile: "continuous_voice_v1"
      },
      audioWorkflow: {
        status: "approved",
        beginnerAudioKey: "students/gabriela-test/beginner.mp3",
        editorAudioKey: "students/gabriela-test/advanced.mp3",
        approvedAt: "2026-07-21T12:00:00.000Z"
      }
    }
  ],
  { magicUnlockScore: 7, channelingEnabled: true }
);

assert.ok(Array.isArray(payload.students));
assert.equal(payload.students.length, 1);
assert.equal(payload.students[0].slug, "gabriela-test");
assert.equal(payload.students[0].audioReady, true);
assert.equal(payload.students[0].email, undefined);
assert.equal(payload.students[0].token, undefined);
assert.deepEqual(payload.students[0].advancedPlayback, {
  profile: "continuous_voice_v1",
  continuousVoiceEnabled: true,
  breathingVolumeMultiplier: 0.4,
  recoveryVolumeMultiplier: 0.4,
  apneaVolumeMultiplier: 1,
  transitionSeconds: 0.8
});
assert.deepEqual(payload.settings, { magicUnlockScore: 7, channelingEnabled: true });

console.log("students public contract tests: ok");
