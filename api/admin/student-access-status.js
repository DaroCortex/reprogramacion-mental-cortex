import { readStudents } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import { hasPassword, normalizeEmail } from "../../lib/student-auth.js";

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
      return res.status(200).json({
        ok: true,
        studentExists: false,
        hasPassword: false,
        email,
        slug
      });
    }

    return res.status(200).json({
      ok: true,
      studentExists: true,
      hasPassword: hasPassword(student),
      email: normalizeEmail(student.email),
      slug: String(student.slug || "").trim()
    });
  } catch (error) {
    console.error("student access status error:", error);
    return res.status(500).json({ error: "No se pudo consultar el acceso" });
  }
}
