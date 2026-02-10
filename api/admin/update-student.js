import { readStudents, writeStudents, uploadObject } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import { buildAudioKey, optimizeAudioBuffer } from "../../lib/audio-optimizer.js";

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
    let optimization = null;
    if (!nextAudioKey && audioBase64 && fileName) {
      const inputBuffer = Buffer.from(String(audioBase64), "base64");
      const optimized = await optimizeAudioBuffer({ inputBuffer, fileName });
      optimization = optimized.optimization;
      nextAudioKey = buildAudioKey(fileName, optimized.extension || "mp3");
      await uploadObject(nextAudioKey, optimized.buffer, optimized.contentType || contentType);
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
    return res.status(200).json({ ok: true, optimization });
  } catch (error) {
    console.error("update-student error:", error);
    return res.status(500).json({
      error: "No se pudo actualizar",
      detail: error?.message || "error"
    });
  }
}
