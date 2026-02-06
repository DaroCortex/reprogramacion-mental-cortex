import { readStudents } from "../_r2.js";

const isAllowed = (password) => {
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  return password && adminPassword && password === adminPassword;
};

export default async function handler(req, res) {
  try {
    const password = String(req.query.password || "").trim();
    if (!isAllowed(password)) {
      return res.status(401).json({ error: "No autorizado" });
    }
    const students = await readStudents();
    return res.status(200).json({ students });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo cargar estudiantes" });
  }
}
