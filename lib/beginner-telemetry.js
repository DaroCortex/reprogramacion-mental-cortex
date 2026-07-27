import { readJson, writeJson } from "./r2.js";
import { normalizeBeginnerAudioUsage } from "./beginner-progress.js";

const TELEMETRY_VERSION = 1;

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
  if (!key) return;
  const usage = student.usage || {};
  await writeJson(key, {
    version: TELEMETRY_VERSION,
    slug: safeSlug(student.slug),
    usage: {
      beginnerAudioUsage: normalizeBeginnerAudioUsage(usage),
      ...(usage.beginnerAudio ? { beginnerAudio: usage.beginnerAudio } : {}),
      firstActivityAt: validIso(usage.firstActivityAt),
      lastActivityAt: validIso(usage.lastActivityAt),
      practiceActivityByDay: mergeCountMaps(usage.practiceActivityByDay)
    },
    lastAudioAccessAt: validIso(student.lastAudioAccessAt),
    updatedAt: validIso(student.updatedAt) || new Date().toISOString()
  });
};

export {
  hydrateBeginnerTelemetry,
  readBeginnerTelemetry,
  telemetryKey,
  writeBeginnerTelemetry
};
