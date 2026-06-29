import { readStudents } from "../../lib/r2.js";
import { verifyAdminPassword, verifyEditorPassword } from "../../lib/auth.js";
import { redactStudentAuth } from "../../lib/student-auth.js";

export default async function handler(req, res) {
  try {
    const password = String(req.query.password || "").trim();
    const isAdmin = await verifyAdminPassword(password);
    const isEditor = isAdmin || (await verifyEditorPassword(password));
    if (!isEditor) {
      return res.status(401).json({ error: "No autorizado" });
    }
    const students = await readStudents();
    const safeEditorStudents = students.map((student) => ({
      name: student.name,
      slug: student.slug,
      createdAt: student.createdAt || "",
      updatedAt: student.updatedAt || "",
      audioWorkflow: student.audioWorkflow || {}
    }));
    return res.status(200).json({
      role: isAdmin ? "admin" : "editor",
      students: isAdmin ? students.map(redactStudentAuth) : safeEditorStudents
    });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo cargar estudiantes" });
  }
}
