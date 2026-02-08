import { restoreBackup } from "./_daily.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { slug, password, backupKey } = req.body || {};
    const cleanSlug = String(slug || "").trim();
    const cleanPassword = String(password || "").trim();
    const cleanBackup = String(backupKey || "").trim();
    if (!cleanSlug || !cleanPassword || !cleanBackup) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    await restoreBackup({
      slug: cleanSlug,
      backupObjectKey: cleanBackup,
      adminPassword: cleanPassword
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "No se pudo restaurar backup" });
  }
}
