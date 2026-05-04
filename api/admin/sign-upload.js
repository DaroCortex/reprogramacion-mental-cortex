import { readStudents, signPutUrl } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";

const sanitizeFileName = (fileName) =>
  String(fileName || "audio")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "") || "audio";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { password, fileName, scope = "admin", slug, token } = req.body || {};
    if (!fileName) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const safeName = sanitizeFileName(fileName);
    const safeSlug = String(slug || "").trim();
    let prefix = "audios";

    if (scope === "student-raw") {
      const safeToken = String(token || "").trim();
      const students = await readStudents();
      const student = students.find((item) => item.slug === safeSlug);
      if (!student || !safeToken || String(student.token || "") !== safeToken) {
        return res.status(403).json({ error: "Token inválido" });
      }
      prefix = `student-submissions/${safeSlug}`;
    } else {
      if (!(await verifyAdminPassword(password))) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (scope === "editor-final") {
        const students = await readStudents();
        const student = students.find((item) => item.slug === safeSlug);
        if (!student) {
          return res.status(404).json({ error: "Estudiante no encontrado" });
        }
        prefix = `student-edited/${safeSlug}`;
      }
    }

    const key = `${prefix}/${Date.now()}-${safeName}`;
    const uploadUrl = await signPutUrl(key);
    return res.status(200).json({ key, uploadUrl });
  } catch (error) {
    console.error("sign-upload error:", error);
    return res.status(500).json({ error: "No se pudo firmar la subida", detail: error?.message || "error" });
  }
}
