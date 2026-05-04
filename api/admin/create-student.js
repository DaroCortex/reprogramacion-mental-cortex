import crypto from "crypto";
import { readAppSettings, readStudents, writeStudents, uploadObject } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import { buildAudioKey, optimizeAudioBuffer } from "../../lib/audio-optimizer.js";

const BEGINNER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();

const uniqueSlug = (name, existing) => {
  const base = slugify(name || "");
  const safeBase = base || "estudiante";
  let slug = safeBase;
  let counter = 2;
  const taken = new Set(existing.map((item) => item.slug));
  while (taken.has(slug)) {
    slug = `${safeBase}-${counter}`;
    counter += 1;
  }
  return slug;
};

const makeToken = () => crypto.randomBytes(16).toString("hex");

const makeInitialUsage = () => ({
  firstSessionAt: "",
  lastSessionAt: "",
  totalSessions: 0,
  totalRounds: 0,
  totalBreaths: 0,
  sessionsByDay: {},
  apneaRoundSums: [0, 0, 0, 0, 0],
  apneaRoundCounts: [0, 0, 0, 0, 0],
  flowStats: {
    onboarding: 0,
    prePractice: 0,
    practice: 0
  },
  colorVisionUsage: {
    totalSessions: 0,
    totalHits: 0,
    totalMisses: 0,
    totalDetections: 0,
    averageAccuracy: 0,
    lastSessionAt: "",
    lastSession: null
  },
  lastSession: null
});

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { password, name, fileName, audioBase64, contentType, audioKey, requestAudio } = req.body || {};
    if (!(await verifyAdminPassword(password))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if (!name) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    let key = String(audioKey || "").trim();
    let optimization = null;
    const nowIso = new Date().toISOString();
    const hasUploadedAudio = Boolean(key || (fileName && audioBase64));

    if (!key && fileName && audioBase64) {
      const inputBuffer = Buffer.from(String(audioBase64), "base64");
      const optimized = await optimizeAudioBuffer({ inputBuffer, fileName });
      key = buildAudioKey(fileName, optimized.extension || "mp3");
      await uploadObject(key, optimized.buffer, optimized.contentType || contentType);
      optimization = optimized.optimization;
    }

    const [students, appSettings] = await Promise.all([readStudents(), readAppSettings()]);
    const slug = uniqueSlug(name, students);
    const token = makeToken();
    const approvedAt = hasUploadedAudio ? nowIso : "";
    const advancedUnlockAt = hasUploadedAudio ? new Date(Date.now() + BEGINNER_DAYS * DAY_MS).toISOString() : "";
    const workflowStatus = hasUploadedAudio ? "approved" : requestAudio ? "requested" : "pending";

    const student = {
      name,
      audioKey: key,
      slug,
      token,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastAudioAccessAt: hasUploadedAudio ? nowIso : "",
      audioWorkflow: {
        status: workflowStatus,
        requestedAt: requestAudio && !hasUploadedAudio ? nowIso : "",
        rawAudioKey: "",
        rawFileName: "",
        rawSource: "",
        rawUploadedAt: "",
        submittedAt: "",
        beginnerAudioKey: hasUploadedAudio ? key : "",
        beginnerFileName: hasUploadedAudio ? String(fileName || "audio-principiante") : "",
        beginnerEditedAt: hasUploadedAudio ? nowIso : "",
        editorAudioKey: hasUploadedAudio ? key : "",
        editorFileName: hasUploadedAudio ? String(fileName || "audio-aprobado") : "",
        editedAt: hasUploadedAudio ? nowIso : "",
        approvedAt,
        advancedUnlockAt
      },
      usage: makeInitialUsage(),
      features: {
        colorVisionEnabled: false,
        magicUnlockScore: appSettings.magicUnlockScore,
        beginnerReprogrammingEnabled: hasUploadedAudio,
        advancedReprogrammingEnabled: false
      }
    };

    const next = [...students, student];
    await writeStudents(next);
    return res.status(200).json({ student, optimization });
  } catch (error) {
    console.error("create-student error:", error);
    return res.status(500).json({
      error: "No se pudo crear estudiante",
      detail: error?.message || "error"
    });
  }
}
