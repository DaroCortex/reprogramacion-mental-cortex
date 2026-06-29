import { readAppSettings, readStudents, writeStudents } from "../../lib/r2.js";
import {
  createSessionForStudent,
  getPasswordHash,
  normalizeEmail,
  setSessionCookie,
  verifyPassword
} from "../../lib/student-auth.js";
import { buildAuthenticatedStudent } from "../students.js";

const genericUnauthorized = (res) => res.status(401).json({ error: "Email o contraseña incorrectos" });

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !password) return genericUnauthorized(res);

    const [students, appSettings] = await Promise.all([readStudents(), readAppSettings()]);
    const index = students.findIndex((student) => normalizeEmail(student.email) === email);
    if (index < 0) return genericUnauthorized(res);

    const current = students[index];
    const ok = await verifyPassword(password, getPasswordHash(current));
    if (!ok) return genericUnauthorized(res);

    const session = createSessionForStudent(current);
    const nextStudents = students.slice();
    nextStudents[index] = session.student;
    await writeStudents(nextStudents);
    setSessionCookie(res, session.token, session.expiresAt);
    return res.status(200).json({
      student: buildAuthenticatedStudent(session.student, appSettings),
      session: {
        token: session.token,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    console.error("student login error:", error);
    return res.status(500).json({ error: "No se pudo iniciar sesión" });
  }
}
