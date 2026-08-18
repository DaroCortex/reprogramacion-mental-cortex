const clampNumber = (value, min, max, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeDateKey = (value) => {
  const key = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : "";
};

const argentinaDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);

const shiftDateKey = (dateKey, offsetDays) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const safeApneas = (session = {}) =>
  (Array.isArray(session.apneaByRound) ? session.apneaByRound : [])
    .slice(0, 10)
    .map((seconds) => clampNumber(seconds, 0, 36000, 0))
    .filter((seconds) => seconds > 0);

const isBreathingSession = (session = {}) => {
  const type = String(session.sessionType || "breathing").trim().toLowerCase();
  if (["color-vision", "color_vision", "colorvision"].includes(type)) return false;
  return Boolean(
    clampNumber(session.completedRounds, 0, 50, 0) ||
      clampNumber(session.breathsDoneTotal, 0, 100000, 0) ||
      safeApneas(session).length
  );
};

const buildRecentSession = (session = {}) => ({
  completedAt: String(session.completedAt || ""),
  startedAt: String(session.startedAt || ""),
  date: normalizeDateKey(session.date),
  durationSeconds: clampNumber(session.durationSeconds, 0, 86400, 0),
  completedRounds: clampNumber(session.completedRounds, 0, 50, 0),
  plannedRounds: clampNumber(session.plannedRounds, 0, 50, 0),
  breathsDoneTotal: clampNumber(session.breathsDoneTotal, 0, 100000, 0),
  apneaByRound: safeApneas(session),
  flowStage: String(session.flowStage || ""),
  partial: Boolean(session.partial),
  manualStop: Boolean(session.manualStop)
});

const sessionsInWindow = (sessionsByDay, startDateKey) =>
  Object.entries(sessionsByDay || {}).reduce((total, [dateKey, count]) => {
    if (!normalizeDateKey(dateKey) || dateKey < startDateKey) return total;
    return total + clampNumber(count, 0, 9999, 0);
  }, 0);

export const buildBreathingHistory = (usage = {}, now = new Date()) => {
  const recentSessions = (Array.isArray(usage.recentSessions) ? usage.recentSessions : [])
    .filter(isBreathingSession)
    .map(buildRecentSession)
    .sort((left, right) =>
      String(right.completedAt || right.date).localeCompare(String(left.completedAt || left.date))
    )
    .slice(0, 12);
  const sessionsByDay = usage.sessionsByDay && typeof usage.sessionsByDay === "object"
    ? usage.sessionsByDay
    : {};
  const apneaByDay = usage.apneaByDay && typeof usage.apneaByDay === "object"
    ? usage.apneaByDay
    : {};
  const apneaTimes = Object.values(apneaByDay).flatMap((entry) => {
    const source = entry && typeof entry === "object" ? entry : {};
    return (Array.isArray(source.times) ? source.times : [])
      .map((seconds) => clampNumber(seconds, 0, 36000, 0))
      .filter((seconds) => seconds > 0);
  });
  const positiveApneas = apneaTimes.length
    ? apneaTimes
    : recentSessions.flatMap((session) => session.apneaByRound).filter((seconds) => seconds > 0);
  const apneaCount = positiveApneas.length;
  const apneaSecondsTotal = positiveApneas.reduce((total, seconds) => total + seconds, 0);
  const bestApneaSeconds = Object.values(apneaByDay).reduce(
    (best, entry) => Math.max(
      best,
      clampNumber(entry && typeof entry === "object" ? entry.best : 0, 0, 36000, 0)
    ),
    positiveApneas.reduce((best, seconds) => Math.max(best, seconds), 0)
  );
  const today = argentinaDateKey(now);

  return {
    totalSessions: clampNumber(usage.totalSessions, 0, 1e9, 0),
    totalRounds: clampNumber(usage.totalRounds, 0, 1e9, 0),
    totalBreaths: clampNumber(usage.totalBreaths, 0, 1e12, 0),
    activeDays: Object.entries(sessionsByDay).filter(
      ([dateKey, count]) => normalizeDateKey(dateKey) && clampNumber(count, 0, 9999, 0) > 0
    ).length,
    sessionsLast7Days: sessionsInWindow(sessionsByDay, shiftDateKey(today, -6)),
    sessionsLast30Days: sessionsInWindow(sessionsByDay, shiftDateKey(today, -29)),
    apneaCount,
    averageApneaSeconds: apneaCount > 0 ? Math.round(apneaSecondsTotal / apneaCount) : 0,
    bestApneaSeconds,
    firstSessionAt: String(usage.firstSessionAt || ""),
    lastSessionAt: String(usage.lastSessionAt || ""),
    lastActivityAt: String(usage.lastActivityAt || ""),
    recentSessions
  };
};
