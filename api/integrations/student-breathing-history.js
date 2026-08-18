import { timingSafeEqual } from "node:crypto";
import { buildBreathingHistory } from "../../lib/breathing-history.js";
import { readStudents } from "../../lib/r2.js";
import { normalizeEmail } from "../../lib/student-auth.js";

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const normalizeName = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const bearerToken = (req) => {
  const authorization = String(req.headers.authorization || "").trim();
  if (/^Bearer\s+/i.test(authorization)) return authorization.replace(/^Bearer\s+/i, "").trim();
  return String(req.headers["x-integration-key"] || "").trim();
};

const findStudent = (students, identity) => {
  const slug = String(identity.slug || "").trim();
  const email = normalizeEmail(identity.email);
  const name = normalizeName(identity.name);

  if (slug) {
    const bySlug = students.find((student) => String(student?.slug || "").trim() === slug);
    if (bySlug) return bySlug;
  }
  if (email) {
    const byEmail = students.find((student) => normalizeEmail(student?.email) === email);
    if (byEmail) return byEmail;
  }
  if (name) {
    const matches = students.filter((student) => normalizeName(student?.name) === name);
    if (matches.length === 1) return matches[0];
  }
  return null;
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const integrationKey = String(process.env.RM_USAGE_INTEGRATION_KEY || "").trim();
    if (!integrationKey) {
      return res.status(503).json({ error: "Integracion no configurada" });
    }
    if (!safeEqual(bearerToken(req), integrationKey)) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const identity = req.body && typeof req.body === "object" ? req.body : {};
    const slug = String(identity.slug || "").trim();
    const email = normalizeEmail(identity.email);
    const name = normalizeName(identity.name);
    if (!slug && !email && !name) {
      return res.status(400).json({ error: "Falta identidad del alumno" });
    }

    const students = await readStudents();
    const student = findStudent(students, { slug, email, name });
    if (!student) {
      return res.status(200).json({ ok: true, studentExists: false });
    }

    return res.status(200).json({
      ok: true,
      studentExists: true,
      slug: String(student.slug || "").trim(),
      history: buildBreathingHistory(student.usage || {})
    });
  } catch (error) {
    console.error("student breathing history error:", error);
    return res.status(500).json({ error: "No se pudo consultar el historial de respiraciones" });
  }
}

