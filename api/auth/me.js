import { readAppSettings, readStudents, writeStudents } from "../../lib/r2.js";
import { findStudentBySession, touchStudentSession } from "../../lib/student-auth.js";
import { buildAuthenticatedStudent } from "../students.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const [students, appSettings] = await Promise.all([readStudents(), readAppSettings()]);
    const sessionAuth = findStudentBySession(students, req);
    if (!sessionAuth) {
      return res.status(401).json({ error: "Sesión requerida" });
    }

    const nextStudents = students.slice();
    const nextStudent = touchStudentSession(sessionAuth.student, sessionAuth.tokenHash);
    nextStudents[sessionAuth.index] = nextStudent;
    await writeStudents(nextStudents);
    return res.status(200).json({
      student: buildAuthenticatedStudent(nextStudent, appSettings)
    });
  } catch (error) {
    console.error("student me error:", error);
    return res.status(500).json({ error: "No se pudo cargar la sesión" });
  }
}
