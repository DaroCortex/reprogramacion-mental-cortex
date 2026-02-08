import { readStudents } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";

export default async function handler(req, res) {
  try {
    const password = String(req.query.password || "").trim();
    if (!(await verifyAdminPassword(password))) {
      return res.status(401).json({ error: "No autorizado" });
    }
    const students = await readStudents();
    return res.status(200).json({ students });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo cargar estudiantes" });
  }
}
