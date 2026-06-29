import { readStudents, writeStudents } from "../../lib/r2.js";
import { isSuperAdmin, verifyAdminPassword } from "../../lib/auth.js";

const ARGENTINA_OFFSET_MINUTES = -3 * 60;
const AUTO_SLUG_FALLBACK = "daro";
const AUTO_SOURCE = "auto-23-argentina";
const AUTO_HOUR_ARGENTINA = 23;
const AUTO_MINUTE_ARGENTINA = 0;
const DEFAULT_LOOKBACK_DAYS = 14;
const CLASSIC_BREATHING = {
  breathsPerCycle: 36,
  inhaleSeconds: 1.5,
  exhaleSeconds: 1.53,
  recoverySeconds: 17,
  cycles: 3,
  breathStyle: "activation"
};

const clampNumber = (value, min, max, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
};

const normalizeDateKey = (value) => {
  const key = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : "";
};

const argentinaDate = (timestamp = Date.now()) =>
  new Date(timestamp + ARGENTINA_OFFSET_MINUTES * 60 * 1000);

const argentinaDateKey = (timestamp = Date.now()) =>
  argentinaDate(timestamp).toISOString().slice(0, 10);

const shiftDateKey = (dateKey, offsetDays) => {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const argentinaLocalIso = (dateKey, hour = 11, minute = 30, second = 0) => {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hour + 3, minute, second);
  return Number.isNaN(utcMs) ? new Date().toISOString() : new Date(utcMs).toISOString();
};

const hasReachedArgentinaCutoff = (timestamp = Date.now()) => {
  const date = argentinaDate(timestamp);
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  return hour > AUTO_HOUR_ARGENTINA || (hour === AUTO_HOUR_ARGENTINA && minute >= AUTO_MINUTE_ARGENTINA);
};

const isAuthorized = async (req) => {
  const expectedSecret = String(process.env.CRON_SECRET || "").trim();
  const bearer = String(req.headers.authorization || "").trim();
  if (expectedSecret) {
    return bearer === `Bearer ${expectedSecret}`;
  }

  if (req.headers["x-vercel-cron"]) return true;

  const password = String(req.query.password || req.body?.password || "").trim();
  if (!password) return false;
  return (await verifyAdminPassword(password)) || isSuperAdmin(password);
};

const practiceCountForDay = (usage = {}, dayKey) => {
  const sessionsByDay = usage.sessionsByDay || {};
  const practiceActivityByDay = usage.practiceActivityByDay || {};
  const recentSessions = Array.isArray(usage.recentSessions) ? usage.recentSessions : [];
  const directCount = Math.max(
    Number(sessionsByDay[dayKey] || 0),
    Number(practiceActivityByDay[dayKey] || 0)
  );
  if (directCount > 0) return directCount;
  return recentSessions.some((session) => {
    const timestamp = Date.parse(session.completedAt || "");
    return Number.isFinite(timestamp) && argentinaDateKey(timestamp) === dayKey;
  })
    ? 1
    : 0;
};

const hasApneaTimes = (session = {}) => (
  Array.isArray(session.apneaByRound) &&
  session.apneaByRound.some((seconds) => clampNumber(seconds, 0, 36000, 0) > 0)
);

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
    lastAt: latestIso(previous.lastAt, completedAt)
  };
  return next;
};

const latestIso = (...values) => {
  let best = "";
  let bestTs = 0;
  values.forEach((value) => {
    const text = String(value || "");
    const ts = Date.parse(text);
    if (Number.isFinite(ts) && ts > bestTs) {
      best = text;
      bestTs = ts;
    }
  });
  return best;
};

const sessionDateKey = (session = {}) => (
  normalizeDateKey(session.date) ||
  normalizeDateKey(session.autoFillDate) ||
  (() => {
    const timestamp = Date.parse(session.completedAt || session.startedAt || "");
    return Number.isFinite(timestamp) ? argentinaDateKey(timestamp) : "";
  })()
);

const backfillApneaByDayFromRecent = (student) => {
  const usage = student.usage || {};
  let apneaByDay = normalizeApneaByDay(usage.apneaByDay);
  let addedDays = 0;
  const sessions = [
    ...(usage.lastSession ? [usage.lastSession] : []),
    ...(Array.isArray(usage.recentSessions) ? usage.recentSessions : [])
  ];
  const seen = new Set();

  sessions.forEach((session) => {
    const dateKey = sessionDateKey(session);
    if (!dateKey || apneaByDay[dateKey]?.times?.length) return;
    const times = Array.isArray(session.apneaByRound)
      ? session.apneaByRound.filter((seconds) => clampNumber(seconds, 0, 36000, 0) > 0)
      : [];
    if (!times.length) return;
    const sessionKey = `${dateKey}|${session.completedAt || ""}|${JSON.stringify(times)}`;
    if (seen.has(sessionKey)) return;
    seen.add(sessionKey);
    apneaByDay = addApneaDayEntry(apneaByDay, dateKey, times, session.completedAt || session.startedAt || "");
    addedDays += 1;
  });

  if (addedDays === 0) {
    return { student, addedDays: 0 };
  }

  return {
    addedDays,
    student: {
      ...student,
      usage: {
        ...usage,
        apneaByDay
      },
      updatedAt: new Date().toISOString()
    }
  };
};

const seededNumber = (seed) => {
  let hash = 2166136261;
  const text = String(seed || "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};

const seededInt = (seed, min, max) => (
  Math.round(min + seededNumber(seed) * (max - min))
);

const collectApneaTemplates = (usage = {}, dateKey = "") => {
  const sessions = [
    ...(usage.lastSession ? [usage.lastSession] : []),
    ...(Array.isArray(usage.recentSessions) ? usage.recentSessions : [])
  ];
  const seen = new Set();
  return sessions
    .filter((session) => {
      const completedAt = String(session.completedAt || "");
      const completedTs = Date.parse(completedAt);
      const sessionDay = Number.isFinite(completedTs) ? argentinaDateKey(completedTs) : "";
      const key = `${completedAt}|${JSON.stringify(session.apneaByRound || [])}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return !dateKey || !sessionDay || sessionDay !== dateKey;
    })
    .map((session) => (
      Array.isArray(session.apneaByRound)
        ? session.apneaByRound.slice(0, 3).map((seconds) => clampNumber(seconds, 0, 36000, 0))
        : []
    ))
    .filter((rounds) => rounds.length >= 3 && rounds.every((seconds) => seconds > 0));
};

const buildAutoApneas = (usage = {}, dateKey = "", slug = "daro") => {
  const seed = `${slug}:${dateKey}`;
  const templates = collectApneaTemplates(usage, dateKey);
  if (templates.length > 0) {
    const template = templates[seededInt(`${seed}:template`, 0, templates.length - 1)];
    const jittered = template.map((seconds, index) => (
      clampNumber(seconds + seededInt(`${seed}:jitter:${index}`, -8, 8), 90, 260, seconds)
    ));
    return [
      clampNumber(jittered[0], 125, 145, 130),
      clampNumber(Math.max(jittered[1], jittered[0] + 12), 138, 175, 155),
      clampNumber(Math.max(jittered[2], jittered[1] + 10), 150, 195, 180)
    ];
  }

  const first = seededInt(`${seed}:first`, 130, 138);
  const second = seededInt(`${seed}:second`, 150, 168);
  const third = seededInt(`${seed}:third`, 172, 188);
  return [
    first,
    Math.max(second, first + 12),
    Math.max(third, second + 10)
  ];
};

const buildAutoSession = (student, dateKey) => {
  const usage = student.usage || {};
  const slug = String(student.slug || student.name || AUTO_SLUG_FALLBACK).trim().toLowerCase();
  const apneaByRound = buildAutoApneas(usage, dateKey, slug);
  const startedAt = argentinaLocalIso(dateKey, AUTO_HOUR_ARGENTINA, AUTO_MINUTE_ARGENTINA, 0);
  const durationSeconds = Math.round(
    CLASSIC_BREATHING.cycles *
      (
        CLASSIC_BREATHING.breathsPerCycle *
          (CLASSIC_BREATHING.inhaleSeconds + CLASSIC_BREATHING.exhaleSeconds) +
        CLASSIC_BREATHING.recoverySeconds
      )
  );
  const completedAt = new Date(Date.parse(startedAt) + durationSeconds * 1000).toISOString();
  return {
    sessionType: "breathing",
    flowStage: "",
    completedRounds: CLASSIC_BREATHING.cycles,
    plannedRounds: CLASSIC_BREATHING.cycles,
    breathsPerCycle: CLASSIC_BREATHING.breathsPerCycle,
    breathsDoneTotal: CLASSIC_BREATHING.breathsPerCycle * CLASSIC_BREATHING.cycles,
    apneaByRound,
    completedAt,
    startedAt,
    date: dateKey,
    durationSeconds,
    partial: false,
    manualStop: false,
    autoFilled: true,
    autoFillSource: AUTO_SOURCE,
    autoFillDate: dateKey,
    config: CLASSIC_BREATHING
  };
};

const addAutoBreathingForDay = (student, dateKey) => {
  const usage = student.usage || {};
  const recentSessions = Array.isArray(usage.recentSessions) ? usage.recentSessions : [];
  const existingAutoIndex = recentSessions.findIndex((session) => (
    session?.autoFilled &&
    session?.autoFillDate === dateKey &&
    !hasApneaTimes(session)
  ));
  const lastSessionMatchesAuto =
    usage.lastSession?.autoFilled &&
    usage.lastSession?.autoFillDate === dateKey &&
    !hasApneaTimes(usage.lastSession);

  if (practiceCountForDay(usage, dateKey) > 0 && existingAutoIndex < 0 && !lastSessionMatchesAuto) {
    return { student, added: false, reason: "already-has-practice" };
  }

  const session = buildAutoSession(student, dateKey);
  const sessionsByDay = normalizeUsageMap(usage.sessionsByDay);
  const practiceActivityByDay = normalizeUsageMap(usage.practiceActivityByDay);
  const repairedExistingAuto = existingAutoIndex >= 0 || lastSessionMatchesAuto;
  const filteredRecent = repairedExistingAuto
    ? recentSessions.filter((item) => !(item?.autoFilled && item?.autoFillDate === dateKey && !hasApneaTimes(item)))
    : recentSessions.filter((item) => item.autoFillDate !== dateKey);
  const nextRecent = [session, ...filteredRecent]
    .sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")))
    .slice(0, 60);
  const nowIso = new Date().toISOString();
  const completedAt = session.completedAt;
  const previousLastSession = usage.lastSession || null;
  const nextLastSession = previousLastSession &&
    String(previousLastSession.completedAt || "").localeCompare(session.completedAt) > 0
    ? previousLastSession
    : session;
  const lastActivityAt = latestIso(usage.lastActivityAt, usage.lastSessionAt, student.lastAudioAccessAt, completedAt);
  const firstActivityAt = latestIso(usage.firstActivityAt) || completedAt;
  const firstSessionAt = latestIso(usage.firstSessionAt) || completedAt;
  const prevSums = Array.isArray(usage.apneaRoundSums) ? usage.apneaRoundSums.slice(0, 10) : [];
  const prevCounts = Array.isArray(usage.apneaRoundCounts) ? usage.apneaRoundCounts.slice(0, 10) : [];
  const nextSums = [];
  const nextCounts = [];
  for (let i = 0; i < 10; i += 1) {
    const apneaSeconds = clampNumber(session.apneaByRound[i], 0, 36000, -1);
    nextSums[i] = clampNumber(prevSums[i], 0, 1e9, 0) + (apneaSeconds >= 0 ? apneaSeconds : 0);
    nextCounts[i] = clampNumber(prevCounts[i], 0, 1e9, 0) + (apneaSeconds >= 0 ? 1 : 0);
  }

  return {
    added: !repairedExistingAuto,
    repaired: repairedExistingAuto,
    reason: repairedExistingAuto ? "repaired-auto-apneas" : "added",
    session,
    student: {
      ...student,
      usage: {
        ...usage,
        firstActivityAt,
        lastActivityAt,
        firstSessionAt,
        lastSessionAt: latestIso(usage.lastSessionAt, completedAt),
        totalSessions: clampNumber(usage.totalSessions, 0, 1e9, 0) + (repairedExistingAuto ? 0 : 1),
        totalRounds:
          clampNumber(usage.totalRounds, 0, 1e9, 0) +
          (repairedExistingAuto ? 0 : CLASSIC_BREATHING.cycles),
        totalBreaths:
          clampNumber(usage.totalBreaths, 0, 1e9, 0) +
          (repairedExistingAuto ? 0 : CLASSIC_BREATHING.breathsPerCycle * CLASSIC_BREATHING.cycles),
        sessionsByDay: {
          ...sessionsByDay,
          [dateKey]: Math.max(
            clampNumber(sessionsByDay[dateKey], 0, 9999, 0),
            repairedExistingAuto ? 1 : clampNumber(sessionsByDay[dateKey], 0, 9999, 0) + 1
          )
        },
        practiceActivityByDay: {
          ...practiceActivityByDay,
          [dateKey]: Math.max(clampNumber(practiceActivityByDay[dateKey], 0, 9999, 0), 1)
        },
        apneaRoundSums: nextSums,
        apneaRoundCounts: nextCounts,
        apneaByDay: addApneaDayEntry(usage.apneaByDay, dateKey, session.apneaByRound, completedAt),
        recentSessions: nextRecent,
        lastSession: lastSessionMatchesAuto ? session : nextLastSession
      },
      lastAudioAccessAt: latestIso(student.lastAudioAccessAt, completedAt),
      updatedAt: nowIso
    }
  };
};

const getTargetDateKeys = (req) => {
  const explicitDate = normalizeDateKey(req.query.date);
  if (explicitDate) return [explicitDate];

  const today = argentinaDateKey(Date.now());
  const lookbackDays = clampNumber(
    req.query.lookbackDays ?? process.env.AUTO_BREATHING_LOOKBACK_DAYS,
    0,
    14,
    DEFAULT_LOOKBACK_DAYS
  );
  const keys = [];
  for (let offset = lookbackDays; offset >= 1; offset -= 1) {
    const key = shiftDateKey(today, -offset);
    if (key) keys.push(key);
  }
  if (hasReachedArgentinaCutoff(Date.now())) keys.push(today);
  return [...new Set(keys)];
};

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    if (!(await isAuthorized(req))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const targetSlug = String(process.env.AUTO_BREATHING_SLUG || AUTO_SLUG_FALLBACK).trim().toLowerCase();
    const fallbackNames = new Set(["daro", "darío", "dario"]);
    const students = await readStudents();
    const index = students.findIndex((student) => {
      const slug = String(student.slug || "").trim().toLowerCase();
      const name = String(student.name || "").trim().toLowerCase();
      return slug === targetSlug || name === targetSlug || fallbackNames.has(slug) || fallbackNames.has(name);
    });

    if (index < 0) {
      return res.status(404).json({
        error: "Estudiante para auto-respiración no encontrado",
        targetSlug
      });
    }

    const backfillResult = backfillApneaByDayFromRecent(students[index]);
    let targetStudent = backfillResult.student;
    const results = [];
    for (const dateKey of getTargetDateKeys(req)) {
      const result = addAutoBreathingForDay(targetStudent, dateKey);
      targetStudent = result.student;
      results.push({
        dateKey,
        added: result.added,
        repaired: Boolean(result.repaired),
        reason: result.reason,
        completedAt: result.session?.completedAt || ""
      });
    }

    const addedCount = results.filter((item) => item.added).length;
    const repairedCount = results.filter((item) => item.repaired).length;
    const backfilledDays = backfillResult.addedDays || 0;
    if (addedCount > 0 || repairedCount > 0 || backfilledDays > 0) {
      const nextStudents = students.slice();
      nextStudents[index] = targetStudent;
      await writeStudents(nextStudents);
    }

    return res.status(200).json({
      ok: true,
      slug: targetStudent.slug,
      addedCount,
      repairedCount,
      backfilledDays,
      results,
      schedule: "23:00 Argentina",
      config: CLASSIC_BREATHING
    });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo completar respiración automática",
      detail: error?.message || "error"
    });
  }
}
