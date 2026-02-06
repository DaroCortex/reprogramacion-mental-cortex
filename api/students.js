import { readStudents } from "./_r2.js";

export default async function handler(req, res) {
  try {
    const students = await readStudents();
    const safe = students.map((item) => ({
      name: item.name,
      slug: item.slug
    }));
    return res.status(200).json({ students: safe });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo cargar estudiantes" });
  }
}
