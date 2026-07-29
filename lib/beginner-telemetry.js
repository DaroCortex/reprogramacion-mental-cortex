import {
  isPreconditionFailed,
  readJson,
  readJsonSnapshot,
  writeJson
} from "./r2.js";
import {
  mergeBeginnerProgressMonotonic,
  normalizeBeginnerAudioUsage
} from "./beginner-progress.js";

const TELEMETRY_VERSION = 1;
const MAX_TELEMETRY_WRITE_ATTEMPTS = 8;

const safeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 100);

const telemetryKey = (slug) => {
  const normalized = safeSlug(slug);
  return normalized ? `telemetry/beginner/${normalized}.json` : "";
};

const validIso = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
};

const earliestIso = (...values) =>
  values.map(validIso).filter(Boolean).sort().at(0) || "";

const latestIso = (...values) =>
  values.map(validIso).filter(Boolean).sort().at(-1) || "";

const mergeCountMaps = (left, right) => {
  const result = {};
  for (const source of [left, right]) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    for (const [key, value] of Object.entries(source)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      const count = Number(value);
      if (!Number.isFinite(count)) continue;
      result[key] = Math.max(result[key] || 0, Math.max(0, Math.min(9999, count)));
    }
  }
  return result;
};

const mergeEvents = (left, right) => {
  const byId = new Map();
  for (const event of [...(left || []), ...(right || [])]) {
    if (!event || typeof event !== "object") continue;
    const identity = String(
      event.eventId ||
        `${event.sessionId || ""}|${event.sequence || 0}|${event.eventType || ""}|${event.eventAt || ""}`
    );
    const previous = byId.get(identity);
    if (!previous || latestIso(previous.eventAt, event.eventAt) === validIso(event.eventAt)) {
      byId.set(identity, event);
    }
  }
  return [...byId.values()]
    .sort((a, b) => String(b.eventAt || "").localeCompare(String(a.eventAt || "")))
    .slice(0, 80);
};

const mergeSessions = (left, right) => {
  const byId = new Map();
  for (const session of [...(left || []), ...(right || [])]) {
    const identity = String(session?.sessionId || "");
    if (!identity) continue;
    const previous = byId.get(identity);
    const previousSequence = Number(previous?.lastSequence || 0);
    const nextSequence = Number(session?.lastSequence || 0);
    if (
      !previous ||
      nextSequence > previousSequence ||
      (
        nextSequence === previousSequence &&
        String(session?.lastEventAt || "") >= String(previous?.lastEventAt || "")
      )
    ) {
      byId.set(identity, session);
    }
  }
  return [...byId.values()]
    .sort((a, b) => String(b.lastEventAt || "").localeCompare(String(a.lastEventAt || "")))
    .slice(0, 40);
};

const mergeLegacySessions = (left, right) => {
  const byId = new Map();
  for (const session of [...(left || []), ...(right || [])]) {
    const identity = String(session?.id || session?.startedAt || "");
    if (!identity) continue;
    const previous = byId.get(identity);
    if (!previous || String(session?.updatedAt || "") >= String(previous?.updatedAt || "")) {
      byId.set(identity, session);
    }
  }
  return [...byId.values()]
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 30);
};

const mergeLegacyBeginnerAudio = (left = {}, right = {}) => {
  const recentSessions = mergeLegacySessions(left.recentSessions, right.recentSessions);
  const latestSession = [left.lastSession, right.lastSession]
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .at(0) || null;

  return {
    ...left,
    ...right,
    totalStarts: Math.max(Number(left.totalStarts || 0), Number(right.totalStarts || 0)),
    completedPlays: Math.max(Number(left.completedPlays || 0), Number(right.completedPlays || 0)),
    partialPlays: Math.max(Number(left.partialPlays || 0), Number(right.partialPlays || 0)),
    totalListenSeconds: Math.max(
      Number(left.totalListenSeconds || 0),
      Number(right.totalListenSeconds || 0)
    ),
    lastStartedAt: latestIso(left.lastStartedAt, right.lastStartedAt),
    lastProgressAt: latestIso(left.lastProgressAt, right.lastProgressAt),
    lastCompletedAt: latestIso(left.lastCompletedAt, right.lastCompletedAt),
    sessionsByDay: mergeCountMaps(left.sessionsByDay, right.sessionsByDay),
    completedByDay: mergeCountMaps(left.completedByDay, right.completedByDay),
    recentSessions,
    lastSession: latestSession
  };
};

const buildTelemetryRecord = (student) => {
  const usage = student?.usage || {};
  return {
    version: TELEMETRY_VERSION,
    slug: safeSlug(student?.slug),
    usage: {
      beginnerAudioUsage: normalizeBeginnerAudioUsage(usage),
      ...(usage.beginnerAudio ? { beginnerAudio: usage.beginnerAudio } : {}),
      firstActivityAt: validIso(usage.firstActivityAt),
      lastActivityAt: validIso(usage.lastActivityAt),
      practiceActivityByDay: mergeCountMaps(usage.practiceActivityByDay)
    },
    lastAudioAccessAt: validIso(student?.lastAudioAccessAt),
    updatedAt: validIso(student?.updatedAt) || new Date().toISOString()
  };
};

const mergeTelemetryRecords = (stored, incoming) => {
  if (!stored?.usage) return incoming;
  const storedProgress = normalizeBeginnerAudioUsage(stored.usage);
  const incomingProgress = normalizeBeginnerAudioUsage(incoming.usage);
  const progress = mergeBeginnerProgressMonotonic(storedProgress, incomingProgress);
  const beginnerAudioUsage = normalizeBeginnerAudioUsage({
    beginnerAudioUsage: {
      ...progress,
      events: mergeEvents(storedProgress.events, incomingProgress.events),
      sessions: mergeSessions(storedProgress.sessions, incomingProgress.sessions)
    }
  });

  return {
    version: TELEMETRY_VERSION,
    slug: incoming.slug || stored.slug,
    usage: {
      beginnerAudioUsage,
      ...(
        stored.usage.beginnerAudio || incoming.usage.beginnerAudio
          ? {
              beginnerAudio: mergeLegacyBeginnerAudio(
                stored.usage.beginnerAudio,
                incoming.usage.beginnerAudio
              )
            }
          : {}
      ),
      firstActivityAt: earliestIso(
        stored.usage.firstActivityAt,
        incoming.usage.firstActivityAt
      ),
      lastActivityAt: latestIso(
        stored.usage.lastActivityAt,
        incoming.usage.lastActivityAt
      ),
      practiceActivityByDay: mergeCountMaps(
        stored.usage.practiceActivityByDay,
        incoming.usage.practiceActivityByDay
      )
    },
    lastAudioAccessAt: latestIso(stored.lastAudioAccessAt, incoming.lastAudioAccessAt),
    updatedAt: latestIso(stored.updatedAt, incoming.updatedAt)
  };
};

const readBeginnerTelemetry = async (slug) => {
  const key = telemetryKey(slug);
  if (!key) return null;
  const value = await readJson(key, null);
  return value && typeof value === "object" && value.slug === safeSlug(slug) ? value : null;
};

const hydrateBeginnerTelemetry = async (student) => {
  if (!student?.slug) return student;
  const telemetry = await readBeginnerTelemetry(student.slug);
  if (!telemetry?.usage) return student;

  const currentUsage = student.usage || {};
  const storedUsage = telemetry.usage || {};
  const currentProgress = normalizeBeginnerAudioUsage(currentUsage);
  const storedProgress = normalizeBeginnerAudioUsage(storedUsage);
  const useStoredProgress =
    latestIso(storedProgress.lastEventAt) >= latestIso(currentProgress.lastEventAt);

  return {
    ...student,
    usage: {
      ...currentUsage,
      ...(storedUsage.beginnerAudio ? { beginnerAudio: storedUsage.beginnerAudio } : {}),
      beginnerAudioUsage: useStoredProgress
        ? storedProgress
        : currentProgress,
      firstActivityAt: earliestIso(currentUsage.firstActivityAt, storedUsage.firstActivityAt),
      lastActivityAt: latestIso(currentUsage.lastActivityAt, storedUsage.lastActivityAt),
      practiceActivityByDay: mergeCountMaps(
        currentUsage.practiceActivityByDay,
        storedUsage.practiceActivityByDay
      )
    },
    lastAudioAccessAt: latestIso(student.lastAudioAccessAt, telemetry.lastAudioAccessAt),
    updatedAt: latestIso(student.updatedAt, telemetry.updatedAt)
  };
};

const writeBeginnerTelemetry = async (student) => {
  const key = telemetryKey(student?.slug);
  if (!key) return null;
  const incoming = buildTelemetryRecord(student);

  for (let attempt = 1; attempt <= MAX_TELEMETRY_WRITE_ATTEMPTS; attempt += 1) {
    const snapshot = await readJsonSnapshot(key, null);
    const merged = mergeTelemetryRecords(snapshot.value, incoming);
    try {
      await writeJson(
        key,
        merged,
        snapshot.etag ? { ifMatch: snapshot.etag } : { ifNoneMatch: "*" }
      );
      return merged;
    } catch (error) {
      if (!isPreconditionFailed(error) || attempt === MAX_TELEMETRY_WRITE_ATTEMPTS) {
        throw error;
      }
    }
  }
  throw new Error("No se pudo consolidar la telemetria de Principiante");
};

export {
  hydrateBeginnerTelemetry,
  mergeTelemetryRecords,
  readBeginnerTelemetry,
  telemetryKey,
  writeBeginnerTelemetry
};
