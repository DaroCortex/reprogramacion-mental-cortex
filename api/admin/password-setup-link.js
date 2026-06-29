import { readStudents, writeStudents } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import {
  createOneTimeToken,
  normalizeEmail,
  redactStudentAuth
} from "../../lib/student-auth.js";

const getBaseUrl = (req) => {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const proto = forwardedProto || "https";
  const host = String(req.headers.host || "rm.academiacortex.com.ar").trim();
  return `${proto}://${host}`;
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const password = String(req.body?.password || "");
    if (!(await verifyAdminPassword(password))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const slug = String(req.body?.slug || "").trim();
    const email = normalizeEmail(req.body?.email);
    const students = await readStudents();
    const index = students.findIndex((student) =>
      slug ? student.slug === slug : email ? normalizeEmail(student.email) === email : false
    );
    if (index < 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    const generated = createOneTimeToken(students[index], "passwordSetup", 72);
    const nextStudents = students.slice();
    nextStudents[index] = generated.student;
    await writeStudents(nextStudents);
    const setupUrl = `${getBaseUrl(req)}/set-password?token=${encodeURIComponent(generated.token)}`;
    return res.status(200).json({
      ok: true,
      setupUrl,
      student: redactStudentAuth(generated.student)
    });
  } catch (error) {
    console.error("password setup link error:", error);
    return res.status(500).json({ error: "No se pudo generar el link" });
  }
}
