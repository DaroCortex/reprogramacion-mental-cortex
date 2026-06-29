import { readStudents, writeStudents } from "../../lib/r2.js";
import {
  clearSessionCookie,
  findStudentBySession,
  revokeStudentSession
} from "../../lib/student-auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const students = await readStudents();
    const sessionAuth = findStudentBySession(students, req);
    if (sessionAuth) {
      const nextStudents = students.slice();
      nextStudents[sessionAuth.index] = revokeStudentSession(sessionAuth.student, sessionAuth.tokenHash);
      await writeStudents(nextStudents);
    }
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("student logout error:", error);
    return res.status(500).json({ error: "No se pudo cerrar sesión" });
  }
}
