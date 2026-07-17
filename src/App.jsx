import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DailyGoalsModule from "./modules/daily/DailyGoalsModule";
import Admin2Dashboard from "./Admin2Dashboard";

const DEFAULT_CONFIG = {
  breathsPerCycle: 30,
  inhaleSeconds: 2,
  exhaleSeconds: 2,
  recoverySeconds: 15,
  cycles: 3,
  breathStyle: "activation",
  audioVolume: 0.8,
  breathCueVolume: 1,
  bosqueVolume: 0.5,
  ambientSound: "bosque",
  septasyncTrack: "none",
  septasyncVolume: 0.5,
  reverbMix: 0.12,
  reverbMode: "soft"
};

const PHASE_LABELS = {
  idle: "Listo para iniciar",
  breathing: "Audio de reprogramación mental",
  apnea: "Apnea",
  recovery: "Recuperación",
  complete: "Sesión completada"
};

const TICK_MS = 100;
const DOUBLE_TAP_MS = 280;
const NOSTRIL_PREVIEW_MS = 500;
const DIRECT_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024;
const STOP_HOLD_MS = 1000;
const FINALIZE_HOLD_MS = 1500;
const PRE_APNEA_BREATHS_LEFT = 1;
const ALERT_WARNING_HOURS = 48;
const ALERT_CRITICAL_HOURS = 72;
const DEFAULT_WHITE_MAGIC_UNLOCK_SCORE = 82;
const SEGUIMIENTO_DASHBOARD_URL = "https://seguimiento-academia-v2-m4j7pg92s-darocortexs-projects.vercel.app/";
const WHITE_MAGIC_BONUS = [
  {
    month: "Enero",
    title: "El Decreto del Guerrero",
    goal: "Escribir 10 metas concretas del año y verlas todos los días."
  },
  {
    month: "Febrero",
    title: "El Espejo del Amor Propio",
    goal: "7 días seguidos diciendo 3 cosas que amas de vos frente al espejo."
  },
  {
    month: "Marzo",
    title: "El Billete Magnético",
    goal: "Ahorrar durante 21 días consecutivos, aunque sean monedas."
  },
  {
    month: "Abril",
    title: "El Escudo de Ropa",
    goal: "Eliminar 3 fuentes de energía negativa (hábitos, personas o espacios)."
  },
  {
    month: "Mayo",
    title: "La Carta al Futuro",
    goal: "Actualizar CV/portfolio o dar un paso real a un nuevo proyecto."
  },
  {
    month: "Junio",
    title: "El Baño del Sol Interior",
    goal: "14 días seguidos de actividad física."
  },
  {
    month: "Julio",
    title: "El Círculo de Fuego",
    goal: "Reconectar con 3 personas."
  },
  {
    month: "Agosto",
    title: "El Libro de las Sombras",
    goal: "Escribir diario personal durante 10 días."
  },
  {
    month: "Septiembre",
    title: "La Balanza de Cristal",
    goal: "Ordenar a fondo un espacio abandonado de tu casa."
  },
  {
    month: "Octubre",
    title: "La Carta de Fuego",
    goal: "Escribir una carta de perdón y leerla en voz alta."
  },
  {
    month: "Noviembre",
    title: "El Altar de Gratitud Viviente",
    goal: "Enviar agradecimiento real a 3 personas."
  },
  {
    month: "Diciembre",
    title: "El Gran Sello del Año",
    goal: "Completar 12 mensuales + al menos 6 bonus."
  }
];

const SYSTEM_AUDIO = {
  respirax1: { slug: "respira" },
  bosque7: { slug: "bosq" },
  oceano: { slug: "oceano", token: "0b1c639be3bfbd85ce0b03878cfe2da0" },
  inalamos: { slug: "inala" },
  septasyncBalance: { slug: "balance", token: "feac0b11ec4cc1075e8d3cab8820da64" },
  septasyncGamma: { slug: "gamma", token: "fab74156451bda36e14983914723b1cc" },
  septasyncTrance: { slug: "trance", token: "3d662b5c21e6ed1373a269ee865a4193" }
};

const SPEED_OPTIONS = [
  { id: "rapida", label: "Rápida 1.5s/1.53s", inhale: 1.5, exhale: 1.53 },
  { id: "normal", label: "Normal 2s/2s", inhale: 2, exhale: 2 },
  { id: "lenta", label: "Lenta 2.5s/2.5s", inhale: 2.5, exhale: 2.5 }
];
const BREATH_STYLE_OPTIONS = [
  { id: "activation", label: "Activacion" },
  { id: "reset", label: "Reset" },
  { id: "comfort", label: "Confort" }
];

const BREATH_STYLE_SHORT_LABELS = {
  activation: "Activación",
  reset: "Reset",
  comfort: "Confort"
};

const SPEED_SHORT_LABELS = {
  rapida: "Rápida",
  normal: "Normal",
  lenta: "Lenta"
};

const BREATHS_OPTIONS = [36, 42, 48];
const CYCLES_OPTIONS = [3, 5, 8, 15];
const REVERB_MODE_OPTIONS = [
  { id: "off", label: "Off" },
  { id: "soft", label: "Suave" },
  { id: "camera", label: "Camara" }
];
const BEGINNER_COMPLETION_DAYS_REQUIRED = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const WORKFLOW_STATUS_LABELS = {
  pending: "Pendiente",
  requested: "Solicitud enviada",
  submitted: "Audio recibido",
  edited: "Editado listo",
  approved: "Aprobado"
};
const STUDENT_STATUS_LABELS = {
  active: "Activo",
  inactive: "Inactivo"
};
const AGE_BUCKET_LABELS = {
  "age-30": "0-30 dias",
  "age-60": "31-60 dias",
  "age-90": "61-90 dias",
  "age-90plus": "+90 dias",
  "age-unknown": "Sin fecha"
};
const PRACTICE_OPTIONS = [
  { id: "principiante", label: "Reprogramacion Mental Principiante", enabled: false },
  { id: "reprogramacion", label: "Reprogramacion Mental Advanced", enabled: false },
  { id: "metas", label: "Metas Diarias", enabled: true },
  { id: "colores", label: "Practica de visualizacion de colores", enabled: false },
  { id: "remota", label: "Practica de vision remota", enabled: false },
  { id: "meditacion", label: "Practica de meditacion", enabled: false },
  { id: "telekinesis", label: "Practica de telekinesis", enabled: false },
  { id: "magia", label: "Sesiones de canalizacion", enabled: false }
];

const MS_PER_HOUR = 1000 * 60 * 60;
const DAILY_QUICK_STATUS = ["done", "partial", "missed"];
const hasColorPracticeAccess = (studentItem) => Boolean(studentItem?.features?.colorVisionEnabled);

const getWorkflowRequestLabel = (workflow = {}) => {
  if (workflow?.requestLabel) return workflow.requestLabel;
  if (workflow?.requestType === "special-binaural" || workflow?.requestSource === "special") {
    return "Pedido especial binaural";
  }
  if (workflow?.requestType === "student-audio") return "Audio de estudiante";
  return "";
};

const isSpecialWorkflow = (workflow = {}) =>
  workflow?.requestType === "special-binaural" || workflow?.requestSource === "special";

const isAutomaticAudioWorkflow = (workflow = {}) =>
  workflow?.requestType === "formulario-auto-audio" || workflow?.requestSource === "formulario-cortex";

const hasWorkflowAudioAsset = (workflow = {}) =>
  Boolean(
    workflow?.rawAudioKey ||
      workflow?.beginnerAudioKey ||
      workflow?.beginnerAltAudioKey ||
      workflow?.editorAudioKey ||
      workflow?.hasRawAudio ||
      workflow?.hasBeginnerAudio ||
      workflow?.hasBeginnerAltAudio ||
      workflow?.hasEditedAudio
  );

const safeTimestamp = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
};

const getStudentStatus = (studentItem = {}) =>
  studentItem.status === "inactive" || studentItem.inactive ? "inactive" : "active";

const getStudentAgeDays = (studentItem = {}, now = Date.now()) => {
  const createdAt = safeTimestamp(studentItem.createdAt);
  if (!createdAt) return null;
  return Math.max(0, Math.floor((now - createdAt) / DAY_MS));
};

const getAgeBucket = (ageDays) => {
  if (!Number.isFinite(ageDays)) return "age-unknown";
  if (ageDays <= 30) return "age-30";
  if (ageDays <= 60) return "age-60";
  if (ageDays <= 90) return "age-90";
  return "age-90plus";
};

const getBeginnerAudioProgress = (studentItem = {}) => {
  const source =
    studentItem?.beginnerAudioProgress ||
    studentItem?.usage?.beginnerAudioUsage ||
    studentItem?.usage?.beginnerAudio ||
    {};
  const rawCompletedByDay =
    source.completedByDay && typeof source.completedByDay === "object" && !Array.isArray(source.completedByDay)
      ? source.completedByDay
      : {};
  const completedByDay = Object.fromEntries(
    Object.entries(rawCompletedByDay)
      .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(String(key)))
      .map(([key, value]) => [
        key,
        typeof value === "object" && value !== null
          ? {
              completedAt: String(value.completedAt || value.eventAt || ""),
              count: Number(value.count || 1),
              kind: String(value.kind || "beginner")
            }
          : {
              completedAt: "",
              count: Number(value || 1),
              kind: "beginner"
            }
      ])
  );
  const normalizedEvents = Array.isArray(source.events)
    ? source.events.slice(0, 80)
    : Array.isArray(source.recentSessions)
      ? source.recentSessions.slice(0, 80).map((session) => ({
          eventType: session.completed || session.status === "complete" ? "completed" : session.status || "event",
          eventAt: session.completedAt || session.updatedAt || session.startedAt || "",
          dayKey: String(session.startedAt || session.updatedAt || "").slice(0, 10),
          kind: session.audioId === "beginner-2" ? "beginner-alt" : "beginner",
          durationSeconds: Number(session.durationSeconds || 0),
          currentTimeSeconds: Number(session.maxPositionSeconds || session.listenedSeconds || 0),
          playedSeconds: Number(session.listenedSeconds || session.maxPositionSeconds || 0),
          completionPercent: Number(session.percent || 0) / 100,
          completed: Boolean(session.completed || session.status === "complete"),
          interrupted: session.status === "partial",
          seeked: false,
          source: "legacy"
        }))
      : [];
  const completedDays = Object.keys(completedByDay).length;
  return {
    completedByDay,
    completedDays,
    requiredDays: Number(source.requiredDays || BEGINNER_COMPLETION_DAYS_REQUIRED),
    remainingDays: Math.max(0, BEGINNER_COMPLETION_DAYS_REQUIRED - completedDays),
    lastEventAt: String(source.lastEventAt || normalizedEvents[0]?.eventAt || ""),
    lastCompletedAt: String(source.lastCompletedAt || ""),
    events: normalizedEvents
  };
};

const ADVANCED_GRANDFATHER_CUTOFF_ISO = "2026-06-29T20:16:00.000Z";

const safeDateTime = (value) => {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : 0;
};

const hasModernAdvancedAudio = (workflow = {}) => Boolean(
  workflow.rawAudioKey ||
    workflow.hasRawAudio ||
    workflow.rawUploadedAt ||
    workflow.submittedAt ||
    workflow.editorAudioKey ||
    workflow.hasEditedAudio
);

const isGrandfatheredLegacyAdvancedStudent = (studentItem, workflow = studentItem?.audioWorkflow || {}) => {
  if (!studentItem?.audioReady && !studentItem?.audioKey) return false;
  if (hasModernAdvancedAudio(workflow)) return false;
  const createdAt = safeDateTime(studentItem?.createdAt);
  const cutoff = safeDateTime(ADVANCED_GRANDFATHER_CUTOFF_ISO);
  return Boolean(createdAt && cutoff && createdAt < cutoff);
};

const getAdvancedAccessInfo = (studentItem) => {
  const workflow = studentItem?.audioWorkflow || {};
  const progress = getBeginnerAudioProgress(studentItem);
  const beginnerReady = Boolean(
    studentItem?.audioReady ||
      studentItem?.audioKey ||
      workflow.beginnerAudioKey ||
      workflow.hasBeginnerAudio ||
      workflow.status === "approved" ||
      studentItem?.features?.beginnerReprogrammingEnabled
  );
  const submittedPersonalAudio = Boolean(
    studentItem?.audioKey ||
      workflow.rawAudioKey ||
      workflow.hasRawAudio ||
      workflow.rawUploadedAt ||
      workflow.submittedAt ||
      workflow.editorAudioKey ||
      workflow.hasEditedAudio ||
      workflow.status === "submitted"
  );
  const advancedAudioReady = Boolean(
    studentItem?.audioKey ||
      ((workflow.editorAudioKey || workflow.hasEditedAudio) && workflow.status === "approved")
  );
  const legacyGrandfathered = isGrandfatheredLegacyAdvancedStudent(studentItem, workflow);
  const completedRequiredDays = progress.completedDays >= BEGINNER_COMPLETION_DAYS_REQUIRED;
  const manualEnabled = Boolean(
    (studentItem?.features?.advancedReprogrammingEnabled && (advancedAudioReady || legacyGrandfathered)) ||
      legacyGrandfathered
  );
  const unlocked = Boolean(
    manualEnabled ||
      legacyGrandfathered ||
      (beginnerReady && completedRequiredDays && submittedPersonalAudio && advancedAudioReady)
  );
  let blockedReason = "";
  if (!unlocked) {
    if (!beginnerReady) blockedReason = "missing-beginner-audio";
    else if (!completedRequiredDays) blockedReason = "beginner-days";
    else if (!submittedPersonalAudio) blockedReason = "missing-personal-audio";
    else if (!advancedAudioReady) blockedReason = "advanced-audio-pending";
  }

  return {
    hasApprovedAudio: beginnerReady,
    beginnerReady,
    advancedAudioReady: advancedAudioReady || legacyGrandfathered,
    submittedPersonalAudio,
    completedRequiredDays,
    legacyGrandfathered,
    completedDays: progress.completedDays,
    requiredDays: BEGINNER_COMPLETION_DAYS_REQUIRED,
    remainingDays: progress.remainingDays,
    unlocked,
    blockedReason,
    daysUntil: progress.remainingDays,
    progress
  };
};

const toIsoDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

const padDatePart = (value) => String(value).padStart(2, "0");

const localStartOfDay = (date = new Date()) => (
  new Date(date.getFullYear(), date.getMonth(), date.getDate())
);

const localDateKey = (input = new Date()) => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
};

const shiftLocalDate = (date, offsetDays) => {
  const next = localStartOfDay(date instanceof Date ? date : new Date(date));
  next.setDate(next.getDate() + offsetDays);
  return next;
};

const compareDateKey = (a, b) => String(a || "").localeCompare(String(b || ""));

const formatWeeklyDay = (key) => {
  const [year, month, day] = String(key || "").split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return key || "-";
  return WEEKDAY_SHORT[date.getDay()] || key;
};

const formatDurationClock = (secondsInput = 0) => {
  const seconds = Math.max(0, Math.round(Number(secondsInput) || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const formatDateShortLabel = (key) => {
  const [year, month, day] = String(key || "").split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return key || "-";
  return `${WEEKDAY_SHORT[date.getDay()] || ""} ${padDatePart(day)}/${padDatePart(month)}`.trim();
};

const normalizeApneaTimes = (session) => {
  const source = Array.isArray(session?.apneaByRound)
    ? session.apneaByRound
    : Array.isArray(session?.rounds)
      ? session.rounds
      : Number(session?.seconds || 0) > 0
        ? [session.seconds]
        : [];
  return source
    .map((value) => Math.max(0, Math.round(Number(value) || 0)))
    .filter((value) => value > 0)
    .slice(0, 10);
};

const normalizeDailyApneaEntry = (entry) => {
  const source = entry && typeof entry === "object" && !Array.isArray(entry)
    ? entry
    : { times: Array.isArray(entry) ? entry : [] };
  const times = Array.isArray(source.times)
    ? source.times
        .map((value) => Math.max(0, Math.round(Number(value) || 0)))
        .filter((value) => value > 0)
    : [];
  const sourceBest = Number(source.best);
  const best = Math.max(Number.isFinite(sourceBest) ? Math.round(sourceBest) : 0, ...times, 0);
  return {
    sessions: Math.max(0, Math.round(Number(source.sessions || (times.length ? 1 : 0)))),
    times,
    best,
    lastAt: String(source.lastAt || "")
  };
};

const buildApneaDailyLog = (usage = {}, limit = 5) => {
  const dailySummary = usage.apneaByDay && typeof usage.apneaByDay === "object" && !Array.isArray(usage.apneaByDay)
    ? usage.apneaByDay
    : {};
  const recent = Array.isArray(usage.recentSessions) ? usage.recentSessions : [];
  const sessions = usage.lastSession ? [usage.lastSession, ...recent] : recent;
  const byDay = new Map();
  const summarizedDays = new Set();
  const seen = new Set();

  Object.entries(dailySummary).forEach(([dateKey, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) return;
    const normalized = normalizeDailyApneaEntry(entry);
    if (!normalized.times.length) return;
    byDay.set(dateKey, {
      dateKey,
      label: formatDateShortLabel(dateKey),
      sessions: normalized.sessions,
      times: normalized.times,
      best: normalized.best,
      lastAt: normalized.lastAt
    });
    summarizedDays.add(dateKey);
  });

  sessions.forEach((session) => {
    const sessionKey = `${session.completedAt || ""}|${session.startedAt || ""}|${JSON.stringify(session.apneaByRound || session.rounds || [])}`;
    if (seen.has(sessionKey)) return;
    seen.add(sessionKey);
    const times = normalizeApneaTimes(session);
    if (!times.length) return;
    const explicitDate = String(session.date || "");
    const dayKey = /^\d{4}-\d{2}-\d{2}$/.test(explicitDate)
      ? explicitDate
      : localDateKey(session.completedAt || session.timestamp || session.startedAt || "");
    if (!dayKey) return;
    if (summarizedDays.has(dayKey)) return;
    const day = byDay.get(dayKey) || {
      dateKey: dayKey,
      label: formatDateShortLabel(dayKey),
      sessions: 0,
      times: []
    };
    day.sessions += 1;
    day.times.push(...times);
    byDay.set(dayKey, day);
  });

  return Array.from(byDay.values())
    .map((day) => ({
      ...day,
      total: day.times.length,
      best: Math.max(...day.times)
    }))
    .sort((a, b) => compareDateKey(b.dateKey, a.dateKey))
    .slice(0, limit && Number.isFinite(limit) ? limit : undefined);
};

const buildWeeklyPracticeStats = (studentItem, nowInput = new Date()) => {
  const nowDate = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const usage = studentItem?.usage || {};
  const sessionsByDay = usage.sessionsByDay || {};
  const practiceActivityByDay = usage.practiceActivityByDay || {};
  const todayKey = localDateKey(nowDate);
  const createdKey = studentItem?.createdAt ? localDateKey(studentItem.createdAt) : "";
  const lastActivityKey =
    localDateKey(usage.lastActivityAt || "") ||
    localDateKey(studentItem?.lastAudioAccessAt || "") ||
    localDateKey(usage.lastSessionAt || "");
  const practiceCountForDay = (key) => Math.max(
    Number(sessionsByDay[key] || 0),
    Number(practiceActivityByDay[key] || 0),
    lastActivityKey === key ? 1 : 0
  );
  const weekKeys = Array.from({ length: 7 }, (_, index) => (
    localDateKey(shiftLocalDate(nowDate, index - 6))
  )).filter(Boolean);
  const trackedKeys = weekKeys.filter((key) => !createdKey || compareDateKey(key, createdKey) >= 0);
  const completedKeys = trackedKeys.filter((key) => practiceCountForDay(key) > 0);
  const missedKeys = trackedKeys
    .filter((key) => key !== todayKey)
    .filter((key) => practiceCountForDay(key) <= 0);
  const weeklySessions = trackedKeys.reduce((sum, key) => sum + practiceCountForDay(key), 0);
  const todaySessions = practiceCountForDay(todayKey);

  let currentStreak = 0;
  const streakStartOffset = todaySessions > 0 ? 0 : 1;
  for (let offset = streakStartOffset; offset < 90; offset += 1) {
    const key = localDateKey(shiftLocalDate(nowDate, -offset));
    if (createdKey && compareDateKey(key, createdKey) < 0) break;
    if (practiceCountForDay(key) <= 0) break;
    currentStreak += 1;
  }

  let consecutiveMisses = 0;
  for (let offset = 1; offset < 90; offset += 1) {
    const key = localDateKey(shiftLocalDate(nowDate, -offset));
    if (createdKey && compareDateKey(key, createdKey) < 0) break;
    if (practiceCountForDay(key) > 0) break;
    consecutiveMisses += 1;
  }

  return {
    weekKeys: trackedKeys,
    practicedDays: completedKeys.length,
    expectedDays: trackedKeys.length,
    weeklySessions,
    missedKeys,
    missedLabels: missedKeys.map(formatWeeklyDay),
    currentStreak,
    consecutiveMisses,
    todaySessions,
    needsAttention: consecutiveMisses >= 2,
    warning: consecutiveMisses === 1
  };
};

const normalizeRoundArray = (value, limit = 5) => {
  const list = Array.isArray(value) ? value : [];
  return list
    .slice(0, limit)
    .map((item) => (Number.isFinite(Number(item)) ? Number(item) : 0));
};

const clampPercent = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
};

const formatRelativeTime = (value) => {
  const parsed = Date.parse(value || "");
  if (!Number.isFinite(parsed)) return "Sin fecha";
  const diffMs = Date.now() - parsed;
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < minute) return "recién";
  if (absMs < hour) {
    const count = Math.max(1, Math.round(absMs / minute));
    return `hace ${count} min`;
  }
  if (absMs < day) {
    const count = Math.max(1, Math.round(absMs / hour));
    return `hace ${count} h`;
  }
  const count = Math.max(1, Math.round(absMs / day));
  return count === 1 ? "ayer" : `hace ${count} dias`;
};

const buildBeginnerAudioInfo = (usage = {}) => {
  const source = usage?.beginnerAudio && typeof usage.beginnerAudio === "object"
    ? usage.beginnerAudio
    : {};
  const progress = getBeginnerAudioProgress({ usage });
  const eventSessions = progress.events.map((event) => ({
    status: event.completed ? "complete" : event.interrupted ? "partial" : event.eventType || "progress",
    startedAt: event.eventAt || "",
    updatedAt: event.eventAt || "",
    completedAt: event.completed ? event.eventAt || "" : "",
    durationSeconds: event.durationSeconds || 0,
    listenedSeconds: event.playedSeconds || event.currentTimeSeconds || 0,
    maxPositionSeconds: event.currentTimeSeconds || event.playedSeconds || 0,
    percent: Math.round(Number(event.completionPercent || 0) * 100),
    completed: Boolean(event.completed)
  }));
  const recent = Array.isArray(source.recentSessions) && source.recentSessions.length
    ? source.recentSessions
    : eventSessions;
  const last = source.lastSession || recent[0] || null;

  if (!last) {
    return {
      hasData: false,
      level: "empty",
      statusLabel: "Sin registro",
      lastAgo: "Sin registro",
      listenedSeconds: 0,
      durationSeconds: 0,
      percent: 0,
      totalStarts: Number(source.totalStarts || recent.length || 0),
      completedPlays: Number(source.completedPlays || progress.completedDays || 0),
      partialPlays: Number(source.partialPlays || progress.events.filter((event) => event.interrupted).length || 0)
    };
  }

  const durationSeconds = Math.max(0, Math.round(Number(last.durationSeconds || 0)));
  const listenedSeconds = Math.max(
    0,
    Math.round(Number(last.listenedSeconds || last.maxPositionSeconds || 0))
  );
  const percent = clampPercent(
    Number(last.percent || 0) ||
      (durationSeconds > 0 ? (listenedSeconds / durationSeconds) * 100 : 0)
  );
  const completed = Boolean(last.completed || last.status === "complete");
  const statusLabel = completed
    ? "Completo"
    : last.status === "started" || last.status === "progress"
      ? "En progreso"
      : "Cortado";
  const level = completed
    ? "ok"
    : percent >= 80
      ? "warning"
      : "critical";
  const lastAt = last.completedAt || last.updatedAt || last.startedAt || source.lastProgressAt || "";

  return {
    hasData: true,
    level,
    statusLabel,
    lastAgo: formatRelativeTime(lastAt),
    listenedSeconds,
    durationSeconds,
    percent,
    totalStarts: Number(source.totalStarts || recent.length || 0),
    completedPlays: Number(source.completedPlays || progress.completedDays || 0),
    partialPlays: Number(source.partialPlays || progress.events.filter((event) => event.interrupted).length || 0)
  };
};

const dailyDateKey = (input = new Date()) => {
  if (typeof input === "string") return input.slice(0, 10);
  return input.toISOString().slice(0, 10);
};

const isBreathingTaskDaily = (item) => /respiraci/i.test(String(item?.text || ""));

const buildQuickChecklistItems = (templates, dayKey) => {
  const safeTemplates = Array.isArray(templates) ? templates : [];
  return safeTemplates.map((template, index) => ({
    id: `${template.id || `quick-${index}`}-${dayKey}`,
    templateId: template.id || null,
    text: template.text || `Acción ${index + 1}`,
    category: template.category || "Personal",
    critical: Boolean(template.critical),
    points: Number(template.points || 8),
    status: "pending"
  }));
};

const applySundayDailyRules = (dayKey, items) => {
  const date = new Date(`${dayKey}T12:00:00`);
  if (date.getDay() !== 0) return { changed: false, items };
  let changed = false;
  const next = items.map((item) => {
    if (isBreathingTaskDaily(item)) return item;
    if (item.status === "na" && item.critical === false) return item;
    changed = true;
    return { ...item, status: "na", critical: false };
  });
  return { changed, items: next };
};

const isQuickChecklistCompleted = (items) => {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return false;
  return list.every((item) => DAILY_QUICK_STATUS.includes(item.status));
};

const normalizeMagicUnlockScore = (value, fallback = DEFAULT_WHITE_MAGIC_UNLOCK_SCORE) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(60, Math.min(98, Math.round(num)));
};

const getAmbientUrlFromMap = (map, ambientSound) => {
  if (ambientSound === "none") return "";
  return map?.[ambientSound] || "";
};

const getSeptasyncUrlFromMap = (map, septasyncTrack) => {
  if (septasyncTrack === "none") return "";
  return map?.[septasyncTrack] || "";
};

const getRouteSlug = (prefix) => {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[0] === prefix ? decodeURIComponent(parts[1] || "").trim() : "";
};

const getSlugFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get("s");
  if (querySlug) return querySlug.trim();
  return getRouteSlug("s");
};

const getTokenFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("t") || params.get("token");
  return token ? token.trim() : "";
};

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();

const withGeneratedSlugs = (items) => {
  const seen = new Map();
  return items.map((item) => {
    const base = item.slug ? slugify(item.slug) : slugify(item.name || "");
    const safeBase = base || "estudiante";
    const count = (seen.get(safeBase) || 0) + 1;
    seen.set(safeBase, count);
    const slug = count === 1 ? safeBase : `${safeBase}-${count}`;
    return { ...item, slug };
  });
};

const getTodayKey = () => localDateKey(new Date());

const getYesterdayKey = () => {
  return localDateKey(shiftLocalDate(new Date(), -1));
};

const getNostrilState = (style, breathNumber) => {
  const index = Math.max(1, breathNumber) - 1;
  if (style === "comfort") {
    const sequence = ["both", "both", "both", "left", "left", "left", "right", "right", "right"];
    return sequence[index % sequence.length];
  }
  if (style === "reset") {
    // Inspirado en ciclos alternos tipo nadi shodhana para reset mental.
    const sequence = ["left", "right", "left", "right", "both", "both"];
    return sequence[index % sequence.length];
  }
  return "both";
};

const getNostrilHint = (nostrilState) => {
  if (nostrilState === "left") return "Fosa izquierda";
  if (nostrilState === "right") return "Fosa derecha";
  return "Ambas fosas";
};

const fetchJsonWithTimeout = async (url, timeoutMs = 3000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const readRememberedValue = (key) => {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage?.getItem(key) || window.sessionStorage?.getItem(key) || "";
  } catch (_error) {
    return "";
  }
};

const rememberValue = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(key, value);
    window.sessionStorage?.setItem(key, value);
  } catch (_error) {
    // Si el navegador bloquea almacenamiento, la app sigue funcionando en la sesión actual.
  }
};

const buildImpulseResponse = (audioContext, seconds = 1.4, decay = 2.2) => {
  const rate = audioContext.sampleRate;
  const length = Math.floor(rate * seconds);
  const impulse = audioContext.createBuffer(2, length, rate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      // Cola de reverb suave, más intensa al inicio y difuminada al final.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return impulse;
};

export default function App() {
  const currentPath = window.location.pathname;
  const isLoginRoute = currentPath.startsWith("/login");
  const isSetPasswordRoute = currentPath.startsWith("/set-password");
  const [theme, setTheme] = useState(
    localStorage.getItem("rmcortex_theme") || "dark"
  );
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [slug] = useState(getSlugFromLocation());
  const [token] = useState(getTokenFromLocation());
  const [authStudent, setAuthStudent] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginStatus, setLoginStatus] = useState("idle");
  const [legacyLoginOpen, setLegacyLoginOpen] = useState(false);
  const [legacyLoginLink, setLegacyLoginLink] = useState("");
  const [legacyLoginMessage, setLegacyLoginMessage] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [setupStatus, setSetupStatus] = useState("idle");
  const hasRouteStudentSession = Boolean(authStudent?.slug && slug && authStudent.slug === slug);
  const hasStudentAccess = Boolean(token || hasRouteStudentSession);
  const [searchTerm, setSearchTerm] = useState("");
  const [adminPassword, setAdminPassword] = useState(() =>
    readRememberedValue("rmcortex_admin_pw")
  );
  const [adminStatus, setAdminStatus] = useState("idle");
  const [adminStudents, setAdminStudents] = useState([]);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminFile, setAdminFile] = useState(null);
  const [adminLink, setAdminLink] = useState("");
  const [adminView, setAdminView] = useState("students");
  const [adminsList, setAdminsList] = useState([]);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminConfirmation, setNewAdminConfirmation] = useState("");
  const [newAdminConfirmedTwice, setNewAdminConfirmedTwice] = useState(false);
  const [adminManagerMessage, setAdminManagerMessage] = useState("");
  const [adminBridgeMessage, setAdminBridgeMessage] = useState("");
  const [adminBridgeLoading, setAdminBridgeLoading] = useState(false);
  const [adminApneaHistorySlug, setAdminApneaHistorySlug] = useState("");
  const [adminActionSlug, setAdminActionSlug] = useState("");
  const [replaceSlug, setReplaceSlug] = useState("");
  const [openStudentMenuSlug, setOpenStudentMenuSlug] = useState("");
  const [editorPassword, setEditorPassword] = useState(() =>
    readRememberedValue("rmcortex_editor_pw")
  );
  const [editorStatus, setEditorStatus] = useState("idle");
  const [editorStudents, setEditorStudents] = useState([]);
  const [editorMessage, setEditorMessage] = useState("");
  const [editorSearchTerm, setEditorSearchTerm] = useState("");
  const [editorUploadSlug, setEditorUploadSlug] = useState("");
  const [studentUploadFile, setStudentUploadFile] = useState(null);
  const [studentUploadStatus, setStudentUploadStatus] = useState("idle");
  const [studentUploadMessage, setStudentUploadMessage] = useState("");
  const [studentRecordedBlob, setStudentRecordedBlob] = useState(null);
  const [studentRecordingStatus, setStudentRecordingStatus] = useState("idle");
  const [manualConfigOpen, setManualConfigOpen] = useState(false);
  const [apneaHistoryOpen, setApneaHistoryOpen] = useState(false);
  const [practiceScreen, setPracticeScreen] = useState("menu");
  const [whiteMagicUnlocked, setWhiteMagicUnlocked] = useState(false);
  const [whiteMagicScore, setWhiteMagicScore] = useState(0);
  const [magicUnlockScoreConfig, setMagicUnlockScoreConfig] = useState(DEFAULT_WHITE_MAGIC_UNLOCK_SCORE);
  const [magicUnlockConfigDraft, setMagicUnlockConfigDraft] = useState(String(DEFAULT_WHITE_MAGIC_UNLOCK_SCORE));
  const [magicUnlockConfigMessage, setMagicUnlockConfigMessage] = useState("");
  const [magicUnlockConfigSaving, setMagicUnlockConfigSaving] = useState(false);
  const [channelingEnabled, setChannelingEnabled] = useState(false);
  const [channelingConfigSaving, setChannelingConfigSaving] = useState(false);
  const [channelingConfigMessage, setChannelingConfigMessage] = useState("");
  const [brandLogoMissing, setBrandLogoMissing] = useState(false);
  const [breathLogoMissing, setBreathLogoMissing] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [audioSrc, setAudioSrc] = useState("");
  const [audioStatus, setAudioStatus] = useState("idle");
  const [audioCheckStatus, setAudioCheckStatus] = useState("idle");
  const [audioCheckMessage, setAudioCheckMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [startCountdown, setStartCountdown] = useState(0);
  const [ambientAudioMap, setAmbientAudioMap] = useState({
    bosque: "",
    oceano: ""
  });
  const [septasyncAudioMap, setSeptasyncAudioMap] = useState({
    balance: "",
    gamma: "",
    trance: ""
  });

  useEffect(() => {
    if (!["menu", "practice-check", "practice"].includes(practiceScreen)) return undefined;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [practiceScreen]);

  useEffect(() => {
    if (practiceScreen !== "practice" || !manualConfigOpen) return undefined;
    const frame = requestAnimationFrame(() => {
      manualSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [practiceScreen, manualConfigOpen]);

  useEffect(() => {
    if (practiceScreen !== "menu") setApneaHistoryOpen(false);
  }, [practiceScreen]);

  useEffect(() => {
    const path = window.location.pathname;
    const isSystemRoute =
      path.startsWith("/upload") ||
      path.startsWith("/editor") ||
      path.startsWith("/admin") ||
      path.startsWith("/login") ||
      path.startsWith("/set-password");
    if (!isSystemRoute) setTheme("dark");
  }, []);

  const [phase, setPhase] = useState("idle");
  const [subphase, setSubphase] = useState("inhale");
  const [cycleIndex, setCycleIndex] = useState(1);
  const [breathsDone, setBreathsDone] = useState(0);
  const [currentBreathNumber, setCurrentBreathNumber] = useState(1);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAwaitingFinalClose, setIsAwaitingFinalClose] = useState(false);
  const [endHoldProgress, setEndHoldProgress] = useState(0);
  const [stopHoldProgress, setStopHoldProgress] = useState(0);
  const [finalHoldProgress, setFinalHoldProgress] = useState(0);
  const [previousApneaSeconds, setPreviousApneaSeconds] = useState(0);

  const [progress, setProgress] = useState({
    totalSessions: 0,
    totalBreaths: 0,
    streak: 0,
    lastSessionDate: "",
    lastSummary: null,
    lastApneaSeconds: 0,
    apneaHistory: []
  });
  const [studentUsageSummary, setStudentUsageSummary] = useState(null);
  const [quickCheckState, setQuickCheckState] = useState({
    loading: false,
    error: "",
    dayKey: "",
    items: []
  });
  const [showPrecheckItems, setShowPrecheckItems] = useState(true);

  const submitColorVisionSession = useCallback(
    async (payload, flowStage = "practice") => {
      if (!slug || !hasStudentAccess) return;
      const hits = Number(payload?.hits || 0);
      const misses = Number(payload?.misses || 0);
      const total = Math.max(0, hits + misses);
      const accuracy = total > 0 ? clampPercent((hits / total) * 100) : 0;
      try {
        await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            token,
            session: {
              sessionType: "colorVision",
              flowStage,
              completedAt: new Date().toISOString(),
              colorVision: {
                hits,
                misses,
                total,
                accuracy,
                colorsCalibrated: Number(payload?.colorsCalibrated || 0)
              }
            }
          })
        });
      } catch (_error) {
        // no-op
      }
    },
    [slug, token, hasStudentAccess]
  );

  const audioRef = useRef(null);
  const beginnerAudioRef = useRef(null);
  const beginnerAudioRefs = useRef({});
  const breathAudioRef = useRef(null);
  const breathAudioAltRef = useRef(null);
  const bosqueAudioRef = useRef(null);
  const endApneaAudioRef = useRef(null);
  const septasyncAudioRef = useRef(null);
  const preApneaCueAudioRef = useRef(null);
  const finalApneaCueAudioRef = useRef(null);
  const replaceInputRef = useRef(null);
  const intervalRef = useRef(null);
  const breathStopTimerRef = useRef(null);
  const lastBreathTriggerRef = useRef(0);
  const breathCueIndexRef = useRef(0);
  const breathBufferRef = useRef(null);
  const breathBufferUrlRef = useRef("");
  const breathBufferLoadingRef = useRef(null);
  const breathActiveSourcesRef = useRef(new Set());
  const wakeLockRef = useRef(null);
  const pauseStartedAtRef = useRef(0);
  const endHoldTimeoutRef = useRef(null);
  const endHoldIntervalRef = useRef(null);
  const stopHoldTimeoutRef = useRef(null);
  const stopHoldIntervalRef = useRef(null);
  const finalHoldTimeoutRef = useRef(null);
  const finalHoldIntervalRef = useRef(null);
  const phaseRef = useRef(phase);
  const isRunningRef = useRef(isRunning);
  const isPausedRef = useRef(isPaused);
  const subphaseRef = useRef(subphase);
  const cycleIndexRef = useRef(cycleIndex);
  const breathsDoneRef = useRef(breathsDone);
  const currentBreathNumberRef = useRef(currentBreathNumber);
  const sessionMetricsRecordedRef = useRef(false);
  const sessionStartRef = useRef(null);
  const beginnerPlaybackRef = useRef(null);
  const lastTapRef = useRef(0);
  const lastDoubleTapActionRef = useRef(0);
  const studentMenuActionLockRef = useRef(0);
  const lastApneaMsRef = useRef(0);
  const roundApneaByCycleRef = useRef([]);
  const handlePhaseAdvanceRef = useRef(() => {});
  const countdownAbortRef = useRef(false);
  const phaseDeadlineRef = useRef(0);
  const apneaStartedAtRef = useRef(0);
  const startRequestRef = useRef(0);
  const phaseTransitionLockRef = useRef(false);

  const syncLoopTrackSource = (audioEl, url) => {
    if (!audioEl || !url) return false;
    const last = audioEl.dataset.trackSrc || "";
    if (last === url) return false;
    audioEl.src = url;
    audioEl.dataset.trackSrc = url;
    return true;
  };

  const startAudioPriming = (audioEl) => {
    if (!audioEl?.dataset) return "";
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    audioEl.dataset.primeToken = token;
    return token;
  };

  const isAudioPrimingCurrent = (audioEl, token) =>
    Boolean(audioEl?.dataset && token && audioEl.dataset.primeToken === token);

  const clearAudioPriming = (audioEl, token = "") => {
    if (!audioEl?.dataset?.primeToken) return;
    if (!token || audioEl.dataset.primeToken === token) {
      delete audioEl.dataset.primeToken;
    }
  };

  const markRealAudioPlayback = (audioEl) => {
    if (!audioEl) return;
    clearAudioPriming(audioEl);
    audioEl.muted = false;
  };

  const preApneaCueCycleRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceNodeRef = useRef(null);
  const masterGainRef = useRef(null);
  const dryGainRef = useRef(null);
  const wetGainRef = useRef(null);
  const convolverRef = useRef(null);
  const impulseSoftRef = useRef(null);
  const impulseCameraRef = useRef(null);
  const bosqueSourceNodeRef = useRef(null);
  const bosqueGainRef = useRef(null);
  const septasyncSourceNodeRef = useRef(null);
  const septasyncGainRef = useRef(null);
  const preCueSourceNodeRef = useRef(null);
  const preCueGainRef = useRef(null);
  const finalCueSourceNodeRef = useRef(null);
  const finalCueGainRef = useRef(null);
  const bosqueFadeStopRef = useRef(null);
  const septasyncFadeStopRef = useRef(null);
  const quickDailyPayloadRef = useRef(null);
  const quickDailySaveTimerRef = useRef(null);
  const manualSectionRef = useRef(null);
  const lastBreathBeepKeyRef = useRef("");
  const lastRecoveryBeepKeyRef = useRef("");
  const studentMediaRecorderRef = useRef(null);
  const studentMediaStreamRef = useRef(null);
  const studentRecordedChunksRef = useRef([]);

  const getEffectiveReverbMix = useCallback((cfg) => {
    if (cfg.reverbMode === "off") return 0;
    if (cfg.reverbMode === "camera") return Math.min(1, Math.max(0.35, Number(cfg.reverbMix || 0)));
    return Math.min(1, Math.max(0, Number(cfg.reverbMix || 0)));
  }, []);

  const updateReverbMix = useCallback((mixValue) => {
    const mix = Math.min(1, Math.max(0, Number(mixValue || 0)));
    if (dryGainRef.current) dryGainRef.current.gain.value = 1 - mix;
    if (wetGainRef.current) wetGainRef.current.gain.value = mix;
  }, []);

  const ensureReverbGraph = useCallback(() => {
    if (!audioRef.current) return false;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new Ctx();
      }
      const ctx = audioContextRef.current;

      if (!audioSourceNodeRef.current) {
        const source = ctx.createMediaElementSource(audioRef.current);
        const master = ctx.createGain();
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        const convolver = ctx.createConvolver();
        convolver.buffer = buildImpulseResponse(ctx);

        source.connect(dryGain);
        source.connect(convolver);
        convolver.connect(wetGain);
        dryGain.connect(master);
        wetGain.connect(master);
        master.connect(ctx.destination);

        audioSourceNodeRef.current = source;
        masterGainRef.current = master;
        dryGainRef.current = dryGain;
        wetGainRef.current = wetGain;
        convolverRef.current = convolver;
      }

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      audioRef.current.volume = 1;
      if (!impulseSoftRef.current) {
        impulseSoftRef.current = buildImpulseResponse(ctx, 1.4, 2.2);
      }
      if (!impulseCameraRef.current) {
        impulseCameraRef.current = buildImpulseResponse(ctx, 2.2, 2.8);
      }
      convolverRef.current.buffer =
        config.reverbMode === "camera" ? impulseCameraRef.current : impulseSoftRef.current;
      updateReverbMix(getEffectiveReverbMix(config));
      if (masterGainRef.current) {
        masterGainRef.current.gain.value = Math.min(1, Math.max(0, config.audioVolume));
      }
      return true;
    } catch (error) {
      return false;
    }
  }, [config.audioVolume, config.reverbMix, config.reverbMode, getEffectiveReverbMix, updateReverbMix]);

  const ensureBreathBuffer = useCallback(async (urlFromCaller) => {
    const url =
      urlFromCaller ||
      breathAudioRef.current?.src ||
      breathAudioAltRef.current?.src ||
      "";
    if (!url) return false;
    if (breathBufferRef.current && breathBufferUrlRef.current === url) return true;
    if (breathBufferLoadingRef.current) {
      try {
        await breathBufferLoadingRef.current;
        return breathBufferUrlRef.current === url && Boolean(breathBufferRef.current);
      } catch (_error) {
        return false;
      }
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    if (!audioContextRef.current) {
      audioContextRef.current = new Ctx();
    }
    const ctx = audioContextRef.current;

    const loading = (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("breath buffer fetch failed");
      const data = await response.arrayBuffer();
      const decoded = await ctx.decodeAudioData(data.slice(0));
      breathBufferRef.current = decoded;
      breathBufferUrlRef.current = url;
    })();

    breathBufferLoadingRef.current = loading;
    try {
      await loading;
      return true;
    } catch (_error) {
      breathBufferRef.current = null;
      breathBufferUrlRef.current = "";
      return false;
    } finally {
      breathBufferLoadingRef.current = null;
    }
  }, []);

  const ensureAuxGainGraph = useCallback((audioElement, sourceRef, gainRef, baseGain = 1) => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!audioElement || !Ctx) return false;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new Ctx();
      }
      const ctx = audioContextRef.current;
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audioElement);
      }
      if (!gainRef.current) {
        gainRef.current = ctx.createGain();
        sourceRef.current.connect(gainRef.current);
        gainRef.current.connect(ctx.destination);
      }
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      audioElement.volume = 1;
      gainRef.current.gain.value = Math.max(0, Number(baseGain) || 0);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const smoothGainTo = useCallback((gainNode, target, seconds = 0.3) => {
    if (!gainNode) return;
    const now = gainNode.context.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(Math.max(0, Number(target) || 0), now + Math.max(0.01, seconds));
  }, []);

  useEffect(() => {
    const safeTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", safeTheme);
    localStorage.setItem("rmcortex_theme", safeTheme);
  }, [theme]);

  useEffect(() => () => {
    if (quickDailySaveTimerRef.current) {
      clearTimeout(quickDailySaveTimerRef.current);
      quickDailySaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    subphaseRef.current = subphase;
  }, [subphase]);

  useEffect(() => {
    cycleIndexRef.current = cycleIndex;
  }, [cycleIndex]);

  useEffect(() => {
    breathsDoneRef.current = breathsDone;
  }, [breathsDone]);

  useEffect(() => {
    currentBreathNumberRef.current = currentBreathNumber;
  }, [currentBreathNumber]);

  useEffect(() => {
    phaseTransitionLockRef.current = false;
  }, [phase, subphase, breathsDone, cycleIndex, isRunning, isPaused]);

  useEffect(() => {
    const loadStudents = async () => {
      if (isLoginRoute || isSetPasswordRoute) {
        setLoading(false);
        return;
      }
      try {
        if (slug && !token) {
          try {
            const sessionData = await fetchJsonWithTimeout("/api/auth/me", 2200);
            if (sessionData?.student?.slug) {
              setAuthStudent(sessionData.student);
              setStudents([sessionData.student]);
              setChannelingEnabled(Boolean(sessionData?.settings?.channelingEnabled));
              return;
            }
          } catch (_sessionError) {
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            return;
          }
        }
        const data = await fetchJsonWithTimeout("/api/students", 1800);
        setStudents(Array.isArray(data.students) ? data.students : []);
        setChannelingEnabled(Boolean(data?.settings?.channelingEnabled));
      } catch (error) {
        try {
          const data = await fetchJsonWithTimeout("/students.json", 1800);
          setStudents(Array.isArray(data.students) ? data.students : []);
        } catch (innerError) {
          setLoadError("No se pudo cargar la lista de estudiantes.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [isLoginRoute, isSetPasswordRoute, slug, token]);

  useEffect(() => {
    const onMessage = (event) => {
      if (!event?.data || typeof event.data !== "object") return;
      const eventType = String(event.data?.type || "");
      if (eventType === "COLOR_SESSION_REPORT") {
        submitColorVisionSession(event.data?.payload || {}, "practice");
        return;
      }
      if (eventType === "COLOR_FLOW_EVENT") {
        const stage = String(event.data?.stage || "").toLowerCase();
        if (stage === "onboarding" || stage === "pre-practice" || stage === "prepractice") {
          const normalized = stage === "onboarding" ? "onboarding" : "prepractice";
          submitColorVisionSession(event.data?.payload || {}, normalized);
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [submitColorVisionSession]);

  const studentsWithSlugs = useMemo(() => withGeneratedSlugs(students), [students]);

  const student = useMemo(() => {
    if (!slug) return null;
    return studentsWithSlugs.find((item) => item.slug === slug) || null;
  }, [slug, studentsWithSlugs]);
  const hasStudentSession = Boolean(hasRouteStudentSession && student?.slug);

  const uploadSlug = getRouteSlug("upload");
  const uploadStudent = useMemo(
    () => studentsWithSlugs.find((item) => item.slug === uploadSlug) || null,
    [studentsWithSlugs, uploadSlug]
  );
  const audioWorkflow = student?.audioWorkflow || {};
  const advancedAccessInfo = useMemo(() => getAdvancedAccessInfo(student), [student]);
  const hasApprovedAudio = advancedAccessInfo.hasApprovedAudio;
  const advancedUnlocked = advancedAccessInfo.unlocked;
  const beginnerAudioProgress = advancedAccessInfo.progress;
  const beginnerCompletedDays = beginnerAudioProgress.completedDays;
  const beginnerRequiredDays = beginnerAudioProgress.requiredDays;
  const hasBeginnerPracticeAudio = Boolean(
    audioWorkflow.beginnerAudioKey ||
      audioWorkflow.hasBeginnerAudio ||
      audioWorkflow.beginnerAltAudioKey ||
      audioWorkflow.hasBeginnerAltAudio ||
      (hasApprovedAudio && !audioWorkflow.editorAudioKey)
  );
  const daysUntilAdvanced = advancedUnlocked
    ? 0
    : advancedAccessInfo.remainingDays || BEGINNER_COMPLETION_DAYS_REQUIRED;
  const beginnerAudioOptions = useMemo(() => {
    if (!hasBeginnerPracticeAudio || !slug || !hasStudentAccess) return [];
    const encodedSlug = encodeURIComponent(slug);
    const encodedToken = encodeURIComponent(token);
    const audioUrl = (kind) =>
      token
        ? `/api/audio-file?slug=${encodedSlug}&token=${encodedToken}&kind=${kind}`
        : `/api/audio-file?kind=${kind}`;
    const hasPrimary = Boolean(
      audioWorkflow.beginnerAudioKey ||
        audioWorkflow.hasBeginnerAudio ||
        (hasApprovedAudio && !audioWorkflow.editorAudioKey && !audioWorkflow.hasEditedAudio)
    );
    const hasAlt = Boolean(audioWorkflow.beginnerAltAudioKey || audioWorkflow.hasBeginnerAltAudio);
    const options = [];
    if (hasPrimary) {
      options.push({
        id: "beginner-1",
        label: "Audio básico 1",
        fileName: audioWorkflow.beginnerFileName || "",
        src: audioUrl("beginner")
      });
    }
    if (hasAlt) {
      options.push({
        id: "beginner-2",
        label: "Audio básico 2",
        fileName: audioWorkflow.beginnerAltFileName || "",
        src: audioUrl("beginner-alt")
      });
    }
    return options;
  }, [
    audioWorkflow.beginnerAltAudioKey,
    audioWorkflow.beginnerAltFileName,
    audioWorkflow.beginnerAudioKey,
    audioWorkflow.beginnerFileName,
    audioWorkflow.editorAudioKey,
    audioWorkflow.hasBeginnerAltAudio,
    audioWorkflow.hasBeginnerAudio,
    audioWorkflow.hasEditedAudio,
    hasApprovedAudio,
    hasBeginnerPracticeAudio,
    hasStudentAccess,
    slug,
    token
  ]);
  const beginnerAudioUrl = beginnerAudioOptions[0]?.src || "";

  useEffect(() => {
    if (!student?.slug || !hasStudentAccess) {
      setStudentUsageSummary(null);
      return undefined;
    }
    let cancelled = false;
    const loadStudentUsage = async () => {
      try {
        const data = await fetchJsonWithTimeout(
          token
            ? `/api/students?slug=${encodeURIComponent(student.slug)}&token=${encodeURIComponent(token)}`
            : "/api/auth/me",
          2200
        );
        if (!cancelled) setStudentUsageSummary(data?.student?.usage || null);
      } catch (_error) {
        if (!cancelled) setStudentUsageSummary(null);
      }
    };
    loadStudentUsage();
    return () => {
      cancelled = true;
    };
  }, [student?.slug, token, hasStudentAccess]);

  const recordedPreviewUrl = useMemo(
    () => (studentRecordedBlob ? URL.createObjectURL(studentRecordedBlob) : ""),
    [studentRecordedBlob]
  );

  useEffect(() => () => {
    if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
  }, [recordedPreviewUrl]);

  const magicUnlockScore = useMemo(
    () => normalizeMagicUnlockScore(student?.features?.magicUnlockScore, magicUnlockScoreConfig),
    [student?.features?.magicUnlockScore, magicUnlockScoreConfig]
  );

  const whiteMagicStorageKey = useMemo(
    () => `rmcortex_magic_unlock_${slug || "anon"}`,
    [slug]
  );

  useEffect(() => {
    const saved = localStorage.getItem("rmcortex_magic_unlock_score");
    const normalized = normalizeMagicUnlockScore(saved, DEFAULT_WHITE_MAGIC_UNLOCK_SCORE);
    setMagicUnlockScoreConfig(normalized);
    setMagicUnlockConfigDraft(String(normalized));
  }, []);

  useEffect(() => {
    localStorage.setItem("rmcortex_magic_unlock_score", String(magicUnlockScoreConfig));
  }, [magicUnlockScoreConfig]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(whiteMagicStorageKey);
      if (!raw) {
        setWhiteMagicUnlocked(false);
        setWhiteMagicScore(0);
        return;
      }
      const parsed = JSON.parse(raw);
      setWhiteMagicUnlocked(Boolean(parsed?.unlocked));
      setWhiteMagicScore(Number(parsed?.score || 0));
    } catch (_error) {
      setWhiteMagicUnlocked(false);
      setWhiteMagicScore(0);
    }
  }, [whiteMagicStorageKey]);

  const practiceOptions = useMemo(
    () =>
      PRACTICE_OPTIONS.map((item) => {
        if (item.id === "principiante") {
          return {
            ...item,
            enabled: hasBeginnerPracticeAudio
          };
        }
        if (item.id === "reprogramacion") {
          return {
            ...item,
            enabled: advancedUnlocked
          };
        }
        if (item.id === "colores") {
          return {
            ...item,
            enabled: hasColorPracticeAccess(student)
          };
        }
        if (item.id === "magia") {
          return {
            ...item,
            enabled: channelingEnabled
          };
        }
        return item;
      }),
    [student, channelingEnabled, hasBeginnerPracticeAudio, advancedUnlocked]
  );

  const selectedAmbientUrl = useMemo(() => {
    if (config.ambientSound === "none") return "";
    return ambientAudioMap[config.ambientSound] || "";
  }, [ambientAudioMap, config.ambientSound]);

  const selectedSeptasyncUrl = useMemo(() => {
    if (config.septasyncTrack === "none") return "";
    if (config.septasyncTrack === "balance") return septasyncAudioMap.balance || "";
    if (config.septasyncTrack === "gamma") return septasyncAudioMap.gamma || "";
    if (config.septasyncTrack === "trance") return septasyncAudioMap.trance || "";
    return "";
  }, [config.septasyncTrack, septasyncAudioMap]);

  const adminAnalytics = useMemo(() => {
    const nowDate = new Date();
    const now = nowDate.getTime();
    const rows = adminStudents.map((item) => {
      const usage = item.usage || {};
      const lastSessionAt = usage.lastSessionAt || "";
      const lastActivityAt = usage.lastActivityAt || item.lastAudioAccessAt || lastSessionAt;
      const status = getStudentStatus(item);
      const ageDays = getStudentAgeDays(item, now);
      const ageBucket = getAgeBucket(ageDays);
      const isManuallyInactive = status === "inactive";
      const createdMs = item.createdAt ? Date.parse(item.createdAt) : 0;
      const lastMs = lastActivityAt ? Date.parse(lastActivityAt) : createdMs;
      const inactiveHours = lastMs ? (now - lastMs) / MS_PER_HOUR : Number.POSITIVE_INFINITY;
      const hasRecentActivity = Boolean(lastActivityAt) && Number.isFinite(inactiveHours) && inactiveHours < ALERT_WARNING_HOURS;
      const isActive = !isManuallyInactive;
      const inactivityAlertLevel = isManuallyInactive || !Number.isFinite(inactiveHours)
        ? "ok"
        : inactiveHours >= ALERT_CRITICAL_HOURS
          ? "critical"
          : inactiveHours >= ALERT_WARNING_HOURS
            ? "warning"
            : "ok";
      const weeklyPractice = buildWeeklyPracticeStats(item, nowDate);
      const missedAlertLevel = weeklyPractice.consecutiveMisses >= 2
        ? "critical"
        : weeklyPractice.consecutiveMisses >= 1
          ? "warning"
          : "ok";
      const alertLevel = inactivityAlertLevel === "critical" || missedAlertLevel === "critical"
        ? "critical"
        : inactivityAlertLevel === "warning" || missedAlertLevel === "warning"
          ? "warning"
          : "ok";
      const todaySessions = weeklyPractice.todaySessions;
      const roundSums = normalizeRoundArray(usage.apneaRoundSums, 5);
      const roundCounts = normalizeRoundArray(usage.apneaRoundCounts, 5);
      const flowStats = usage.flowStats || {};
      const colorVisionUsage = usage.colorVisionUsage || {};
      const roundAvg = roundSums.map((sum, idx) => {
        const count = roundCounts[idx] || 0;
        return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
      });
      const apneaHistory = buildApneaDailyLog(usage, 0);
      const apneaDailyLog = apneaHistory.slice(0, 5);
      const apneaBestSeconds = apneaHistory.reduce((best, day) => Math.max(best, day.best || 0), 0);
      const beginnerAudioProgress = getBeginnerAudioProgress(item);
      const beginnerAudioInfo = buildBeginnerAudioInfo(usage);
      const flowState = {
        onboarding: Number(flowStats.onboarding || 0) > 0,
        prePractice: Number(flowStats.prePractice || 0) > 0,
        practice: Number(flowStats.practice || 0) > 0
      };
      return {
        ...item,
        usage,
        status,
        ageDays,
        ageBucket,
        isManuallyInactive,
        hasRecentActivity,
        isActive,
        alertLevel,
        inactiveHours,
        todaySessions,
        totalSessions: Number(usage.totalSessions || 0),
        totalRounds: Number(usage.totalRounds || 0),
        onboardingSessions: Number(flowStats.onboarding || 0),
        prePracticeSessions: Number(flowStats.prePractice || 0),
        practiceSessions: Number(flowStats.practice || 0),
        colorVisionSessions: Number(colorVisionUsage.totalSessions || 0),
        colorVisionAccuracy: Number(colorVisionUsage.averageAccuracy || 0),
        flowState,
        roundAvg,
        apneaDailyLog,
        apneaHistory,
        apneaBestSeconds,
        beginnerAudioProgress,
        beginnerAudioInfo,
        weeklyPractice,
        lastActivityAt,
        lastSessionAt
      };
    });

    const active = rows.filter((item) => item.status !== "inactive");
    const inactive = rows.filter((item) => item.status === "inactive");
    const warning = active.filter((item) => item.alertLevel === "warning");
    const critical = active.filter((item) => item.alertLevel === "critical");
    const moreThanOnceToday = active.filter((item) => item.todaySessions > 1);
    const abandoned = active.filter((item) => item.alertLevel === "critical");
    const practicingDaily = active.filter((item) => item.todaySessions >= 1);
    const twoDayPracticeAlerts = active.filter((item) => item.weeklyPractice?.consecutiveMisses >= 2);
    const specialRequests = active.filter((item) =>
      isSpecialWorkflow(item.audioWorkflow) && item.audioWorkflow?.status !== "approved"
    );
    const ageBuckets = {
      "age-30": active.filter((item) => item.ageBucket === "age-30"),
      "age-60": active.filter((item) => item.ageBucket === "age-60"),
      "age-90": active.filter((item) => item.ageBucket === "age-90"),
      "age-90plus": active.filter((item) => item.ageBucket === "age-90plus"),
      "age-unknown": active.filter((item) => item.ageBucket === "age-unknown")
    };
    const flowCounts = active.reduce(
      (acc, item) => {
        if (item.flowState?.onboarding) acc.onboarding += 1;
        if (item.flowState?.prePractice) acc.prePractice += 1;
        if (item.flowState?.practice) acc.practice += 1;
        if (item.features?.colorVisionEnabled) acc.colorEnabled += 1;
        return acc;
      },
      { onboarding: 0, prePractice: 0, practice: 0, colorEnabled: 0 }
    );
    const flowProgressPct = active.length
      ? Math.round(
          ((flowCounts.onboarding + flowCounts.prePractice + flowCounts.practice) /
            (active.length * 3)) *
            100
        )
      : 0;
    const flowSemaforoLevel = flowProgressPct >= 66 ? "green" : flowProgressPct >= 33 ? "yellow" : "red";

    return {
      rows,
      active,
      inactive,
      ageBuckets,
      warning,
      critical,
      moreThanOnceToday,
      abandoned,
      practicingDaily,
      twoDayPracticeAlerts,
      specialRequests,
      flowCounts,
      flowProgressPct,
      flowSemaforoLevel,
      hasAttention: critical.length > 0 || warning.length > 0 || specialRequests.length > 0
    };
  }, [adminStudents]);

  useEffect(() => {
    if (!slug) return;
    const savedConfig = localStorage.getItem(`rmcortex_config_${slug}`);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig((prev) => ({
          ...prev,
          ...parsed,
          ambientSound: parsed.ambientSound || prev.ambientSound,
          septasyncTrack: parsed.septasyncTrack || prev.septasyncTrack,
          septasyncVolume: Number.isFinite(parsed.septasyncVolume)
            ? parsed.septasyncVolume
            : prev.septasyncVolume,
          bosqueVolume: Number.isFinite(parsed.bosqueVolume)
            ? parsed.bosqueVolume
            : prev.bosqueVolume,
          breathCueVolume: Number.isFinite(parsed.breathCueVolume)
            ? parsed.breathCueVolume
            : prev.breathCueVolume
        }));
      } catch (error) {
        // ignore malformed
      }
    }
    const saved = localStorage.getItem(`rmcortex_progress_${slug}`);
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (error) {
        // ignore malformed
      }
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    localStorage.setItem(`rmcortex_config_${slug}`, JSON.stringify(config));
  }, [config, slug]);

  useEffect(() => {
    if (!audioRef.current) return;
    const hasGraph = Boolean(audioSourceNodeRef.current);
    if (hasGraph && masterGainRef.current) {
      audioRef.current.volume = 1;
      masterGainRef.current.gain.value = Math.min(1, Math.max(0, config.audioVolume));
      return;
    }
    audioRef.current.volume = Math.min(1, Math.max(0, config.audioVolume));
  }, [config.audioVolume]);

  useEffect(() => {
    const nextVolume = Math.min(1, Math.max(0, config.breathCueVolume ?? 1));
    [breathAudioRef.current, breathAudioAltRef.current].forEach((audioEl) => {
      if (!audioEl) return;
      audioEl.volume = nextVolume;
    });
  }, [config.breathCueVolume]);

  useEffect(() => {
    if (convolverRef.current && impulseSoftRef.current && impulseCameraRef.current) {
      convolverRef.current.buffer =
        config.reverbMode === "camera" ? impulseCameraRef.current : impulseSoftRef.current;
    }
    updateReverbMix(getEffectiveReverbMix(config));
  }, [config.reverbMix, config.reverbMode, config, getEffectiveReverbMix, updateReverbMix]);

  useEffect(() => {
    if (!bosqueAudioRef.current) return;
    if (bosqueGainRef.current) {
      smoothGainTo(bosqueGainRef.current, Math.min(1, Math.max(0, config.bosqueVolume)), 0.2);
    } else {
      bosqueAudioRef.current.volume = Math.min(1, Math.max(0, config.bosqueVolume));
    }
  }, [config.bosqueVolume, smoothGainTo]);

  useEffect(() => {
    setAudioSrc("");
    setAudioStatus("idle");
  }, [student?.slug]);

  const fetchAudioUrl = useCallback(async (audioSlug, providedToken) => {
    const tokenPart = providedToken
      ? `&token=${encodeURIComponent(providedToken)}`
      : "";
    const response = await fetch(
      `/api/audio?slug=${encodeURIComponent(audioSlug)}${tokenPart}`
    );
    if (!response.ok) return "";
    const data = await response.json();
    return data?.url || "";
  }, []);

  const loadSystemAudio = useCallback(async () => {
    const nextAmbient = {};
    const nextSeptasync = {};
    const entries = Object.entries(SYSTEM_AUDIO);
    for (const [key, value] of entries) {
      try {
        const url = await fetchAudioUrl(value.slug, value.token);
        if (!url) continue;
        if (key === "respirax1" && breathAudioRef.current) {
          breathAudioRef.current.src = url;
          if (breathAudioAltRef.current) {
            breathAudioAltRef.current.src = url;
          }
          ensureBreathBuffer(url);
        }
        if (key === "bosque7") {
          nextAmbient.bosque = url;
          if (config.ambientSound === "bosque" && bosqueAudioRef.current) {
            bosqueAudioRef.current.src = url;
          }
        }
        if (key === "oceano") {
          nextAmbient.oceano = url;
          if (config.ambientSound === "oceano" && bosqueAudioRef.current) {
            bosqueAudioRef.current.src = url;
          }
        }
        if (key === "inalamos" && endApneaAudioRef.current) {
          endApneaAudioRef.current.src = url;
        }
        if (key === "septasyncBalance") {
          nextSeptasync.balance = url;
          if (config.septasyncTrack === "balance" && septasyncAudioRef.current) {
            septasyncAudioRef.current.src = url;
          }
        }
        if (key === "septasyncGamma") {
          nextSeptasync.gamma = url;
          if (config.septasyncTrack === "gamma" && septasyncAudioRef.current) {
            septasyncAudioRef.current.src = url;
          }
        }
        if (key === "septasyncTrance") {
          nextSeptasync.trance = url;
          if (config.septasyncTrack === "trance" && septasyncAudioRef.current) {
            septasyncAudioRef.current.src = url;
          }
        }
      } catch (error) {
        // ignore
      }
    }
    if (Object.keys(nextAmbient).length) {
      setAmbientAudioMap((prev) => ({ ...prev, ...nextAmbient }));
    }
    if (Object.keys(nextSeptasync).length) {
      setSeptasyncAudioMap((prev) => ({ ...prev, ...nextSeptasync }));
    }
    return { nextAmbient, nextSeptasync };
  }, [config.ambientSound, config.septasyncTrack, ensureBreathBuffer, fetchAudioUrl]);

  useEffect(() => {
    loadSystemAudio();
  }, [loadSystemAudio]);

  useEffect(() => {
    if (!bosqueAudioRef.current) return;
    if (!selectedAmbientUrl) {
      const keepSessionLoop =
        (isRunningRef.current || (phaseRef.current === "complete" && isAwaitingFinalClose)) &&
        Boolean(bosqueAudioRef.current.dataset.trackSrc);
      if (keepSessionLoop) return;
      stopBosque();
      return;
    }
    syncLoopTrackSource(bosqueAudioRef.current, selectedAmbientUrl);
  }, [selectedAmbientUrl, isAwaitingFinalClose]);

  useEffect(() => {
    const shouldKeepPlaying = isRunning || (phase === "complete" && isAwaitingFinalClose);
    if (!shouldKeepPlaying || isPaused) {
      stopBosque();
      return;
    }
    playBosque();
  }, [phase, isRunning, isPaused, selectedAmbientUrl, isAwaitingFinalClose]);

  useEffect(() => {
    if (!septasyncAudioRef.current) return;
    if (!selectedSeptasyncUrl) {
      const keepSessionLoop =
        (isRunningRef.current || (phaseRef.current === "complete" && isAwaitingFinalClose)) &&
        Boolean(septasyncAudioRef.current.dataset.trackSrc);
      if (keepSessionLoop) return;
      stopSeptasync();
      return;
    }
    syncLoopTrackSource(septasyncAudioRef.current, selectedSeptasyncUrl);
  }, [selectedSeptasyncUrl, isAwaitingFinalClose]);

  useEffect(() => {
    if (!septasyncAudioRef.current) return;
    if (septasyncGainRef.current) {
      smoothGainTo(septasyncGainRef.current, Math.min(1, Math.max(0, config.septasyncVolume)), 0.2);
    } else {
      septasyncAudioRef.current.volume = Math.min(1, Math.max(0, config.septasyncVolume));
    }
  }, [config.septasyncVolume, smoothGainTo]);

  useEffect(() => {
    const shouldKeepPlaying = isRunning || (phase === "complete" && isAwaitingFinalClose);
    if (!shouldKeepPlaying || isPaused) {
      stopSeptasync();
      return;
    }
    playSeptasync();
  }, [isRunning, isPaused, selectedSeptasyncUrl, phase, isAwaitingFinalClose]);

  useEffect(() => {
    if (!isRunning || isPaused || phase === "idle") return;
    const watchdog = setInterval(() => {
      if (!isRunningRef.current || isPausedRef.current) return;
      if (selectedAmbientUrl && bosqueAudioRef.current?.paused) {
        playBosque();
      }
      if (selectedSeptasyncUrl && septasyncAudioRef.current?.paused) {
        playSeptasync();
      }
    }, 600);
    return () => clearInterval(watchdog);
  }, [isRunning, isPaused, phase, selectedAmbientUrl, selectedSeptasyncUrl]);

  useEffect(() => {
    if (!isRunning || isPaused || phase === "complete") return;

    intervalRef.current = setInterval(() => {
      if (phaseRef.current === "apnea") {
        const elapsed = Math.max(0, Date.now() - (apneaStartedAtRef.current || Date.now()));
        setTimeLeftMs(elapsed);
        return;
      }

      const remaining = Math.max(0, (phaseDeadlineRef.current || 0) - Date.now());
      if (remaining > 0) {
        setTimeLeftMs(remaining);
        return;
      }

      setTimeLeftMs(0);
      if (phaseTransitionLockRef.current) return;
      phaseTransitionLockRef.current = true;
      handlePhaseAdvanceRef.current();
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isPaused, phase]);

  const playSoftCueBeep = useCallback((frequency = 820, duration = 0.12, gainValue = 0.03) => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new Ctx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainValue, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.03);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch (_error) {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (phase !== "breathing" || subphase !== "inhale" || !isRunning || isPaused) {
      if (phase !== "breathing") lastBreathBeepKeyRef.current = "";
      return;
    }
    const breathsLeft = Math.max(0, config.breathsPerCycle - currentBreathNumber + 1);
    if (breathsLeft > 3) return;
    const key = `${cycleIndex}-${currentBreathNumber}`;
    if (lastBreathBeepKeyRef.current === key) return;
    lastBreathBeepKeyRef.current = key;
    playSoftCueBeep(760, 0.11, 0.026);
  }, [
    phase,
    subphase,
    isRunning,
    isPaused,
    cycleIndex,
    currentBreathNumber,
    config.breathsPerCycle,
    playSoftCueBeep
  ]);

  useEffect(() => {
    if (phase !== "recovery" || !isRunning || isPaused) {
      if (phase !== "recovery") lastRecoveryBeepKeyRef.current = "";
      return;
    }
    const remainingSeconds = Math.ceil(Math.max(0, timeLeftMs) / 1000);
    if (remainingSeconds > 2 || remainingSeconds < 1) return;
    const key = `${cycleIndex}-${remainingSeconds}`;
    if (lastRecoveryBeepKeyRef.current === key) return;
    lastRecoveryBeepKeyRef.current = key;
    playSoftCueBeep(930, 0.1, 0.03);
  }, [phase, isRunning, isPaused, timeLeftMs, cycleIndex, playSoftCueBeep]);

  const requestWakeLock = async () => {
    if (!("wakeLock" in navigator) || wakeLockRef.current) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      wakeLockRef.current.addEventListener("release", () => {
        wakeLockRef.current = null;
      });
    } catch (error) {
      // ignore unsupported/blocked
    }
  };

  const releaseWakeLock = async () => {
    if (!wakeLockRef.current) return;
    try {
      await wakeLockRef.current.release();
    } catch (error) {
      // ignore
    } finally {
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    if (isRunning && !isPaused) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isRunning, isPaused]);

  useEffect(() => {
    const onVisibility = () => {
      if (isRunningRef.current && !isPausedRef.current) {
        requestWakeLock();
        if (phaseRef.current === "apnea") {
          const elapsed = Math.max(0, Date.now() - (apneaStartedAtRef.current || Date.now()));
          setTimeLeftMs(elapsed);
        } else {
          const remaining = Math.max(0, (phaseDeadlineRef.current || 0) - Date.now());
          setTimeLeftMs(remaining);
        }
      }
      if (document.visibilityState === "visible" && audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
      if (document.visibilityState === "visible" && isRunningRef.current && !isPausedRef.current) {
        const safePlay = (audioEl) => {
          if (!audioEl || !audioEl.src) return;
          markRealAudioPlayback(audioEl);
          audioEl.play().catch(() => {});
        };
        if (phaseRef.current === "apnea") {
          safePlay(audioRef.current);
        }
        safePlay(bosqueAudioRef.current);
        safePlay(septasyncAudioRef.current);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => () => {
    cancelEndApneaHold();
    cancelStopHold();
    cancelFinalizeHold();
    if (bosqueFadeStopRef.current) {
      clearTimeout(bosqueFadeStopRef.current);
      bosqueFadeStopRef.current = null;
    }
    if (septasyncFadeStopRef.current) {
      clearTimeout(septasyncFadeStopRef.current);
      septasyncFadeStopRef.current = null;
    }
    breathActiveSourcesRef.current.forEach((source) => {
      try {
        source.stop(0);
      } catch (_error) {
        // no-op
      }
    });
    breathActiveSourcesRef.current.clear();
    breathBufferRef.current = null;
    breathBufferUrlRef.current = "";
    breathBufferLoadingRef.current = null;
    releaseWakeLock();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, [smoothGainTo]);

  const handlePhaseAdvance = () => {
    if (phase === "breathing") {
      if (subphase === "inhale") {
        setSubphase("exhale");
        const exhaleMs = config.exhaleSeconds * 1000;
        phaseDeadlineRef.current = Date.now() + exhaleMs;
        setTimeLeftMs(exhaleMs);
        return;
      }

      const nextBreaths = breathsDone + 1;
      if (nextBreaths >= config.breathsPerCycle) {
        setBreathsDone(nextBreaths);
        startApnea();
        return;
      }

      const upcomingBreath = nextBreaths + 1;
      const cueBreath = Math.max(1, config.breathsPerCycle - PRE_APNEA_BREATHS_LEFT + 1);
      if (upcomingBreath === cueBreath && preApneaCueCycleRef.current !== cycleIndex) {
        playPreApneaCue();
        preApneaCueCycleRef.current = cycleIndex;
      }

      setBreathsDone(nextBreaths);
      setSubphase("inhale");
      setCurrentBreathNumber(nextBreaths + 1);
      playBreathSound();
      const inhaleMs = config.inhaleSeconds * 1000;
      phaseDeadlineRef.current = Date.now() + inhaleMs;
      setTimeLeftMs(inhaleMs);
      return;
    }

    if (phase === "apnea") {
      startRecovery();
      return;
    }

    if (phase === "recovery") {
      if (cycleIndex < config.cycles) {
        setCycleIndex((prev) => prev + 1);
        setBreathsDone(0);
        setSubphase("inhale");
        setCurrentBreathNumber(1);
        playBreathSound();
        setPhase("breathing");
        const inhaleMs = config.inhaleSeconds * 1000;
        phaseDeadlineRef.current = Date.now() + inhaleMs;
        setTimeLeftMs(inhaleMs);
        return;
      }

      finishSession();
    }
  };

  useEffect(() => {
    handlePhaseAdvanceRef.current = handlePhaseAdvance;
  }, [handlePhaseAdvance]);

  const waitForAudioReady = (audioElement, timeoutMs = 1200) =>
    new Promise((resolve) => {
      if (!audioElement || !audioElement.src) {
        resolve(false);
        return;
      }
      if (audioElement.readyState >= 2) {
        resolve(true);
        return;
      }
      let done = false;
      const finish = (result) => {
        if (done) return;
        done = true;
        audioElement.removeEventListener("canplay", onReady);
        audioElement.removeEventListener("loadeddata", onReady);
        audioElement.removeEventListener("error", onError);
        clearTimeout(timer);
        resolve(result);
      };
      const onReady = () => finish(true);
      const onError = () => finish(false);
      const timer = setTimeout(() => finish(false), timeoutMs);
      audioElement.addEventListener("canplay", onReady);
      audioElement.addEventListener("loadeddata", onReady);
      audioElement.addEventListener("error", onError);
      audioElement.load();
    });

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const warmupAudioElement = async (audioElement, durationMs = 140) => {
    if (!audioElement || !audioElement.src) return false;
    const wasMuted = audioElement.muted;
    const wasLoop = audioElement.loop;
    const token = startAudioPriming(audioElement);
    try {
      audioElement.muted = true;
      audioElement.loop = false;
      audioElement.currentTime = 0;
      await audioElement.play();
      await sleep(durationMs);
      return true;
    } catch (_error) {
      return false;
    } finally {
      if (isAudioPrimingCurrent(audioElement, token)) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.muted = wasMuted;
        audioElement.loop = wasLoop;
        clearAudioPriming(audioElement, token);
      }
    }
  };

  const warmupAllAudios = async (effectiveAmbientUrl, effectiveSeptasyncUrl) => {
    if (effectiveAmbientUrl && bosqueAudioRef.current) {
      syncLoopTrackSource(bosqueAudioRef.current, effectiveAmbientUrl);
    }
    if (effectiveSeptasyncUrl && septasyncAudioRef.current) {
      syncLoopTrackSource(septasyncAudioRef.current, effectiveSeptasyncUrl);
    }

    await ensureBreathBuffer();

    const targets = [
      audioRef.current,
      breathAudioRef.current,
      breathAudioAltRef.current,
      endApneaAudioRef.current,
      preApneaCueAudioRef.current,
      finalApneaCueAudioRef.current,
      effectiveAmbientUrl ? bosqueAudioRef.current : null,
      effectiveSeptasyncUrl ? septasyncAudioRef.current : null
    ].filter(Boolean);

    await Promise.all(targets.map((audioEl) => warmupAudioElement(audioEl)));
  };

  const primeAudioElementFromGesture = (audioElement) => {
    if (!audioElement || !audioElement.src) return;
    const wasMuted = audioElement.muted;
    const wasLoop = audioElement.loop;
    const token = startAudioPriming(audioElement);
    try {
      audioElement.muted = true;
      audioElement.loop = false;
      audioElement.currentTime = 0;
      const playResult = audioElement.play();
      if (playResult && typeof playResult.then === "function") {
        playResult
          .then(() => {
            if (!isAudioPrimingCurrent(audioElement, token)) return;
            audioElement.pause();
            audioElement.currentTime = 0;
            audioElement.muted = wasMuted;
            audioElement.loop = wasLoop;
            clearAudioPriming(audioElement, token);
          })
          .catch(() => {
            if (!isAudioPrimingCurrent(audioElement, token)) return;
            audioElement.muted = wasMuted;
            audioElement.loop = wasLoop;
            clearAudioPriming(audioElement, token);
          });
      } else {
        if (isAudioPrimingCurrent(audioElement, token)) {
          audioElement.pause();
          audioElement.currentTime = 0;
          audioElement.muted = wasMuted;
          audioElement.loop = wasLoop;
          clearAudioPriming(audioElement, token);
        }
      }
    } catch (_error) {
      if (isAudioPrimingCurrent(audioElement, token)) {
        audioElement.muted = wasMuted;
        audioElement.loop = wasLoop;
        clearAudioPriming(audioElement, token);
      }
    }
  };

  const primeAllSessionAudios = useCallback((effectiveAmbientUrl, effectiveSeptasyncUrl) => {
    if (effectiveAmbientUrl && bosqueAudioRef.current) {
      syncLoopTrackSource(bosqueAudioRef.current, effectiveAmbientUrl);
    }
    if (effectiveSeptasyncUrl && septasyncAudioRef.current) {
      syncLoopTrackSource(septasyncAudioRef.current, effectiveSeptasyncUrl);
    }

    ensureReverbGraph();
    ensureAuxGainGraph(bosqueAudioRef.current, bosqueSourceNodeRef, bosqueGainRef, 0);
    ensureAuxGainGraph(septasyncAudioRef.current, septasyncSourceNodeRef, septasyncGainRef, 0);
    ensureAuxGainGraph(preApneaCueAudioRef.current, preCueSourceNodeRef, preCueGainRef, 1.8);
    ensureAuxGainGraph(finalApneaCueAudioRef.current, finalCueSourceNodeRef, finalCueGainRef, 1.8);

    const targets = [
      audioRef.current,
      breathAudioRef.current,
      breathAudioAltRef.current,
      endApneaAudioRef.current,
      preApneaCueAudioRef.current,
      finalApneaCueAudioRef.current,
      effectiveAmbientUrl ? bosqueAudioRef.current : null,
      effectiveSeptasyncUrl ? septasyncAudioRef.current : null
    ].filter(Boolean);

    targets.forEach((audioEl) => primeAudioElementFromGesture(audioEl));
  }, [ensureAuxGainGraph, ensureReverbGraph]);

  const recordPracticeActivity = useCallback(() => {
    if (!student?.slug || !hasStudentAccess) return;
    fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: student.slug,
        token,
        action: "practice-activity",
        activity: {
          startedAt: new Date().toISOString(),
          dayKey: localDateKey(new Date())
        }
      })
    }).catch((error) => {
      console.warn("practice activity warning:", error?.message || error);
    });
  }, [student?.slug, token, hasStudentAccess]);

  const sendBeginnerAudioPlayback = useCallback(
    (status = "progress", options = {}) => {
      if (!student?.slug || !hasStudentAccess || !beginnerPlaybackRef.current) return;
      const state = beginnerPlaybackRef.current;
      const audioId = options.audioId || state.audioId || "beginner-1";
      const audioEl = beginnerAudioRefs.current[audioId] || beginnerAudioRef.current;
      const durationSeconds = Math.max(
        0,
        Math.round(Number.isFinite(audioEl?.duration) ? audioEl.duration : state.durationSeconds || 0)
      );
      const currentSeconds = Math.max(
        0,
        Number.isFinite(audioEl?.currentTime) ? audioEl.currentTime : state.maxPositionSeconds || 0
      );
      state.maxPositionSeconds = Math.max(
        Number(state.maxPositionSeconds || 0),
        currentSeconds,
        Number(options.maxPositionSeconds || 0)
      );
      state.durationSeconds = Math.max(durationSeconds, Number(state.durationSeconds || 0));
      const listenedSeconds = Math.max(0, Math.round(state.maxPositionSeconds || 0));
      const percent = clampPercent(
        state.durationSeconds > 0 ? (listenedSeconds / state.durationSeconds) * 100 : 0
      );
      const completed = status === "complete" || options.completed || percent >= 96;
      const reportedAt = new Date().toISOString();
      const eventType = completed
        ? "completed"
        : status === "partial"
          ? "paused"
          : status === "started"
            ? "started"
            : "resumed";
      const payload = {
        slug: student.slug,
        token,
        action: "beginner-audio-event",
        event: {
          eventType,
          eventAt: reportedAt,
          dayKey: localDateKey(new Date()),
          kind: audioId === "beginner-2" ? "beginner-alt" : "beginner",
          label: state.audioLabel || "",
          durationSeconds: state.durationSeconds,
          currentTimeSeconds: currentSeconds,
          playedSeconds: listenedSeconds,
          completionPercent: state.durationSeconds > 0 ? listenedSeconds / state.durationSeconds : 0,
          completed,
          seeked: Boolean(state.seeked),
          source: "web"
        }
      };

      if (completed) {
        state.completed = true;
      }
      state.lastReportAt = Date.now();

      const body = JSON.stringify(payload);
      if (options.beacon && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/students", blob);
        return;
      }

      fetch("/api/students", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body
      })
        .then((response) => (response.ok ? response.json().catch(() => ({})) : {}))
        .then((data) => {
          if (!data?.beginnerAudioProgress) return;
          setStudents((prev) =>
            prev.map((item) => {
              if (item.slug !== student.slug) return item;
              return {
                ...item,
                beginnerAudioProgress: data.beginnerAudioProgress,
                advancedBlockedReason: data.advancedBlockedReason || item.advancedBlockedReason || "",
                usage: {
                  ...(item.usage || {}),
                  beginnerAudioUsage: data.beginnerAudioProgress
                },
                features: data.features || item.features
              };
            })
          );
        })
        .catch((error) => {
          console.warn("beginner audio tracking warning:", error?.message || error);
        });
    },
    [student?.slug, token, hasStudentAccess]
  );

  const pauseOtherBeginnerAudios = (activeAudioId) => {
    Object.entries(beginnerAudioRefs.current || {}).forEach(([audioId, audioEl]) => {
      if (audioId !== activeAudioId && audioEl && !audioEl.paused) {
        audioEl.pause();
      }
    });
  };

  const handleBeginnerAudioPlay = (audioId = "beginner-1", audioLabel = "Audio básico") => {
    if (!student?.slug || !hasStudentAccess) return;
    pauseOtherBeginnerAudios(audioId);
    const current = beginnerPlaybackRef.current;
    if (!current || current.completed || current.audioId !== audioId) {
      beginnerPlaybackRef.current = {
        sessionId: `${student.slug}-${audioId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        audioId,
        audioLabel,
        startedAt: new Date().toISOString(),
        maxPositionSeconds: 0,
        durationSeconds: 0,
        lastReportAt: 0,
        completed: false,
        seeked: false
      };
      sendBeginnerAudioPlayback("started", { audioId });
      return;
    }
    sendBeginnerAudioPlayback("progress", { audioId });
  };

  const handleBeginnerAudioTimeUpdate = (audioId = "beginner-1") => {
    const state = beginnerPlaybackRef.current;
    const audioEl = beginnerAudioRefs.current[audioId] || beginnerAudioRef.current;
    if (!state || state.completed || state.audioId !== audioId || !audioEl) return;
    state.maxPositionSeconds = Math.max(
      Number(state.maxPositionSeconds || 0),
      Number.isFinite(audioEl.currentTime) ? audioEl.currentTime : 0
    );
    state.durationSeconds = Math.max(
      Number(state.durationSeconds || 0),
      Number.isFinite(audioEl.duration) ? audioEl.duration : 0
    );
    const now = Date.now();
    if (state.maxPositionSeconds >= 30 && now - Number(state.lastReportAt || 0) > 30000) {
      sendBeginnerAudioPlayback("progress", { audioId });
    }
  };

  const handleBeginnerAudioPause = (audioId = "beginner-1") => {
    const audioEl = beginnerAudioRefs.current[audioId] || beginnerAudioRef.current;
    const state = beginnerPlaybackRef.current;
    if (!state || state.completed || state.audioId !== audioId || audioEl?.ended) return;
    if (Number(state.maxPositionSeconds || 0) < 5) return;
    sendBeginnerAudioPlayback("partial", { audioId });
  };

  const handleBeginnerAudioEnded = (audioId = "beginner-1") => {
    sendBeginnerAudioPlayback("complete", { audioId, completed: true });
  };

  const handleBeginnerAudioSeeking = (audioId = "beginner-1") => {
    const state = beginnerPlaybackRef.current;
    if (!state || state.audioId !== audioId) return;
    state.seeked = true;
  };

  useEffect(() => {
    const flushBeginnerPlayback = () => {
      const state = beginnerPlaybackRef.current;
      if (!state || state.completed || Number(state.maxPositionSeconds || 0) < 5) return;
      sendBeginnerAudioPlayback("partial", { beacon: true });
    };

    window.addEventListener("pagehide", flushBeginnerPlayback);
    return () => {
      window.removeEventListener("pagehide", flushBeginnerPlayback);
    };
  }, [sendBeginnerAudioPlayback]);

  useEffect(() => {
    beginnerPlaybackRef.current = null;
  }, [beginnerAudioUrl, beginnerAudioOptions.length, slug]);

  const beginSession = (effectiveAmbientUrl, effectiveSeptasyncUrl) => {
    phaseTransitionLockRef.current = false;
    sessionStartRef.current = Date.now();
    roundApneaByCycleRef.current = [];
    sessionMetricsRecordedRef.current = false;
    pauseStartedAtRef.current = 0;
    setIsRunning(true);
    setIsPaused(false);
    setIsAwaitingFinalClose(false);
    setPreviousApneaSeconds(0);
    preApneaCueCycleRef.current = null;
    breathCueIndexRef.current = 0;
    setPhase("breathing");
    setCycleIndex(1);
    setBreathsDone(0);
    setCurrentBreathNumber(1);
    setSubphase("inhale");
    if (effectiveAmbientUrl) playBosque();
    if (effectiveSeptasyncUrl) playSeptasync();
    recordPracticeActivity();
    playBreathSound();
    const inhaleMs = config.inhaleSeconds * 1000;
    phaseDeadlineRef.current = Date.now() + inhaleMs;
    apneaStartedAtRef.current = 0;
    setTimeLeftMs(inhaleMs);
  };

  const runAudioCheck = async () => {
    setAudioCheckStatus("checking");
    setAudioCheckMessage("Chequeando audios...");
    const loaded = await loadSystemAudio();
    const effectiveAmbientUrl = getAmbientUrlFromMap(
      { ...ambientAudioMap, ...(loaded?.nextAmbient || {}) },
      config.ambientSound
    );
    const effectiveSeptasyncUrl = getSeptasyncUrlFromMap(
      { ...septasyncAudioMap, ...(loaded?.nextSeptasync || {}) },
      config.septasyncTrack
    );
    if (effectiveAmbientUrl && bosqueAudioRef.current) {
      syncLoopTrackSource(bosqueAudioRef.current, effectiveAmbientUrl);
    }
    if (effectiveSeptasyncUrl && septasyncAudioRef.current) {
      syncLoopTrackSource(septasyncAudioRef.current, effectiveSeptasyncUrl);
    }
    const apneaUrl = await loadSignedAudio();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
      audioRef.current.muted = true;
    }
    const checks = [];
    if (apneaUrl && audioRef.current) checks.push(waitForAudioReady(audioRef.current));
    if (breathAudioRef.current?.src) checks.push(waitForAudioReady(breathAudioRef.current));
    if (breathAudioAltRef.current?.src) checks.push(waitForAudioReady(breathAudioAltRef.current));
    if (endApneaAudioRef.current?.src) checks.push(waitForAudioReady(endApneaAudioRef.current));
    if (preApneaCueAudioRef.current?.src) checks.push(waitForAudioReady(preApneaCueAudioRef.current));
    if (finalApneaCueAudioRef.current?.src) checks.push(waitForAudioReady(finalApneaCueAudioRef.current));
    if (effectiveAmbientUrl && bosqueAudioRef.current?.src) checks.push(waitForAudioReady(bosqueAudioRef.current));
    if (effectiveSeptasyncUrl && septasyncAudioRef.current?.src) checks.push(waitForAudioReady(septasyncAudioRef.current));

    const results = await Promise.all(checks);
    const okCount = results.filter(Boolean).length;
    const allOk = results.length > 0 && okCount === results.length;

    if (allOk || (apneaUrl && okCount >= 1)) {
      setAudioCheckStatus("ready");
      setAudioCheckMessage(`Audio OK (${okCount}/${results.length})`);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.loop = false;
        audioRef.current.muted = false;
      }
      return true;
    }

    setAudioCheckStatus("warning");
    setAudioCheckMessage(`Audio parcial (${okCount}/${results.length}), inicio permitido`);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
      audioRef.current.muted = false;
    }
    return true;
  };

  const startSession = async () => {
    if (!student || isRunningRef.current || isStarting) return;
    setIsStarting(true);
    await requestWakeLock();
    const startNonce = Date.now();
    startRequestRef.current = startNonce;
    try {
      const immediateAmbientUrl = getAmbientUrlFromMap(ambientAudioMap, config.ambientSound);
      const immediateSeptasyncUrl = getSeptasyncUrlFromMap(septasyncAudioMap, config.septasyncTrack);
      primeAllSessionAudios(immediateAmbientUrl, immediateSeptasyncUrl);

      setAudioCheckStatus("checking");
      setAudioCheckMessage("Preparando audios...");

      const loaded = await loadSystemAudio();
      if (startRequestRef.current !== startNonce) return;

      const effectiveAmbientUrl = getAmbientUrlFromMap(
        { ...ambientAudioMap, ...(loaded?.nextAmbient || {}) },
        config.ambientSound
      );
      const effectiveSeptasyncUrl = getSeptasyncUrlFromMap(
        { ...septasyncAudioMap, ...(loaded?.nextSeptasync || {}) },
        config.septasyncTrack
      );

      const apneaUrl = await loadSignedAudio();
      if (startRequestRef.current !== startNonce) return;

      await warmupAllAudios(effectiveAmbientUrl, effectiveSeptasyncUrl);
      if (startRequestRef.current !== startNonce) return;

      if (apneaUrl) {
        setAudioCheckStatus("ready");
        setAudioCheckMessage("Audio OK");
      } else {
        setAudioCheckStatus("warning");
        setAudioCheckMessage("Audio estudiante no disponible, iniciando igual");
      }

      beginSession(effectiveAmbientUrl, effectiveSeptasyncUrl);
    } catch (_error) {
      setAudioCheckStatus("warning");
      setAudioCheckMessage("No se pudo preparar todo el audio. Reintenta.");
    } finally {
      setIsStarting(false);
    }
  };

  const pauseSession = () => {
    pauseStartedAtRef.current = Date.now();
    setIsPaused(true);
    pauseAudio();
    stopBreathSound();
  };

  const resumeSession = () => {
    const pausedMs = pauseStartedAtRef.current ? Math.max(0, Date.now() - pauseStartedAtRef.current) : 0;
    pauseStartedAtRef.current = 0;
    if (pausedMs > 0) {
      if (phaseRef.current === "apnea") {
        apneaStartedAtRef.current += pausedMs;
      } else if (phaseDeadlineRef.current) {
        phaseDeadlineRef.current += pausedMs;
      }
    }
    setIsPaused(false);
    if (phase === "apnea") playAudio();
    if (phase === "breathing" || phase === "recovery" || phase === "apnea") {
      playBosque();
      playSeptasync();
    }
    if (phase === "breathing") {
      if (subphase === "inhale") playBreathSound();
    }
  };

  const stopSession = () => {
    if (
      isRunningRef.current &&
      phaseRef.current !== "idle" &&
      phaseRef.current !== "complete"
    ) {
      recordCurrentSessionIfNeeded({ partial: true, manualStop: true });
    }
    countdownAbortRef.current = true;
    setStartCountdown(0);
    cancelStopHold();
    cancelFinalizeHold();
    cancelEndApneaHold();
    setIsRunning(false);
    setIsPaused(false);
    setIsAwaitingFinalClose(false);
    pauseStartedAtRef.current = 0;
    phaseDeadlineRef.current = 0;
    apneaStartedAtRef.current = 0;
    phaseTransitionLockRef.current = false;
    setPhase("idle");
    setTimeLeftMs(0);
    setBreathsDone(0);
    setCycleIndex(1);
    setCurrentBreathNumber(1);
    setSubphase("inhale");
    roundApneaByCycleRef.current = [];
    lastBreathTriggerRef.current = 0;
    breathCueIndexRef.current = 0;
    stopAudio();
    stopBosque();
    stopSeptasync();
    stopBreathSound();
    if (preApneaCueAudioRef.current) {
      preApneaCueAudioRef.current.pause();
      preApneaCueAudioRef.current.currentTime = 0;
    }
    if (finalApneaCueAudioRef.current) {
      finalApneaCueAudioRef.current.pause();
      finalApneaCueAudioRef.current.currentTime = 0;
    }
  };

  const startApnea = () => {
    setPhase("apnea");
    apneaStartedAtRef.current = Date.now();
    phaseDeadlineRef.current = 0;
    setTimeLeftMs(0);
    lastBreathTriggerRef.current = 0;
    breathCueIndexRef.current = 0;
    stopBreathSound();
    const startPlayback = () => {
      playAudio();
      setTimeout(() => {
        if (!isRunningRef.current || isPausedRef.current) return;
        if (selectedAmbientUrl) playBosque();
        if (selectedSeptasyncUrl) playSeptasync();
      }, 250);
    };

    if (audioRef.current?.src || audioSrc) {
      startPlayback();
      return;
    }

    loadSignedAudio().then((url) => {
      if (url) startPlayback();
    });
  };

  const startRecovery = () => {
    if (phase === "apnea") {
      const apneaMs = Math.max(0, Date.now() - (apneaStartedAtRef.current || Date.now()));
      const apneaSeconds = Math.round(apneaMs / 1000);
      lastApneaMsRef.current = apneaMs;
      setPreviousApneaSeconds(apneaSeconds);
      roundApneaByCycleRef.current[cycleIndex - 1] = apneaSeconds;
      stopAudio();
      if (cycleIndex < config.cycles) {
        playEndApnea();
      }
      if (cycleIndex >= config.cycles) {
        playFinalApneaCue();
      }
    }
    setPhase("recovery");
    const recoveryMs = config.recoverySeconds * 1000;
    phaseDeadlineRef.current = Date.now() + recoveryMs;
    setTimeLeftMs(recoveryMs);
  };

  const recordSessionMetrics = async ({
    completedRounds,
    plannedRounds,
    breathsPerCycle,
    apneaByRound,
    partial = false,
    manualStop = false,
    startedAt = "",
    durationSeconds = 0,
    breathsDoneTotal = 0
  }) => {
    if (!student?.slug || !hasStudentAccess) return;
    try {
      await fetch("/api/students", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: student.slug,
          token,
          session: {
            completedRounds,
            plannedRounds,
            breathsPerCycle,
            breathsDoneTotal,
            apneaByRound,
            partial,
            manualStop,
            startedAt,
            date: localDateKey(new Date()),
            durationSeconds,
            completedAt: new Date().toISOString()
          }
        })
      });
    } catch (error) {
      console.warn("session metrics warning:", error?.message || error);
    }
  };

  const buildSessionSnapshot = ({ partial = false, manualStop = false } = {}) => {
    const activePhase = phaseRef.current || phase;
    const totalCycles = Math.max(1, Number(config.cycles || 1));
    const currentCycle = Math.min(
      totalCycles,
      Math.max(1, Number(cycleIndexRef.current || cycleIndex || 1))
    );
    const breathsPerCycle = Math.max(1, Number(config.breathsPerCycle || 1));
    const apneaByRound = roundApneaByCycleRef.current
      .slice(0, totalCycles)
      .map((value) => Math.max(0, Number(value || 0)));

    while (apneaByRound.length < totalCycles) {
      apneaByRound.push(0);
    }

    if (activePhase === "apnea" && apneaStartedAtRef.current) {
      const apneaSeconds = Math.max(0, Math.round((Date.now() - apneaStartedAtRef.current) / 1000));
      apneaByRound[currentCycle - 1] = Math.max(apneaByRound[currentCycle - 1] || 0, apneaSeconds);
    }

    const completedBeforeCurrent = Math.max(0, currentCycle - 1);
    const currentBreath = Math.max(1, Number(currentBreathNumberRef.current || currentBreathNumber || 1));
    const doneState = Math.max(0, Number(breathsDoneRef.current || breathsDone || 0));
    const breathsInCurrent =
      activePhase === "breathing"
        ? Math.min(breathsPerCycle, Math.max(doneState, currentBreath - 1))
        : activePhase === "apnea" || activePhase === "recovery" || activePhase === "complete"
          ? breathsPerCycle
          : 0;

    let completedRounds = completedBeforeCurrent;
    if (activePhase === "breathing") {
      completedRounds += breathsInCurrent / breathsPerCycle;
    } else if (activePhase === "apnea" || activePhase === "recovery" || activePhase === "complete") {
      completedRounds += 1;
    }

    const apneasCompleted = apneaByRound.filter((seconds) => seconds > 0).length;
    completedRounds = Math.min(totalCycles, Math.max(completedRounds, apneasCompleted));

    const durationSeconds = sessionStartRef.current
      ? Math.max(0, Math.round((Date.now() - sessionStartRef.current) / 1000))
      : 0;
    const breathsDoneTotal = Math.min(
      totalCycles * breathsPerCycle,
      Math.max(0, completedBeforeCurrent * breathsPerCycle + breathsInCurrent)
    );

    return {
      completedRounds: Number(completedRounds.toFixed(2)),
      plannedRounds: totalCycles,
      breathsPerCycle,
      breathsDoneTotal,
      apneaByRound,
      partial,
      manualStop,
      startedAt: sessionStartRef.current ? new Date(sessionStartRef.current).toISOString() : "",
      durationSeconds
    };
  };

  const recordCurrentSessionIfNeeded = (flags = {}) => {
    if (sessionMetricsRecordedRef.current) return;
    const snapshot = buildSessionSnapshot(flags);
    const hasUsefulProgress =
      snapshot.completedRounds > 0 ||
      snapshot.breathsDoneTotal > 0 ||
      snapshot.apneaByRound.some((seconds) => seconds > 0);

    if (!hasUsefulProgress) return;
    sessionMetricsRecordedRef.current = true;
    recordSessionMetrics(snapshot);
  };

  const finishSession = () => {
    setPhase("complete");
    setIsRunning(true);
    setIsPaused(false);
    setIsAwaitingFinalClose(true);
    pauseStartedAtRef.current = 0;
    phaseDeadlineRef.current = 0;
    apneaStartedAtRef.current = 0;
    phaseTransitionLockRef.current = false;
    setTimeLeftMs(0);
    stopAudio();
    stopBreathSound();

    const today = getTodayKey();
    const yesterday = getYesterdayKey();
    const addedBreaths = config.breathsPerCycle * config.cycles;
    const apneaByRound = roundApneaByCycleRef.current
      .slice(0, config.cycles)
      .map((value) => Math.max(0, Number(value || 0)));

    if (!sessionMetricsRecordedRef.current) {
      sessionMetricsRecordedRef.current = true;
      recordSessionMetrics({
        completedRounds: cycleIndex,
        plannedRounds: config.cycles,
        breathsPerCycle: config.breathsPerCycle,
        breathsDoneTotal: addedBreaths,
        apneaByRound,
        partial: false,
        manualStop: false,
        startedAt: sessionStartRef.current ? new Date(sessionStartRef.current).toISOString() : "",
        durationSeconds: sessionStartRef.current
          ? Math.max(0, Math.round((Date.now() - sessionStartRef.current) / 1000))
          : 0
      });
    }

    setProgress((prev) => {
      const lastDate = prev.lastSessionDate || "";
      let nextStreak = prev.streak || 0;

      if (lastDate === today) {
        nextStreak = prev.streak;
      } else if (lastDate === yesterday) {
        nextStreak = (prev.streak || 0) + 1;
      } else {
        nextStreak = 1;
      }

      const updated = {
        totalSessions: (prev.totalSessions || 0) + 1,
        totalBreaths: (prev.totalBreaths || 0) + addedBreaths,
        streak: nextStreak,
        lastSessionDate: today,
        lastApneaSeconds: Math.round((lastApneaMsRef.current || 0) / 1000),
        apneaHistory: [
          ...(prev.apneaHistory || []),
          {
            date: today,
            seconds: Math.round((lastApneaMsRef.current || 0) / 1000),
            rounds: apneaByRound.filter((seconds) => seconds > 0),
            timestamp: new Date().toISOString()
          }
        ].slice(-10),
        lastSummary: {
          date: today,
          cycles: config.cycles,
          breaths: addedBreaths,
          apneaSeconds: Math.round((lastApneaMsRef.current || 0) / 1000),
          rounds: apneaByRound.filter((seconds) => seconds > 0)
        }
      };

      localStorage.setItem(`rmcortex_progress_${slug}`, JSON.stringify(updated));
      return updated;
    });
  };

  const playAudio = () => {
    if (!audioRef.current) return;
    ensureReverbGraph();
    markRealAudioPlayback(audioRef.current);
    audioRef.current.muted = false;
    audioRef.current.currentTime = 0;
    audioRef.current.loop = true;
    audioRef.current.play().catch(() => {
      // Autoplay might be blocked until user gesture
    });
  };

  const playBreathSound = () => {
    if (!breathAudioRef.current && !breathAudioAltRef.current && !breathBufferRef.current) return;
    const now = Date.now();
    if (now - lastBreathTriggerRef.current < 320) return;
    lastBreathTriggerRef.current = now;
    const breathCueVolume = Math.min(1, Math.max(0, config.breathCueVolume ?? 1));

    if (breathStopTimerRef.current) {
      clearTimeout(breathStopTimerRef.current);
      breathStopTimerRef.current = null;
    }

    const loadedBreathUrl = breathAudioRef.current?.src || breathAudioAltRef.current?.src || "";

    const playWithBuffer = () => {
      const buffer = breathBufferRef.current;
      if (!buffer) return false;
      if (
        loadedBreathUrl &&
        breathBufferUrlRef.current &&
        breathBufferUrlRef.current !== loadedBreathUrl
      ) {
        return false;
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      if (!audioContextRef.current) {
        audioContextRef.current = new Ctx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      breathActiveSourcesRef.current.forEach((source) => {
        try {
          source.stop(0);
        } catch (_error) {
          // no-op
        }
      });
      breathActiveSourcesRef.current.clear();
      [breathAudioRef.current, breathAudioAltRef.current].forEach((audioEl) => {
        if (!audioEl) return;
        audioEl.pause();
        try {
          audioEl.currentTime = 0;
        } catch (_error) {
          // ignore
        }
      });

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = 1;
      gain.gain.value = breathCueVolume;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.onended = () => {
        breathActiveSourcesRef.current.delete(source);
        source.disconnect();
        gain.disconnect();
      };
      breathActiveSourcesRef.current.add(source);
      source.start(0);
      return true;
    };

    if (playWithBuffer()) return;

    const usePrimary = breathCueIndexRef.current % 2 === 0;
    breathCueIndexRef.current += 1;
    const audioEl = usePrimary
      ? breathAudioRef.current || breathAudioAltRef.current
      : breathAudioAltRef.current || breathAudioRef.current;
    const backupEl = usePrimary
      ? breathAudioAltRef.current || breathAudioRef.current
      : breathAudioRef.current || breathAudioAltRef.current;
    if (!audioEl) return;

    const restartAndPlay = (target) => {
      if (!target || !target.src) return Promise.reject(new Error("sin fuente"));
      markRealAudioPlayback(target);
      target.loop = false;
      target.playbackRate = 1;
      target.volume = breathCueVolume;
      try {
        target.currentTime = 0;
      } catch (_error) {
        // ignore
      }
      const attempt = target.play();
      if (attempt && typeof attempt.then === "function") {
        return attempt;
      }
      return Promise.resolve();
    };

    const breathSrc = audioEl?.src || backupEl?.src || "";
    if (breathSrc) {
      // Preparamos el buffer para el próximo disparo, pero no lo reproducimos
      // al terminar la carga: si llega tarde, pisaría la respiración actual.
      ensureBreathBuffer(breathSrc).catch(() => {});
    }

    restartAndPlay(audioEl)
      .catch(() => restartAndPlay(backupEl))
      .catch(() => {
        const src = breathSrc;
        if (!src) return;
        try {
          const oneShot = new Audio(src);
          oneShot.preload = "auto";
          oneShot.loop = false;
          oneShot.playbackRate = 1;
          oneShot.volume = breathCueVolume;
          oneShot.play().catch(() => {});
        } catch (_error) {
          // ignore
        }
      });
  };

  const stopBreathSound = () => {
    const stopOne = (audioEl) => {
      if (!audioEl) return;
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.playbackRate = 1;
    };
    breathActiveSourcesRef.current.forEach((source) => {
      try {
        source.stop(0);
      } catch (_error) {
        // no-op
      }
    });
    breathActiveSourcesRef.current.clear();
    if (breathStopTimerRef.current) {
      clearTimeout(breathStopTimerRef.current);
      breathStopTimerRef.current = null;
    }
    stopOne(breathAudioRef.current);
    stopOne(breathAudioAltRef.current);
    lastBreathTriggerRef.current = 0;
  };

  const playBosque = () => {
    if (!bosqueAudioRef.current) return;
    if (!selectedAmbientUrl) return;
    const changedSource = syncLoopTrackSource(bosqueAudioRef.current, selectedAmbientUrl);
    if (bosqueFadeStopRef.current) {
      clearTimeout(bosqueFadeStopRef.current);
      bosqueFadeStopRef.current = null;
    }
    const targetGain = Math.min(1, Math.max(0, config.bosqueVolume));
    ensureAuxGainGraph(
      bosqueAudioRef.current,
      bosqueSourceNodeRef,
      bosqueGainRef,
      0
    );
    markRealAudioPlayback(bosqueAudioRef.current);
    bosqueAudioRef.current.loop = true;
    if (bosqueAudioRef.current.paused || changedSource) {
      bosqueAudioRef.current.play().then(() => {
        if (bosqueGainRef.current) {
          smoothGainTo(bosqueGainRef.current, targetGain, 0.35);
        }
      }).catch(() => {});
      return;
    }
    if (bosqueGainRef.current) {
      smoothGainTo(bosqueGainRef.current, targetGain, 0.35);
    }
  };

  const stopBosque = () => {
    if (!bosqueAudioRef.current) return;
    if (bosqueGainRef.current) {
      smoothGainTo(bosqueGainRef.current, 0, 0.35);
      if (bosqueFadeStopRef.current) {
        clearTimeout(bosqueFadeStopRef.current);
      }
      bosqueFadeStopRef.current = setTimeout(() => {
        if (!bosqueAudioRef.current) return;
        bosqueAudioRef.current.pause();
        bosqueAudioRef.current.currentTime = 0;
        bosqueFadeStopRef.current = null;
      }, 380);
      return;
    }
    bosqueAudioRef.current.pause();
    bosqueAudioRef.current.currentTime = 0;
  };

  const playSeptasync = () => {
    if (!septasyncAudioRef.current) return;
    if (!selectedSeptasyncUrl) return;
    const changedSource = syncLoopTrackSource(septasyncAudioRef.current, selectedSeptasyncUrl);
    if (septasyncFadeStopRef.current) {
      clearTimeout(septasyncFadeStopRef.current);
      septasyncFadeStopRef.current = null;
    }
    const targetGain = Math.min(1, Math.max(0, config.septasyncVolume));
    ensureAuxGainGraph(
      septasyncAudioRef.current,
      septasyncSourceNodeRef,
      septasyncGainRef,
      0
    );
    markRealAudioPlayback(septasyncAudioRef.current);
    septasyncAudioRef.current.loop = true;
    if (septasyncAudioRef.current.paused || changedSource) {
      septasyncAudioRef.current.play().then(() => {
        if (septasyncGainRef.current) {
          smoothGainTo(septasyncGainRef.current, targetGain, 0.35);
        }
      }).catch(() => {});
      return;
    }
    if (septasyncGainRef.current) {
      smoothGainTo(septasyncGainRef.current, targetGain, 0.35);
    }
  };

  const stopSeptasync = () => {
    if (!septasyncAudioRef.current) return;
    if (septasyncGainRef.current) {
      smoothGainTo(septasyncGainRef.current, 0, 0.35);
      if (septasyncFadeStopRef.current) {
        clearTimeout(septasyncFadeStopRef.current);
      }
      septasyncFadeStopRef.current = setTimeout(() => {
        if (!septasyncAudioRef.current) return;
        septasyncAudioRef.current.pause();
        septasyncAudioRef.current.currentTime = 0;
        septasyncFadeStopRef.current = null;
      }, 380);
      return;
    }
    septasyncAudioRef.current.pause();
    septasyncAudioRef.current.currentTime = 0;
  };

  const reviveAmbientIfNeeded = () => {
    if (!isRunningRef.current || isPausedRef.current) return;
    if (!selectedAmbientUrl) return;
    if (bosqueAudioRef.current?.paused) {
      playBosque();
    }
  };

  const reviveSeptasyncIfNeeded = () => {
    if (!isRunningRef.current || isPausedRef.current) return;
    if (!selectedSeptasyncUrl) return;
    if (septasyncAudioRef.current?.paused) {
      playSeptasync();
    }
  };

  const playEndApnea = () => {
    if (!endApneaAudioRef.current) return;
    markRealAudioPlayback(endApneaAudioRef.current);
    endApneaAudioRef.current.currentTime = 0;
    endApneaAudioRef.current.loop = false;
    endApneaAudioRef.current.play().catch(() => {
      try {
        const fallback = new Audio(endApneaAudioRef.current.src);
        fallback.play().catch(() => {});
      } catch (_error) {
        // ignore
      }
    });
  };

  const playPreApneaCue = () => {
    if (!preApneaCueAudioRef.current) return;
    ensureAuxGainGraph(preApneaCueAudioRef.current, preCueSourceNodeRef, preCueGainRef, 1.8);
    markRealAudioPlayback(preApneaCueAudioRef.current);
    preApneaCueAudioRef.current.currentTime = 0;
    preApneaCueAudioRef.current.loop = false;
    preApneaCueAudioRef.current.play().catch(() => {
      try {
        const fallback = new Audio(preApneaCueAudioRef.current.src);
        fallback.play().catch(() => {});
      } catch (_error) {
        // ignore
      }
    });
  };

  const playFinalApneaCue = () => {
    if (!finalApneaCueAudioRef.current) return;
    ensureAuxGainGraph(finalApneaCueAudioRef.current, finalCueSourceNodeRef, finalCueGainRef, 1.8);
    markRealAudioPlayback(finalApneaCueAudioRef.current);
    finalApneaCueAudioRef.current.currentTime = 0;
    finalApneaCueAudioRef.current.loop = false;
    finalApneaCueAudioRef.current.play().catch(() => {
      try {
        const fallback = new Audio(finalApneaCueAudioRef.current.src);
        fallback.play().catch(() => {});
      } catch (_error) {
        // ignore
      }
    });
  };

  const loadSignedAudio = async () => {
    if (!student?.slug) return null;
    setAudioStatus("loading");
    try {
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
      const response = await fetch(
        `/api/audio?slug=${encodeURIComponent(student.slug)}${tokenParam}`
      );
      if (!response.ok) throw new Error("No se pudo firmar el audio");
      const data = await response.json();
      if (!data?.url) throw new Error("URL inválida");
      setAudioSrc(data.url);
      setAudioStatus("ready");
      if (audioRef.current) {
        audioRef.current.src = data.url;
      }
      return data.url;
    } catch (error) {
      setAudioStatus("error");
      return null;
    }
  };

  const previewAudio = () => {
    loadSignedAudio().then((url) => {
      if (!url || !audioRef.current) return;
      ensureReverbGraph();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
      audioRef.current.play().catch(() => {
        // Autoplay might be blocked until user gesture
      });
    });
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const pauseAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  };

  const stopAudio = () => {
    if (!audioRef.current) return;
    const audioEl = audioRef.current;
    audioEl.loop = false;
    audioEl.muted = true;
    audioEl.pause();
    try {
      audioEl.currentTime = 0;
    } catch (_error) {
      // iOS puede bloquear currentTime durante cambios de foco.
    }

    if (masterGainRef.current) {
      const now = audioContextRef.current?.currentTime || 0;
      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.setValueAtTime(Math.min(1, Math.max(0, config.audioVolume)), now);
    }

    setTimeout(() => {
      if (!audioRef.current) return;
      audioRef.current.muted = false;
    }, 60);
  };

  const cancelEndApneaHold = () => {
    if (endHoldTimeoutRef.current) {
      clearTimeout(endHoldTimeoutRef.current);
      endHoldTimeoutRef.current = null;
    }
    if (endHoldIntervalRef.current) {
      clearInterval(endHoldIntervalRef.current);
      endHoldIntervalRef.current = null;
    }
    setEndHoldProgress(0);
  };

  const startEndApneaHold = (event) => {
    if (phase !== "apnea") return;
    event.preventDefault();
    cancelEndApneaHold();
    const startAt = Date.now();
    const holdMs = 1500;
    endHoldIntervalRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startAt) / holdMs) * 100);
      setEndHoldProgress(pct);
    }, 30);
    endHoldTimeoutRef.current = setTimeout(() => {
      cancelEndApneaHold();
      endApneaEarly();
    }, holdMs);
  };

  const endApneaEarly = () => {
    if (phase !== "apnea") return;
    startRecovery();
  };

  const cancelStopHold = () => {
    if (stopHoldTimeoutRef.current) {
      clearTimeout(stopHoldTimeoutRef.current);
      stopHoldTimeoutRef.current = null;
    }
    if (stopHoldIntervalRef.current) {
      clearInterval(stopHoldIntervalRef.current);
      stopHoldIntervalRef.current = null;
    }
    setStopHoldProgress(0);
  };

  const startStopHold = (event) => {
    if (!isRunning || phase === "apnea" || phase === "complete") return;
    event.preventDefault();
    cancelStopHold();
    const startAt = Date.now();
    stopHoldIntervalRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startAt) / STOP_HOLD_MS) * 100);
      setStopHoldProgress(pct);
    }, 30);
    stopHoldTimeoutRef.current = setTimeout(() => {
      cancelStopHold();
      stopSession();
    }, STOP_HOLD_MS);
  };

  const cancelFinalizeHold = () => {
    if (finalHoldTimeoutRef.current) {
      clearTimeout(finalHoldTimeoutRef.current);
      finalHoldTimeoutRef.current = null;
    }
    if (finalHoldIntervalRef.current) {
      clearInterval(finalHoldIntervalRef.current);
      finalHoldIntervalRef.current = null;
    }
    setFinalHoldProgress(0);
  };

  const finalizeCompleteSession = () => {
    cancelFinalizeHold();
    cancelEndApneaHold();
    cancelStopHold();
    setIsAwaitingFinalClose(false);
    setIsRunning(false);
    setIsPaused(false);
    setPhase("idle");
    setTimeLeftMs(0);
    setBreathsDone(0);
    setCycleIndex(1);
    setCurrentBreathNumber(1);
    setSubphase("inhale");
    stopAudio();
    stopBreathSound();
    stopBosque();
    stopSeptasync();
    if (preApneaCueAudioRef.current) {
      preApneaCueAudioRef.current.pause();
      preApneaCueAudioRef.current.currentTime = 0;
    }
    if (finalApneaCueAudioRef.current) {
      finalApneaCueAudioRef.current.pause();
      finalApneaCueAudioRef.current.currentTime = 0;
    }
  };

  const startFinalizeHold = (event) => {
    if (phase !== "complete" || !isAwaitingFinalClose) return;
    event.preventDefault();
    cancelFinalizeHold();
    const startAt = Date.now();
    finalHoldIntervalRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startAt) / FINALIZE_HOLD_MS) * 100);
      setFinalHoldProgress(pct);
    }, 30);
    finalHoldTimeoutRef.current = setTimeout(() => {
      finalizeCompleteSession();
    }, FINALIZE_HOLD_MS);
  };

  const formatSeconds = (ms) => {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  };

  const inhaleStyle = {
    "--phase-duration": `${config.inhaleSeconds}s`
  };

  const exhaleStyle = {
    "--phase-duration": `${config.exhaleSeconds}s`
  };

  const phaseStyle = () => {
    if (phase === "breathing" && subphase === "inhale") return inhaleStyle;
    if (phase === "breathing" && subphase === "exhale") return exhaleStyle;
    if (phase === "apnea" || phase === "recovery") return { animationDuration: "6s" };
    return {};
  };

  const phaseClass = () => {
    if (phase === "apnea") return "apnea";
    if (phase === "breathing" && subphase === "inhale") return "inhale";
    if (phase === "breathing" && subphase === "exhale") return "exhale";
    if (phase === "recovery") return "recovery";
    return "idle";
  };

  const nostrilState = useMemo(() => {
    if (phase !== "breathing") return "both";
    return getNostrilState(config.breathStyle, currentBreathNumber);
  }, [phase, config.breathStyle, currentBreathNumber]);

  const nextNostrilState = useMemo(() => {
    if (phase !== "breathing") return "none";
    if (currentBreathNumber >= config.breathsPerCycle) return "none";
    return getNostrilState(config.breathStyle, currentBreathNumber + 1);
  }, [phase, config.breathStyle, currentBreathNumber, config.breathsPerCycle]);

  const glowNostrilState = useMemo(() => {
    if (phase !== "breathing") return "both";
    const isAboutToSwitch =
      subphase === "exhale" &&
      nextNostrilState !== "none" &&
      timeLeftMs <= NOSTRIL_PREVIEW_MS;
    if (isAboutToSwitch) return nextNostrilState;
    return nostrilState;
  }, [phase, subphase, timeLeftMs, nextNostrilState, nostrilState]);

  const selectedSpeedOption = useMemo(
    () =>
      SPEED_OPTIONS.find(
        (option) =>
          config.inhaleSeconds === option.inhale &&
          config.exhaleSeconds === option.exhale
      ) || SPEED_OPTIONS[1],
    [config.inhaleSeconds, config.exhaleSeconds]
  );

  const sessionModeLabel = `${BREATH_STYLE_SHORT_LABELS[config.breathStyle] || "Activación"} · ${
    SPEED_SHORT_LABELS[selectedSpeedOption.id] || "Normal"
  }`;

  const isSessionActive = isRunning && phase !== "idle" && phase !== "complete";
  const breathProgressPercent = Math.min(
    100,
    Math.max(0, (currentBreathNumber / Math.max(1, config.breathsPerCycle)) * 100)
  );

  const renderHeader = () => {
    const path = window.location.pathname;
    const isSystemRoute =
      path.startsWith("/upload") ||
      path.startsWith("/editor") ||
      path.startsWith("/admin") ||
      path.startsWith("/login") ||
      path.startsWith("/set-password");
    const isPastStudentStart = !isSystemRoute && practiceScreen !== "menu";

    return (
      <header className={`header ${isPastStudentStart ? "compact-flow-header" : ""}`}>
        {!isPastStudentStart && (
          <div>
            <p className="eyebrow">
              {path.startsWith("/upload")
                ? "Carga de audio"
                : path.startsWith("/editor")
                  ? "Editor de audio"
                  : path.startsWith("/login") || path.startsWith("/set-password")
                    ? "Acceso de alumno"
                  : practiceScreen === "daily-goals"
                    ? "Metas Diarias"
                    : practiceScreen === "color-vision"
                      ? "Visualizacion de colores"
                      : practiceScreen === "principiante"
                        ? "Reprogramacion mental principiante"
                        : "Reprogramación mental"}
            </p>
            {!brandLogoMissing && (
              <img
                className="brand-logo"
                src={theme === "dark" ? "/logo-10-dark.png" : "/logo-10-light.png"}
                alt="Cortex"
                onError={() => setBrandLogoMissing(true)}
              />
            )}
            {brandLogoMissing && <h1 className="brand-fallback">Reprogramación Mental / Cortex</h1>}
          </div>
        )}
        <div className="header-controls">
          <button
            type="button"
            className="theme-toggle"
            aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          >
            {isPastStudentStart ? (theme === "dark" ? "☀" : "☾") : theme === "dark" ? "Modo claro" : "Modo oscuro"}
          </button>
          {!isPastStudentStart && (
            <div className="student-chip">
              <span>Estudiante</span>
              <strong>{student?.name || "Sin asignación"}</strong>
            </div>
          )}
        </div>
      </header>
    );
  };

  const buildStudentLink = (studentSlug, studentToken, includeToken) => {
    const origin = window.location.origin;
    const tokenParam =
      includeToken && studentToken ? `?t=${studentToken}` : "";
    return `${origin}/s/${studentSlug}${tokenParam}`;
  };

  const buildUploadLink = (studentSlug, studentToken) =>
    `${window.location.origin}/upload/${studentSlug}?t=${studentToken}`;

  const buildWorkflowAudioUrl = (item, kind, passwordValue = adminPassword) =>
    `/api/audio-file?slug=${encodeURIComponent(item.slug)}&kind=${encodeURIComponent(kind)}&password=${encodeURIComponent(passwordValue || "")}`;

  const showAdminFeedback = (message) => {
    try {
      if (typeof window.alert === "function") {
        window.alert(message);
        return;
      }
    } catch (_error) {
      // Algunos iframes bloquean alert/confirm/prompt; usamos el mensaje del panel.
    }
    setAdminMessage(message);
  };

  const confirmAdminAction = (message) => {
    try {
      if (typeof window.confirm === "function") {
        return window.confirm(message);
      }
    } catch (_error) {
      return true;
    }
    return true;
  };

  const showCopyFallback = (message, value) => {
    try {
      if (typeof window.prompt === "function") {
        window.prompt(message, value);
        return;
      }
    } catch (_error) {
      // El panel puede estar embebido y bloquear prompts nativos.
    }
    setAdminMessage(`${message} ${value}`);
  };

  const copyUploadLink = async (studentSlug, studentToken) => {
    const link = buildUploadLink(studentSlug, studentToken);
    try {
      await navigator.clipboard.writeText(link);
      showAdminFeedback("Link de carga copiado.");
    } catch (error) {
      showCopyFallback("Copia el link de carga:", link);
    }
  };

  const copyLink = async (studentSlug, studentToken, includeToken) => {
    const link = buildStudentLink(studentSlug, studentToken, includeToken);
    try {
      await navigator.clipboard.writeText(link);
      showAdminFeedback("Link copiado.");
    } catch (error) {
      showCopyFallback("Copia el link:", link);
    }
  };

  const copyToken = async (studentToken) => {
    if (!studentToken) return;
    try {
      await navigator.clipboard.writeText(studentToken);
      showAdminFeedback("Token copiado.");
    } catch (error) {
      showCopyFallback("Copia el token:", studentToken);
    }
  };

  const runStudentMenuAction = async (action) => {
    const now = Date.now();
    if (now - studentMenuActionLockRef.current < 700) return;
    studentMenuActionLockRef.current = now;
    try {
      await action();
    } finally {
      setOpenStudentMenuSlug("");
      window.setTimeout(() => {
        studentMenuActionLockRef.current = 0;
      }, 700);
    }
  };

  const handleStudentMenuAction = (event, action) => {
    event.preventDefault();
    event.stopPropagation();
    runStudentMenuAction(action);
  };

  const executeDoubleTapAction = () => {
    const now = Date.now();
    if (now - lastDoubleTapActionRef.current < 420) return;
    lastDoubleTapActionRef.current = now;

    if (phase === "recovery") return;
    if (!isRunning) {
      startSession();
      return;
    }
    if (phase === "breathing") {
      startApnea();
      return;
    }
    if (phase === "apnea") {
      startRecovery();
    }
  };

  const handleDailyMagicUnlock = useCallback((payload) => {
    const score = Number(payload?.score || 0);
    const unlocked = Boolean(payload?.unlocked);
    setWhiteMagicScore(score);
    setWhiteMagicUnlocked(unlocked);
    try {
      localStorage.setItem(
        whiteMagicStorageKey,
        JSON.stringify({
          unlocked,
          score,
          updatedAt: new Date().toISOString()
        })
      );
    } catch (_error) {
      // ignore
    }
  }, [whiteMagicStorageKey]);

  const persistQuickDailyPayload = useCallback(async () => {
    if (!slug || !hasStudentAccess) return;
    const payload = quickDailyPayloadRef.current;
    if (!payload) return;
    try {
      await fetch("/api/daily/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, token, payload })
      });
    } catch (_error) {
      // silent, se reintenta con próximos cambios
    }
  }, [slug, token, hasStudentAccess]);

  const scheduleQuickDailySave = useCallback(() => {
    if (quickDailySaveTimerRef.current) {
      clearTimeout(quickDailySaveTimerRef.current);
    }
    quickDailySaveTimerRef.current = setTimeout(() => {
      persistQuickDailyPayload();
      quickDailySaveTimerRef.current = null;
    }, 350);
  }, [persistQuickDailyPayload]);

  const loadQuickDailyChecklist = useCallback(async () => {
    if (!slug || !hasStudentAccess || !student) return;
    setQuickCheckState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const response = await fetch(
        token
          ? `/api/daily/data?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`
          : `/api/daily/data?slug=${encodeURIComponent(slug)}`
      );
      if (!response.ok) throw new Error("No se pudo cargar check diario.");
      const data = await response.json().catch(() => ({}));
      const payload = data?.data && typeof data.data === "object" ? data.data : {};
      const rawTemplates = Array.isArray(payload.templates) && payload.templates.length
        ? payload.templates
        : [
            { id: `${slug}-resp`, text: "Respiracion de reprogramacion mental", category: "Salud", critical: true, points: 12 },
            { id: `${slug}-kpi`, text: "Revision de KPIs", category: "Sistema", critical: true, points: 10 },
            { id: `${slug}-foco`, text: "Tarea principal completada", category: "Sistema", critical: true, points: 10 },
            { id: `${slug}-familia`, text: "Momento de presencia personal/familiar", category: "Familia", critical: false, points: 8 },
            { id: `${slug}-registro`, text: "Registro breve emocional", category: "Salud", critical: false, points: 8 }
          ];
      const store = payload.store && typeof payload.store === "object"
        ? {
            days: payload.store.days && typeof payload.store.days === "object" ? payload.store.days : {},
            activeTemplateIds: Array.isArray(payload.store.activeTemplateIds) ? payload.store.activeTemplateIds : null
          }
        : { days: {}, activeTemplateIds: null };
      const activeTemplateSet = Array.isArray(store.activeTemplateIds)
        ? new Set(store.activeTemplateIds.filter(Boolean))
        : null;
      const templates = activeTemplateSet
        ? rawTemplates.filter((template) => activeTemplateSet.has(template.id))
        : rawTemplates;

      const dayKey = dailyDateKey();
      let changed = false;
      let day = store.days[dayKey];
      if (!day || !Array.isArray(day.items) || day.items.length === 0) {
        day = {
          createdAt: new Date().toISOString(),
          items: buildQuickChecklistItems(templates, dayKey)
        };
        store.days = { ...store.days, [dayKey]: day };
        changed = true;
      }

      if (activeTemplateSet) {
        const filteredDayItems = day.items.filter((item) => {
          if (!item?.templateId) return true;
          return activeTemplateSet.has(item.templateId);
        });
        if (filteredDayItems.length !== day.items.length) {
          day = { ...day, items: filteredDayItems };
          store.days = { ...store.days, [dayKey]: day };
          changed = true;
        }
      }

      const sundayAdjusted = applySundayDailyRules(dayKey, day.items);
      if (sundayAdjusted.changed) {
        day = { ...day, items: sundayAdjusted.items };
        store.days = { ...store.days, [dayKey]: day };
        changed = true;
      }

      const normalizedPayload = {
        studentId: payload.studentId || slug,
        studentName: payload.studentName || student.name || slug,
        coachNotes: payload.coachNotes || "",
        templates,
        store
      };
      quickDailyPayloadRef.current = normalizedPayload;

      if (changed) {
        fetch("/api/daily/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            token,
            payload: normalizedPayload
          })
        }).catch(() => {});
      }

      const visibleItems = (store.days[dayKey]?.items || []).filter((item) => item.status !== "na");
      const doneToday = isQuickChecklistCompleted(visibleItems);

      setQuickCheckState({
        loading: false,
        error: "",
        dayKey,
        items: visibleItems
      });
      setShowPrecheckItems(!doneToday);
    } catch (_error) {
      setQuickCheckState((prev) => ({
        ...prev,
        loading: false,
        error: "No se pudo cargar el check diario."
      }));
    }
  }, [slug, token, student, hasStudentAccess]);

  const setQuickItemStatus = useCallback((itemId, status) => {
    if (!DAILY_QUICK_STATUS.includes(status)) return;
    setQuickCheckState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, status } : item
      )
    }));
    const payload = quickDailyPayloadRef.current;
    const dayKey = quickCheckState.dayKey;
    if (!payload || !dayKey || !payload.store?.days?.[dayKey]?.items) return;
    payload.store.days[dayKey].items = payload.store.days[dayKey].items.map((item) =>
      item.id === itemId ? { ...item, status } : item
    );
    scheduleQuickDailySave();
  }, [quickCheckState.dayKey, scheduleQuickDailySave]);

  const quickChecklistDoneToday = isQuickChecklistCompleted(quickCheckState.items);

  useEffect(() => {
    if (practiceScreen !== "practice-check" || !slug || !hasStudentAccess || !student) return;
    loadQuickDailyChecklist();
  }, [practiceScreen, slug, hasStudentAccess, student, loadQuickDailyChecklist]);

  const advancedBlockedLabel = () => {
    if (advancedAccessInfo.blockedReason === "missing-personal-audio") return "Falta grabar audio";
    if (advancedAccessInfo.blockedReason === "advanced-audio-pending") return "Audio en preparación";
    if (advancedAccessInfo.blockedReason === "beginner-days") {
      return `Faltan ${daysUntilAdvanced} días completos`;
    }
    return "Pendiente";
  };

  const handleAdvancedBlockedClick = () => {
    if (advancedAccessInfo.blockedReason === "missing-personal-audio") {
      window.alert(
        "Ya completaste los 7 días de Principiante. Para activar Advanced falta grabar tu audio personalizado en https://formulario.academiacortex.com.ar/"
      );
      return;
    }
    if (advancedAccessInfo.blockedReason === "advanced-audio-pending") {
      window.alert("Tu audio personalizado ya fue enviado. Advanced se habilita cuando el audio Advanced queda preparado.");
      return;
    }
    if (advancedAccessInfo.blockedReason === "beginner-days") {
      window.alert(
        `Advanced se habilita al completar ${beginnerRequiredDays} días de audio Principiante de inicio a fin. Llevás ${beginnerCompletedDays}/${beginnerRequiredDays}.`
      );
      return;
    }
    window.alert("Advanced todavía no está disponible para este alumno.");
  };

  const handleBackToMenu = () => {
    if (practiceScreen === "principiante") {
      handleBeginnerAudioPause(beginnerPlaybackRef.current?.audioId || "beginner-1");
    }
    countdownAbortRef.current = true;
    setStartCountdown(0);
    if (isRunningRef.current) {
      stopSession();
    }
    setApneaHistoryOpen(false);
    setPracticeScreen("menu");
  };

  const proceedFromPrecheck = async () => {
    await persistQuickDailyPayload();
    setPracticeScreen("practice");
  };

  const openPracticeOption = (practiceId) => {
    setApneaHistoryOpen(false);
    if (practiceId === "principiante") {
      if (!hasApprovedAudio) return;
      setPracticeScreen("principiante");
      return;
    }
    if (practiceId === "reprogramacion") {
      if (!advancedUnlocked) {
        handleAdvancedBlockedClick();
        return;
      }
      setPracticeScreen("practice-check");
      return;
    }
    if (practiceId === "metas") {
      setPracticeScreen("daily-goals");
      return;
    }
    if (practiceId === "magia") {
      if (!whiteMagicUnlocked) return;
      setPracticeScreen("magia");
      return;
    }
    if (practiceId === "colores") {
      if (!hasColorPracticeAccess(student)) return;
      setPracticeScreen("color-vision");
      return;
    }
    setPracticeScreen("practice-check");
  };

  const onPointerUp = (event) => {
    if (event.pointerType && event.pointerType !== "touch") return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      executeDoubleTapAction();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  const onAppDoubleClick = (event) => {
    event.preventDefault();
    executeDoubleTapAction();
  };

  const isAdminRoute = window.location.pathname.startsWith("/admin");
  const isAdminClassicRoute = window.location.pathname.startsWith("/admin-classic");
  const isModernAdminRoute = isAdminRoute && !isAdminClassicRoute;
  const isEditorRoute = window.location.pathname.startsWith("/editor");
  const isUploadRoute = window.location.pathname.startsWith("/upload");

  useEffect(() => {
    if (!isAdminRoute) return;
    if (adminPassword) {
      ensureAdminList(adminPassword);
      ensureAdminsRegistry(adminPassword);
    }
  }, [isAdminRoute, adminPassword]);

  useEffect(() => {
    if (!openStudentMenuSlug) return undefined;

    const closeOnOutsidePointer = (event) => {
      if (event.target instanceof Element && event.target.closest(".student-more-menu")) {
        return;
      }
      setOpenStudentMenuSlug("");
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpenStudentMenuSlug("");
      }
    };

    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [openStudentMenuSlug]);

  useEffect(() => {
    if (!isEditorRoute) return;
    if (editorPassword) {
      ensureEditorList(editorPassword);
    }
  }, [isEditorRoute, editorPassword]);

  const ensureAdminList = async (password) => {
    setAdminStatus("loading");
    setAdminMessage("");
    try {
      const response = await fetch(`/api/admin/list?password=${encodeURIComponent(password)}`);
      if (!response.ok) throw new Error("No autorizado");
      const data = await response.json();
      setAdminStudents(Array.isArray(data.students) ? data.students : []);
      setAdminStatus("ready");
      return true;
    } catch (error) {
      setAdminStatus("auth-error");
      setAdminMessage("Password incorrecto o sin acceso.");
      return false;
    }
  };

  const ensureAdminsRegistry = async (password) => {
    setAdminManagerMessage("");
    try {
      const response = await fetch(`/api/admin/admins?password=${encodeURIComponent(password)}`);
      if (!response.ok) return;
      const data = await response.json();
      setAdminsList(Array.isArray(data.admins) ? data.admins : []);
      const nextScore = normalizeMagicUnlockScore(
        data?.settings?.magicUnlockScore,
        magicUnlockScoreConfig
      );
      setMagicUnlockScoreConfig(nextScore);
      setMagicUnlockConfigDraft(String(nextScore));
      setChannelingEnabled(Boolean(data?.settings?.channelingEnabled));
    } catch (error) {
      // silent
    }
  };

  const handleAdminLogin = async () => {
    if (!adminPassword) return;
    rememberValue("rmcortex_admin_pw", adminPassword);
    await ensureAdminList(adminPassword);
    await ensureAdminsRegistry(adminPassword);
  };

  const handleCreateAdmin = async () => {
    if (!adminPassword || !newAdminName || !newAdminPassword) {
      setAdminManagerMessage("Completa nombre y password de administrador.");
      return;
    }
    const expected = `CONFIRMAR ${newAdminName.trim()}`;
    if (newAdminConfirmation.trim() !== expected || !newAdminConfirmedTwice) {
      setAdminManagerMessage(`Doble confirmación requerida: ${expected}`);
      return;
    }
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          name: newAdminName,
          adminPassword: newAdminPassword,
          confirmationText: newAdminConfirmation,
          confirmedTwice: newAdminConfirmedTwice
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo crear administrador");
      }
      setNewAdminName("");
      setNewAdminPassword("");
      setNewAdminConfirmation("");
      setNewAdminConfirmedTwice(false);
      await ensureAdminsRegistry(adminPassword);
      setAdminManagerMessage("Administrador creado.");
    } catch (error) {
      setAdminManagerMessage(error?.message || "No se pudo crear administrador.");
    }
  };

  const handleRemoveAdmin = async (name) => {
    if (!adminPassword) return;
    const confirmationText =
      typeof window.prompt === "function"
        ? window.prompt(`Escribe exactamente: ELIMINAR ${name}`)
        : "";
    if (!confirmationText) return;
    const confirmedTwice = confirmAdminAction("¿Seguro? Esta acción elimina acceso de administrador.");
    if (!confirmedTwice) return;
    try {
      const response = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          name,
          confirmationText,
          confirmedTwice
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "No se pudo eliminar");
      await ensureAdminsRegistry(adminPassword);
      setAdminManagerMessage("Administrador eliminado.");
    } catch (error) {
      setAdminManagerMessage(error?.message || "No se pudo eliminar administrador.");
    }
  };

  const handleSaveMagicUnlockScore = async () => {
    if (!adminPassword) {
      setMagicUnlockConfigMessage("Ingresa password de admin.");
      return;
    }
    const nextScore = normalizeMagicUnlockScore(magicUnlockConfigDraft, magicUnlockScoreConfig);
    setMagicUnlockConfigSaving(true);
    setMagicUnlockConfigMessage("");
    try {
      const response = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          magicUnlockScore: nextScore
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar configuración.");
      }
      const savedScore = normalizeMagicUnlockScore(data?.settings?.magicUnlockScore, nextScore);
      setMagicUnlockScoreConfig(savedScore);
      setMagicUnlockConfigDraft(String(savedScore));
      setMagicUnlockConfigMessage(
        `Objetivo guardado en ${savedScore}% para canalización.`
      );
      await ensureAdminList(adminPassword);
    } catch (error) {
      setMagicUnlockConfigMessage(error?.message || "No se pudo guardar configuración.");
    } finally {
      setMagicUnlockConfigSaving(false);
    }
  };

  const handleToggleChannelingEnabled = async (enabled) => {
    if (!adminPassword) {
      setChannelingConfigMessage("Ingresa password de admin.");
      return;
    }
    setChannelingConfigSaving(true);
    setChannelingConfigMessage("");
    try {
      const response = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          channelingEnabled: enabled
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar la habilitación.");
      }
      const nextEnabled = Boolean(data?.settings?.channelingEnabled);
      setChannelingEnabled(nextEnabled);
      setChannelingConfigMessage(
        nextEnabled ? "Canalización habilitada desde dashboard." : "Canalización bloqueada desde dashboard."
      );
    } catch (error) {
      setChannelingConfigMessage(error?.message || "No se pudo actualizar canalización.");
    } finally {
      setChannelingConfigSaving(false);
    }
  };

  const handleImportSeguimiento = async () => {
    if (!adminPassword) {
      setAdminBridgeMessage("Ingresa password de admin.");
      return;
    }
    const confirmImport = confirmAdminAction(
      "Esto sincroniza estudiantes desde Seguimiento/Academia a Cortex. ¿Continuar?"
    );
    if (!confirmImport) return;

    setAdminBridgeLoading(true);
    setAdminBridgeMessage("");
    try {
      const response = await fetch("/api/admin/admins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo sincronizar");
      }
      await ensureAdminList(adminPassword);
      setAdminBridgeMessage(
        `Sincronizado: ${data.created || 0} nuevos, ${data.updated || 0} actualizados, total ${data.totalStudents || 0}.`
      );
    } catch (error) {
      setAdminBridgeMessage(error?.message || "No se pudo sincronizar.");
    } finally {
      setAdminBridgeLoading(false);
    }
  };

  const readFileBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("No se pudo leer archivo"));
      reader.readAsDataURL(file);
    });

  const uploadFileWithSignature = async (file, payload = {}) => {
    const signRes = await fetch("/api/admin/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: payload.password ?? adminPassword,
        fileName: file.name,
        contentType: file.type || "audio/mpeg",
        ...payload
      })
    });
    const signPayload = await signRes.json().catch(() => ({}));
    if (!signRes.ok || !signPayload?.uploadUrl || !signPayload?.key) {
      throw new Error(signPayload?.error || signPayload?.detail || "No se pudo preparar subida directa");
    }

    const putRes = await fetch(signPayload.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "audio/mpeg"
      },
      body: file
    });
    if (!putRes.ok) {
      throw new Error("No se pudo subir audio directo a R2");
    }
    return signPayload.key;
  };

  const directUploadToR2 = (file) => uploadFileWithSignature(file, { password: adminPassword });

  const ensureEditorList = async (passwordValue = editorPassword) => {
    if (!passwordValue) return false;
    setEditorStatus("loading");
    setEditorMessage("");
    try {
      const response = await fetch(`/api/admin/list?password=${encodeURIComponent(passwordValue)}`);
      if (!response.ok) throw new Error("No autorizado");
      const data = await response.json();
      setEditorStudents(Array.isArray(data.students) ? data.students : []);
      rememberValue("rmcortex_editor_pw", passwordValue);
      setEditorStatus("ready");
      return true;
    } catch (error) {
      setEditorStatus("auth-error");
      setEditorMessage("Password incorrecto o sin acceso.");
      return false;
    }
  };

  const handleEditorLogin = async () => {
    if (!editorPassword) {
      setEditorMessage("Ingresa password de editor.");
      return;
    }
    await ensureEditorList(editorPassword);
  };

  const filteredEditorStudents = useMemo(() => {
    const term = editorSearchTerm.trim().toLowerCase();
    const workflowRows = editorStudents.filter((item) => {
      const status = item.audioWorkflow?.status || "";
      return (
        ["requested", "submitted", "edited", "approved"].includes(status) ||
        item.audioWorkflow?.rawAudioKey ||
        item.audioWorkflow?.beginnerAudioKey ||
        item.audioWorkflow?.beginnerAltAudioKey ||
        item.audioWorkflow?.editorAudioKey
      );
    });
    if (!term) return workflowRows;
    return workflowRows.filter((item) =>
      [
        item.name,
        item.slug,
        item.audioWorkflow?.status,
        item.audioWorkflow?.requestLabel,
        item.audioWorkflow?.requestType
      ].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [editorStudents, editorSearchTerm]);

  const updateStudentWorkflow = async (body, passwordValue = adminPassword) => {
    const response = await fetch("/api/admin/update-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordValue, ...body })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.detail || payload?.error || "No se pudo actualizar");
    return payload;
  };

  const handleRequestStudentAudio = async (slugToUpdate, options = {}) => {
    if (!adminPassword || !slugToUpdate) return;
    try {
      await updateStudentWorkflow({
        slug: slugToUpdate,
        action: "request-audio",
        requestType: options.requestType || "student-audio",
        requestLabel: options.requestLabel || "Audio de estudiante",
        requestSource: options.requestSource || "admin"
      });
      await ensureAdminList(adminPassword);
      setAdminMessage("Solicitud creada. Copia el link de carga y envíaselo al estudiante.");
    } catch (error) {
      setAdminMessage(error?.message || "No se pudo solicitar audio.");
    }
  };

  const handleApproveEditedAudio = async (slugToUpdate) => {
    if (!adminPassword || !slugToUpdate) return;
    try {
      await updateStudentWorkflow({ slug: slugToUpdate, action: "approve-edited-audio" });
      await ensureAdminList(adminPassword);
      setAdminMessage("Audio aprobado. Principiante usa el editado 30 min y Advanced queda preparado con el crudo.");
    } catch (error) {
      setAdminMessage(error?.message || "No se pudo aprobar audio.");
    }
  };

  const handleUnlockAdvanced = async (slugToUpdate) => {
    if (!adminPassword || !slugToUpdate) return;
    try {
      if (adminActionSlug === slugToUpdate) return;
      setAdminActionSlug(slugToUpdate);
      setAdminMessage("");
      await updateStudentWorkflow({ slug: slugToUpdate, action: "unlock-advanced" });
      await ensureAdminList(adminPassword);
      setAdminMessage("Advanced habilitado manualmente para este estudiante.");
    } catch (error) {
      setAdminMessage(error?.message || error?.detail || "No se pudo habilitar Advanced.");
    } finally {
      setAdminActionSlug("");
    }
  };

  const handleEditorFinalUpload = async (slugToUpdate, file, uploadKind = "advanced") => {
    if (!editorPassword || !slugToUpdate || !file) return;
    setEditorUploadSlug(slugToUpdate);
    setEditorMessage("");
    try {
      const isBeginner = uploadKind === "beginner";
      const isBeginnerAlt = uploadKind === "beginner-alt";
      const isLegacyRaw = uploadKind === "legacy-raw";
      const uploadedAudioKey = await uploadFileWithSignature(file, {
        scope: isLegacyRaw
          ? "editor-raw"
          : isBeginner
          ? "editor-beginner"
          : isBeginnerAlt
            ? "editor-beginner-alt"
            : "editor-final",
        password: editorPassword,
        slug: slugToUpdate
      });
      await updateStudentWorkflow(
        {
          slug: slugToUpdate,
          action: isLegacyRaw
            ? "attach-raw-audio"
            : isBeginner
            ? "attach-beginner-audio"
            : isBeginnerAlt
              ? "attach-beginner-alt-audio"
              : "attach-edited-audio",
          ...(isLegacyRaw
            ? { rawAudioKey: uploadedAudioKey, rawFileName: file.name }
            : isBeginner
            ? { beginnerAudioKey: uploadedAudioKey, beginnerFileName: file.name }
            : isBeginnerAlt
              ? { beginnerAltAudioKey: uploadedAudioKey, beginnerAltFileName: file.name }
            : { editorAudioKey: uploadedAudioKey, editorFileName: file.name })
        },
        editorPassword
      );
      await ensureEditorList(editorPassword);
      setEditorMessage(
        isLegacyRaw
          ? "Audio legacy subido, mejorado y asignado como crudo Advanced. Queda esperando OK del administrador."
          : isBeginner
          ? "Audio editado 30 min subido para Principiante. Queda esperando OK del administrador."
          : isBeginnerAlt
            ? "Segundo audio básico subido para Principiante. Queda disponible junto al primero."
          : "Audio crudo Advanced subido. Queda esperando OK del administrador."
      );
    } catch (error) {
      setEditorMessage(error?.message || "No se pudo subir audio.");
    } finally {
      setEditorUploadSlug("");
    }
  };

  const stopStudentRecordingTracks = () => {
    studentMediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    studentMediaStreamRef.current = null;
  };

  const startStudentRecording = async () => {
    try {
      setStudentUploadMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      studentMediaStreamRef.current = stream;
      studentRecordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      studentMediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) studentRecordedChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(studentRecordedChunksRef.current, {
          type: recorder.mimeType || "audio/webm"
        });
        setStudentRecordedBlob(blob);
        setStudentRecordingStatus("ready");
        stopStudentRecordingTracks();
      };
      recorder.start();
      setStudentRecordingStatus("recording");
    } catch (error) {
      setStudentRecordingStatus("error");
      setStudentUploadMessage("No se pudo activar el micrófono. Puedes subir un archivo.");
    }
  };

  const stopStudentRecording = () => {
    if (studentMediaRecorderRef.current?.state === "recording") {
      studentMediaRecorderRef.current.stop();
    }
  };

  const handleStudentRawUpload = async () => {
    const sourceFile = studentRecordedBlob
      ? new File([studentRecordedBlob], `${uploadSlug || "audio"}-grabacion.webm`, {
          type: studentRecordedBlob.type || "audio/webm"
        })
      : studentUploadFile;
    if (!uploadSlug || !token || !sourceFile) {
      setStudentUploadMessage("Selecciona o graba un audio.");
      return;
    }
    setStudentUploadStatus("loading");
    setStudentUploadMessage("");
    try {
      const rawAudioKey = await uploadFileWithSignature(sourceFile, {
        scope: "student-raw",
        password: "",
        slug: uploadSlug,
        token
      });
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: uploadSlug,
          token,
          action: "submitRawAudio",
          rawAudioKey,
          fileName: sourceFile.name,
          source: studentRecordedBlob ? "recorded" : "uploaded"
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "No se pudo guardar audio");
      setStudentUploadStatus("ready");
      setStudentUploadMessage("Audio enviado. El editor lo preparará y administración dará el OK.");
      setStudentUploadFile(null);
      setStudentRecordedBlob(null);
      setStudentRecordingStatus("idle");
    } catch (error) {
      setStudentUploadStatus("error");
      setStudentUploadMessage(error?.message || "No se pudo subir el audio.");
    }
  };

  useEffect(() => () => stopStudentRecordingTracks(), []);

  const optimizeStudentAudioDeferred = async (slugToOptimize) => {
    if (!slugToOptimize || !adminPassword) return;
    try {
      const response = await fetch("/api/admin/optimize-student-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          slug: slugToOptimize
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo optimizar");
      }
      await ensureAdminList(adminPassword);
      const opt = payload?.optimization;
      if (opt?.applied) {
        const fromMb = (opt.originalBytes / (1024 * 1024)).toFixed(2);
        const toMb = (opt.finalBytes / (1024 * 1024)).toFixed(2);
        setAdminMessage(`Audio optimizado en segundo plano: ${fromMb}MB -> ${toMb}MB`);
      } else {
        setAdminMessage("Audio procesado en segundo plano.");
      }
    } catch (error) {
      setAdminMessage("Audio subido, pero no se pudo optimizar automáticamente.");
    }
  };

  const handleAdminCreate = async () => {
    if (!adminPassword || !adminName) {
      setAdminMessage("Completa nombre.");
      return;
    }
    setAdminStatus("loading");
    setAdminMessage("");
    setAdminLink("");
    try {
      if (!adminFile) {
        const addRes = await fetch("/api/admin/create-student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: adminPassword,
            name: adminName,
            requestAudio: true
          })
        });
        if (!addRes.ok) {
          const detail = await addRes.json().catch(() => ({}));
          throw new Error(`No se pudo crear estudiante (${detail?.error || "error"}).`);
        }
        const payload = await addRes.json();
        const created = payload.student;
        setAdminLink(buildUploadLink(created.slug, created.token));
        setAdminName("");
        setAdminFile(null);
        await ensureAdminList(adminPassword);
        setAdminStatus("ready");
        setAdminMessage("Estudiante creado. Link de carga listo para enviar.");
        return;
      }
      const isLarge = adminFile.size > DIRECT_UPLOAD_THRESHOLD_BYTES;
      const payloadBase = {
        password: adminPassword,
        name: adminName
      };
      const payloadBody = isLarge
        ? {
            ...payloadBase,
            audioKey: await directUploadToR2(adminFile)
          }
        : {
            ...payloadBase,
            fileName: adminFile.name,
            contentType: adminFile.type || "audio/mpeg",
            audioBase64: await readFileBase64(adminFile)
          };
      const addRes = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody)
      });
      if (!addRes.ok) {
        const detail = await addRes.json().catch(() => ({}));
        throw new Error(`No se pudo crear estudiante (${detail?.error || "error"}).`);
      }
      const payload = await addRes.json();
      const created = payload.student;
      const link = buildStudentLink(created.slug, created.token, true);
      setAdminLink(link);
      setAdminName("");
      setAdminFile(null);
      await ensureAdminList(adminPassword);
      setAdminStatus("ready");
      if (isLarge) {
        setAdminMessage("Estudiante creado. Audio grande subido. Iniciando optimización automática...");
        optimizeStudentAudioDeferred(created.slug);
      } else if (payload?.optimization) {
        const opt = payload.optimization;
        const fromMb = (opt.originalBytes / (1024 * 1024)).toFixed(2);
        const toMb = (opt.finalBytes / (1024 * 1024)).toFixed(2);
        const mode = opt.mode || "procesado";
        setAdminMessage(`Estudiante creado. Audio ${mode}: ${fromMb}MB -> ${toMb}MB`);
      } else {
        setAdminMessage("Estudiante creado.");
      }
    } catch (error) {
      setAdminStatus("ready");
      setAdminMessage(error?.message || "No se pudo crear el estudiante.");
    }
  };

  const handleAdminCreateSpecialRequest = async () => {
    if (!adminPassword || !adminName.trim()) {
      setAdminMessage("Completa nombre para el pedido especial.");
      return;
    }
    setAdminStatus("loading");
    setAdminMessage("");
    setAdminLink("");
    try {
      const addRes = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          name: adminName,
          requestAudio: true,
          requestType: "special-binaural",
          requestLabel: "Pedido especial binaural",
          requestSource: "special"
        })
      });
      const payload = await addRes.json().catch(() => ({}));
      if (!addRes.ok) {
        throw new Error(`No se pudo crear pedido especial (${payload?.error || "error"}).`);
      }
      const created = payload.student;
      setAdminLink(buildUploadLink(created.slug, created.token));
      setAdminName("");
      setAdminFile(null);
      await ensureAdminList(adminPassword);
      setAdminStatus("ready");
      setAdminMessage("Pedido especial creado. Queda en alertas y en la cola del editor.");
    } catch (error) {
      setAdminStatus("ready");
      setAdminMessage(error?.message || "No se pudo crear el pedido especial.");
    }
  };

  const handleAdminDelete = async (slugToDelete) => {
    if (!adminPassword) return;
    const confirmed = confirmAdminAction("¿Eliminar este estudiante?");
    if (!confirmed) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    try {
      const response = await fetch("/api/admin/delete-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword, slug: slugToDelete })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo eliminar");
      }
      await ensureAdminList(adminPassword);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollTop, left: 0, behavior: "auto" });
        });
      });
    } catch (error) {
      setAdminMessage(error?.message || "No se pudo eliminar");
    }
  };

  const handleReplaceClick = (slugToUpdate) => {
    setReplaceSlug(slugToUpdate);
    if (replaceInputRef.current) {
      replaceInputRef.current.value = "";
      replaceInputRef.current.click();
    }
  };

  const handleAdminReplace = async (file) => {
    if (!adminPassword || !replaceSlug || !file) return;
    setAdminStatus("loading");
    setAdminMessage("");
    try {
      const slugToReplace = replaceSlug;
      const isLarge = file.size > DIRECT_UPLOAD_THRESHOLD_BYTES;
      const payloadBody = isLarge
        ? {
            password: adminPassword,
            slug: slugToReplace,
            audioKey: await directUploadToR2(file)
          }
        : {
            password: adminPassword,
            slug: slugToReplace,
            fileName: file.name,
            contentType: file.type || "audio/mpeg",
            audioBase64: await readFileBase64(file)
          };
      const updateRes = await fetch("/api/admin/update-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody)
      });
      if (!updateRes.ok) {
        const detail = await updateRes.json().catch(() => ({}));
        throw new Error(detail?.error || "No se pudo actualizar");
      }
      const payload = await updateRes.json().catch(() => ({}));
      await ensureAdminList(adminPassword);
      setAdminStatus("ready");
      if (isLarge) {
        setAdminMessage("Audio reemplazado. Iniciando optimización automática...");
        optimizeStudentAudioDeferred(slugToReplace);
      } else if (payload?.optimization) {
        const opt = payload.optimization;
        const fromMb = (opt.originalBytes / (1024 * 1024)).toFixed(2);
        const toMb = (opt.finalBytes / (1024 * 1024)).toFixed(2);
        const mode = opt.mode || "procesado";
        setAdminMessage(`Audio reemplazado (${mode}): ${fromMb}MB -> ${toMb}MB`);
      } else {
        setAdminMessage("Audio reemplazado.");
      }
    } catch (error) {
      setAdminStatus("ready");
      setAdminMessage(error?.message || "No se pudo reemplazar el audio.");
    }
  };

  const handleToggleColorPractice = async (slugToUpdate, enabled) => {
    if (!adminPassword || !slugToUpdate) return;
    try {
      const response = await fetch("/api/admin/update-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          slug: slugToUpdate,
          settings: {
            features: {
              colorVisionEnabled: enabled
            }
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo actualizar acceso");
      }
      await ensureAdminList(adminPassword);
      setAdminMessage(enabled ? "Color habilitado para estudiante." : "Color deshabilitado para estudiante.");
    } catch (error) {
      setAdminMessage(error?.message || "No se pudo cambiar acceso de color.");
    }
  };

  const handleToggleStudentStatus = async (slugToUpdate, nextStatus) => {
    if (!adminPassword || !slugToUpdate) return;
    const isInactive = nextStatus === "inactive";
    if (isInactive) {
      const confirmed = confirmAdminAction(
        "¿Marcar este estudiante como inactivo? Pasará a la lista Inactivos y no molestará en las alertas."
      );
      if (!confirmed) return;
    }
    try {
      await updateStudentWorkflow({
        slug: slugToUpdate,
        action: "set-student-status",
        studentStatus: isInactive ? "inactive" : "active"
      });
      await ensureAdminList(adminPassword);
      setAdminMessage(isInactive ? "Estudiante movido a Inactivos." : "Estudiante marcado como activo.");
    } catch (error) {
      setAdminMessage(error?.message || "No se pudo cambiar el estado del estudiante.");
    }
  };

  const adminRowsForView = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = (item) => {
      if (!term) return true;
      return (
        String(item.name || "").toLowerCase().includes(term) ||
        String(item.slug || "").toLowerCase().includes(term) ||
        String(item.audioKey || "").toLowerCase().includes(term)
      );
    };
    const searchedRows = adminAnalytics.rows.filter(matchesSearch);
    const activeRows = searchedRows.filter((item) => item.status !== "inactive");

    if (adminView === "alerts") {
      return activeRows
        .filter((item) => item.alertLevel === "critical" || item.alertLevel === "warning")
        .sort((a, b) => (
          (b.weeklyPractice?.consecutiveMisses || 0) - (a.weeklyPractice?.consecutiveMisses || 0) ||
          b.inactiveHours - a.inactiveHours
        ));
    }
    if (adminView === "inactive") return searchedRows.filter((item) => item.status === "inactive");
    if (adminView === "age-30") return activeRows.filter((item) => item.ageBucket === "age-30");
    if (adminView === "age-60") return activeRows.filter((item) => item.ageBucket === "age-60");
    if (adminView === "age-90") return activeRows.filter((item) => item.ageBucket === "age-90");
    if (adminView === "age-90plus") return activeRows.filter((item) => item.ageBucket === "age-90plus");
    if (adminView === "age-unknown") return activeRows.filter((item) => item.ageBucket === "age-unknown");
    return activeRows;
  }, [adminAnalytics, adminView, searchTerm]);

  const adminApneaHistoryStudent = useMemo(
    () => adminAnalytics.rows.find((item) => item.slug === adminApneaHistorySlug) || null,
    [adminAnalytics.rows, adminApneaHistorySlug]
  );

  const adminApneaHistoryDays = adminApneaHistoryStudent?.apneaHistory || [];
  const adminApneaHistoryBest = adminApneaHistoryDays.reduce(
    (best, day) => Math.max(best, day.best || 0),
    0
  );

  const localProgressSessions = useMemo(() => (
    (progress.apneaHistory || [])
      .slice()
      .reverse()
      .map((entry) => ({
        completedAt: entry.timestamp || entry.date || "",
        date: entry.date || "",
        apneaByRound: Array.isArray(entry.rounds) && entry.rounds.length
          ? entry.rounds
          : [entry.seconds || 0]
      }))
  ), [progress.apneaHistory]);

  const studentUsageForPanel = useMemo(() => {
    const serverRecent = Array.isArray(studentUsageSummary?.recentSessions)
      ? studentUsageSummary.recentSessions
      : [];
    const sessionsByDay = { ...(studentUsageSummary?.sessionsByDay || {}) };
    const practiceActivityByDay = { ...(studentUsageSummary?.practiceActivityByDay || {}) };
    const apneaByDay = { ...(studentUsageSummary?.apneaByDay || {}) };

    localProgressSessions.forEach((session) => {
      const key = session.date || localDateKey(session.completedAt || "");
      if (!key) return;
      sessionsByDay[key] = Math.max(Number(sessionsByDay[key] || 0), 1);
      practiceActivityByDay[key] = Math.max(Number(practiceActivityByDay[key] || 0), 1);
      const times = normalizeApneaTimes(session);
      if (times.length) {
        const previous = normalizeDailyApneaEntry(apneaByDay[key]);
        const mergedTimes = [...previous.times, ...times];
        apneaByDay[key] = {
          sessions: Math.max(previous.sessions, 0) + 1,
          times: mergedTimes,
          best: Math.max(previous.best || 0, ...times),
          lastAt: session.completedAt || previous.lastAt || ""
        };
      }
    });

    return {
      totalSessions: Math.max(
        Number(progress.totalSessions || 0),
        Number(studentUsageSummary?.totalSessions || 0)
      ),
      totalBreaths: Math.max(
        Number(progress.totalBreaths || 0),
        Number(studentUsageSummary?.totalBreaths || 0)
      ),
      sessionsByDay,
      practiceActivityByDay,
      apneaByDay,
      lastActivityAt:
        studentUsageSummary?.lastActivityAt ||
        localProgressSessions[0]?.completedAt ||
        progress.lastSessionDate ||
        "",
      lastSessionAt:
        studentUsageSummary?.lastSessionAt ||
        localProgressSessions[0]?.completedAt ||
        progress.lastSessionDate ||
        "",
      recentSessions: [...localProgressSessions, ...serverRecent].slice(0, 60),
      lastSession: studentUsageSummary?.lastSession || localProgressSessions[0] || null
    };
  }, [localProgressSessions, progress.lastSessionDate, progress.totalBreaths, progress.totalSessions, studentUsageSummary]);

  const studentWeeklyStats = useMemo(
    () => buildWeeklyPracticeStats({ ...student, usage: studentUsageForPanel }, new Date()),
    [student, studentUsageForPanel]
  );

  const studentApneaHistoryLog = useMemo(
    () => buildApneaDailyLog(studentUsageForPanel, 0),
    [studentUsageForPanel]
  );

  const studentApneaDailyLog = useMemo(
    () => studentApneaHistoryLog.slice(0, 4),
    [studentApneaHistoryLog]
  );

  const studentBestApneaSeconds = useMemo(
    () => studentApneaHistoryLog.reduce((best, day) => Math.max(best, day.best || 0), 0),
    [studentApneaHistoryLog]
  );

  const latestStudentApneaTimes = studentApneaDailyLog[0]?.times || [];
  const studentLastApneaSeconds =
    latestStudentApneaTimes[latestStudentApneaTimes.length - 1] ||
    progress.lastApneaSeconds ||
    0;

  const sessionApneaBoard = Array.from({ length: Math.max(1, Number(config.cycles || 1)) }, (_, index) => {
    const recordedSeconds = Math.max(0, Number(roundApneaByCycleRef.current[index] || 0));
    const isActiveRound = phase === "apnea" && index === Math.max(0, cycleIndex - 1);
    const liveSeconds = isActiveRound ? Math.max(0, Math.floor(timeLeftMs / 1000)) : 0;
    return {
      round: index + 1,
      seconds: Math.max(recordedSeconds, liveSeconds),
      active: isActiveRound
    };
  });
  const visibleSessionApneas = sessionApneaBoard.filter((item) => item.seconds > 0 || item.active);

  const magicPolicyLevel = useMemo(() => {
    if (magicUnlockScoreConfig >= 88) return "red";
    if (magicUnlockScoreConfig >= 76) return "yellow";
    return "green";
  }, [magicUnlockScoreConfig]);

  const handleStudentLogin = async (event) => {
    event.preventDefault();
    setLoginStatus("loading");
    setLoginMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "No se pudo iniciar sesión");
      const nextParam = new URLSearchParams(window.location.search).get("next");
      const fallback = data?.student?.slug ? `/s/${encodeURIComponent(data.student.slug)}` : "/";
      const nextUrl = nextParam && nextParam.startsWith("/") ? nextParam : fallback;
      window.location.href = nextUrl;
    } catch (error) {
      setLoginStatus("error");
      setLoginMessage(error?.message || "No se pudo iniciar sesión.");
    }
  };

  const handleLegacyTokenLogin = (event) => {
    event.preventDefault();
    setLegacyLoginMessage("");
    let nextSlug = "";
    let nextToken = "";
    const pastedLink = legacyLoginLink.trim();

    if (!pastedLink) {
      setLegacyLoginMessage("Pegá el link anterior completo.");
      return;
    }

    try {
      const parsed = new URL(pastedLink, window.location.origin);
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "s" && pathParts[1]) {
        nextSlug = decodeURIComponent(pathParts[1]);
      }
      nextSlug = parsed.searchParams.get("s") || nextSlug;
      nextToken = parsed.searchParams.get("t") || parsed.searchParams.get("token") || "";
    } catch (_error) {
      setLegacyLoginMessage("Pegá un link válido.");
      return;
    }

    if (!nextSlug || !nextToken) {
      setLegacyLoginMessage("El link debe incluir el alumno y el token.");
      return;
    }

    window.location.href = `/s/${encodeURIComponent(nextSlug)}?t=${encodeURIComponent(nextToken)}`;
  };

  const renderLegacyLogin = () => (
    <div className="legacy-login">
      <div className="auth-divider">
        <span />
        <em>Usuarios anteriores</em>
        <span />
      </div>
      {!legacyLoginOpen ? (
        <button
          type="button"
          className="secondary legacy-login-toggle"
          onClick={() => setLegacyLoginOpen(true)}
        >
          Ingresar con link anterior
        </button>
      ) : (
        <form className="auth-form legacy-login-form" onSubmit={handleLegacyTokenLogin}>
          <label>
            Link anterior
            <input
              type="text"
              inputMode="url"
              autoComplete="off"
              placeholder="https://rm.academiacortex.com.ar/s/tu-slug?t=token"
              value={legacyLoginLink}
              onChange={(event) => setLegacyLoginLink(event.target.value)}
            />
          </label>
          {legacyLoginMessage && <p className="status error">{legacyLoginMessage}</p>}
          <div className="legacy-login-actions">
            <button type="submit">Ingresar con link</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setLegacyLoginOpen(false);
                setLegacyLoginMessage("");
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );

  const handlePasswordSetup = async (event) => {
    event.preventDefault();
    setSetupStatus("loading");
    setSetupMessage("");
    try {
      const setupToken = new URLSearchParams(window.location.search).get("token") || "";
      if (!setupToken) throw new Error("Link inválido.");
      if (setupPassword !== setupPasswordConfirm) {
        throw new Error("Las contraseñas no coinciden.");
      }
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: setupToken, password: setupPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "No se pudo guardar la contraseña");
      const target = data?.student?.slug ? `/s/${encodeURIComponent(data.student.slug)}` : "/login";
      window.location.href = target;
    } catch (error) {
      setSetupStatus("error");
      setSetupMessage(error?.message || "No se pudo guardar la contraseña.");
    }
  };

  if (loading) {
    return (
      <div className="app">
        {renderHeader()}
        <p className="status">Cargando configuración...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app">
        {renderHeader()}
        <p className="status error">{loadError}</p>
      </div>
    );
  }

  if (isLoginRoute) {
    return (
      <div className="app auth-app">
        {renderHeader()}
        <section className="card auth-card">
          <p className="eyebrow">Acceso seguro</p>
          <h2>Ingresar a la app</h2>
          <p className="muted">Usá el email y contraseña asociados a tu alumno.</p>
          <form className="auth-form" onSubmit={handleStudentLogin}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
            </label>
            {loginMessage && <p className="status error">{loginMessage}</p>}
            <button type="submit" disabled={loginStatus === "loading"}>
              {loginStatus === "loading" ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
          {renderLegacyLogin()}
        </section>
      </div>
    );
  }

  if (isSetPasswordRoute) {
    return (
      <div className="app auth-app">
        {renderHeader()}
        <section className="card auth-card">
          <p className="eyebrow">Activación de cuenta</p>
          <h2>Crear contraseña</h2>
          <p className="muted">Elegí una contraseña de al menos 8 caracteres para usar la app.</p>
          <form className="auth-form" onSubmit={handlePasswordSetup}>
            <label>
              Nueva contraseña
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={setupPassword}
                onChange={(event) => setSetupPassword(event.target.value)}
                required
              />
            </label>
            <label>
              Repetir contraseña
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={setupPasswordConfirm}
                onChange={(event) => setSetupPasswordConfirm(event.target.value)}
                required
              />
            </label>
            {setupMessage && <p className="status error">{setupMessage}</p>}
            <button type="submit" disabled={setupStatus === "loading"}>
              {setupStatus === "loading" ? "Guardando..." : "Guardar y entrar"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  if (isUploadRoute) {
    const uploadWorkflowStatus = uploadStudent?.audioWorkflow?.status || "pending";
    const uploadTokenValid = Boolean(
      uploadStudent && token && String(uploadStudent.token || "") === token
    );

    return (
      <div className="app">
        {renderHeader()}
        <section className="card student-upload-card">
          <p className="eyebrow">Carga simple</p>
          <h2>Subir audio para edición</h2>
          {!uploadStudent ? (
            <p className="status error">Estudiante no encontrado. Revisa el link.</p>
          ) : !uploadTokenValid ? (
            <p className="status error">Token inválido. Abre el link completo que te enviaron.</p>
          ) : uploadWorkflowStatus === "approved" ? (
            <p className="status success">Tu audio ya está aprobado y cargado.</p>
          ) : (
            <>
              <p className="muted">
                Hola <strong>{uploadStudent.name}</strong>. Puedes grabar desde esta página o subir el audio
                desde tu teléfono o notebook.
              </p>
              <div className="upload-drop">
                <label>
                  Subir archivo de audio
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => setStudentUploadFile(event.target.files?.[0] || null)}
                  />
                </label>
                <div className="audio-tools">
                  {studentRecordingStatus !== "recording" ? (
                    <button type="button" className="secondary" onClick={startStudentRecording}>
                      Grabar ahora
                    </button>
                  ) : (
                    <button type="button" className="ghost" onClick={stopStudentRecording}>
                      <span className="recording-dot" /> Detener grabación
                    </button>
                  )}
                </div>
                {recordedPreviewUrl && (
                  <audio className="audio-preview" controls src={recordedPreviewUrl} />
                )}
                {studentUploadFile && (
                  <p className="muted">Archivo seleccionado: {studentUploadFile.name}</p>
                )}
              </div>
              <div className="audio-tools">
                <button
                  type="button"
                  className="primary"
                  onClick={handleStudentRawUpload}
                  disabled={
                    studentUploadStatus === "loading" ||
                    (!studentUploadFile && !studentRecordedBlob)
                  }
                >
                  {studentUploadStatus === "loading" ? "Subiendo..." : "Enviar audio"}
                </button>
                {studentUploadMessage && (
                  <span className={studentUploadStatus === "error" ? "status error" : "muted"}>
                    {studentUploadMessage}
                  </span>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  if (isEditorRoute) {
    return (
      <div className="app">
        {renderHeader()}
        <section className="card editor-dashboard">
          <p className="eyebrow">Solo edición</p>
          <h2>Cola de audios</h2>
          <p className="muted">
            Acá Mathi o Nico escuchan el audio original del alumno y suben dos audios:
            el editado de 30 minutos para Principiante y el crudo para Advanced.
            No tocan permisos ni alumnos.
          </p>
          <div className="admin-login">
            <input
              type="password"
              placeholder="Password editor/admin"
              value={editorPassword}
              onChange={(event) => setEditorPassword(event.target.value)}
            />
            <button type="button" className="secondary" onClick={handleEditorLogin}>
              Entrar
            </button>
          </div>
          {editorMessage && (
            <p className={editorStatus === "auth-error" ? "status error" : "muted"}>
              {editorMessage}
            </p>
          )}
        </section>

        {editorStatus === "ready" && (
          <section className="card editor-dashboard">
            <div className="panel-actions">
              <h3>Audios por editar</h3>
              <input
                type="search"
                placeholder="Buscar estudiante..."
                value={editorSearchTerm}
                onChange={(event) => setEditorSearchTerm(event.target.value)}
              />
            </div>
            <div className="link-list">
              {filteredEditorStudents.map((item) => {
                const workflowStatus = item.audioWorkflow?.status || "pending";
                const requestLabel = getWorkflowRequestLabel(item.audioWorkflow);
                const specialWorkflow = isSpecialWorkflow(item.audioWorkflow);
                return (
                  <div key={item.slug} className={`link-row editor-row ${specialWorkflow ? "is-special" : ""}`}>
                    <div>
                      <strong>{item.name}</strong>
                      <div className="muted">{item.slug}</div>
                      <div className="workflow-meta">
                        Estado:{" "}
                        <span className={`workflow-pill ${workflowStatus}`}>
                          {WORKFLOW_STATUS_LABELS[workflowStatus] || workflowStatus}
                        </span>
                        {requestLabel && (
                          <span className={`workflow-request-badge ${specialWorkflow ? "special" : ""}`}>
                            {requestLabel}
                          </span>
                        )}
                      </div>
                      {item.audioWorkflow?.rawFileName && (
                        <div className="muted">Original alumno: {item.audioWorkflow.rawFileName}</div>
                      )}
                      {item.audioWorkflow?.beginnerFileName && (
                        <div className="muted">Principiante 1: {item.audioWorkflow.beginnerFileName}</div>
                      )}
                      {item.audioWorkflow?.beginnerAltFileName && (
                        <div className="muted">Principiante 2: {item.audioWorkflow.beginnerAltFileName}</div>
                      )}
                      {item.audioWorkflow?.editorFileName && (
                        <div className="muted">Crudo Advanced: {item.audioWorkflow.editorFileName}</div>
                      )}
                    </div>
                    <div className="link-actions">
                      {item.audioWorkflow?.rawAudioKey && (
                        <a
                          className="ghost link-button"
                          href={buildWorkflowAudioUrl(item, "raw", editorPassword)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Escuchar original
                        </a>
                      )}
                      <label className={`secondary file-button ${editorUploadSlug === item.slug ? "is-loading" : ""}`}>
                        {editorUploadSlug === item.slug ? "Procesando..." : "Subir original legacy y mejorar"}
                        <input
                          type="file"
                          accept="audio/*"
                          disabled={editorUploadSlug === item.slug}
                          onChange={(event) => handleEditorFinalUpload(item.slug, event.target.files?.[0], "legacy-raw")}
                        />
                      </label>
                      <label className={`secondary file-button ${editorUploadSlug === item.slug ? "is-loading" : ""}`}>
                        {editorUploadSlug === item.slug ? "Subiendo..." : "Subir Principiante 1"}
                        <input
                          type="file"
                          accept="audio/*"
                          disabled={editorUploadSlug === item.slug}
                          onChange={(event) => handleEditorFinalUpload(item.slug, event.target.files?.[0], "beginner")}
                        />
                      </label>
                      {item.audioWorkflow?.beginnerAudioKey && (
                        <a
                          className="ghost link-button"
                          href={buildWorkflowAudioUrl(item, "beginner", editorPassword)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Escuchar Principiante 1
                        </a>
                      )}
                      <label className={`secondary file-button ${editorUploadSlug === item.slug ? "is-loading" : ""}`}>
                        {editorUploadSlug === item.slug ? "Subiendo..." : "Subir Principiante 2"}
                        <input
                          type="file"
                          accept="audio/*"
                          disabled={editorUploadSlug === item.slug}
                          onChange={(event) => handleEditorFinalUpload(item.slug, event.target.files?.[0], "beginner-alt")}
                        />
                      </label>
                      {item.audioWorkflow?.beginnerAltAudioKey && (
                        <a
                          className="ghost link-button"
                          href={buildWorkflowAudioUrl(item, "beginner-alt", editorPassword)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Escuchar Principiante 2
                        </a>
                      )}
                      <label className={`secondary file-button ${editorUploadSlug === item.slug ? "is-loading" : ""}`}>
                        {editorUploadSlug === item.slug ? "Subiendo..." : "Subir crudo Advanced"}
                        <input
                          type="file"
                          accept="audio/*"
                          disabled={editorUploadSlug === item.slug}
                          onChange={(event) => handleEditorFinalUpload(item.slug, event.target.files?.[0], "advanced")}
                        />
                      </label>
                      {item.audioWorkflow?.editorAudioKey && (
                        <a
                          className="ghost link-button"
                          href={buildWorkflowAudioUrl(item, "edited", editorPassword)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Escuchar crudo Advanced
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredEditorStudents.length === 0 && (
                <p className="muted">
                  No hay audios pendientes. Desde admin usa Solicitar audio o Crear pedido especial.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (isAdminRoute) {
    const adminLoginCard = (
      <section className="card admin-login-card">
        <div>
          <p className="eyebrow">Acceso interno</p>
          <h2>Panel de administrador</h2>
          <p className="muted">Crea estudiantes y sube sus audios sin salir de aquí.</p>
        </div>
        <div className="admin-login admin-login-inline">
          <input
            type="password"
            placeholder="Password de admin"
            value={adminPassword}
            onChange={(event) => setAdminPassword(event.target.value)}
          />
          <button type="button" className="secondary" onClick={handleAdminLogin}>
            Entrar
          </button>
        </div>
        {adminStatus === "auth-error" && <p className="status error">{adminMessage}</p>}
      </section>
    );

    if (isModernAdminRoute) {
      return (
        <Admin2Dashboard
          status={adminStatus}
          loginCard={adminLoginCard}
          analytics={adminAnalytics}
          message={adminMessage}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          onRefresh={() => ensureAdminList(adminPassword)}
          onCopyLink={(item) => copyLink(item.slug, item.token, true)}
          onRequestAudio={(item) => handleRequestStudentAudio(item.slug)}
          onReplaceAudio={(item) => handleReplaceClick(item.slug)}
          onToggleStudentStatus={(item) => handleToggleStudentStatus(
            item.slug,
            item.status === "inactive" ? "active" : "inactive"
          )}
          onToggleColor={(item) => handleToggleColorPractice(
            item.slug,
            !item.features?.colorVisionEnabled
          )}
          canRequestAudio={(item) => {
            const workflowStatus = item.audioWorkflow?.status || (item.audioReady ? "approved" : "pending");
            return (
              !isAutomaticAudioWorkflow(item.audioWorkflow) &&
              !hasWorkflowAudioAsset(item.audioWorkflow) &&
              !["requested", "submitted", "edited", "approved"].includes(workflowStatus)
            );
          }}
          studentUrl={(item) => buildStudentLink(item.slug, item.token, true)}
          formatDuration={formatDurationClock}
          getAdvancedInfo={getAdvancedAccessInfo}
        />
      );
    }

    return (
      <div className="app admin-app">
        {renderHeader()}
        {adminStatus !== "ready" ? (
          adminLoginCard
        ) : (
          <main className="admin-dashboard">
            <section className="admin-hero">
              <div>
                <h2>Estudiantes</h2>
                <div className="admin-tabs segmented-tabs" role="tablist" aria-label="Vista estudiantes">
                  <button
                    type="button"
                    className={`chip ${adminView === "students" ? "active" : ""}`}
                    onClick={() => setAdminView("students")}
                  >
                    Activos ({adminAnalytics.active.length})
                  </button>
                  <button
                    type="button"
                    className={`chip ${adminView === "age-30" ? "active" : ""}`}
                    onClick={() => setAdminView("age-30")}
                  >
                    0-30 ({adminAnalytics.ageBuckets["age-30"].length})
                  </button>
                  <button
                    type="button"
                    className={`chip ${adminView === "age-60" ? "active" : ""}`}
                    onClick={() => setAdminView("age-60")}
                  >
                    31-60 ({adminAnalytics.ageBuckets["age-60"].length})
                  </button>
                  <button
                    type="button"
                    className={`chip ${adminView === "age-90" ? "active" : ""}`}
                    onClick={() => setAdminView("age-90")}
                  >
                    61-90 ({adminAnalytics.ageBuckets["age-90"].length})
                  </button>
                  <button
                    type="button"
                    className={`chip ${adminView === "age-90plus" ? "active" : ""}`}
                    onClick={() => setAdminView("age-90plus")}
                  >
                    +90 ({adminAnalytics.ageBuckets["age-90plus"].length})
                  </button>
                  {adminAnalytics.ageBuckets["age-unknown"].length > 0 && (
                    <button
                      type="button"
                      className={`chip ${adminView === "age-unknown" ? "active" : ""}`}
                      onClick={() => setAdminView("age-unknown")}
                    >
                      Sin fecha ({adminAnalytics.ageBuckets["age-unknown"].length})
                    </button>
                  )}
                  <button
                    type="button"
                    className={`chip ${adminView === "inactive" ? "active" : ""}`}
                    onClick={() => setAdminView("inactive")}
                  >
                    Inactivos ({adminAnalytics.inactive.length})
                  </button>
                  <button
                    type="button"
                    className={`chip ${adminView === "alerts" ? "active" : ""}`}
                    onClick={() => setAdminView("alerts")}
                  >
                    Alertas
                  </button>
                </div>
              </div>
              <div className="admin-hero-tools" aria-hidden="true">
                <span className="admin-icon-button">☼</span>
                <span className="admin-avatar">A</span>
              </div>
            </section>

            <section className="admin-kpi-strip card">
              <div className="admin-kpi-card active">
                <span className="kpi-icon people" />
                <div>
                  <span>Estudiantes activos</span>
                  <strong>{adminAnalytics.active.length}</strong>
                  <small>Diario: {adminAnalytics.practicingDaily.length} practicaron hoy · Inactivos: {adminAnalytics.inactive.length}</small>
                </div>
                <span className="kpi-spark green" />
              </div>
              <div className="admin-kpi-card warning">
                <span className="kpi-icon clock" />
                <div>
                  <span>Alerta 48h</span>
                  <strong>{adminAnalytics.warning.length}</strong>
                  <small>2 dias seguidos: {adminAnalytics.twoDayPracticeAlerts.length} · Especiales: {adminAnalytics.specialRequests.length}</small>
                </div>
                <span className="kpi-spark red" />
              </div>
              <div className="admin-kpi-card critical">
                <span className="kpi-icon clock" />
                <div>
                  <span>Alerta 72h</span>
                  <strong>{adminAnalytics.critical.length}</strong>
                  <small>A revisar: {adminAnalytics.critical.length}</small>
                </div>
                <span className="kpi-spark orange" />
              </div>
              <div className="admin-kpi-card sessions">
                <span className="kpi-icon calendar" />
                <div>
                  <span>Más de 1 sesión hoy</span>
                  <strong>{adminAnalytics.moreThanOnceToday.length}</strong>
                  <small>Estudiantes con actividad</small>
                </div>
                <span className="kpi-spark blue" />
              </div>
              <button
                type="button"
                className="admin-alert-button"
                onClick={() => setAdminView("alerts")}
              >
                <span>Revisar alertas</span>
                <small>Ver estudiantes en riesgo</small>
              </button>
            </section>

            <section className="admin-toolbar card">
              <label className="admin-search-field" aria-label="Buscar estudiante">
                <span>⌕</span>
                <input
                  type="search"
                  placeholder="Buscar estudiante..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <span className="admin-count">
                {adminRowsForView.length} visibles · {adminAnalytics.active.length} activos · {adminAnalytics.inactive.length} inactivos
              </span>
              <select aria-label="Ordenar estudiantes" defaultValue="name">
                <option value="name">Ordenar por: Nombre A-Z</option>
              </select>
              <button type="button" className="ghost admin-filter-button">Filtros</button>
            </section>

            <section className="admin-students-list" aria-label="Listado de estudiantes">
              {adminRowsForView.map((item) => {
                const workflowStatus = item.audioWorkflow?.status || (item.audioReady ? "approved" : "pending");
                const requestLabel = getWorkflowRequestLabel(item.audioWorkflow);
                const specialWorkflow = isSpecialWorkflow(item.audioWorkflow);
                const automaticWorkflow = isAutomaticAudioWorkflow(item.audioWorkflow);
                const advancedInfo = getAdvancedAccessInfo(item);
                const hasBeginnerAudio = Boolean(item.audioWorkflow?.beginnerAudioKey || item.audioWorkflow?.hasBeginnerAudio);
                const hasSecondBeginnerAudio = Boolean(
                  item.audioWorkflow?.beginnerAltAudioKey || item.audioWorkflow?.hasBeginnerAltAudio
                );
                const hasAdvancedAudio = Boolean(item.audioWorkflow?.editorAudioKey || item.audioWorkflow?.hasEditedAudio);
                const readyToApproveWorkflow = workflowStatus === "edited" && hasBeginnerAudio && hasAdvancedAudio;
                const canForceAdvancedOnly = hasAdvancedAudio && !advancedInfo.unlocked;
                const canRequestStudentAudio =
                  !automaticWorkflow &&
                  !hasWorkflowAudioAsset(item.audioWorkflow) &&
                  !["requested", "submitted", "edited", "approved"].includes(workflowStatus);
                const isActivatingAdvanced = adminActionSlug === item.slug;
                const initial = (item.name || item.slug || "E").trim().slice(0, 1).toUpperCase();
                const createdLabel = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-";
                const studentStatus = getStudentStatus(item);
                const isInactive = studentStatus === "inactive";
                const isStudentMenuOpen = openStudentMenuSlug === item.slug;
                const ageLabel = Number.isFinite(item.ageDays)
                  ? `${item.ageDays} dias`
                  : AGE_BUCKET_LABELS[item.ageBucket] || "Sin fecha";
                const weekly = item.weeklyPractice || buildWeeklyPracticeStats(item);
                const missedCopy = weekly.missedLabels?.length ? weekly.missedLabels.join(", ") : "ninguna";
                const apneaDailyLog = item.apneaDailyLog || [];
                const apneaHistory = item.apneaHistory || apneaDailyLog;
                const apneaBestSeconds = item.apneaBestSeconds || 0;
                const beginnerAudioProgress = item.beginnerAudioProgress || getBeginnerAudioProgress(item);
                const beginnerInfo = item.beginnerAudioInfo || buildBeginnerAudioInfo(item.usage || {});
                const alertCopy = specialWorkflow && workflowStatus !== "approved"
                  ? "Pedido especial"
                  : weekly.consecutiveMisses >= 2
                    ? `${weekly.consecutiveMisses} dias sin practica`
                    : item.alertLevel === "critical"
                      ? "Alerta 72h"
                      : item.alertLevel === "warning"
                        ? "Alerta 48h"
                        : "Sin alerta";
                const alertDetail = specialWorkflow && workflowStatus !== "approved"
                  ? "Revisar audio"
                  : weekly.consecutiveMisses >= 2
                    ? "Revisar hoy"
                    : item.alertLevel && item.alertLevel !== "ok"
                      ? "Sin practica"
                      : "Actividad normal";
                return (
                  <article key={item.slug} className={`admin-student-card ${item.alertLevel ? `has-${item.alertLevel}` : ""} ${specialWorkflow ? "is-special" : ""} ${isInactive ? "is-inactive" : ""} ${isStudentMenuOpen ? "is-menu-open" : ""}`}>
                    <div className="student-identity">
                      <span className="student-avatar-ring">{initial}</span>
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.slug}</p>
                        <small>Creado: {createdLabel}</small>
                        <div className="student-state-row">
                          <span className={`student-state-pill ${studentStatus}`}>
                            {STUDENT_STATUS_LABELS[studentStatus] || "Activo"}
                          </span>
                          <span className="student-age-pill">{ageLabel}</span>
                        </div>
                        <div className="workflow-meta">
                          <span>Audio:</span>
                          <span className={`workflow-pill ${workflowStatus}`}>
                            {WORKFLOW_STATUS_LABELS[workflowStatus] || workflowStatus}
                          </span>
                          {requestLabel && (
                            <span className={`workflow-request-badge ${specialWorkflow ? "special" : ""}`}>
                              {requestLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="student-progress-stack">
                      <span className={item.flowState?.onboarding ? "done" : ""}>Onboarding</span>
                      <span className={item.flowState?.prePractice ? "done" : ""}>Pre-práctica</span>
                      <span className={item.flowState?.practice ? "done" : ""}>Práctica</span>
                    </div>

                    <div className="student-main-actions">
                      <button
                        type="button"
                        className="primary"
                        onClick={() => copyLink(item.slug, item.token, true)}
                      >
                        Copiar link con token
                      </button>
                      {canRequestStudentAudio && (
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => handleRequestStudentAudio(item.slug)}
                        >
                          Solicitar audio
                        </button>
                      )}
                      <a
                        className="ghost link-button"
                        href={buildStudentLink(item.slug, item.token, true)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir link
                      </a>
                      <div className={`student-more-menu ${isStudentMenuOpen ? "is-open" : ""}`}>
                        <button
                          type="button"
                          className="student-more-trigger"
                          aria-label="Más acciones"
                          aria-expanded={isStudentMenuOpen}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenStudentMenuSlug(isStudentMenuOpen ? "" : item.slug);
                          }}
                        >
                          •••
                        </button>
                        {isStudentMenuOpen && (
                          <div className="student-more-panel" onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              onPointerDown={(event) => handleStudentMenuAction(event, () => copyLink(item.slug, item.token, false))}
                              onClick={(event) => handleStudentMenuAction(event, () => copyLink(item.slug, item.token, false))}
                            >
                              Copiar link
                            </button>
                            <button
                              type="button"
                              onPointerDown={(event) => handleStudentMenuAction(event, () => copyToken(item.token))}
                              onClick={(event) => handleStudentMenuAction(event, () => copyToken(item.token))}
                            >
                              Copiar token
                            </button>
                            <button
                              type="button"
                              onPointerDown={(event) => handleStudentMenuAction(event, () => copyUploadLink(item.slug, item.token))}
                              onClick={(event) => handleStudentMenuAction(event, () => copyUploadLink(item.slug, item.token))}
                            >
                              Copiar link carga
                            </button>
                            <button
                              type="button"
                              onPointerDown={(event) => handleStudentMenuAction(event, () => handleReplaceClick(item.slug))}
                              onClick={(event) => handleStudentMenuAction(event, () => handleReplaceClick(item.slug))}
                            >
                              Reemplazar audio
                            </button>
                            <button
                              type="button"
                              onPointerDown={(event) => handleStudentMenuAction(event, () => handleToggleColorPractice(item.slug, !item.features?.colorVisionEnabled))}
                              onClick={(event) => handleStudentMenuAction(event, () => handleToggleColorPractice(item.slug, !item.features?.colorVisionEnabled))}
                            >
                              {item.features?.colorVisionEnabled ? "Color ON" : "Color OFF"}
                            </button>
                            <button
                              type="button"
                              className={isInactive ? "" : "danger-action"}
                              onPointerDown={(event) => handleStudentMenuAction(event, () => handleToggleStudentStatus(item.slug, isInactive ? "active" : "inactive"))}
                              onClick={(event) => handleStudentMenuAction(event, () => handleToggleStudentStatus(item.slug, isInactive ? "active" : "inactive"))}
                            >
                              {isInactive ? "Marcar activo" : "Marcar inactivo"}
                            </button>
                            {item.audioWorkflow?.rawAudioKey && (
                              <a href={buildWorkflowAudioUrl(item, "raw")} target="_blank" rel="noreferrer" onClick={() => setOpenStudentMenuSlug("")}>
                                Original alumno
                              </a>
                            )}
                            {item.audioWorkflow?.editorAudioKey && (
                              <a href={buildWorkflowAudioUrl(item, "edited")} target="_blank" rel="noreferrer" onClick={() => setOpenStudentMenuSlug("")}>
                                Crudo Advanced
                              </a>
                            )}
                            {item.audioWorkflow?.beginnerAudioKey && (
                              <a href={buildWorkflowAudioUrl(item, "beginner")} target="_blank" rel="noreferrer" onClick={() => setOpenStudentMenuSlug("")}>
                                Principiante 1
                              </a>
                            )}
                            {item.audioWorkflow?.beginnerAltAudioKey && (
                              <a href={buildWorkflowAudioUrl(item, "beginner-alt")} target="_blank" rel="noreferrer" onClick={() => setOpenStudentMenuSlug("")}>
                                Principiante 2
                              </a>
                            )}
                            <button
                              className="danger-action"
                              type="button"
                              onPointerDown={(event) => handleStudentMenuAction(event, () => handleAdminDelete(item.slug))}
                              onClick={(event) => handleStudentMenuAction(event, () => handleAdminDelete(item.slug))}
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="student-status-line">
                      <span>Estado: {STUDENT_STATUS_LABELS[studentStatus] || "Activo"}</span>
                      <span>Antigüedad: {ageLabel}</span>
                      <span>Avanzado: {advancedInfo.unlocked ? "habilitado" : "bloqueado"}</span>
                      <span>Principiante: {beginnerAudioProgress.completedDays}/{beginnerAudioProgress.requiredDays}</span>
                      <span>Colores: {item.features?.colorVisionEnabled ? "habilitada" : "bloqueada"}</span>
                      <span>Flujo O/Pre/Pra: {item.onboardingSessions || 0}/{item.prePracticeSessions || 0}/{item.practiceSessions || 0}</span>
                    </div>

                    <div className={`student-alert-badge ${item.alertLevel || "ok"}`}>
                      <strong>{alertCopy}</strong>
                      <span>{alertDetail}</span>
                    </div>

                    <div className="student-secondary">
                      <div className="student-weekly-panel" aria-label={`Seguimiento semanal de ${item.name}`}>
                        <div className="student-weekly-stat">
                          <span>Semana</span>
                          <strong>{weekly.practicedDays || 0}/{weekly.expectedDays || 7}</strong>
                        </div>
                        <div className={`student-weekly-stat ${weekly.missedLabels?.length ? "warning" : "ok"}`}>
                          <span>Fallo</span>
                          <strong>{missedCopy}</strong>
                        </div>
                        <div className="student-weekly-stat">
                          <span>Racha</span>
                          <strong>{weekly.currentStreak || 0} dias</strong>
                        </div>
                        <div className={`student-weekly-stat ${weekly.consecutiveMisses >= 2 ? "critical" : weekly.consecutiveMisses >= 1 ? "warning" : "ok"}`}>
                          <span>Seguidos sin practica</span>
                          <strong>{weekly.consecutiveMisses || 0}</strong>
                        </div>
                      </div>

                      <div
                        className={`student-audio-log ${beginnerInfo.level}`}
                        aria-label={`Seguimiento audio principiante de ${item.name}`}
                        style={{ "--audio-progress": `${beginnerInfo.percent || 0}%` }}
                      >
                        <div className="student-audio-log-head">
                          <span>Audio principiante</span>
                          <strong>{beginnerAudioProgress.completedDays}/{beginnerAudioProgress.requiredDays} completos</strong>
                        </div>
                        {beginnerInfo.hasData ? (
                          <>
                            <div className="student-audio-log-main">
                              <strong>{beginnerInfo.statusLabel}</strong>
                              <span>
                                {formatDurationClock(beginnerInfo.listenedSeconds)}
                                {beginnerInfo.durationSeconds
                                  ? ` / ${formatDurationClock(beginnerInfo.durationSeconds)}`
                                  : ""}
                                {` · ${beginnerInfo.percent}%`}
                              </span>
                            </div>
                            <div className="student-audio-progress" aria-hidden="true" />
                            <small>
                              Último: {beginnerInfo.lastAgo} · {beginnerInfo.completedPlays}/{beginnerInfo.totalStarts} completas · {beginnerInfo.partialPlays} cortadas
                            </small>
                            {beginnerAudioProgress.events.length > 0 && (
                              <div className="student-audio-events">
                                {beginnerAudioProgress.events.slice(0, 4).map((event, index) => {
                                  const eventDate = event.eventAt ? new Date(event.eventAt) : null;
                                  const eventLabel = eventDate && !Number.isNaN(eventDate.getTime())
                                    ? `${WEEKDAY_SHORT[eventDate.getDay()]} ${padDatePart(eventDate.getDate())}/${padDatePart(eventDate.getMonth() + 1)}`
                                    : event.dayKey || "Sin fecha";
                                  const statusLabel = event.completed
                                    ? "Completo"
                                    : event.interrupted
                                      ? "Cortado"
                                      : "En progreso";
                                  return (
                                    <em
                                      key={`${item.slug}-beginner-event-${event.eventAt || index}`}
                                      className={event.completed ? "completed" : event.interrupted ? "interrupted" : ""}
                                    >
                                      {eventLabel} · {statusLabel}
                                    </em>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="muted">Todavía no reprodujo Reprogramación Mental Principiante.</p>
                        )}
                      </div>

                      <div className="student-apnea-log" aria-label={`Registro de apneas de ${item.name}`}>
                        <div className="student-apnea-log-head">
                          <span>Apneas por día</span>
                          <div className="student-apnea-log-tools">
                            <strong>{apneaBestSeconds ? `${formatDurationClock(apneaBestSeconds)} mejor` : "Sin datos"}</strong>
                            {apneaHistory.length > 0 && (
                              <button
                                type="button"
                                className="student-apnea-history-button"
                                onClick={() => setAdminApneaHistorySlug(item.slug)}
                              >
                                Historial
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="student-apnea-log-days">
                          {apneaDailyLog.length > 0 ? (
                            apneaDailyLog.map((day) => (
                              <div className="student-apnea-log-row" key={`${item.slug}-${day.dateKey}`}>
                                <span>{day.label}</span>
                                <div>
                                  {day.times.slice(0, 5).map((seconds, index) => (
                                    <em key={`${item.slug}-${day.dateKey}-${seconds}-${index}`}>
                                      {formatDurationClock(seconds)}
                                    </em>
                                  ))}
                                  {day.times.length > 5 && <em>+{day.times.length - 5}</em>}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="muted">Sin apneas registradas todavía.</p>
                          )}
                        </div>
                      </div>

                      <div className="student-secondary-actions">
                        {readyToApproveWorkflow && (
                          <button type="button" className="primary" onClick={() => handleApproveEditedAudio(item.slug)}>
                            Aprobar audio
                          </button>
                        )}
                        {workflowStatus === "edited" && automaticWorkflow && !hasAdvancedAudio && (
                          <span className="workflow-pill approved">Audio automático generado</span>
                        )}
                        {workflowStatus === "edited" && !automaticWorkflow && !readyToApproveWorkflow && (
                          <span className="workflow-pill pending">
                            {!hasBeginnerAudio && !hasAdvancedAudio
                              ? "Faltan editado 30 min y crudo Advanced"
                              : !hasBeginnerAudio
                                ? "Falta editado 30 min"
                                : "Falta crudo Advanced"}
                          </span>
                        )}
                        {canForceAdvancedOnly && (
                          <button
                            type="button"
                            className="primary"
                            disabled={isActivatingAdvanced}
                            onClick={() => handleUnlockAdvanced(item.slug)}
                          >
                            {isActivatingAdvanced ? "Activando..." : "Activar solo Advanced"}
                          </button>
                        )}
                        {advancedInfo.hasApprovedAudio && !advancedInfo.unlocked && !canForceAdvancedOnly && (
                          <button
                            type="button"
                            className="primary"
                            disabled={isActivatingAdvanced}
                            onClick={() => handleUnlockAdvanced(item.slug)}
                          >
                            {isActivatingAdvanced ? "Activando..." : "Activar Advanced"}
                          </button>
                        )}
                        {advancedInfo.unlocked && <span className="workflow-pill approved">Advanced ON</span>}
                        {hasSecondBeginnerAudio && <span className="workflow-pill approved">Principiante 2 ON</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
              {adminRowsForView.length === 0 && (
                <section className="card empty-admin-state">
                  {adminStudents.length === 0 ? "Aún no hay estudiantes cargados." : "Sin resultados para esa vista."}
                </section>
              )}
            </section>

            <section className="admin-lower-grid">
              {adminLoginCard}

              <section className="card new-student-card">
                <h3>Nuevo estudiante</h3>
                <div className="form-grid">
                  <label>
                    Nombre
                    <input
                      type="text"
                      value={adminName}
                      onChange={(event) => setAdminName(event.target.value)}
                    />
                  </label>
                  <label>
                    Audio inicial aprobado (opcional)
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(event) => setAdminFile(event.target.files?.[0] || null)}
                    />
                    <span className="muted">
                      Si lo dejas vacío, se crea un link para que el alumno suba su audio original.
                    </span>
                  </label>
                </div>
                <div className="audio-tools">
                  <button type="button" className="primary" onClick={handleAdminCreate}>
                    Crear estudiante
                  </button>
                  <button type="button" className="secondary" onClick={handleAdminCreateSpecialRequest}>
                    Crear pedido especial
                  </button>
                  {adminStatus === "loading" && <span className="muted">Procesando...</span>}
                  {adminMessage && <span className="muted">{adminMessage}</span>}
                </div>
                <p className="muted">
                  Pedido especial crea un audio binaural fuera de academia y queda visible en alertas/editor.
                </p>
                {adminLink && (
                  <div className="summary">
                    Link listo: <span className="code">{adminLink}</span>
                  </div>
                )}
              </section>

              <section className="card admin-config-card">
                <h3>Configurar habilitaciones</h3>
                <p className="muted">
                  Define el score semanal objetivo y decide si Canalización aparece o no en el menú del alumno.
                </p>
                <div className="admin-config-grid">
                  <label>
                    Objetivo Canalización (%)
                    <input
                      type="number"
                      min="60"
                      max="98"
                      step="1"
                      value={magicUnlockConfigDraft}
                      onChange={(event) => setMagicUnlockConfigDraft(event.target.value)}
                    />
                  </label>
                  <div className="admin-semaforo-panel">
                    <strong>Semáforo objetivo</strong>
                    <div className="semaforo-lights">
                      <span className={`semaforo-light green ${magicPolicyLevel === "green" ? "on" : ""}`} />
                      <span className={`semaforo-light yellow ${magicPolicyLevel === "yellow" ? "on" : ""}`} />
                      <span className={`semaforo-light red ${magicPolicyLevel === "red" ? "on" : ""}`} />
                    </div>
                    <small>
                      {magicPolicyLevel === "green"
                        ? "Objetivo fácil de alcanzar"
                        : magicPolicyLevel === "yellow"
                          ? "Objetivo medio"
                          : "Objetivo exigente"}
                    </small>
                  </div>
                  <div className="admin-flow-summary compact">
                    <div className={`alert-pill ${adminAnalytics.flowSemaforoLevel}`}>
                      Avance de flujo: {adminAnalytics.flowProgressPct}%
                    </div>
                    <div className="flow-semaforo" aria-label="Semáforo de flujo por etapa">
                      <span className={`flow-dot ${adminAnalytics.flowCounts.onboarding > 0 ? "on" : "off"}`} />
                      <span className={`flow-dot ${adminAnalytics.flowCounts.prePractice > 0 ? "on" : "off"}`} />
                      <span className={`flow-dot ${adminAnalytics.flowCounts.practice > 0 ? "on" : "off"}`} />
                      <span className="muted flow-legend">
                        Onboarding {adminAnalytics.flowCounts.onboarding} · Pre-práctica {adminAnalytics.flowCounts.prePractice} · Práctica {adminAnalytics.flowCounts.practice}
                      </span>
                    </div>
                    <div className="muted">
                      Color habilitado en {adminAnalytics.flowCounts.colorEnabled} de {adminStudents.length} estudiantes.
                    </div>
                  </div>
                </div>
                <div className="audio-tools">
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleSaveMagicUnlockScore}
                    disabled={magicUnlockConfigSaving}
                  >
                    {magicUnlockConfigSaving ? "Guardando..." : "Guardar objetivo"}
                  </button>
                  <button
                    type="button"
                    className={channelingEnabled ? "primary" : "secondary"}
                    onClick={() => handleToggleChannelingEnabled(!channelingEnabled)}
                    disabled={channelingConfigSaving}
                  >
                    {channelingConfigSaving
                      ? "Guardando..."
                      : channelingEnabled
                        ? "Canalización ON"
                        : "Canalización OFF"}
                  </button>
                  {magicUnlockConfigMessage && <span className="muted">{magicUnlockConfigMessage}</span>}
                  {channelingConfigMessage && <span className="muted">{channelingConfigMessage}</span>}
                </div>
              </section>

              <section className="card admin-managers-card">
                <h3>Administradores (v2)</h3>
                <p className="muted">Solo el administrador principal puede crear o eliminar administradores secundarios.</p>
                <button
                  type="button"
                  className="ghost wide-action"
                  onClick={() => window.open(SEGUIMIENTO_DASHBOARD_URL, "_blank", "noopener,noreferrer")}
                >
                  Abrir dashboard Seguimiento
                </button>
                <button type="button" className="secondary wide-action" onClick={handleImportSeguimiento} disabled={adminBridgeLoading}>
                  {adminBridgeLoading ? "Sincronizando..." : "Sincronizar alumnos desde Seguimiento"}
                </button>
                {adminBridgeMessage && <p className="muted">{adminBridgeMessage}</p>}
                <details className="admin-manager-details">
                  <summary>Gestionar administradores</summary>
                  <div className="form-grid">
                    <label>
                      Nombre admin
                      <input type="text" value={newAdminName} onChange={(event) => setNewAdminName(event.target.value)} />
                    </label>
                    <label>
                      Password admin
                      <input type="password" value={newAdminPassword} onChange={(event) => setNewAdminPassword(event.target.value)} />
                    </label>
                    <label>
                      Doble confirmación
                      <input
                        type="text"
                        placeholder={newAdminName ? `CONFIRMAR ${newAdminName}` : "CONFIRMAR nombre"}
                        value={newAdminConfirmation}
                        onChange={(event) => setNewAdminConfirmation(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="audio-tools">
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={newAdminConfirmedTwice}
                        onChange={(event) => setNewAdminConfirmedTwice(event.target.checked)}
                      />
                      Confirmo por segunda vez que deseo crear este administrador.
                    </label>
                    <button type="button" className="secondary" onClick={handleCreateAdmin}>
                      Crear administrador
                    </button>
                    {adminManagerMessage && <span className="muted">{adminManagerMessage}</span>}
                  </div>
                  <div className="link-list compact-admin-list">
                    {adminsList.map((admin) => (
                      <div key={admin.name} className="link-row">
                        <div>
                          <strong>{admin.name}</strong>
                          <div className="muted">
                            {admin.role === "admin-total" ? "Administrador total" : "Administrador"}
                            {admin.source === "env" ? " · acceso fijo" : ""}
                          </div>
                          <div className="muted">Creado: {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "-"}</div>
                        </div>
                        <div className="link-actions">
                          {admin.locked ? (
                            <span className="muted">Protegido por Vercel</span>
                          ) : (
                            <button type="button" className="ghost" onClick={() => handleRemoveAdmin(admin.name)}>
                              Eliminar admin
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </section>
            </section>
            {adminApneaHistoryStudent && (
              <div
                className="apnea-history-overlay"
                role="dialog"
                aria-modal="true"
                aria-label={`Historial completo de apneas de ${adminApneaHistoryStudent.name}`}
                onClick={() => setAdminApneaHistorySlug("")}
              >
                <section
                  className="apnea-history-sheet admin-apnea-history-sheet"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="apnea-history-head">
                    <div>
                      <p className="eyebrow">Historial completo</p>
                      <h3>{adminApneaHistoryStudent.name}</h3>
                    </div>
                    <button
                      type="button"
                      className="apnea-history-close"
                      aria-label="Cerrar historial de apnea"
                      onClick={() => setAdminApneaHistorySlug("")}
                    >
                      ×
                    </button>
                  </div>
                  <div className="apnea-history-summary">
                    <div>
                      <span>Días</span>
                      <strong>{adminApneaHistoryDays.length}</strong>
                    </div>
                    <div>
                      <span>Mejor</span>
                      <strong>{adminApneaHistoryBest ? formatDurationClock(adminApneaHistoryBest) : "0:00"}</strong>
                    </div>
                    <div>
                      <span>Sesiones</span>
                      <strong>
                        {adminApneaHistoryDays.reduce((sum, day) => sum + Number(day.sessions || 0), 0)}
                      </strong>
                    </div>
                  </div>
                  <div className="apnea-history-days admin-apnea-history-days">
                    {adminApneaHistoryDays.length > 0 ? (
                      adminApneaHistoryDays.map((day) => (
                        <article key={`${adminApneaHistoryStudent.slug}-${day.dateKey}`} className="apnea-history-day">
                          <div>
                            <strong>{day.label}</strong>
                            <span>{day.sessions || 1} sesión{Number(day.sessions || 1) === 1 ? "" : "es"}</span>
                          </div>
                          <div>
                            {day.times.map((seconds, index) => (
                              <em key={`${day.dateKey}-${seconds}-${index}`}>{formatDurationClock(seconds)}</em>
                            ))}
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="muted">Sin tiempos de apnea registrados todavía.</p>
                    )}
                  </div>
                </section>
              </div>
            )}
          </main>
        )}
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="app auth-app">
        {renderHeader()}
        <section className="card auth-card">
          <p className="eyebrow">Acceso seguro</p>
          <h2>Ingresar a la app</h2>
          <p className="muted">Usá el email y contraseña asociados a tu alumno.</p>
          <form className="auth-form" onSubmit={handleStudentLogin}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
            </label>
            {loginMessage && <p className="status error">{loginMessage}</p>}
            <button type="submit" disabled={loginStatus === "loading"}>
              {loginStatus === "loading" ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
          {renderLegacyLogin()}
        </section>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="app">
        {renderHeader()}
        <div className="card">
          <h2>Estudiante no encontrado</h2>
          <p>Revisa el slug en el link y confirma que exista en <span className="code">public/students.json</span>.</p>
        </div>
      </div>
    );
  }

  if (practiceScreen === "menu") {
    return (
      <div className="app menu-app">
        {renderHeader()}
        <div className="card menu-card">
          <div className="menu-card-title-row">
            <h2>Selecciona práctica</h2>
            <button
              type="button"
              className="apnea-history-button"
              aria-label="Ver historial de tiempos de apnea"
              title="Historial de apnea"
              onClick={() => setApneaHistoryOpen(true)}
            >
              <span>⏱</span>
              {studentApneaDailyLog.length > 0 && <em>{studentApneaDailyLog.length}</em>}
            </button>
          </div>
          <p className="muted">
            Principiante se habilita cuando administración aprueba tu audio. Advanced se libera al completar 7 días
            escuchando Principiante de inicio a fin y tener listo tu audio personalizado.
          </p>
          <div className="practice-menu">
            {practiceOptions.map((item) => {
              const canClickLockedAdvanced = item.id === "reprogramacion";
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`menu-button ${item.enabled ? "enabled" : "disabled"}`}
                  onClick={item.enabled || canClickLockedAdvanced ? () => openPracticeOption(item.id) : undefined}
                  disabled={!item.enabled && !canClickLockedAdvanced}
                >
                  {item.label}
                  {!item.enabled && (
                    <span>
                      {item.id === "principiante"
                        ? "Pendiente de audio"
                        : item.id === "reprogramacion"
                          ? hasApprovedAudio
                            ? advancedBlockedLabel()
                            : "Pendiente de audio"
                          : item.id === "colores"
                            ? "Bloqueado"
                            : item.id === "magia"
                              ? "Bloqueado por dashboard"
                              : "Proximamente"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {apneaHistoryOpen && (
          <div
            className="apnea-history-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Historial de tiempos de apnea"
            onClick={() => setApneaHistoryOpen(false)}
          >
            <section className="apnea-history-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="apnea-history-head">
                <div>
                  <p className="eyebrow">Mis apneas</p>
                  <h3>Tiempos de apnea</h3>
                </div>
                <button
                  type="button"
                  className="apnea-history-close"
                  aria-label="Cerrar historial de apnea"
                  onClick={() => setApneaHistoryOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className="apnea-history-summary">
                <div>
                  <span>Racha</span>
                  <strong>{studentWeeklyStats.currentStreak || progress.streak || 0}d</strong>
                </div>
                <div>
                  <span>Mejor</span>
                  <strong>{studentBestApneaSeconds ? formatDurationClock(studentBestApneaSeconds) : "0:00"}</strong>
                </div>
                <div>
                  <span>Última</span>
                  <strong>{studentLastApneaSeconds ? formatDurationClock(studentLastApneaSeconds) : "0:00"}</strong>
                </div>
              </div>
              <div className="apnea-history-days">
                {studentApneaHistoryLog.length > 0 ? (
                  studentApneaHistoryLog.map((day) => (
                    <article key={day.dateKey} className="apnea-history-day">
                      <div>
                        <strong>{day.label}</strong>
                        <span>{day.total} apneas</span>
                      </div>
                      <div>
                        {day.times.map((seconds, index) => (
                          <em key={`${day.dateKey}-${seconds}-${index}`}>{formatDurationClock(seconds)}</em>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="muted">Sin tiempos de apnea registrados todavía.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }

  if (practiceScreen === "principiante") {
    return (
      <div className="app">
        {renderHeader()}
        <div className="practice-nav">
          <button type="button" className="ghost" onClick={handleBackToMenu}>
            Volver al menu
          </button>
        </div>
        <section className="card beginner-card">
          <p className="eyebrow">Primera etapa</p>
          <h2>Reprogramacion Mental Principiante</h2>
          <p className="muted">
            Escuchás tu audio completo editado. Advanced se habilita al completar 7 días de reproducción de inicio a fin:
            reproducir, cerrar ojos y dejar que corra.
          </p>
          {beginnerAudioOptions.length > 0 ? (
            <div className="beginner-audio-list">
              {beginnerAudioOptions.map((audioItem, index) => (
                <div className="beginner-audio-option" key={audioItem.id}>
                  <div className="beginner-audio-option-head">
                    <span>{audioItem.label}</span>
                    <small>{audioItem.fileName || `Opción ${index + 1}`}</small>
                  </div>
                  <audio
                    ref={(node) => {
                      if (node) {
                        beginnerAudioRefs.current[audioItem.id] = node;
                        if (index === 0) beginnerAudioRef.current = node;
                      } else {
                        delete beginnerAudioRefs.current[audioItem.id];
                      }
                    }}
                    className="beginner-player"
                    controls
                    preload="metadata"
                    src={audioItem.src}
                    onPlay={() => handleBeginnerAudioPlay(audioItem.id, audioItem.label)}
                    onTimeUpdate={() => handleBeginnerAudioTimeUpdate(audioItem.id)}
                    onPause={() => handleBeginnerAudioPause(audioItem.id)}
                    onEnded={() => handleBeginnerAudioEnded(audioItem.id)}
                    onSeeking={() => handleBeginnerAudioSeeking(audioItem.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="status error">El audio todavía no está aprobado.</p>
          )}
          <div className="summary">
            {advancedUnlocked ? (
              "Advanced ya está disponible en el menú."
            ) : advancedAccessInfo.blockedReason === "missing-personal-audio" ? (
              <>
                Completaste {beginnerCompletedDays}/{beginnerRequiredDays} días. Falta grabar tu audio personalizado en{" "}
                <a href="https://formulario.academiacortex.com.ar/" target="_blank" rel="noreferrer">
                  formulario.academiacortex.com.ar
                </a>.
              </>
            ) : (
              `Advanced se libera al completar ${beginnerCompletedDays}/${beginnerRequiredDays} días del audio Principiante.`
            )}
          </div>
        </section>
      </div>
    );
  }

  if (practiceScreen === "daily-goals") {
    return (
      <div className="app">
        {renderHeader()}
        <div className="practice-nav">
          <button type="button" className="ghost" onClick={handleBackToMenu}>
            Volver al menu
          </button>
        </div>
        <DailyGoalsModule
          allowAdmin={false}
          onMagicUnlockChange={handleDailyMagicUnlock}
          magicUnlockScore={magicUnlockScore}
          fixedStudent={{
            id: student?.slug || "",
            name: student?.name || "Estudiante",
            slug: student?.slug || "",
            token
          }}
        />
      </div>
    );
  }

  if (practiceScreen === "magia") {
    return (
      <div className="app">
        {renderHeader()}
        <div className="practice-nav">
          <button type="button" className="ghost" onClick={handleBackToMenu}>
            Volver al menu
          </button>
        </div>
        <section className="card">
          <p className="eyebrow">Canalización</p>
          <h3>Sesiones de canalización</h3>
          <p className="muted">
            Disponible porque fue habilitado desde dashboard. Referencia actual de score: {whiteMagicScore}% / objetivo {magicUnlockScore}%.
          </p>
          <p className="muted">
            Usa este módulo como práctica guiada: cada mes tiene un bonus y una meta concreta para habilitarlo.
          </p>
          <ul className="magic-list">
            {WHITE_MAGIC_BONUS.map((item) => (
              <li key={item.month} className="magic-row">
                <div>
                  <strong>{item.month} · {item.title}</strong>
                  <small>{item.goal}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  if (practiceScreen === "color-vision") {
    if (!hasColorPracticeAccess(student)) {
      return (
        <div className="app">
          {renderHeader()}
          <div className="practice-nav">
            <button type="button" className="ghost" onClick={handleBackToMenu}>
              Volver al menu
            </button>
          </div>
          <section className="card">
            <h3>Visualizacion de colores</h3>
            <p className="muted">Tu acceso no está activado todavía. Pide habilitación al administrador.</p>
          </section>
        </div>
      );
    }
    return (
      <div className="app">
        {renderHeader()}
        <div className="practice-nav">
          <button type="button" className="ghost" onClick={handleBackToMenu}>
            Volver al menu
          </button>
        </div>
        <section className="card color-practice-shell">
          <p className="eyebrow">Visualizacion de colores</p>
          <h3>Entrenamiento de cartulinas</h3>
          <p className="muted">Detector con cámara, calibración por color y reporte final.</p>
          <iframe
            className="color-practice-iframe"
            src={`/cartulinas/index.html?student=${encodeURIComponent(student?.name || "")}&slug=${encodeURIComponent(
              student?.slug || ""
            )}&token=${encodeURIComponent(token || "")}`}
            title="Practica de visualizacion de colores"
            allow="camera; microphone"
          />
        </section>
      </div>
    );
  }

  if (practiceScreen === "practice-check") {
    return (
      <div className="app practice-check-app precheck-app">
        {renderHeader()}
        <div className="practice-nav">
          <button type="button" className="ghost" onClick={handleBackToMenu}>
            Volver al menu
          </button>
        </div>
        <section className="card precheck-screen">
          <div className="precheck-head">
            <p className="eyebrow">Checklist previo</p>
            <h2>Checks de respiración</h2>
            {quickChecklistDoneToday ? (
              <p className="status success precheck-done-banner">
                Checklist hecho hoy. Puedes tocar <strong>Siguiente</strong> directo.
              </p>
            ) : (
              <p className="muted">
                Puedes tocar <strong>Siguiente</strong> directo para entrar a la práctica.
              </p>
            )}
            {quickCheckState.dayKey && (
              <p className="muted precheck-date">
                Día de control:{" "}
                {new Date(`${quickCheckState.dayKey}T12:00:00`).toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long"
                })}
              </p>
            )}
          </div>

          {quickCheckState.loading && <p className="muted">Cargando checks...</p>}
          {quickCheckState.error && <p className="status error">{quickCheckState.error}</p>}

          {!quickCheckState.loading && !quickCheckState.error && showPrecheckItems && (
            <div className="precheck-list">
              {quickCheckState.items.map((item, index) => (
                <article
                  key={item.id}
                  className={`precheck-item ${
                    item.status === "done"
                      ? "is-done"
                      : item.status === "partial"
                        ? "is-partial"
                        : item.status === "missed"
                          ? "is-missed"
                          : ""
                  }`}
                >
                  <div className="precheck-meta">
                    <strong>{item.text}</strong>
                    <small>
                      {item.category || "Personal"} · Check {index + 1}
                    </small>
                  </div>
                  <div className="precheck-actions">
                    <button
                      type="button"
                      className={item.status === "done" ? "chip active" : "chip"}
                      onClick={() => setQuickItemStatus(item.id, "done")}
                    >
                      Hecho
                    </button>
                    <button
                      type="button"
                      className={item.status === "partial" ? "chip active" : "chip"}
                      onClick={() => setQuickItemStatus(item.id, "partial")}
                    >
                      Parcial
                    </button>
                    <button
                      type="button"
                      className={item.status === "missed" ? "chip active" : "chip"}
                      onClick={() => setQuickItemStatus(item.id, "missed")}
                    >
                      No hecho
                    </button>
                  </div>
                </article>
              ))}
              {quickCheckState.items.length === 0 && (
                <p className="muted">
                  No hay checks cargados todavía. Puedes cargarlos en <strong>Metas Diarias</strong>.
                </p>
              )}
            </div>
          )}

          <div className="precheck-footer">
            <button
              type="button"
              className="secondary"
              onClick={proceedFromPrecheck}
            >
              Siguiente
            </button>
            {quickChecklistDoneToday && (
              <button
                type="button"
                className="ghost"
                onClick={() => setShowPrecheckItems((prev) => !prev)}
                disabled={quickCheckState.loading}
              >
                {showPrecheckItems ? "Ocultar checklist" : "Editar checklist"}
              </button>
            )}
            <button
              type="button"
              className="ghost"
              onClick={loadQuickDailyChecklist}
              disabled={quickCheckState.loading}
            >
              Recargar
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className={`app practice-app phase-${phase} ${isSessionActive ? "is-session-active" : ""}`}
      onPointerUp={onPointerUp}
      onDoubleClick={onAppDoubleClick}
    >
      <main className="grid practice-grid">
        <section className="practice-screen practice-screen-session">
          {renderHeader()}
          <div className="practice-nav">
            <button type="button" className="ghost" onClick={handleBackToMenu}>
              Volver al menu
            </button>
          </div>

          <section className="session card practice-section practice-section-session">
            <div className="session-header">
              <div>
                <p className="eyebrow session-mode-pill">
                  {isSessionActive ? sessionModeLabel : PHASE_LABELS[phase]}
                </p>
                <h2>{phase === "complete" ? "Buen trabajo" : "Sesión en curso"}</h2>
              </div>
              <div className="timer-wrap">
                {isSessionActive ? (
                  <>
                    <div className="cycle-live-pill">
                      <span />
                      Ciclo {cycleIndex} / {config.cycles}
                    </div>
                    {phase === "apnea" && (
                      <div className="apnea-corner-timer" aria-live="polite">
                        <span>Apnea</span>
                        <strong>{formatSeconds(timeLeftMs)}</strong>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="timer">
                      {phase === "idle" || phase === "complete" ? "--:--" : formatSeconds(timeLeftMs)}
                    </div>
                    {!isRunning && startCountdown > 0 && (
                      <div className="timer-sub">Comienza en {startCountdown}...</div>
                    )}
                    {phase === "apnea" && previousApneaSeconds > 0 && (
                      <div className="timer-sub">Apnea anterior: {formatSeconds(previousApneaSeconds * 1000)}</div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="breath-visual">
              {phase === "breathing" && (
                <div className="breath-counter-top">
                  <strong>
                    <span>{currentBreathNumber}</span>
                    <em>/ {config.breathsPerCycle}</em>
                  </strong>
                  <span>Respiraciones</span>
                  <div className="nostril-preview" aria-label="Siguiente respiración">
                    <span className={`nostril-dot ${nextNostrilState === "left" ? "active" : ""}`} />
                    <span className={`nostril-dot ${nextNostrilState === "both" ? "active" : ""}`} />
                    <span className={`nostril-dot ${nextNostrilState === "right" ? "active" : ""}`} />
                  </div>
                </div>
              )}

              <div className={`breath-orb ${phaseClass()} nostril-${glowNostrilState}`} style={phaseStyle()}>
                {!breathLogoMissing && (
                  <img
                    className="breath-logo"
                    src={theme === "dark" ? "/logo-05-dark.png" : "/logo-05-light.png"}
                    alt="Cortex breath"
                    onError={() => setBreathLogoMissing(true)}
                  />
                )}
                {breathLogoMissing && <div className="breath-logo-fallback">Falta logo de respiración en /public</div>}
              </div>
              <div className="breath-text">
                {phase === "breathing" && subphase === "inhale" && "Inhala"}
                {phase === "breathing" && subphase === "exhale" && "Exhala"}
                {phase === "apnea" && "Mantén la apnea"}
                {phase === "recovery" && "Recupera"}
                {(phase === "idle" || phase === "complete") && "Preparado"}
              </div>
              {visibleSessionApneas.length > 0 && (
                <div className="session-apnea-board" aria-label="Apneas registradas en la sesión">
                  {visibleSessionApneas.map((item) => (
                    <span
                      key={`round-apnea-${item.round}`}
                      className={`apnea-round-chip ${item.active ? "active" : ""}`}
                    >
                      <b>A{item.round}</b>
                      {formatDurationClock(item.seconds)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {phase === "breathing" && (
              <div className="breath-progress" style={{ "--breath-progress": `${breathProgressPercent}%` }} />
            )}

            <div className="session-meta">
              <div>
                <span>Ciclo</span>
                <strong>{cycleIndex} / {config.cycles}</strong>
              </div>
              <div>
                <span>Respiraciones</span>
                <strong>{breathsDone} / {config.breathsPerCycle}</strong>
              </div>
              <div>
                <span>Audio apnea</span>
                <strong>{student ? "Asignado" : "No"}</strong>
              </div>
            </div>

            <div className="actions">
              {!isRunning && (
                <button
                  className="primary"
                  onClick={startSession}
                  disabled={
                    audioCheckStatus === "checking" ||
                    isStarting ||
                    startCountdown > 0
                  }
                >
                  {audioCheckStatus === "checking"
                    ? "Chequeando audio..."
                    : isStarting
                      ? "Iniciando..."
                    : startCountdown > 0
                      ? `Inicia en ${startCountdown}...`
                      : "Iniciar sesión"}
                </button>
              )}
              {isRunning && !isPaused && phase !== "complete" && (
                <button className="secondary" onClick={pauseSession}>Pausar</button>
              )}
              {isRunning && isPaused && phase !== "complete" && (
                <button className="secondary" onClick={resumeSession}>Reanudar</button>
              )}
              {isRunning && phase !== "complete" && phase !== "apnea" && (
                <button
                  className="ghost hold-to-end"
                  style={{ "--hold-pct": `${stopHoldProgress}%` }}
                  onPointerDown={startStopHold}
                  onPointerUp={cancelStopHold}
                  onPointerLeave={cancelStopHold}
                  onPointerCancel={cancelStopHold}
                >
                  <span>Mantener 1s para detener</span>
                </button>
              )}
              {phase === "apnea" && (
                <button
                  className="primary hold-to-end"
                  style={{ "--hold-pct": `${endHoldProgress}%` }}
                  onPointerDown={startEndApneaHold}
                  onPointerUp={cancelEndApneaHold}
                  onPointerLeave={cancelEndApneaHold}
                  onPointerCancel={cancelEndApneaHold}
                >
                  <span>Mantener 1.5s para terminar apnea</span>
                </button>
              )}
              {phase === "complete" && isAwaitingFinalClose && (
                <button
                  className="primary hold-to-end"
                  style={{ "--hold-pct": `${finalHoldProgress}%` }}
                  onPointerDown={startFinalizeHold}
                  onPointerUp={cancelFinalizeHold}
                  onPointerLeave={cancelFinalizeHold}
                  onPointerCancel={cancelFinalizeHold}
                >
                  <span>Mantener 1.5s para finalizar ejercicio</span>
                </button>
              )}
            </div>

            <audio ref={audioRef} src={audioSrc} preload="auto" playsInline />
            <audio ref={breathAudioRef} preload="auto" playsInline />
            <audio ref={breathAudioAltRef} preload="auto" playsInline />
            <audio
              ref={bosqueAudioRef}
              preload="auto"
              playsInline
              onEnded={reviveAmbientIfNeeded}
              onPause={() => {
                setTimeout(reviveAmbientIfNeeded, 120);
              }}
            />
            <audio ref={endApneaAudioRef} preload="auto" playsInline />
            <audio
              ref={septasyncAudioRef}
              preload="auto"
              playsInline
              onEnded={reviveSeptasyncIfNeeded}
              onPause={() => {
                setTimeout(reviveSeptasyncIfNeeded, 120);
              }}
            />
            <audio ref={preApneaCueAudioRef} src="/pre-apnea-cue.mp3" preload="auto" playsInline />
            <audio ref={finalApneaCueAudioRef} src="/finaliza-ultima-apnea.mp3" preload="auto" playsInline />
          </section>
        </section>

        <section className="card practice-screen practice-section practice-section-config">
          <h3>Configuración rápida</h3>
          <p className="muted">Presets rápidos para no tocar sliders en cada sesión.</p>

          <div className="preset-group">
            <div className="preset-label">Estilo respiración</div>
            <div className="preset-row">
              {BREATH_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`chip ${config.breathStyle === option.id ? "active" : ""}`}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      breathStyle: option.id
                    }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="muted">
              Activacion: ambas fosas. Confort: 3 ambas + 3 izquierda + 3 derecha. Reset: alterna izquierda/derecha con cierre en ambas.
            </span>
          </div>

          <div className="preset-group">
            <div className="preset-label">Velocidad respiración</div>
            <div className="preset-row">
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`chip ${config.inhaleSeconds === option.inhale && config.exhaleSeconds === option.exhale ? "active" : ""}`}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      inhaleSeconds: option.inhale,
                      exhaleSeconds: option.exhale
                    }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="preset-group">
            <div className="preset-label">Respiraciones por ciclo</div>
            <div className="preset-row">
              {BREATHS_OPTIONS.map((value) => (
                <button
                  key={`breaths-${value}`}
                  type="button"
                  className={`chip ${config.breathsPerCycle === value ? "active" : ""}`}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      breathsPerCycle: value
                    }))
                  }
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="preset-group">
            <div className="preset-label">Ciclos</div>
            <div className="preset-row">
              {CYCLES_OPTIONS.map((value) => (
                <button
                  key={`cycles-${value}`}
                  type="button"
                  className={`chip ${config.cycles === value ? "active" : ""}`}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      cycles: value
                    }))
                  }
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="preset-group">
            <div className="preset-label">Sonido ambiente</div>
            <div className="preset-row">
              <button
                type="button"
                className={`chip ${config.ambientSound === "bosque" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, ambientSound: "bosque" }))}
              >
                Bosque
              </button>
              <button
                type="button"
                className={`chip ${config.ambientSound === "oceano" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, ambientSound: "oceano" }))}
              >
                Oceano
              </button>
              <button
                type="button"
                className={`chip ${config.ambientSound === "none" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, ambientSound: "none" }))}
              >
                Sin sonido
              </button>
            </div>
            <label>
              Volumen ambiente
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.bosqueVolume}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    bosqueVolume: Number(event.target.value)
                  }))
                }
              />
            </label>
          </div>

          <div className="preset-group">
            <div className="preset-label">Septasync</div>
            <div className="preset-row">
              <button
                type="button"
                className={`chip ${config.septasyncTrack === "balance" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, septasyncTrack: "balance" }))}
              >
                Balance
              </button>
              <button
                type="button"
                className={`chip ${config.septasyncTrack === "gamma" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, septasyncTrack: "gamma" }))}
              >
                Gamma
              </button>
              <button
                type="button"
                className={`chip ${config.septasyncTrack === "trance" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, septasyncTrack: "trance" }))}
              >
                Trance
              </button>
              <button
                type="button"
                className={`chip ${config.septasyncTrack === "none" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, septasyncTrack: "none" }))}
              >
                Off
              </button>
            </div>
            <label>
              Volumen Septasync
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.septasyncVolume}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    septasyncVolume: Number(event.target.value)
                  }))
                }
              />
            </label>
            <span className="muted">Septasync activo durante la sesión (volumen independiente).</span>
          </div>

          <div className="audio-tools">
            <button
              type="button"
              className="secondary"
              onClick={() => setManualConfigOpen((prev) => !prev)}
            >
              {manualConfigOpen ? "Ocultar manual" : "Manual"}
            </button>
          </div>

          <div className="audio-tools">
            <button className="secondary" onClick={runAudioCheck}>
              Chequear audios
            </button>
            <button className="secondary" onClick={previewAudio}>
              Probar audio
            </button>
            <button className="ghost" onClick={resetConfig}>
              Resetear ajustes
            </button>
            <span className="muted">
              Ajusta el volumen antes de iniciar la sesión.
            </span>
            {audioStatus === "loading" && (
              <span className="muted">Preparando audio…</span>
            )}
            {audioStatus === "error" && (
              <span className="muted">No se pudo cargar el audio.</span>
            )}
            {audioCheckMessage && (
              <span className="muted">{audioCheckMessage}</span>
            )}
          </div>
        </section>

        {manualConfigOpen && (
          <section ref={manualSectionRef} className="card practice-screen practice-section practice-section-manual-card">
            <div className="manual-head">
              <p className="eyebrow">Ajustes finos</p>
              <h3>Manual</h3>
            </div>
            <div className="form-grid practice-section-manual manual-config-grid">
              <label>
                Respiraciones por ciclo
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={config.breathsPerCycle}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      breathsPerCycle: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                Inhalar (segundos)
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.inhaleSeconds}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      inhaleSeconds: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                Exhalar (segundos)
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.exhaleSeconds}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      exhaleSeconds: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                Recuperación (segundos)
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={config.recoverySeconds}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      recoverySeconds: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                Ciclos
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={config.cycles}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      cycles: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label className="span-full">
                Volumen inhala / exhala
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.breathCueVolume}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      breathCueVolume: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label className="span-full">
                Volumen audio apnea
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.audioVolume}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      audioVolume: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label className="span-full">
                Reverb audio apnea
                <div className="preset-row">
                  {REVERB_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`chip ${config.reverbMode === option.id ? "active" : ""}`}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          reverbMode: option.id
                        }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.reverbMix}
                  disabled={config.reverbMode === "off"}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      reverbMix: Number(event.target.value)
                    }))
                  }
                />
                <span className="muted">
                  {config.reverbMode === "camera"
                    ? "Modo camara: reverb mas notorio."
                    : config.reverbMode === "soft"
                      ? "Modo suave: reverb ligero."
                      : "Off: sin reverb."}
                </span>
              </label>
            </div>
            <button type="button" className="ghost manual-close" onClick={() => setManualConfigOpen(false)}>
              Ocultar manual
            </button>
          </section>
        )}

        {phase === "complete" && (
          <section className="card practice-screen practice-section practice-section-progress">
            <h3>Seguimiento local</h3>
            <div className="stats-grid">
              <div>
                <span>Sesiones totales</span>
                <strong>{progress.totalSessions || 0}</strong>
              </div>
              <div>
                <span>Respiraciones totales</span>
                <strong>{progress.totalBreaths || 0}</strong>
              </div>
              <div>
                <span>Racha</span>
                <strong>{progress.streak || 0} días</strong>
              </div>
              <div>
                <span>Última sesión</span>
                <strong>{progress.lastSessionDate || "-"}</strong>
              </div>
              <div>
                <span>Última apnea</span>
                <strong>{progress.lastApneaSeconds || 0}s</strong>
              </div>
            </div>
            {progress.lastSummary && (
              <div className="summary">
                Última sesión: {progress.lastSummary.cycles} ciclos / {progress.lastSummary.breaths} respiraciones / apnea {progress.lastSummary.apneaSeconds || 0}s
              </div>
            )}
            {progress.apneaHistory && progress.apneaHistory.length > 0 && (
              <div className="history">
                <div className="history-title">Historial de apnea</div>
                <div className="history-list">
                  {progress.apneaHistory.map((entry, index) => (
                    <div key={`${entry.timestamp || entry.date}-${index}`} className="history-item">
                      <span>{entry.date}</span>
                      <strong>
                        {Array.isArray(entry.rounds) && entry.rounds.length
                          ? entry.rounds.map(formatDurationClock).join(" · ")
                          : formatDurationClock(entry.seconds || 0)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <input
        ref={replaceInputRef}
        className="hidden-input"
        type="file"
        accept="audio/*"
        onChange={(event) => handleAdminReplace(event.target.files?.[0] || null)}
      />
    </div>
  );
}
