import assert from "node:assert/strict";
import {
  ADVANCED_UNLOCK_POLICIES,
  applyBeginnerAudioEvent,
  BEGINNER_COMPLETION_SECONDS,
  getAdvancedAccessInfo,
  hasApprovedAdvancedAudio,
  mergeBeginnerProgressMonotonic,
  normalizeBeginnerAudioEvent
} from "../lib/beginner-progress.js";
import { mergeTelemetryRecords } from "../lib/beginner-telemetry.js";
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

const eventAt25Minutes = {
  eventType: "paused",
  eventAt: "2026-07-27T12:00:00.000Z",
  dayKey: "2026-07-27",
  kind: "beginner",
  durationSeconds: 1890,
  currentTimeSeconds: BEGINNER_COMPLETION_SECONDS,
  playedSeconds: BEGINNER_COMPLETION_SECONDS,
  completionPercent: BEGINNER_COMPLETION_SECONDS / 1890,
  seeked: false,
  source: "ios"
};
assert.equal(normalizeBeginnerAudioEvent(eventAt25Minutes).completed, true);
assert.equal(
  normalizeBeginnerAudioEvent({
    ...eventAt25Minutes,
    currentTimeSeconds: BEGINNER_COMPLETION_SECONDS - 1,
    playedSeconds: BEGINNER_COMPLETION_SECONDS - 1
  }).completed,
  false
);
assert.equal(normalizeBeginnerAudioEvent({ ...eventAt25Minutes, seeked: true }).completed, false);
assert.equal(
  normalizeBeginnerAudioEvent({
    ...eventAt25Minutes,
    currentTimeSeconds: BEGINNER_COMPLETION_SECONDS,
    playedSeconds: 120
  }).completed,
  false
);

const afterOne25MinutePractice = applyBeginnerAudioEvent(
  makeStudent({ policy: ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS, days: 0 }),
  eventAt25Minutes,
  "2026-07-27T12:00:01.000Z"
);
assert.equal(getAdvancedAccessInfo(afterOne25MinutePractice).completedDays, 1);

const monotonicProgress = mergeBeginnerProgressMonotonic(
  afterOne25MinutePractice.usage.beginnerAudioUsage,
  {
    completedByDay: {},
    lastEventAt: "2026-07-27T11:59:59.000Z",
    events: []
  }
);
assert.equal(monotonicProgress.completedDays, 1);
assert.ok(monotonicProgress.completedByDay["2026-07-27"]);

const sessionBase = makeStudent({
  policy: ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS,
  days: 0
});
const afterFirstCheckpoint = applyBeginnerAudioEvent(
  sessionBase,
  {
    ...eventAt25Minutes,
    eventType: "checkpoint",
    eventAt: "2026-07-27T11:10:00.000Z",
    currentTimeSeconds: 600,
    playedSeconds: 600,
    sessionId: "ios-test-session",
    eventId: "ios-test-session:1",
    sequence: 1
  },
  "2026-07-27T11:10:01.000Z"
);
const afterSecondCheckpoint = applyBeginnerAudioEvent(
  afterFirstCheckpoint,
  {
    ...eventAt25Minutes,
    eventType: "checkpoint",
    eventAt: "2026-07-27T11:20:00.000Z",
    currentTimeSeconds: 1200,
    playedSeconds: 1200,
    sessionId: "ios-test-session",
    eventId: "ios-test-session:2",
    sequence: 2
  },
  "2026-07-27T11:20:01.000Z"
);
assert.equal(afterSecondCheckpoint.usage.beginnerAudioUsage.sessions.length, 1);
assert.equal(afterSecondCheckpoint.usage.beginnerAudioUsage.sessions[0].playedSeconds, 1200);
assert.equal(
  afterSecondCheckpoint.usage.beginnerAudioUsage.events.filter((event) => event.eventType === "checkpoint").length,
  1
);

const afterDuplicateCheckpoint = applyBeginnerAudioEvent(
  afterSecondCheckpoint,
  {
    ...eventAt25Minutes,
    eventType: "checkpoint",
    eventAt: "2026-07-27T11:20:02.000Z",
    currentTimeSeconds: 10,
    playedSeconds: 10,
    sessionId: "ios-test-session",
    eventId: "ios-test-session:2",
    sequence: 2
  },
  "2026-07-27T11:20:03.000Z"
);
assert.deepEqual(afterDuplicateCheckpoint, afterSecondCheckpoint);

const afterCompletedCheckpoint = applyBeginnerAudioEvent(
  afterSecondCheckpoint,
  {
    ...eventAt25Minutes,
    eventType: "checkpoint",
    eventAt: "2026-07-27T11:25:00.000Z",
    sessionId: "ios-test-session",
    eventId: "ios-test-session:3",
    sequence: 3
  },
  "2026-07-27T11:25:01.000Z"
);
const afterCompletedPause = applyBeginnerAudioEvent(
  afterCompletedCheckpoint,
  {
    ...eventAt25Minutes,
    eventType: "paused",
    eventAt: "2026-07-27T11:25:02.000Z",
    sessionId: "ios-test-session",
    eventId: "ios-test-session:4",
    sequence: 4
  },
  "2026-07-27T11:25:03.000Z"
);
assert.equal(afterCompletedPause.usage.beginnerAudioUsage.completedDays, 1);
assert.equal(afterCompletedPause.usage.beginnerAudioUsage.completedByDay["2026-07-27"].count, 1);
assert.equal(afterCompletedPause.usage.beginnerAudioUsage.sessions[0].completed, true);
assert.equal(
  afterCompletedPause.usage.beginnerAudioUsage.events.some((event) => event.eventType === "checkpoint"),
  false
);

const durableCompletion = {
  version: 1,
  slug: "test",
  usage: {
    beginnerAudioUsage: afterCompletedPause.usage.beginnerAudioUsage,
    practiceActivityByDay: { "2026-07-27": 1 }
  },
  lastAudioAccessAt: "2026-07-27T11:25:03.000Z",
  updatedAt: "2026-07-27T11:25:03.000Z"
};
const staleConcurrentCheckpoint = {
  version: 1,
  slug: "test",
  usage: {
    beginnerAudioUsage: afterSecondCheckpoint.usage.beginnerAudioUsage,
    practiceActivityByDay: { "2026-07-27": 1 }
  },
  lastAudioAccessAt: "2026-07-27T11:20:01.000Z",
  updatedAt: "2026-07-27T11:20:01.000Z"
};
const mergedTelemetry = mergeTelemetryRecords(
  durableCompletion,
  staleConcurrentCheckpoint
);
assert.equal(mergedTelemetry.usage.beginnerAudioUsage.completedDays, 1);
assert.equal(mergedTelemetry.usage.beginnerAudioUsage.sessions[0].completed, true);
assert.equal(mergedTelemetry.usage.beginnerAudioUsage.sessions[0].lastSequence, 4);

const shortLegacyTrackCompleted = normalizeBeginnerAudioEvent({
  ...eventAt25Minutes,
  eventType: "completed",
  durationSeconds: 300,
  currentTimeSeconds: 300,
  playedSeconds: 300,
  completionPercent: 1
});
assert.equal(shortLegacyTrackCompleted.completed, true);

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
