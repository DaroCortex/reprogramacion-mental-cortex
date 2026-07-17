import { readStudents } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import { hasPassword, normalizeEmail } from "../../lib/student-auth.js";
import { deriveStudentSupportPassword } from "../../lib/student-support-credential.js";

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
    if (!slug && !email) {
      return res.status(400).json({ error: "Falta slug o email" });
    }

    const students = await readStudents();
    const student = slug
      ? students.find((item) => String(item?.slug || "").trim() === slug)
      : students.find((item) => email && normalizeEmail(item?.email) === email);
    if (!student) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }
    if (!hasPassword(student)) {
      return res.status(409).json({ error: "El alumno todavia no creo su contraseña" });
    }

    return res.status(200).json({
      ok: true,
      email: normalizeEmail(student.email),
      slug: String(student.slug || "").trim(),
      credentialPassword: deriveStudentSupportPassword(student),
      credentialMode: "support"
    });
  } catch (error) {
    console.error("admin student credentials error:", error);
    return res.status(500).json({ error: "No se pudieron obtener las credenciales" });
  }
}
