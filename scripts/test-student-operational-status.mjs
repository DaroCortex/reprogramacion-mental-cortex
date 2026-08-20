import assert from "node:assert/strict";
import {
  findStudentMatch,
  resolveStudentOperationalStatus,
} from "../lib/student-operational-status.js";
import { buildTransfer } from "../lib/student-email-transfer.js";

const students = [
  {
    slug: "duplicate-inactive",
    name: "Mariam Rujana",
    email: "mariam@example.com",
    status: "inactive",
    inactive: true,
    auth: { passwordHash: "inactive-hash" },
  },
  {
    slug: "mariam-rujana",
    name: "Mariam Rujana",
    email: "mariam@example.com",
    status: "active",
    audioWorkflow: {
      status: "approved",
      beginnerAudioKey: "beginner.mp3",
      editorAudioKey: "advanced.mp3",
      editedAt: "2026-08-10T10:00:00.000Z",
      rawUploadedAt: "2026-08-09T10:00:00.000Z",
    },
    advancedUnlockPolicy: "legacy_immediate",
    features: { advancedReprogrammingEnabled: true },
    auth: { passwordHash: "active-hash" },
    usage: {
      beginnerAudioUsage: {
        sessions: [
          {
            sessionId: "ios-session",
            source: "ios-native",
            startedAt: "2026-08-20T10:00:00.000Z",
            lastEventAt: "2026-08-20T10:30:00.000Z",
          },
        ],
      },
    },
  },
];

const activeMatch = findStudentMatch(students, {
  slug: "duplicate-inactive",
  email: "mariam@example.com",
});
assert.equal(activeMatch.student.slug, "mariam-rujana");
assert.equal(activeMatch.matchedBy, "email");

const status = resolveStudentOperationalStatus(students, {
  requestId: "alumno-1",
  email: "MARIAM@example.com",
});
assert.equal(status.requestId, "alumno-1");
assert.equal(status.studentExists, true);
assert.equal(status.hasPassword, true);
assert.equal(status.recordingReceived, true);
assert.equal(status.beginnerReady, true);
assert.equal(status.advancedReady, true);
assert.equal(status.advancedUnlocked, true);
assert.equal(status.lastPlaybackSource, "ios");
assert.equal(status.lastAudioAccessAt, "2026-08-20T10:30:00.000Z");
assert.equal(Object.hasOwn(status, "auth"), false);

const noNameAuthorization = resolveStudentOperationalStatus(students, {
  name: "Mariam Rujana",
});
assert.equal(noNameAuthorization.studentExists, false);

const nameReview = resolveStudentOperationalStatus(
  [{ slug: "legacy", name: "María Pérez", status: "active", audioKey: "audio.mp3" }],
  { name: "Maria Perez" },
  { allowName: true },
);
assert.equal(nameReview.studentExists, true);
assert.equal(nameReview.matchedBy, "name");
assert.equal(nameReview.identityNeedsReview, true);

const transferSource = {
  slug: "mariam",
  email: "mariam@example.com",
  status: "inactive",
  inactive: true,
  auth: { passwordHash: "source-secret" },
};
const transferTarget = {
  slug: "mariam-rujana",
  email: "",
  status: "active",
  auth: { passwordHash: "target-secret" },
  audioKey: "target-audio.mp3",
};
const transfer = buildTransfer([transferSource, transferTarget], {
  sourceSlug: "mariam",
  targetSlug: "mariam-rujana",
  email: "mariam@example.com",
  nowIso: "2026-08-20T12:00:00.000Z",
});
assert.equal(transfer.changed, true);
assert.equal(transfer.students[0].email, "");
assert.equal(transfer.students[1].email, "mariam@example.com");
assert.equal(transfer.students[0].auth.passwordHash, "source-secret");
assert.equal(transfer.students[1].auth.passwordHash, "target-secret");
assert.equal(transfer.students[1].audioKey, "target-audio.mp3");

console.log("student operational status contract: OK");
