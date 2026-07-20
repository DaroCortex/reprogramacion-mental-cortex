import { readStudents, uploadObject, writeStudents } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import { hasPassword, normalizeEmail } from "../../lib/student-auth.js";
import {
  ADVANCED_UNLOCK_POLICIES,
  getAdvancedAccessInfo,
  hadAdvancedEnabledBeforeMigration,
  normalizeAdvancedUnlockPolicy
} from "../../lib/beginner-progress.js";

const PUBLIC_AUDIO_SLUGS = new Set([
  "respira",
  "bosq",
  "inala",
  "oceano",
  "balance",
  "gamma",
  "trance"
]);

const isSystemAudioAsset = (student) => PUBLIC_AUDIO_SLUGS.has(String(student?.slug || "").trim());

const classifyStudent = (student) => {
  const workflow = student?.audioWorkflow || {};
  const advancedInfo = getAdvancedAccessInfo({
    ...student,
    advancedUnlockPolicy: ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS
  });
  const hadAdvancedEnabled = hadAdvancedEnabledBeforeMigration(student, workflow);
  const policy = hadAdvancedEnabled && advancedInfo.advancedAudioReady
    ? ADVANCED_UNLOCK_POLICIES.LEGACY_IMMEDIATE
    : ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS;
  const reason = policy === ADVANCED_UNLOCK_POLICIES.LEGACY_IMMEDIATE
    ? "advanced-enabled-before-migration"
    : !advancedInfo.submittedPersonalAudio
      ? "missing-recording"
      : !advancedInfo.advancedAudioReady
        ? "advanced-not-ready"
        : "requires-seven-beginner-days";

  return {
    policy,
    reason,
    hadAdvancedEnabled,
    recordingReceived: advancedInfo.submittedPersonalAudio,
    beginnerReady: advancedInfo.beginnerReady,
    advancedReady: advancedInfo.advancedAudioReady,
    completedBeginnerDays: advancedInfo.completedDays
  };
};

const buildReport = (students) => {
  const systemAssets = students.filter(isSystemAudioAsset).map((student) => student.slug);
  const rows = students.filter((student) => !isSystemAudioAsset(student)).map((student) => {
    const classification = classifyStudent(student);
    const currentPolicy = normalizeAdvancedUnlockPolicy(student.advancedUnlockPolicy);
    return {
      slug: student.slug,
      name: student.name,
      email: normalizeEmail(student.email),
      hasEmail: Boolean(normalizeEmail(student.email)),
      hasPassword: hasPassword(student),
      currentPolicy,
      ...classification,
      policy: currentPolicy || classification.policy
    };
  });
  return {
    totalStudents: rows.length,
    systemAssetCount: systemAssets.length,
    systemAssets,
    alreadyMigrated: rows.filter((row) => row.currentPolicy).length,
    legacyImmediate: rows.filter((row) => row.policy === ADVANCED_UNLOCK_POLICIES.LEGACY_IMMEDIATE).length,
    afterSevenDays: rows.filter((row) => row.policy === ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS).length,
    missingRecording: rows.filter((row) => !row.recordingReceived).length,
    advancedReady: rows.filter((row) => row.advancedReady).length,
    withEmail: rows.filter((row) => row.hasEmail).length,
    missingEmail: rows.filter((row) => !row.hasEmail).length,
    withPassword: rows.filter((row) => row.hasPassword).length,
    needsPassword: rows.filter((row) => !row.hasPassword).length,
    rows
  };
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    if (!(await verifyAdminPassword(req.body?.password))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const mode = String(req.body?.mode || "dry-run").trim();
    if (mode !== "dry-run" && mode !== "apply") {
      return res.status(400).json({ error: "Modo invalido" });
    }

    const students = await readStudents();
    const before = buildReport(students);
    if (mode === "dry-run") {
      return res.status(200).json({ ok: true, mode, report: before });
    }

    const nowIso = new Date().toISOString();
    const backupKey = `backups/students-before-advanced-policy-${nowIso.replace(/[:.]/g, "-")}.json`;
    await uploadObject(
      backupKey,
      Buffer.from(JSON.stringify({ students }, null, 2), "utf8"),
      "application/json"
    );

    let changed = 0;
    const nextStudents = students.map((student) => {
      if (isSystemAudioAsset(student)) return student;
      const existingPolicy = normalizeAdvancedUnlockPolicy(student.advancedUnlockPolicy);
      if (existingPolicy) return student;
      const classification = classifyStudent(student);
      changed += 1;
      return {
        ...student,
        advancedUnlockPolicy: classification.policy,
        advancedUnlockPolicyReason: classification.reason,
        advancedUnlockPolicyMigratedAt: nowIso
      };
    });

    if (changed > 0) await writeStudents(nextStudents);
    return res.status(200).json({
      ok: true,
      mode,
      changed,
      backupKey,
      report: buildReport(nextStudents)
    });
  } catch (error) {
    console.error("migrate-advanced-access error:", error);
    return res.status(500).json({
      error: "No se pudo migrar la politica de Advanced",
      detail: error?.message || "error"
    });
  }
}

export { buildReport, classifyStudent, isSystemAudioAsset };
