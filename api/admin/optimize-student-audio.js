import {
  deleteObject,
  getObjectBuffer,
  readStudents,
  uploadObject,
  writeStudents
} from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import { buildAudioKey, optimizeAudioBuffer } from "../../lib/audio-optimizer.js";

const inferFileName = (key) => {
  const clean = String(key || "").trim();
  if (!clean) return `audio-${Date.now()}.mp3`;
  return clean.split("/").pop() || `audio-${Date.now()}.mp3`;
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
    if (!target?.audioKey) {
      return res.status(404).json({ error: "Audio no encontrado" });
    }

    const sourceKey = target.audioKey;
    const { buffer: sourceBuffer } = await getObjectBuffer(sourceKey);
    const fileName = inferFileName(sourceKey);
    const optimized = await optimizeAudioBuffer({
      inputBuffer: sourceBuffer,
      fileName
    });

    const nextKey = buildAudioKey(fileName, optimized.extension || "mp3");
    await uploadObject(nextKey, optimized.buffer, optimized.contentType || "audio/mpeg");

    const nowIso = new Date().toISOString();
    const nextStudents = students.map((item) => {
      if (item.slug !== slug) return item;
      return {
        ...item,
        audioKey: nextKey,
        updatedAt: nowIso,
        lastAudioAccessAt: item.lastAudioAccessAt || nowIso
      };
    });

    await writeStudents(nextStudents);

    const stillReferenced = nextStudents.some(
      (item) => item.slug !== slug && item.audioKey === sourceKey
    );
    if (!stillReferenced) {
      try {
        await deleteObject(sourceKey);
      } catch (cleanupError) {
        console.warn("optimize-student-audio cleanup warning:", cleanupError?.message || cleanupError);
      }
    }

    return res.status(200).json({
      ok: true,
      optimization: optimized.optimization,
      sourceKey,
      audioKey: nextKey
    });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo optimizar audio",
      detail: error?.message || "error"
    });
  }
}
