import { readAppSettings, readStudents, writeStudents } from "../../lib/r2.js";
import {
  activateDirectAccess,
  isDirectAccessSlug
} from "../../lib/student-direct-access.js";
import {
  createSessionForStudent,
  setSessionCookie
} from "../../lib/student-auth.js";
import { hydrateBeginnerTelemetry } from "../../lib/beginner-telemetry.js";
import { buildAuthenticatedStudent } from "../students.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const slug = String(req.body?.slug || "").trim().toLowerCase();
    if (!isDirectAccessSlug(slug)) {
      return res.status(404).json({ error: "Acceso directo no disponible" });
    }

    const [students, appSettings] = await Promise.all([readStudents(), readAppSettings()]);
    const index = students.findIndex((student) => student.slug === slug);
    if (index < 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    const storedStudent = await hydrateBeginnerTelemetry(students[index]);
    if (storedStudent.status === "inactive" || storedStudent.inactive) {
      return res.status(403).json({ error: "Este acceso se encuentra bloqueado" });
    }

    const directAccess = activateDirectAccess(storedStudent);
    if (!directAccess.ok) {
      return res.status(403).json({
        error: "El acceso directo de Borja venció después de 30 días.",
        code: "DIRECT_ACCESS_EXPIRED",
        expiresAt: directAccess.expiresAt || ""
      });
    }

    const session = createSessionForStudent(directAccess.student, {
      expiresAt: directAccess.expiresAt
    });
    const nextStudents = students.slice();
    nextStudents[index] = session.student;
    await writeStudents(nextStudents);
    setSessionCookie(res, session.token, session.expiresAt);

    return res.status(200).json({
      student: buildAuthenticatedStudent(session.student, appSettings),
      directAccess: {
        expiresAt: directAccess.expiresAt
      }
    });
  } catch (error) {
    console.error("student direct access error:", error);
    return res.status(500).json({ error: "No se pudo abrir el acceso directo" });
  }
}
