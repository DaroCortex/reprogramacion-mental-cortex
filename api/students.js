import { readAppSettings, readStudents, writeStudents } from "../lib/r2.js";

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
    apneaByRound,
    completedAt: completedAtIso,
    colorVision
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
        lastSession: {
          sessionType: parsed.sessionType,
          flowStage: parsed.flowStage,
          completedRounds: parsed.completedRounds,
          plannedRounds: parsed.plannedRounds,
          breathsPerCycle: parsed.breathsPerCycle,
          apneaByRound: parsed.apneaByRound,
          completedAt: parsed.completedAt,
          colorVision: parsed.colorVision
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

    const [students, appSettings] = await Promise.all([readStudents(), readAppSettings()]);
    const safe = students.map((item) => ({
      name: item.name,
      slug: item.slug,
      features: {
        colorVisionEnabled: Boolean(item?.features?.colorVisionEnabled),
        magicUnlockScore: clampNumber(item?.features?.magicUnlockScore, 60, 98, appSettings.magicUnlockScore)
      }
    }));
    return res.status(200).json({ students: safe });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo cargar estudiantes" });
  }
}
