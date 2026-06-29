import { readStudents, writeStudents } from "../../lib/r2.js";
import { createOneTimeToken, normalizeEmail } from "../../lib/student-auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(200).json({ ok: true });
    }

    const students = await readStudents();
    const index = students.findIndex((student) => normalizeEmail(student.email) === email);
    if (index >= 0) {
      const nextStudents = students.slice();
      const generated = createOneTimeToken(students[index], "passwordReset", 2);
      nextStudents[index] = generated.student;
      await writeStudents(nextStudents);
      // El envio real de email queda para la integracion transaccional.
      // No devolvemos el token en un endpoint publico.
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("student reset request error:", error);
    return res.status(200).json({ ok: true });
  }
}
