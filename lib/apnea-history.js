const normalizeApneaTimes = (session = {}) => {
  const source = Array.isArray(session.apneaByRound)
    ? session.apneaByRound
    : Array.isArray(session.rounds)
      ? session.rounds
      : Number(session.seconds || 0) > 0
        ? [session.seconds]
        : [];

  return source
    .map((value) => Math.max(0, Math.round(Number(value) || 0)))
    .filter((value) => value > 0)
    .slice(0, 10);
};

const sessionDateKey = (session = {}) => {
  const explicitDate = String(session.date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicitDate)) return explicitDate;

  const timestamp = String(
    session.completedAt || session.timestamp || session.startedAt || ""
  ).trim();
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : "";
};

const sessionCompletedAt = (session = {}) => {
  const parsed = Date.parse(
    session.completedAt || session.timestamp || session.startedAt || ""
  );
  return Number.isFinite(parsed) ? parsed : 0;
};

const sameTimes = (left = [], right = []) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const areEquivalentApneaSessions = (localSession, serverSession, toleranceMs = 30_000) => {
  const localDate = sessionDateKey(localSession);
  const serverDate = sessionDateKey(serverSession);
  if (!localDate || localDate !== serverDate) return false;

  const localTimes = normalizeApneaTimes(localSession);
  const serverTimes = normalizeApneaTimes(serverSession);
  if (!localTimes.length || !sameTimes(localTimes, serverTimes)) return false;

  const localCompletedAt = sessionCompletedAt(localSession);
  const serverCompletedAt = sessionCompletedAt(serverSession);
  if (!localCompletedAt || !serverCompletedAt) return true;

  return Math.abs(localCompletedAt - serverCompletedAt) <= toleranceMs;
};

const filterUnsyncedLocalApneaSessions = (localSessions = [], serverSessions = []) =>
  localSessions.filter(
    (localSession) =>
      !serverSessions.some((serverSession) =>
        areEquivalentApneaSessions(localSession, serverSession)
      )
  );

export {
  areEquivalentApneaSessions,
  filterUnsyncedLocalApneaSessions,
  normalizeApneaTimes,
  sessionDateKey
};
