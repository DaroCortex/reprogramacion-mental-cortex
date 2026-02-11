import crypto from "crypto";
import { readStudents, writeStudents, uploadObject } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import { buildAudioKey, optimizeAudioBuffer } from "../../lib/audio-optimizer.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();

const uniqueSlug = (name, existing) => {
  const base = slugify(name || "");
  const safeBase = base || "estudiante";
  let slug = safeBase;
  let counter = 2;
  const taken = new Set(existing.map((item) => item.slug));
  while (taken.has(slug)) {
    slug = `${safeBase}-${counter}`;
    counter += 1;
  }
  return slug;
};

const makeToken = () => crypto.randomBytes(16).toString("hex");

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { password, name, fileName, audioBase64, contentType, audioKey } = req.body || {};
    if (!(await verifyAdminPassword(password))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if (!name) {
      return res.status(400).json({ error: "Datos incompletos" });
    }
    let key = String(audioKey || "").trim();
    let optimization = null;
    if (!key) {
      if (!fileName || !audioBase64) {
        return res.status(400).json({ error: "Datos incompletos" });
      }
      const inputBuffer = Buffer.from(String(audioBase64), "base64");
      const optimized = await optimizeAudioBuffer({ inputBuffer, fileName });
      key = buildAudioKey(fileName, optimized.extension || "mp3");
      await uploadObject(key, optimized.buffer, optimized.contentType || contentType);
      optimization = optimized.optimization;
    }

    const students = await readStudents();
    const slug = uniqueSlug(name, students);
    const token = makeToken();
    const student = {
      name,
      audioKey: key,
      slug,
      token,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAudioAccessAt: new Date().toISOString()
    };

    const next = [...students, student];
    await writeStudents(next);
    return res.status(200).json({ student, optimization });
  } catch (error) {
    console.error("create-student error:", error);
    return res.status(500).json({
      error: "No se pudo crear estudiante",
      detail: error?.message || "error"
    });
  }
}
