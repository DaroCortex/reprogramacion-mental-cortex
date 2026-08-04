const DIRECT_ACCESS_SLUG = "borja-garcia-calvo";
const DIRECT_ACCESS_DAYS = 30;
const DIRECT_ACCESS_WINDOW_MS = DIRECT_ACCESS_DAYS * 24 * 60 * 60 * 1000;

const parseTimestamp = (value) => {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isDirectAccessSlug = (slug) =>
  String(slug || "").trim().toLowerCase() === DIRECT_ACCESS_SLUG;

const isDirectAccessExpired = (student = {}, now = Date.now()) => {
  if (!isDirectAccessSlug(student.slug)) return false;
  const expiresAt = parseTimestamp(student?.auth?.directAccess?.expiresAt);
  return Boolean(expiresAt && Number(now) >= expiresAt);
};

const activateDirectAccess = (student = {}, now = Date.now()) => {
  if (!isDirectAccessSlug(student.slug)) {
    return { ok: false, reason: "not-eligible", student };
  }

  const safeNow = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const auth = student.auth && typeof student.auth === "object" ? student.auth : {};
  const stored = auth.directAccess && typeof auth.directAccess === "object"
    ? auth.directAccess
    : {};
  const storedStartedAt = parseTimestamp(stored.startedAt);
  const storedExpiresAt = parseTimestamp(stored.expiresAt);
  const startedAtMs = storedStartedAt || safeNow;
  const expiresAtMs = storedExpiresAt || (startedAtMs + DIRECT_ACCESS_WINDOW_MS);
  const startedAt = new Date(startedAtMs).toISOString();
  const expiresAt = new Date(expiresAtMs).toISOString();

  if (safeNow >= expiresAtMs) {
    return {
      ok: false,
      reason: "expired",
      startedAt,
      expiresAt,
      student
    };
  }

  const nowIso = new Date(safeNow).toISOString();
  const changed = !storedStartedAt || !storedExpiresAt;
  return {
    ok: true,
    changed,
    startedAt,
    expiresAt,
    student: {
      ...student,
      auth: {
        ...auth,
        directAccess: {
          startedAt,
          expiresAt,
          lastUsedAt: nowIso
        }
      },
      updatedAt: nowIso
    }
  };
};

export {
  DIRECT_ACCESS_DAYS,
  DIRECT_ACCESS_SLUG,
  DIRECT_ACCESS_WINDOW_MS,
  activateDirectAccess,
  isDirectAccessExpired,
  isDirectAccessSlug
};
