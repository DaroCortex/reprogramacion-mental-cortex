import { listBackups } from "./_daily.js";

export default async function handler(req, res) {
  try {
    const slug = String(req.query.slug || "").trim();
    const password = String(req.query.password || "").trim();
    if (!slug || !password) {
      return res.status(400).json({ error: "Slug y password requeridos" });
    }

    const backups = await listBackups({ slug, adminPassword: password });
    return res.status(200).json({ backups });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "No se pudo listar backups" });
  }
}
