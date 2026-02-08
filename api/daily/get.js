import { checkStudentAccess, loadDaily } from "./_daily.js";

export default async function handler(req, res) {
  try {
    const slug = String(req.query.slug || "").trim();
    const token = String(req.query.token || "").trim();
    if (!slug || !token) return res.status(400).json({ error: "Slug y token requeridos" });

    const access = await checkStudentAccess(slug, token);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const data = await loadDaily(slug);
    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo cargar metas diarias" });
  }
}
