import { readStudents, writeStudents, uploadObject } from "../_r2.js";
import { verifyAdminPassword } from "../_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { password, slug, audioKey, audioBase64, fileName, contentType } = req.body || {};
    if (!(await verifyAdminPassword(password))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if (!slug || (!audioKey && !audioBase64)) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    let nextAudioKey = audioKey;
    if (!nextAudioKey && audioBase64 && fileName) {
      const safeName = String(fileName)
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "");
      nextAudioKey = `audios/${Date.now()}-${safeName}`;
      const buffer = Buffer.from(String(audioBase64), "base64");
      await uploadObject(nextAudioKey, buffer, contentType);
    }

    const students = await readStudents();
    const next = students.map((item) => {
      if (item.slug !== slug) return item;
      return {
        ...item,
        audioKey: nextAudioKey || item.audioKey,
        updatedAt: new Date().toISOString()
      };
    });

    await writeStudents(next);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("update-student error:", error);
    return res.status(500).json({
      error: "No se pudo actualizar",
      detail: error?.message || "error"
    });
  }
}
