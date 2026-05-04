import { deleteObject, readStudents, writeStudents } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";

const collectAudioKeys = (student) => {
  const workflow = student?.audioWorkflow || {};
  return [
    ...new Set([student?.audioKey, workflow.rawAudioKey, workflow.beginnerAudioKey, workflow.editorAudioKey].filter(Boolean))
  ];
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { password, slug } = req.body || {};
    if (!(await verifyAdminPassword(password))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if (!slug) {
      return res.status(400).json({ error: "Slug requerido" });
    }

    const students = await readStudents();
    const target = students.find((item) => item.slug === slug);
    const next = students.filter((item) => item.slug !== slug);

    for (const key of collectAudioKeys(target)) {
      const isStillReferenced = next.some((item) => collectAudioKeys(item).includes(key));
      try {
        if (!isStillReferenced) {
          await deleteObject(key);
        }
      } catch (cleanupError) {
        console.warn("delete-student audio cleanup warning:", cleanupError?.message || cleanupError);
      }
    }

    await writeStudents(next);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo eliminar" });
  }
}
