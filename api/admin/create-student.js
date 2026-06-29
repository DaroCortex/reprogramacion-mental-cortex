import crypto from "crypto";
import { readAppSettings, readStudents, writeStudents, uploadObject } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import { buildAudioKey, optimizeAudioBuffer } from "../../lib/audio-optimizer.js";
import { normalizeEmail } from "../../lib/student-auth.js";

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

    const {
      password,
      name,
      fileName,
      audioBase64,
      contentType,
      audioKey,
      email,
      requestAudio,
      requestType,
      requestLabel,
      requestSource,
      sourceExternalId,
      sourceSystem
    } = req.body || {};
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
    const safeRequestType = String(requestType || (requestAudio ? "student-audio" : "")).trim();
    const safeRequestLabel = String(
      requestLabel ||
        (safeRequestType === "special-binaural"
          ? "Pedido especial binaural"
          : safeRequestType === "student-audio" || requestAudio
            ? "Audio de estudiante"
            : "")
    ).trim();
    const safeRequestSource = String(
      requestSource || (safeRequestType === "special-binaural" ? "special" : requestAudio ? "admin" : "")
    ).trim();
    const safeSourceExternalId = String(sourceExternalId || "").trim();
    const safeSourceSystem = String(sourceSystem || (safeSourceExternalId ? "formulario-cortex" : "")).trim();
    const safeEmail = normalizeEmail(email);

    if (!key && fileName && audioBase64) {
      const inputBuffer = Buffer.from(String(audioBase64), "base64");
      const optimized = await optimizeAudioBuffer({ inputBuffer, fileName });
      key = buildAudioKey(fileName, optimized.extension || "mp3");
      await uploadObject(key, optimized.buffer, optimized.contentType || contentType);
      optimization = optimized.optimization;
    }

    const [students, appSettings] = await Promise.all([readStudents(), readAppSettings()]);
    const mergeExistingStudent = async (existingIndex, matchReason) => {
      const current = students[existingIndex];
      const nowIso = new Date().toISOString();
      const nextStudent = {
        ...current,
        email: current.email || safeEmail,
        source: safeSourceExternalId
          ? {
              ...(current.source || {}),
              system: safeSourceSystem,
              externalId: safeSourceExternalId
            }
          : current.source,
        updatedAt: nowIso
      };
      const changed = JSON.stringify(nextStudent) !== JSON.stringify(current);
      if (changed) {
        const next = students.slice();
        next[existingIndex] = nextStudent;
        await writeStudents(next);
      }
      return res.status(200).json({
        student: nextStudent,
        optimization: null,
        existing: true,
        match: matchReason
      });
    };

    if (safeSourceExternalId) {
      const sourceMatches = students
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
          const source = item?.source || item?.externalSource || {};
          const externalId = String(source.externalId || source.sourceExternalId || "").trim();
          const system = String(source.system || source.sourceSystem || "").trim();
          return externalId === safeSourceExternalId && system === safeSourceSystem;
        });
      const preferredSourceMatch =
        safeEmail && sourceMatches.find(({ item }) => normalizeEmail(item.email) === safeEmail);
      const existingIndex = (preferredSourceMatch || sourceMatches[0])?.index ?? -1;
      if (existingIndex >= 0) {
        return mergeExistingStudent(existingIndex, "sourceExternalId");
      }
    }

    if (safeEmail) {
      const existingByEmailIndex = students.findIndex((item) => normalizeEmail(item.email) === safeEmail);
      if (existingByEmailIndex >= 0) {
        return mergeExistingStudent(existingByEmailIndex, "email");
      }
    }

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
      email: safeEmail,
      tokenLoginEnabled: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastAudioAccessAt: hasUploadedAudio ? nowIso : "",
      studentType: safeRequestType === "special-binaural" ? "special-binaural" : "academy",
      ...(safeSourceExternalId
        ? {
            source: {
              system: safeSourceSystem,
              externalId: safeSourceExternalId
            }
          }
        : {}),
      audioWorkflow: {
        status: workflowStatus,
        requestedAt: requestAudio && !hasUploadedAudio ? nowIso : "",
        requestType: safeRequestType,
        requestLabel: safeRequestLabel,
        requestSource: safeRequestSource,
        rawAudioKey: "",
        rawFileName: "",
        rawSource: "",
        rawUploadedAt: "",
        submittedAt: "",
        beginnerAudioKey: hasUploadedAudio ? key : "",
        beginnerFileName: hasUploadedAudio ? String(fileName || "audio-principiante") : "",
        beginnerEditedAt: hasUploadedAudio ? nowIso : "",
        beginnerAltAudioKey: "",
        beginnerAltFileName: "",
        beginnerAltEditedAt: "",
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
