import crypto from "node:crypto";
import { loadDaily, saveDaily } from "../../lib/daily.js";
import { buildReportPlanPayload } from "../../lib/report-plan.js";
import { readStudents } from "../../lib/r2.js";
import { normalizeEmail } from "../../lib/student-auth.js";

const secretsMatch = (provided, expected) => {
  const left = Buffer.from(String(provided || ""));
  const right = Buffer.from(String(expected || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const resolveStudent = ({ students, submissionId, email }) => {
  const safeSubmissionId = String(submissionId || "").trim();
  const sourceMatches = students.filter((student) => {
    const source = student?.source || {};
    const system = String(source.system || "").trim();
    const externalId = String(source.externalId || source.sourceExternalId || "").trim();
    return system === "formulario-cortex" && externalId === safeSubmissionId;
  });
  if (sourceMatches.length === 1) return sourceMatches[0];
  if (sourceMatches.length > 1) {
    throw Object.assign(new Error("Origen de formulario ambiguo"), { status: 409 });
  }

  const safeEmail = normalizeEmail(email);
  const emailMatches = students.filter(
    (student) => normalizeEmail(student?.email) === safeEmail
  );
  if (emailMatches.length === 1) return emailMatches[0];
  if (emailMatches.length > 1) {
    throw Object.assign(new Error("Email de alumno ambiguo"), { status: 409 });
  }
  return null;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo no permitido" });
  }

  const expectedSecret = String(process.env.FORM_REPORT_SYNC_SECRET || "");
  const authorization = String(req.headers.authorization || "");
  const providedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!expectedSecret || !secretsMatch(providedSecret, expectedSecret)) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const submissionId = String(req.body?.submissionId || "").trim();
    const email = normalizeEmail(req.body?.studentEmail);
    const reportGeneratedAt = String(req.body?.reportGeneratedAt || "").trim();
    const checks = req.body?.checks;
    if (!submissionId || !email || !Array.isArray(checks)) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const students = await readStudents();
    const student = resolveStudent({ students, submissionId, email });
    if (!student) {
      return res.status(404).json({ error: "Alumno no encontrado" });
    }

    const current = await loadDaily(student.slug);
    const { payload, unchanged } = buildReportPlanPayload({
      student,
      current,
      submissionId,
      reportGeneratedAt,
      rawChecks: checks
    });
    if (!unchanged) {
      await saveDaily(student.slug, payload);
    }

    return res.status(200).json({
      ok: true,
      slug: student.slug,
      checkCount: payload.templates.length,
      unchanged
    });
  } catch (error) {
    const status = Number(error?.status) || 400;
    return res.status(status).json({
      error: error?.message || "No se pudo sincronizar el plan"
    });
  }
}
