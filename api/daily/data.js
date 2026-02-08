import { checkStudentAccess, listBackups, loadDaily, restoreBackup, saveDaily } from "../../lib/daily.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const action = String(req.query.action || "get").trim();

      if (action === "backups") {
        const slug = String(req.query.slug || "").trim();
        const password = String(req.query.password || "").trim();
        if (!slug || !password) {
          return res.status(400).json({ error: "Slug y password requeridos" });
        }
        const backups = await listBackups({ slug, adminPassword: password });
        return res.status(200).json({ backups });
      }

      const slug = String(req.query.slug || "").trim();
      const token = String(req.query.token || "").trim();
      if (!slug || !token) return res.status(400).json({ error: "Slug y token requeridos" });
      const access = await checkStudentAccess(slug, token);
      if (!access.ok) return res.status(access.status).json({ error: access.error });
      const data = await loadDaily(slug);
      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      const action = String(req.body?.action || "save").trim();

      if (action === "restore") {
        const slug = String(req.body?.slug || "").trim();
        const password = String(req.body?.password || "").trim();
        const backupKey = String(req.body?.backupKey || "").trim();
        if (!slug || !password || !backupKey) {
          return res.status(400).json({ error: "Datos incompletos" });
        }
        await restoreBackup({
          slug,
          backupObjectKey: backupKey,
          adminPassword: password
        });
        return res.status(200).json({ ok: true });
      }

      const slug = String(req.body?.slug || "").trim();
      const token = String(req.body?.token || "").trim();
      const payload = req.body?.payload;
      if (!slug || !token || !payload) {
        return res.status(400).json({ error: "Datos incompletos" });
      }
      const access = await checkStudentAccess(slug, token);
      if (!access.ok) return res.status(access.status).json({ error: access.error });
      await saveDaily(slug, payload);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Metodo no permitido" });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Error metas diarias" });
  }
}
