import { getAdvancedAccessInfo } from "./beginner-progress.js";
import { hasPassword, normalizeEmail } from "./student-auth.js";

const normalizeSlug = (value) => String(value || "").trim();

const normalizeName = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isActiveStudent = (student = {}) =>
  student?.status !== "inactive" && student?.inactive !== true;

const validIso = (value) => {
  const time = Date.parse(String(value || ""));
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
};

const normalizePlaybackSource = (value) => {
  const source = String(value || "").trim().toLowerCase();
  if (!source) return "";
  if (/ios|iphone|ipad|apple|native/.test(source)) return "ios";
  if (/android/.test(source)) return "android";
  if (/web|browser|pwa/.test(source)) return "web";
  return source.slice(0, 40);
};

const getPlaybackActivity = (student = {}, progress = {}) => {
  const usage = student?.usage || {};
  const candidates = [];
  const addCandidate = (timestamp, source = "") => {
    const iso = validIso(timestamp);
    if (!iso) return;
    candidates.push({
      timestamp: iso,
      source: normalizePlaybackSource(source),
    });
  };

  addCandidate(student.lastAudioAccessAt);
  addCandidate(usage.lastActivityAt);
  addCandidate(usage.lastSessionAt, usage.lastSession?.source);
  addCandidate(usage.lastSession?.updatedAt || usage.lastSession?.completedAt, usage.lastSession?.source);

  for (const session of Array.isArray(usage.recentSessions) ? usage.recentSessions : []) {
    addCandidate(
      session?.updatedAt || session?.completedAt || session?.startedAt,
      session?.source || session?.platform,
    );
  }
  for (const session of Array.isArray(progress.sessions) ? progress.sessions : []) {
    addCandidate(session?.lastEventAt || session?.startedAt, session?.source);
  }
  for (const event of Array.isArray(progress.events) ? progress.events : []) {
    addCandidate(event?.eventAt, event?.source);
  }

  candidates.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  return {
    lastAudioAccessAt: candidates[0]?.timestamp || "",
    lastPlaybackSource:
      candidates.find((candidate) => candidate.source)?.source || "",
  };
};

const hasReceivedRecording = (student = {}) => {
  const workflow = student?.audioWorkflow || {};
  return Boolean(
    student?.audioKey ||
      workflow.rawAudioKey ||
      workflow.hasRawAudio ||
      workflow.rawUploadedAt ||
      workflow.submittedAt ||
      workflow.editorAudioKey ||
      workflow.hasEditedAudio,
  );
};

const getPipelineStatus = ({ beginnerReady, advancedReady, recordingReceived, workflowStatus }) => {
  if (/error|failed|attention/.test(String(workflowStatus || "").toLowerCase())) return "error";
  if (beginnerReady && advancedReady) return "ready";
  if (beginnerReady) return "beginner_ready";
  if (recordingReceived) return "processing";
  return "missing";
};

const findStudentMatch = (students = [], lookup = {}, options = {}) => {
  const slug = normalizeSlug(lookup.slug);
  const email = normalizeEmail(lookup.email);
  const name = options.allowName ? normalizeName(lookup.name) : "";
  const matches = [];

  students.forEach((student, index) => {
    const matchedBy =
      slug && normalizeSlug(student?.slug) === slug
        ? "slug"
        : email && normalizeEmail(student?.email) === email
          ? "email"
          : name && normalizeName(student?.name) === name
            ? "name"
            : "";
    if (!matchedBy) return;
    matches.push({ student, index, matchedBy });
  });

  const methodRank = { slug: 0, email: 1, name: 2 };
  matches.sort((left, right) => {
    const activityRank = Number(!isActiveStudent(left.student)) - Number(!isActiveStudent(right.student));
    if (activityRank !== 0) return activityRank;
    return methodRank[left.matchedBy] - methodRank[right.matchedBy];
  });

  const match = matches[0] || null;
  return match
    ? {
        ...match,
        identityNeedsReview:
          match.matchedBy === "name" || !normalizeEmail(match.student?.email),
      }
    : null;
};

const buildStudentOperationalStatus = (student, options = {}) => {
  const requestId = String(options.requestId || "").trim();
  const lookupEmail = normalizeEmail(options.lookup?.email);
  const lookupSlug = normalizeSlug(options.lookup?.slug);
  if (!student) {
    return {
      requestId,
      matchedRecord: false,
      matchedBy: "",
      studentExists: false,
      active: false,
      accountStatus: "not_found",
      hasPassword: false,
      email: lookupEmail,
      slug: lookupSlug,
      name: "",
      identityNeedsReview: false,
      recordingReceived: false,
      beginnerReady: false,
      advancedReady: false,
      advancedUnlocked: false,
      advancedBlockedReason: "student-not-found",
      completedBeginnerDays: 0,
      requiredBeginnerDays: 7,
      remainingBeginnerDays: 7,
      workflowStatus: "",
      audioPipelineStatus: "missing",
      lastAudioAccessAt: "",
      lastPlaybackSource: "",
    };
  }

  const active = isActiveStudent(student);
  const workflow = student?.audioWorkflow || {};
  const advanced = getAdvancedAccessInfo(student);
  const playback = getPlaybackActivity(student, advanced.progress);
  const recordingReceived = hasReceivedRecording(student);
  const workflowStatus = String(
    workflow.status || (advanced.beginnerReady ? "approved" : recordingReceived ? "submitted" : ""),
  ).trim();

  return {
    requestId,
    matchedRecord: true,
    matchedBy: String(options.matchedBy || ""),
    studentExists: active,
    active,
    accountStatus: active ? "active" : "inactive",
    hasPassword: active && hasPassword(student),
    email: normalizeEmail(student.email),
    slug: normalizeSlug(student.slug),
    name: String(student.name || "").trim(),
    identityNeedsReview: Boolean(options.identityNeedsReview || !normalizeEmail(student.email)),
    recordingReceived,
    beginnerReady: active && advanced.beginnerReady,
    advancedReady: active && advanced.advancedAudioReady,
    advancedUnlocked: active && advanced.unlocked,
    advancedBlockedReason: active ? advanced.blockedReason : "student-inactive",
    completedBeginnerDays: active ? advanced.completedDays : 0,
    requiredBeginnerDays: advanced.requiredDays,
    remainingBeginnerDays: active ? advanced.remainingDays : advanced.requiredDays,
    workflowStatus,
    audioPipelineStatus: active
      ? getPipelineStatus({
          beginnerReady: advanced.beginnerReady,
          advancedReady: advanced.advancedAudioReady,
          recordingReceived,
          workflowStatus,
        })
      : "inactive",
    ...playback,
  };
};

const resolveStudentOperationalStatus = (students, lookup, options = {}) => {
  const match = findStudentMatch(students, lookup, options);
  return buildStudentOperationalStatus(match?.student || null, {
    requestId: lookup?.requestId,
    lookup,
    matchedBy: match?.matchedBy,
    identityNeedsReview: match?.identityNeedsReview,
  });
};

export {
  buildStudentOperationalStatus,
  findStudentMatch,
  hasReceivedRecording,
  isActiveStudent,
  normalizeName,
  normalizePlaybackSource,
  resolveStudentOperationalStatus,
};
