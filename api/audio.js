import { readStudents, signGetUrl } from "./_r2.js";

export default async function handler(req, res) {
  try {
    const slug = String(req.query.slug || "").trim();
    const token = String(req.query.token || "").trim();
    if (!slug) {
      return res.status(400).json({ error: "Slug requerido" });
    }

    const students = await readStudents();
    const student = students.find((item) => item.slug === slug);

    if (!student || !student.audioKey) {
      return res.status(404).json({ error: "Audio no encontrado" });
    }

    if (!token || token !== String(student.token || "")) {
      return res.status(403).json({ error: "Token inválido" });
    }

    const url = await signGetUrl(student.audioKey);
    return res.status(200).json({ url });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo firmar el audio" });
  }
}
