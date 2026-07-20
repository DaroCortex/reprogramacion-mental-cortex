import { readAppSettings, readStudents, writeStudents } from "../lib/r2.js";
import {
  applyBeginnerAudioEvent,
  getAdvancedAccessInfo,
  hasApprovedAdvancedAudio,
  normalizeBeginnerAudioUsage
} from "../lib/beginner-progress.js";
import { findStudentBySession, touchStudentSession } from "../lib/student-auth.js";

const clampNumber = (value, min, max, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
};

const safeTimestamp = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDateKey = (value) => {
  const key = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : "";
};

const normalizeSessionPayload = (payload) => {
  const completedRounds = clampNumber(payload?.completedRounds, 0, 50, 0);
  const plannedRounds = clampNumber(payload?.plannedRounds, 0, 50, completedRounds);
  const breathsPerCycle = clampNumber(payload?.breathsPerCycle, 0, 200, 0);
  const apneaByRoundRaw = Array.isArray(payload?.apneaByRound) ? payload.apneaByRound : [];
  const apneaByRound = apneaByRoundRaw.slice(0, 10).map((seconds) => clampNumber(seconds, 0, 36000, 0));
  const completedAt = payload?.completedAt ? new Date(payload.completedAt) : new Date();
  const completedAtIso = Number.isNaN(completedAt.getTime())
    ? new Date().toISOString()
    : completedAt.toISOString();
  const date = normalizeDateKey(payload?.date) || completedAtIso.slice(0, 10);
  const startedAtDate = payload?.startedAt ? new Date(payload.startedAt) : null;
  const startedAt =
    startedAtDate && !Number.isNaN(startedAtDate.getTime())
      ? startedAtDate.toISOString()
      : "";
  const durationSeconds = clampNumber(payload?.durationSeconds, 0, 86400, 0);
  const breathsDoneTotal = clampNumber(
    payload?.breathsDoneTotal,
    0,
    100000,
    completedRounds * breathsPerCycle
  );
  const partial = Boolean(payload?.partial);
  const manualStop = Boolean(payload?.manualStop);
  const safeType = String(payload?.sessionType || "breathing").trim();
  const flowStageRaw = String(payload?.flowStage || "").trim().toLowerCase();
  const flowStageNormalized =
    flowStageRaw === "pre-practice" || flowStageRaw === "pre_practice" || flowStageRaw === "pre-practica"
      ? "prepractice"
      : flowStageRaw;
  const flowStage =
    flowStageNormalized === "onboarding" || flowStageNormalized === "prepractice" || flowStageNormalized === "practice"
      ? flowStageNormalized
      : "";
  const colorVision = payload?.colorVision && typeof payload.colorVision === "object"
    ? {
        hits: clampNumber(payload.colorVision.hits, 0, 100000, 0),
        misses: clampNumber(payload.colorVision.misses, 0, 100000, 0),
        total: clampNumber(payload.colorVision.total, 0, 100000, 0),
        accuracy: clampNumber(payload.colorVision.accuracy, 0, 100, 0),
        colorsCalibrated: clampNumber(payload.colorVision.colorsCalibrated, 0, 1000, 0)
      }
    : null;
  return {
    sessionType: safeType,
    flowStage,
    completedRounds,
    plannedRounds,
    breathsPerCycle,
    breathsDoneTotal,
    apneaByRound,
    partial,
    manualStop,
    startedAt,
    date,
    durationSeconds,
    completedAt: completedAtIso,
    colorVision
  };
};

const normalizeUsageMap = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => normalizeDateKey(key))
      .map(([key, count]) => [key, clampNumber(count, 0, 9999, 0)])
  );
};

const normalizeApneaByDay = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => {
        const dateKey = normalizeDateKey(key);
        if (!dateKey) return null;
        const source = entry && typeof entry === "object" && !Array.isArray(entry)
          ? entry
          : { times: Array.isArray(entry) ? entry : [] };
        const times = Array.isArray(source.times)
          ? source.times
              .map((seconds) => clampNumber(seconds, 0, 36000, 0))
              .filter((seconds) => seconds > 0)
              .slice(-40)
          : [];
        const sessions = clampNumber(source.sessions, 0, 9999, times.length ? 1 : 0);
        const best = Math.max(clampNumber(source.best, 0, 36000, 0), ...times, 0);
        return [
          dateKey,
          {
            sessions,
            times,
            best,
            lastAt: String(source.lastAt || source.completedAt || "")
          }
        ];
      })
      .filter(Boolean)
  );
};

const addApneaDayEntry = (apneaByDay, dateKey, apneaByRound, completedAt) => {
  const safeDateKey = normalizeDateKey(dateKey);
  const times = Array.isArray(apneaByRound)
    ? apneaByRound
        .map((seconds) => clampNumber(seconds, 0, 36000, 0))
        .filter((seconds) => seconds > 0)
    : [];
  const next = normalizeApneaByDay(apneaByDay);
  if (!safeDateKey || times.length === 0) return next;

  const previous = next[safeDateKey] || { sessions: 0, times: [], best: 0, lastAt: "" };
  const mergedTimes = [...(previous.times || []), ...times].slice(-40);
  next[safeDateKey] = {
    sessions: clampNumber(previous.sessions, 0, 9999, 0) + 1,
    times: mergedTimes,
    best: Math.max(clampNumber(previous.best, 0, 36000, 0), ...times),
    lastAt: String(completedAt || previous.lastAt || "")
  };
  return next;
};

const buildPublicSessionSummary = (session = {}) => ({
  sessionType: String(session.sessionType || "breathing"),
  flowStage: String(session.flowStage || ""),
  completedRounds: clampNumber(session.completedRounds, 0, 50, 0),
  plannedRounds: clampNumber(session.plannedRounds, 0, 50, 0),
  breathsPerCycle: clampNumber(session.breathsPerCycle, 0, 200, 0),
  breathsDoneTotal: clampNumber(session.breathsDoneTotal, 0, 100000, 0),
  apneaByRound: Array.isArray(session.apneaByRound)
    ? session.apneaByRound.slice(0, 10).map((seconds) => clampNumber(seconds, 0, 36000, 0))
    : [],
  completedAt: String(session.completedAt || ""),
  startedAt: String(session.startedAt || ""),
  date: normalizeDateKey(session.date),
  durationSeconds: clampNumber(session.durationSeconds, 0, 86400, 0),
  partial: Boolean(session.partial),
  manualStop: Boolean(session.manualStop)
});

const normalizeBeginnerAudioSession = (session = {}) => {
  const statusRaw = String(session.status || "progress").trim().toLowerCase();
  const status = statusRaw === "complete" || statusRaw === "partial" || statusRaw === "started"
    ? statusRaw
    : "progress";
  const durationSeconds = clampNumber(session.durationSeconds, 0, 86400, 0);
  const listenedSeconds = clampNumber(
    session.listenedSeconds ?? session.maxPositionSeconds,
    0,
    86400,
    0
  );
  const percent = clampNumber(
    session.percent,
    0,
    100,
    durationSeconds > 0 ? Math.round((listenedSeconds / durationSeconds) * 100) : 0
  );
  const reportedAtDate = session.reportedAt ? new Date(session.reportedAt) : new Date();
  const reportedAt = Number.isNaN(reportedAtDate.getTime())
    ? new Date().toISOString()
    : reportedAtDate.toISOString();
  const startedAtDate = session.startedAt ? new Date(session.startedAt) : new Date(reportedAt);
  const startedAt = Number.isNaN(startedAtDate.getTime())
    ? reportedAt
    : startedAtDate.toISOString();
  const completed = Boolean(session.completed || status === "complete" || percent >= 96);

  return {
    id: String(session.id || `${startedAt}-${Math.random().toString(36).slice(2, 8)}`).slice(0, 100),
    audioId: String(session.audioId || "beginner-1").slice(0, 80),
    audioLabel: String(session.audioLabel || "").slice(0, 120),
    status: completed ? "complete" : status,
    startedAt,
    updatedAt: reportedAt,
    completedAt: completed ? reportedAt : "",
    durationSeconds,
    listenedSeconds,
    maxPositionSeconds: listenedSeconds,
    percent,
    completed
  };
};

const buildSafeBeginnerAudioUsage = (usage = {}) => ({
  totalStarts: clampNumber(usage.totalStarts, 0, 1e9, 0),
  completedPlays: clampNumber(usage.completedPlays, 0, 1e9, 0),
  partialPlays: clampNumber(usage.partialPlays, 0, 1e9, 0),
  totalListenSeconds: clampNumber(usage.totalListenSeconds, 0, 1e12, 0),
  lastStartedAt: String(usage.lastStartedAt || ""),
  lastProgressAt: String(usage.lastProgressAt || ""),
  lastCompletedAt: String(usage.lastCompletedAt || ""),
  sessionsByDay: normalizeUsageMap(usage.sessionsByDay),
  completedByDay: normalizeUsageMap(usage.completedByDay),
  recentSessions: Array.isArray(usage.recentSessions)
    ? usage.recentSessions.slice(0, 30).map(normalizeBeginnerAudioSession)
    : [],
  lastSession: usage.lastSession ? normalizeBeginnerAudioSession(usage.lastSession) : null
});

const buildSafeUsageSummary = (usage = {}) => ({
  totalSessions: clampNumber(usage.totalSessions, 0, 1e9, 0),
  totalRounds: clampNumber(usage.totalRounds, 0, 1e9, 0),
  totalBreaths: clampNumber(usage.totalBreaths, 0, 1e9, 0),
  firstActivityAt: String(usage.firstActivityAt || ""),
  lastActivityAt: String(usage.lastActivityAt || ""),
  firstSessionAt: String(usage.firstSessionAt || ""),
  lastSessionAt: String(usage.lastSessionAt || ""),
  sessionsByDay: normalizeUsageMap(usage.sessionsByDay),
  practiceActivityByDay: normalizeUsageMap(usage.practiceActivityByDay),
  apneaRoundSums: Array.isArray(usage.apneaRoundSums)
    ? usage.apneaRoundSums.slice(0, 10).map((seconds) => clampNumber(seconds, 0, 1e9, 0))
    : [],
  apneaRoundCounts: Array.isArray(usage.apneaRoundCounts)
    ? usage.apneaRoundCounts.slice(0, 10).map((count) => clampNumber(count, 0, 1e9, 0))
    : [],
  apneaByDay: normalizeApneaByDay(usage.apneaByDay),
  recentSessions: Array.isArray(usage.recentSessions)
    ? usage.recentSessions.slice(0, 60).map(buildPublicSessionSummary)
    : [],
  lastSession: usage.lastSession ? buildPublicSessionSummary(usage.lastSession) : null,
  beginnerAudio: buildSafeBeginnerAudioUsage(usage.beginnerAudio || {}),
  beginnerAudioUsage: normalizeBeginnerAudioUsage(usage)
});

const hasLegacyBeginnerAudio = (student, workflow = {}) =>
  Boolean(student?.audioKey && !workflow.beginnerAudioKey && !workflow.editorAudioKey);

const buildMobileAudio = (student) => {
  const workflow = student?.audioWorkflow || {};
  const advancedInfo = getAdvancedAccessInfo(student);
  const advancedApproved = hasApprovedAdvancedAudio(student, workflow);
  const advancedReady = advancedApproved && advancedInfo.unlocked;
  const advancedUpdatedAt = Math.max(
    safeTimestamp(workflow.approvedAt),
    safeTimestamp(workflow.editedAt),
    safeTimestamp(student?.updatedAt)
  );
  const beginner = [];

  if (workflow.beginnerAudioKey || hasLegacyBeginnerAudio(student, workflow)) {
    beginner.push({
      id: "beginner-1",
      kind: "beginner",
      ready: true,
      label: "Principiante 1",
      fileName: workflow.beginnerFileName || workflow.editorFileName || "audio-principiante-1.mp3",
      updatedAt: workflow.beginnerEditedAt || workflow.editedAt || student?.updatedAt || ""
    });
  }

  if (workflow.beginnerAltAudioKey) {
    beginner.push({
      id: "beginner-2",
      kind: "beginner-alt",
      ready: true,
      label: "Principiante 2",
      fileName: workflow.beginnerAltFileName || "audio-principiante-2.mp3",
      updatedAt: workflow.beginnerAltEditedAt || student?.updatedAt || ""
    });
  }

  return {
    advanced: {
      ready: advancedReady,
      kind: "edited",
      status: advancedReady
        ? "approved"
        : advancedApproved
          ? "locked"
          : (workflow.status || "not_ready"),
      fileName: advancedReady ? (workflow.editorFileName || "audio-final.mp3") : "",
      updatedAt: advancedReady && advancedUpdatedAt ? new Date(advancedUpdatedAt).toISOString() : ""
    },
    beginner
  };
};

const buildStudentFeatures = (student, appSettings) => {
  const workflow = student?.audioWorkflow || {};
  const advancedInfo = getAdvancedAccessInfo(student);
  return {
    colorVisionEnabled: Boolean(student?.features?.colorVisionEnabled),
    magicUnlockScore: clampNumber(student?.features?.magicUnlockScore, 60, 98, appSettings.magicUnlockScore),
    beginnerReprogrammingEnabled: Boolean(
      student?.features?.beginnerReprogrammingEnabled ||
        workflow.beginnerAudioKey ||
        workflow.beginnerAltAudioKey ||
        student?.audioKey
    ),
    advancedReprogrammingEnabled: advancedInfo.unlocked
  };
};

const buildSafeAudioWorkflow = (student) => {
  const workflow = student?.audioWorkflow || {};
  const advancedInfo = getAdvancedAccessInfo(student);
  return {
    status: workflow.status || (student?.audioKey ? "approved" : "pending"),
    requestType: workflow.requestType || "",
    requestLabel: workflow.requestLabel || "",
    requestSource: workflow.requestSource || "",
    requestedAt: workflow.requestedAt || "",
    rawUploadedAt: workflow.rawUploadedAt || workflow.submittedAt || "",
    rawFileName: workflow.rawFileName || "",
    rawSource: workflow.rawSource || "",
    beginnerFileName: workflow.beginnerFileName || "",
    beginnerAltFileName: workflow.beginnerAltFileName || "",
    editorFileName: workflow.editorFileName || "",
    editedAt: workflow.editedAt || "",
    approvedAt: workflow.approvedAt || "",
    advancedUnlockAt: advancedInfo.unlocked
      ? (
          workflow.advancedUnlockedAt ||
          workflow.advancedUnlockAt ||
          advancedInfo.progress.lastCompletedAt ||
          (advancedInfo.legacyGrandfathered ? (student?.createdAt || student?.updatedAt || "") : "")
        )
      : "",
    advancedUnlockPolicy: advancedInfo.unlockPolicy,
    advancedBlockedReason: advancedInfo.blockedReason,
    beginnerCompletedDays: advancedInfo.completedDays,
    beginnerRequiredDays: advancedInfo.requiredDays,
    beginnerRemainingDays: advancedInfo.remainingDays,
    hasRawAudio: Boolean(workflow.rawAudioKey || workflow.submittedAt || workflow.rawUploadedAt),
    hasBeginnerAudio: Boolean(workflow.beginnerAudioKey || hasLegacyBeginnerAudio(student, workflow)),
    hasBeginnerAltAudio: Boolean(workflow.beginnerAltAudioKey),
    hasEditedAudio: Boolean(workflow.editorAudioKey)
  };
};

const buildAuthenticatedStudent = (student, appSettings) => {
  const advancedInfo = getAdvancedAccessInfo(student);
  return {
    name: student.name,
    slug: student.slug,
    email: student.email || "",
    createdAt: student.createdAt || "",
    updatedAt: student.updatedAt || "",
    features: buildStudentFeatures(student, appSettings),
    audioWorkflow: buildSafeAudioWorkflow(student),
    mobileAudio: buildMobileAudio(student),
    advancedUnlockPolicy: advancedInfo.unlockPolicy,
    usage: buildSafeUsageSummary(student.usage || {}),
    advancedBlockedReason: advancedInfo.blockedReason,
    beginnerAudioProgress: advancedInfo.progress
  };
};

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { slug, token, session, action, rawAudioKey, fileName, source } = req.body || {};
      const safeSlug = String(slug || "").trim();
      const safeToken = String(token || "").trim();

      const students = await readStudents();
      let index = -1;
      let student = null;
      let sessionAuth = null;

      if (safeSlug && safeToken) {
        index = students.findIndex((item) => item.slug === safeSlug);
        if (index < 0) {
          return res.status(404).json({ error: "Estudiante no encontrado" });
        }
        student = students[index];
        if (String(student.token || "") !== safeToken) {
          return res.status(403).json({ error: "Token inválido" });
        }
      } else {
        sessionAuth = findStudentBySession(students, req);
        if (!sessionAuth) {
          return res.status(401).json({ error: "Sesión requerida" });
        }
        if (safeSlug && safeSlug !== sessionAuth.student.slug) {
          return res.status(403).json({ error: "No autorizado" });
        }
        index = sessionAuth.index;
        student = touchStudentSession(sessionAuth.student, sessionAuth.tokenHash);
      }

      if (action === "submitRawAudio") {
        const safeAudioKey = String(rawAudioKey || "").trim();
        if (!safeAudioKey) {
          return res.status(400).json({ error: "Audio requerido" });
        }
        const nowIso = new Date().toISOString();
        const nextStudents = students.slice();
        nextStudents[index] = {
          ...student,
          audioWorkflow: {
            ...(student.audioWorkflow || {}),
            status: "submitted",
            rawAudioKey: safeAudioKey,
            rawFileName: String(fileName || "audio-alumno"),
            rawSource: String(source || "uploaded"),
            rawUploadedAt: nowIso,
            submittedAt: nowIso,
            requestedAt: student?.audioWorkflow?.requestedAt || nowIso
          },
          updatedAt: nowIso
        };
        await writeStudents(nextStudents);
        return res.status(200).json({ ok: true });
      }

      if (action === "practice-activity") {
        const nowIso = new Date().toISOString();
        const activityInput = req.body?.activity && typeof req.body.activity === "object"
          ? req.body.activity
          : {};
        const startedDate = activityInput?.startedAt ? new Date(activityInput.startedAt) : new Date();
        const startedAt = Number.isNaN(startedDate.getTime()) ? nowIso : startedDate.toISOString();
        const requestedDayKey = String(activityInput?.dayKey || "").trim();
        const dayKey = /^\d{4}-\d{2}-\d{2}$/.test(requestedDayKey)
          ? requestedDayKey
          : startedAt.slice(0, 10);
        const prevUsage = student.usage || {};
        const prevByDay = prevUsage.practiceActivityByDay || {};
        const nextByDay = {
          ...prevByDay,
          [dayKey]: clampNumber(prevByDay[dayKey], 0, 9999, 0) + 1
        };
        const nextStudents = students.slice();
        nextStudents[index] = {
          ...student,
          usage: {
            ...prevUsage,
            firstActivityAt: prevUsage.firstActivityAt || startedAt,
            lastActivityAt: startedAt,
            practiceActivityByDay: nextByDay
          },
          lastAudioAccessAt: startedAt,
          updatedAt: nowIso
        };
        await writeStudents(nextStudents);
        return res.status(200).json({ ok: true });
      }

      if (action === "beginner-audio-event") {
        const eventPayload = req.body?.event && typeof req.body.event === "object"
          ? req.body.event
          : req.body?.audioEvent && typeof req.body.audioEvent === "object"
            ? req.body.audioEvent
            : {};
        const nowIso = new Date().toISOString();
        const nextStudents = students.slice();
        const nextStudent = applyBeginnerAudioEvent(student, eventPayload, nowIso);
        nextStudents[index] = nextStudent;
        await writeStudents(nextStudents);
        const advancedInfo = getAdvancedAccessInfo(nextStudent);
        return res.status(200).json({
          ok: true,
          beginnerAudioProgress: advancedInfo.progress,
          advancedBlockedReason: advancedInfo.blockedReason,
          features: buildStudentFeatures(nextStudent, await readAppSettings())
        });
      }

      if (action === "beginner-audio-playback") {
        const parsedAudioSession = normalizeBeginnerAudioSession(req.body?.audioSession || {});
        const nowIso = new Date().toISOString();
        const prevUsage = student.usage || {};
        const prevBeginner = buildSafeBeginnerAudioUsage(prevUsage.beginnerAudio || {});
        const recent = Array.isArray(prevBeginner.recentSessions) ? prevBeginner.recentSessions : [];
        const existingIndex = recent.findIndex((item) => item.id === parsedAudioSession.id);
        const existing = existingIndex >= 0 ? recent[existingIndex] : null;
        const wasCompleted = Boolean(existing?.completed || existing?.status === "complete");
        const wasPartial = Boolean(existing?.status === "partial");
        const completed = Boolean(wasCompleted || parsedAudioSession.completed);
        const listenedSeconds = Math.max(
          clampNumber(existing?.listenedSeconds, 0, 86400, 0),
          parsedAudioSession.listenedSeconds
        );
        const durationSeconds = Math.max(
          clampNumber(existing?.durationSeconds, 0, 86400, 0),
          parsedAudioSession.durationSeconds
        );
        const percent = clampNumber(
          Math.max(clampNumber(existing?.percent, 0, 100, 0), parsedAudioSession.percent),
          0,
          100,
          0
        );
        const nextSession = {
          ...parsedAudioSession,
          status: completed
            ? "complete"
            : parsedAudioSession.status === "partial" || wasPartial
              ? "partial"
              : parsedAudioSession.status,
          startedAt: existing?.startedAt || parsedAudioSession.startedAt,
          durationSeconds,
          listenedSeconds,
          maxPositionSeconds: listenedSeconds,
          percent,
          completed,
          completedAt: completed ? (existing?.completedAt || parsedAudioSession.completedAt || parsedAudioSession.updatedAt) : ""
        };
        const dayKey = nextSession.startedAt.slice(0, 10);
        const nextSessionsByDay = {
          ...prevBeginner.sessionsByDay
        };
        const isNewSession = existingIndex < 0;
        if (isNewSession && /^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
          nextSessionsByDay[dayKey] = clampNumber(nextSessionsByDay[dayKey], 0, 9999, 0) + 1;
        }
        const nextCompletedByDay = {
          ...prevBeginner.completedByDay
        };
        if (!wasCompleted && completed && /^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
          nextCompletedByDay[dayKey] = clampNumber(nextCompletedByDay[dayKey], 0, 9999, 0) + 1;
        }

        const shouldCountAsPractice = completed || listenedSeconds >= 60;
        const prevPracticeByDay = prevUsage.practiceActivityByDay || {};
        const nextPracticeByDay = shouldCountAsPractice && /^\d{4}-\d{2}-\d{2}$/.test(dayKey)
          ? {
              ...prevPracticeByDay,
              [dayKey]: Math.max(clampNumber(prevPracticeByDay[dayKey], 0, 9999, 0), 1)
            }
          : prevPracticeByDay;

        const withoutExisting = recent.filter((item) => item.id !== nextSession.id);
        const nextRecent = [nextSession, ...withoutExisting]
          .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
          .slice(0, 30);
        const nextBeginner = {
          ...prevBeginner,
          totalStarts: prevBeginner.totalStarts + (isNewSession ? 1 : 0),
          completedPlays: prevBeginner.completedPlays + (!wasCompleted && completed ? 1 : 0),
          partialPlays:
            prevBeginner.partialPlays +
            (!wasPartial && !completed && nextSession.status === "partial" ? 1 : 0),
          totalListenSeconds:
            prevBeginner.totalListenSeconds +
            Math.max(0, listenedSeconds - clampNumber(existing?.listenedSeconds, 0, 86400, 0)),
          lastStartedAt: isNewSession ? nextSession.startedAt : prevBeginner.lastStartedAt,
          lastProgressAt: nextSession.updatedAt,
          lastCompletedAt: completed ? nextSession.completedAt : prevBeginner.lastCompletedAt,
          sessionsByDay: nextSessionsByDay,
          completedByDay: nextCompletedByDay,
          recentSessions: nextRecent,
          lastSession: nextSession
        };

        const legacyEventType = completed
          ? "completed"
          : nextSession.status === "partial"
            ? "paused"
            : nextSession.status === "started"
              ? "started"
              : "resumed";
        let nextStudent = {
          ...student,
          usage: {
            ...prevUsage,
            beginnerAudio: nextBeginner,
            firstActivityAt: shouldCountAsPractice ? prevUsage.firstActivityAt || nextSession.startedAt : prevUsage.firstActivityAt || "",
            lastActivityAt: shouldCountAsPractice ? nextSession.updatedAt : prevUsage.lastActivityAt || "",
            practiceActivityByDay: nextPracticeByDay
          },
          lastAudioAccessAt: shouldCountAsPractice ? nextSession.updatedAt : student.lastAudioAccessAt || "",
          updatedAt: nowIso
        };
        nextStudent = applyBeginnerAudioEvent(
          nextStudent,
          {
            eventType: legacyEventType,
            eventAt: nextSession.updatedAt,
            dayKey,
            kind: nextSession.audioId === "beginner-2" ? "beginner-alt" : "beginner",
            durationSeconds,
            currentTimeSeconds: nextSession.maxPositionSeconds,
            playedSeconds: listenedSeconds,
            completionPercent: durationSeconds > 0 ? listenedSeconds / durationSeconds : 0,
            seeked: false,
            source: "web"
          },
          nowIso
        );
        const nextStudents = students.slice();
        nextStudents[index] = nextStudent;
        await writeStudents(nextStudents);
        return res.status(200).json({
          ok: true,
          beginnerAudio: nextBeginner,
          beginnerAudioProgress: normalizeBeginnerAudioUsage(nextStudent.usage || {})
        });
      }

      if (!session) {
        return res.status(400).json({ error: "Datos incompletos" });
      }

      const parsed = normalizeSessionPayload(session);
      const prevUsage = student.usage || {};
      const prevRecent = Array.isArray(prevUsage.recentSessions) ? prevUsage.recentSessions : [];
      const prevByDay = prevUsage.sessionsByDay || {};
      const dayKey = parsed.date || parsed.completedAt.slice(0, 10);
      const nextByDay = {
        ...prevByDay,
        [dayKey]: clampNumber(prevByDay[dayKey], 0, 9999, 0) + 1
      };
      const prevPracticeByDay = prevUsage.practiceActivityByDay || {};
      const nextPracticeByDay = {
        ...prevPracticeByDay,
        [dayKey]: Math.max(clampNumber(prevPracticeByDay[dayKey], 0, 9999, 0), 1)
      };

      const prevSums = Array.isArray(prevUsage.apneaRoundSums) ? prevUsage.apneaRoundSums.slice(0, 10) : [];
      const prevCounts = Array.isArray(prevUsage.apneaRoundCounts) ? prevUsage.apneaRoundCounts.slice(0, 10) : [];
      const nextSums = [];
      const nextCounts = [];
      for (let i = 0; i < 10; i += 1) {
        const prevSum = clampNumber(prevSums[i], 0, 1e9, 0);
        const prevCount = clampNumber(prevCounts[i], 0, 1e9, 0);
        const current = clampNumber(parsed.apneaByRound[i], 0, 36000, -1);
        if (current >= 0) {
          nextSums[i] = prevSum + current;
          nextCounts[i] = prevCount + 1;
        } else {
          nextSums[i] = prevSum;
          nextCounts[i] = prevCount;
        }
      }

      const sessionSummary = {
        sessionType: parsed.sessionType,
        flowStage: parsed.flowStage,
        completedRounds: parsed.completedRounds,
        plannedRounds: parsed.plannedRounds,
        breathsPerCycle: parsed.breathsPerCycle,
        breathsDoneTotal: parsed.breathsDoneTotal,
        apneaByRound: parsed.apneaByRound,
        completedAt: parsed.completedAt,
        startedAt: parsed.startedAt,
        date: dayKey,
        durationSeconds: parsed.durationSeconds,
        partial: parsed.partial,
        manualStop: parsed.manualStop,
        colorVision: parsed.colorVision
      };

      const nextUsage = {
        ...prevUsage,
        firstActivityAt: prevUsage.firstActivityAt || parsed.completedAt,
        lastActivityAt: parsed.completedAt,
        firstSessionAt: prevUsage.firstSessionAt || parsed.completedAt,
        lastSessionAt: parsed.completedAt,
        totalSessions: clampNumber(prevUsage.totalSessions, 0, 1e9, 0) + 1,
        totalRounds: clampNumber(prevUsage.totalRounds, 0, 1e9, 0) + parsed.completedRounds,
        totalBreaths:
          clampNumber(prevUsage.totalBreaths, 0, 1e9, 0) +
          parsed.breathsDoneTotal,
        sessionsByDay: nextByDay,
        practiceActivityByDay: nextPracticeByDay,
        apneaRoundSums: nextSums,
        apneaRoundCounts: nextCounts,
        apneaByDay: addApneaDayEntry(prevUsage.apneaByDay, dayKey, parsed.apneaByRound, parsed.completedAt),
        flowStats: {
          onboarding:
            clampNumber(prevUsage?.flowStats?.onboarding, 0, 1e9, 0) +
            (parsed.flowStage === "onboarding" ? 1 : 0),
          prePractice:
            clampNumber(prevUsage?.flowStats?.prePractice, 0, 1e9, 0) +
            (parsed.flowStage === "prepractice" ? 1 : 0),
          practice:
            clampNumber(prevUsage?.flowStats?.practice, 0, 1e9, 0) +
            (parsed.flowStage === "practice" ? 1 : 0)
        },
        colorVisionUsage: (() => {
          const prevColor = prevUsage?.colorVisionUsage || {};
          if (parsed.sessionType !== "colorVision" || !parsed.colorVision) {
            return {
              totalSessions: clampNumber(prevColor.totalSessions, 0, 1e9, 0),
              totalHits: clampNumber(prevColor.totalHits, 0, 1e9, 0),
              totalMisses: clampNumber(prevColor.totalMisses, 0, 1e9, 0),
              totalDetections: clampNumber(prevColor.totalDetections, 0, 1e9, 0),
              averageAccuracy: clampNumber(prevColor.averageAccuracy, 0, 100, 0),
              lastSessionAt: prevColor.lastSessionAt || "",
              lastSession: prevColor.lastSession || null
            };
          }
          const prevTotalSessions = clampNumber(prevColor.totalSessions, 0, 1e9, 0);
          const prevHits = clampNumber(prevColor.totalHits, 0, 1e9, 0);
          const prevMisses = clampNumber(prevColor.totalMisses, 0, 1e9, 0);
          const prevDetections = clampNumber(prevColor.totalDetections, 0, 1e9, 0);
          const nextSessions = prevTotalSessions + 1;
          const nextHits = prevHits + clampNumber(parsed.colorVision.hits, 0, 1e9, 0);
          const nextMisses = prevMisses + clampNumber(parsed.colorVision.misses, 0, 1e9, 0);
          const nextDetections = prevDetections + clampNumber(parsed.colorVision.total, 0, 1e9, 0);
          const avg = nextDetections > 0 ? Math.round((nextHits / nextDetections) * 100) : 0;
          return {
            totalSessions: nextSessions,
            totalHits: nextHits,
            totalMisses: nextMisses,
            totalDetections: nextDetections,
            averageAccuracy: avg,
            lastSessionAt: parsed.completedAt,
            lastSession: {
              ...parsed.colorVision,
              completedAt: parsed.completedAt
            }
          };
        })(),
        recentSessions: [sessionSummary, ...prevRecent].slice(0, 60),
        lastSession: sessionSummary
      };

      const nowIso = new Date().toISOString();
      const nextStudents = students.slice();
      nextStudents[index] = {
        ...student,
        usage: nextUsage,
        lastAudioAccessAt: parsed.completedAt || nowIso,
        updatedAt: nowIso
      };
      await writeStudents(nextStudents);
      return res.status(200).json({ ok: true });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const [students, appSettings] = await Promise.all([readStudents(), readAppSettings()]);
    const requestedSlug = String(req.query.slug || "").trim();
    const requestedToken = String(req.query.token || "").trim();
    if (requestedSlug || requestedToken) {
      if (!requestedSlug || !requestedToken) {
        return res.status(400).json({ error: "Datos incompletos" });
      }
      const student = students.find((item) => item.slug === requestedSlug);
      if (!student) {
        return res.status(404).json({ error: "Estudiante no encontrado" });
      }
      if (String(student.token || "") !== requestedToken) {
        return res.status(403).json({ error: "Token inválido" });
      }
      return res.status(200).json({
        student: buildAuthenticatedStudent(student, appSettings)
      });
    }

    const sessionAuth = findStudentBySession(students, req);
    if (sessionAuth) {
      const nextStudents = students.slice();
      const nextStudent = touchStudentSession(sessionAuth.student, sessionAuth.tokenHash);
      nextStudents[sessionAuth.index] = nextStudent;
      await writeStudents(nextStudents);
      return res.status(200).json({
        student: buildAuthenticatedStudent(nextStudent, appSettings)
      });
    }

    const safe = students.map((item) => {
      const advancedInfo = getAdvancedAccessInfo(item);
      const hasApprovedAudio = advancedInfo.beginnerReady;
      return {
        name: item.name,
        slug: item.slug,
        audioReady: hasApprovedAudio,
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || "",
        lastAudioAccessAt: item.lastAudioAccessAt || "",
        usage: buildSafeUsageSummary(item.usage || {}),
        beginnerAudioProgress: advancedInfo.progress,
        advancedUnlockPolicy: advancedInfo.unlockPolicy,
        advancedBlockedReason: advancedInfo.blockedReason,
        audioWorkflow: buildSafeAudioWorkflow(item),
        features: buildStudentFeatures(item, appSettings)
      };
    });
    return res.status(200).json({
      students: safe,
      settings: {
        magicUnlockScore: appSettings.magicUnlockScore,
        channelingEnabled: Boolean(appSettings.channelingEnabled)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo cargar estudiantes" });
  }
}

export { buildAuthenticatedStudent, buildMobileAudio, buildStudentFeatures, hasApprovedAdvancedAudio };
