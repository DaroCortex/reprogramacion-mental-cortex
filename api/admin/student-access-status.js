import { readStudents } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import { resolveStudentOperationalStatus } from "../../lib/student-operational-status.js";
import { normalizeEmail } from "../../lib/student-auth.js";

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
    return res.status(200).json({
      ok: true,
      ...resolveStudentOperationalStatus(students, { slug, email })
    });
  } catch (error) {
    console.error("student access status error:", error);
    return res.status(500).json({ error: "No se pudo consultar el acceso" });
  }
}
