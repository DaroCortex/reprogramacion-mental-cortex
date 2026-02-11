import { readStudents, writeStudents } from "../lib/r2.js";

const clampNumber = (value, min, max, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
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
  return {
    completedRounds,
    plannedRounds,
    breathsPerCycle,
    apneaByRound,
    completedAt: completedAtIso
  };
};

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { slug, token, session } = req.body || {};
      const safeSlug = String(slug || "").trim();
      const safeToken = String(token || "").trim();
      if (!safeSlug || !safeToken || !session) {
        return res.status(400).json({ error: "Datos incompletos" });
      }

      const students = await readStudents();
      const index = students.findIndex((item) => item.slug === safeSlug);
      if (index < 0) {
        return res.status(404).json({ error: "Estudiante no encontrado" });
      }
      const student = students[index];
      if (String(student.token || "") !== safeToken) {
        return res.status(403).json({ error: "Token inválido" });
      }

      const parsed = normalizeSessionPayload(session);
      const prevUsage = student.usage || {};
      const prevByDay = prevUsage.sessionsByDay || {};
      const dayKey = parsed.completedAt.slice(0, 10);
      const nextByDay = {
        ...prevByDay,
        [dayKey]: clampNumber(prevByDay[dayKey], 0, 9999, 0) + 1
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

      const nextUsage = {
        firstSessionAt: prevUsage.firstSessionAt || parsed.completedAt,
        lastSessionAt: parsed.completedAt,
        totalSessions: clampNumber(prevUsage.totalSessions, 0, 1e9, 0) + 1,
        totalRounds: clampNumber(prevUsage.totalRounds, 0, 1e9, 0) + parsed.completedRounds,
        totalBreaths:
          clampNumber(prevUsage.totalBreaths, 0, 1e9, 0) +
          parsed.completedRounds * parsed.breathsPerCycle,
        sessionsByDay: nextByDay,
        apneaRoundSums: nextSums,
        apneaRoundCounts: nextCounts,
        lastSession: {
          completedRounds: parsed.completedRounds,
          plannedRounds: parsed.plannedRounds,
          breathsPerCycle: parsed.breathsPerCycle,
          apneaByRound: parsed.apneaByRound,
          completedAt: parsed.completedAt
        }
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

    const students = await readStudents();
    const safe = students.map((item) => ({
      name: item.name,
      slug: item.slug
    }));
    return res.status(200).json({ students: safe });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo cargar estudiantes" });
  }
}
