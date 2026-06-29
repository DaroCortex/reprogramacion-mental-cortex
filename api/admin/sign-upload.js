import { readStudents, signPutUrl } from "../../lib/r2.js";
import { verifyAdminPassword, verifyEditorPassword } from "../../lib/auth.js";

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
      const isEditorUpload =
        scope === "editor-final" ||
        scope === "editor-beginner" ||
        scope === "editor-beginner-alt" ||
        scope === "editor-raw";
      const isAdmin = await verifyAdminPassword(password);
      const canUpload = isEditorUpload
        ? isAdmin || (await verifyEditorPassword(password))
        : isAdmin;
      if (!canUpload) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (isEditorUpload) {
        const students = await readStudents();
        const student = students.find((item) => item.slug === safeSlug);
        if (!student) {
          return res.status(404).json({ error: "Estudiante no encontrado" });
        }
        if (scope === "editor-beginner") {
          prefix = `student-beginner/${safeSlug}`;
        } else if (scope === "editor-beginner-alt") {
          prefix = `student-beginner-alt/${safeSlug}`;
        } else if (scope === "editor-raw") {
          prefix = `student-legacy-raw/${safeSlug}`;
        } else {
          prefix = `student-edited/${safeSlug}`;
        }
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
