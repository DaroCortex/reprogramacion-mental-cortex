import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt);
const SESSION_COOKIE_NAME = "rm_session";
const SESSION_DAYS = 30;
const TOKEN_BYTES = 32;
const MAX_SESSIONS = 6;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

const hashToken = (value) =>
  crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");

const makeRandomToken = () => crypto.randomBytes(TOKEN_BYTES).toString("base64url");

const getNowIso = () => new Date().toISOString();

const addDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const getStudentAuth = (student = {}) => {
  if (student.auth && typeof student.auth === "object" && !Array.isArray(student.auth)) {
    return student.auth;
  }
  return {};
};

const getPasswordHash = (student = {}) => getStudentAuth(student).passwordHash || student.passwordHash || "";

const hasPassword = (student = {}) => Boolean(getPasswordHash(student));

const hashPassword = async (password) => {
  const clean = String(password || "");
  if (clean.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = await scryptAsync(clean, salt, 64);
  return `scrypt$v1$${salt}$${Buffer.from(derived).toString("base64url")}`;
};

const verifyPassword = async (password, storedHash) => {
  const cleanHash = String(storedHash || "");
  const parts = cleanHash.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt" || parts[1] !== "v1") return false;
  const [, , salt, encoded] = parts;
  const expected = Buffer.from(encoded, "base64url");
  if (!expected.length) return false;
  const actual = await scryptAsync(String(password || ""), salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

const getAuthHeaderToken = (req) => {
  const header = String(req?.headers?.authorization || req?.headers?.Authorization || "").trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
};

const parseCookieHeader = (header) =>
  Object.fromEntries(
    String(header || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index < 0) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );

const getCookieToken = (req) => parseCookieHeader(req?.headers?.cookie)[SESSION_COOKIE_NAME] || "";

const getSessionTokenFromRequest = (req) => getAuthHeaderToken(req) || getCookieToken(req);

const createSessionForStudent = (student) => {
  const token = makeRandomToken();
  const nowIso = getNowIso();
  const expiresAt = addDays(SESSION_DAYS);
  const auth = getStudentAuth(student);
  const previousSessions = Array.isArray(auth.sessions) ? auth.sessions : [];
  const nextSessions = [
    {
      tokenHash: hashToken(token),
      createdAt: nowIso,
      lastUsedAt: nowIso,
      expiresAt
    },
    ...previousSessions
      .filter((session) => Date.parse(session?.expiresAt || "") > Date.now())
      .slice(0, MAX_SESSIONS - 1)
  ];
  return {
    token,
    expiresAt,
    student: {
      ...student,
      auth: {
        ...auth,
        sessions: nextSessions
      },
      updatedAt: nowIso
    }
  };
};

const findStudentBySession = (students = [], req) => {
  const token = getSessionTokenFromRequest(req);
  if (!token) return null;
  const tokenHash = hashToken(token);
  const now = Date.now();
  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const auth = getStudentAuth(student);
    const sessions = Array.isArray(auth.sessions) ? auth.sessions : [];
    const session = sessions.find(
      (item) => item?.tokenHash === tokenHash && Date.parse(item?.expiresAt || "") > now
    );
    if (session) {
      return { student, index, tokenHash, session };
    }
  }
  return null;
};

const touchStudentSession = (student, tokenHash) => {
  if (!tokenHash) return student;
  const auth = getStudentAuth(student);
  const sessions = Array.isArray(auth.sessions) ? auth.sessions : [];
  const nowIso = getNowIso();
  return {
    ...student,
    auth: {
      ...auth,
      sessions: sessions.map((session) =>
        session?.tokenHash === tokenHash ? { ...session, lastUsedAt: nowIso } : session
      )
    }
  };
};

const revokeStudentSession = (student, tokenHash) => {
  if (!tokenHash) return student;
  const auth = getStudentAuth(student);
  return {
    ...student,
    auth: {
      ...auth,
      sessions: Array.isArray(auth.sessions)
        ? auth.sessions.filter((session) => session?.tokenHash !== tokenHash)
        : []
    }
  };
};

const setSessionCookie = (res, token, expiresAt) => {
  const maxAgeSeconds = Math.max(1, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${secure}`
  );
};

const clearSessionCookie = (res) => {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`
  );
};

const createOneTimeToken = (student, fieldPrefix, ttlHours = 24) => {
  const token = makeRandomToken();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  const auth = getStudentAuth(student);
  return {
    token,
    student: {
      ...student,
      auth: {
        ...auth,
        [`${fieldPrefix}TokenHash`]: hashToken(token),
        [`${fieldPrefix}ExpiresAt`]: expiresAt
      },
      updatedAt: getNowIso()
    }
  };
};

const consumeOneTimeToken = (students = [], token, fieldPrefixes = []) => {
  const tokenHash = hashToken(token);
  const now = Date.now();
  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const auth = getStudentAuth(student);
    const matchingPrefix = fieldPrefixes.find((prefix) => {
      const expiresAt = Date.parse(auth?.[`${prefix}ExpiresAt`] || "");
      return auth?.[`${prefix}TokenHash`] === tokenHash && expiresAt > now;
    });
    if (matchingPrefix) {
      return { student, index, prefix: matchingPrefix };
    }
  }
  return null;
};

const redactStudentAuth = (student = {}) => {
  const auth = getStudentAuth(student);
  const { passwordHash: _authPasswordHash, sessions: _sessions, ...safeAuth } = auth;
  const { passwordHash: _passwordHash, ...safeStudent } = student;
  return {
    ...safeStudent,
    auth: {
      ...safeAuth,
      hasPassword: hasPassword(student),
      sessionCount: Array.isArray(auth.sessions) ? auth.sessions.length : 0
    }
  };
};

export {
  SESSION_COOKIE_NAME,
  normalizeEmail,
  isValidEmail,
  hashToken,
  makeRandomToken,
  getNowIso,
  hashPassword,
  verifyPassword,
  hasPassword,
  getPasswordHash,
  getSessionTokenFromRequest,
  createSessionForStudent,
  findStudentBySession,
  touchStudentSession,
  revokeStudentSession,
  setSessionCookie,
  clearSessionCookie,
  createOneTimeToken,
  consumeOneTimeToken,
  redactStudentAuth
};
