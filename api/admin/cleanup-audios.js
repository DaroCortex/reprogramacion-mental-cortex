import { deleteObject, listObjects, readStudents, writeStudents } from "../../lib/r2.js";
import { isSuperAdmin, verifyAdminPassword } from "../../lib/auth.js";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const isAuthorized = async (req) => {
  if (req.headers["x-vercel-cron"]) return true;

  const password = String(req.query.password || req.body?.password || "").trim();
  if (await verifyAdminPassword(password)) return true;
  if (isSuperAdmin(password)) return true;

  const tokenFromHeader = String(req.headers["x-cleanup-token"] || "").trim();
  const tokenFromBearer = String(req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const token = tokenFromHeader || tokenFromBearer;
  const expected = String(process.env.CLEANUP_CRON_TOKEN || "").trim();

  return Boolean(expected && token && token === expected);
};

const getTimestamp = (value) => {
  if (!value) return 0;
  const ts = Date.parse(String(value));
  return Number.isNaN(ts) ? 0 : ts;
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    if (!(await isAuthorized(req))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const now = Date.now();
    const cutoff = now - NINETY_DAYS_MS;

    const students = await readStudents();
    const keysToDelete = new Set();
    let studentsUpdated = false;

    const nextStudents = students.map((item) => {
      const key = String(item.audioKey || "").trim();
      if (!key) return item;

      const lastUsageTs = Math.max(
        getTimestamp(item.lastAudioAccessAt),
        getTimestamp(item.updatedAt),
        getTimestamp(item.createdAt)
      );

      if (lastUsageTs > 0 && lastUsageTs < cutoff) {
        keysToDelete.add(key);
        studentsUpdated = true;
        return {
          ...item,
          audioKey: "",
          updatedAt: new Date(now).toISOString()
        };
      }

      return item;
    });

    const referencedKeys = new Set(
      nextStudents
        .map((item) => String(item.audioKey || "").trim())
        .filter(Boolean)
    );

    const objects = await listObjects("audios/");
    for (const object of objects) {
      const key = String(object.Key || "").trim();
      if (!key) continue;
      if (referencedKeys.has(key)) continue;

      const lastModifiedTs = object.LastModified ? new Date(object.LastModified).getTime() : 0;
      if (lastModifiedTs > 0 && lastModifiedTs < cutoff) {
        keysToDelete.add(key);
      }
    }

    let deletedCount = 0;
    for (const key of keysToDelete) {
      try {
        await deleteObject(key);
        deletedCount += 1;
      } catch (error) {
        console.warn("cleanup-audios delete warning:", key, error?.message || error);
      }
    }

    if (studentsUpdated) {
      await writeStudents(nextStudents);
    }

    return res.status(200).json({
      ok: true,
      deletedCount,
      studentsUpdated,
      cutoffIso: new Date(cutoff).toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo limpiar audios",
      detail: error?.message || "error"
    });
  }
}
