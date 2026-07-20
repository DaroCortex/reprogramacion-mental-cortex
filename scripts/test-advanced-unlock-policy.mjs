import assert from "node:assert/strict";
import {
  ADVANCED_UNLOCK_POLICIES,
  getAdvancedAccessInfo,
  hasApprovedAdvancedAudio
} from "../lib/beginner-progress.js";
import { buildMobileAudio } from "../api/students.js";
import { buildReport, classifyStudent } from "../api/admin/migrate-advanced-access.js";

const completedByDay = (days) => Object.fromEntries(
  Array.from({ length: days }, (_, index) => [
    `2026-07-${String(index + 1).padStart(2, "0")}`,
    { completedAt: `2026-07-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`, count: 1, kind: "beginner" }
  ])
);

const makeStudent = ({ policy, advancedEnabled = false, days = 0, recording = true, advanced = true } = {}) => ({
  name: "Test",
  slug: "test",
  ...(policy ? { advancedUnlockPolicy: policy } : {}),
  features: {
    beginnerReprogrammingEnabled: true,
    advancedReprogrammingEnabled: advancedEnabled
  },
  audioWorkflow: {
    status: advanced ? "approved" : recording ? "submitted" : "requested",
    rawAudioKey: recording ? "raw/test.webm" : "",
    rawUploadedAt: recording ? "2026-07-01T10:00:00.000Z" : "",
    submittedAt: recording ? "2026-07-01T10:00:00.000Z" : "",
    beginnerAudioKey: recording ? "beginner/test.mp3" : "",
    editorAudioKey: advanced ? "advanced/test.mp3" : "",
    editedAt: advanced ? "2026-07-01T11:00:00.000Z" : "",
    approvedAt: advanced ? "2026-07-01T11:30:00.000Z" : ""
  },
  usage: {
    beginnerAudioUsage: {
      completedByDay: completedByDay(days)
    }
  }
});

const legacyEnabled = makeStudent({ advancedEnabled: true, days: 0 });
assert.equal(classifyStudent(legacyEnabled).policy, ADVANCED_UNLOCK_POLICIES.LEGACY_IMMEDIATE);
assert.equal(getAdvancedAccessInfo(legacyEnabled).unlocked, true);
assert.equal(buildMobileAudio(legacyEnabled).advanced.ready, true);

const legacyRecordedNotEnabled = makeStudent({ advancedEnabled: false, days: 6 });
assert.equal(classifyStudent(legacyRecordedNotEnabled).policy, ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS);
assert.equal(getAdvancedAccessInfo(legacyRecordedNotEnabled).unlocked, false);
assert.equal(getAdvancedAccessInfo(legacyRecordedNotEnabled).blockedReason, "beginner-days");
assert.equal(buildMobileAudio(legacyRecordedNotEnabled).advanced.ready, false);
assert.equal(buildMobileAudio(legacyRecordedNotEnabled).advanced.status, "locked");

const afterSevenDays = makeStudent({ policy: ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS, days: 7 });
assert.equal(getAdvancedAccessInfo(afterSevenDays).unlocked, true);
assert.equal(buildMobileAudio(afterSevenDays).advanced.ready, true);

const missingRecording = makeStudent({ advancedEnabled: false, recording: false, advanced: false });
assert.equal(classifyStudent(missingRecording).reason, "missing-recording");
assert.equal(getAdvancedAccessInfo(missingRecording).blockedReason, "missing-personal-audio");

const explicitLegacyWithoutAdvanced = makeStudent({
  policy: ADVANCED_UNLOCK_POLICIES.LEGACY_IMMEDIATE,
  recording: true,
  advanced: false
});
assert.equal(getAdvancedAccessInfo(explicitLegacyWithoutAdvanced).unlocked, false);
assert.equal(getAdvancedAccessInfo(explicitLegacyWithoutAdvanced).blockedReason, "advanced-audio-pending");

const staleAdvanced = makeStudent({ policy: ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS, days: 7 });
staleAdvanced.audioWorkflow.rawUploadedAt = "2026-07-02T12:00:00.000Z";
assert.equal(hasApprovedAdvancedAudio(staleAdvanced), false);
assert.equal(buildMobileAudio(staleAdvanced).advanced.ready, false);

const report = buildReport([
  legacyEnabled,
  { ...legacyRecordedNotEnabled, slug: "second", email: "student@example.com" },
  { slug: "oceano", name: "Audio publico", audioKey: "audio/oceano.mp3" }
]);
assert.equal(report.totalStudents, 2);
assert.equal(report.systemAssetCount, 1);
assert.deepEqual(report.systemAssets, ["oceano"]);
assert.equal(report.withEmail, 1);
assert.equal(report.missingEmail, 1);
assert.equal(report.withPassword, 0);
assert.equal(report.needsPassword, 2);

console.log("advanced unlock policy tests: ok");
