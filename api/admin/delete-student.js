import { readStudents, writeStudents } from "../_r2.js";

const isAllowed = (password) => {
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  return password && adminPassword && password === adminPassword;
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { password, slug } = req.body || {};
    if (!isAllowed(password)) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if (!slug) {
      return res.status(400).json({ error: "Slug requerido" });
    }

    const students = await readStudents();
    const next = students.filter((item) => item.slug !== slug);
    await writeStudents(next);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo eliminar" });
  }
}
