import { readAppSettings, readStudents, writeStudents } from "../../lib/r2.js";
import {
  consumeOneTimeToken,
  createSessionForStudent,
  getNowIso,
  hashPassword,
  setSessionCookie
} from "../../lib/student-auth.js";
import { buildAuthenticatedStudent } from "../students.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");
    if (!token || !password) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const [students, appSettings] = await Promise.all([readStudents(), readAppSettings()]);
    const match = consumeOneTimeToken(students, token, ["passwordSetup", "passwordReset"]);
    if (!match) {
      return res.status(404).json({ error: "Link inválido o vencido" });
    }

    const passwordHash = await hashPassword(password);
    const nowIso = getNowIso();
    const nextAuth = {
      ...(match.student.auth || {}),
      passwordHash,
      passwordSetAt: nowIso,
      passwordSetupTokenHash: "",
      passwordSetupExpiresAt: "",
      passwordResetTokenHash: "",
      passwordResetExpiresAt: ""
    };
    const withPassword = {
      ...match.student,
      auth: nextAuth,
      passwordHash: "",
      updatedAt: nowIso
    };
    const session = createSessionForStudent(withPassword);
    const nextStudents = students.slice();
    nextStudents[match.index] = session.student;
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
    const message = error?.message || "No se pudo guardar la contraseña";
    return res.status(400).json({ error: message });
  }
}
