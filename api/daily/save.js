import { checkStudentAccess, saveDaily } from "./_daily.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { slug, token, payload } = req.body || {};
    const cleanSlug = String(slug || "").trim();
    const cleanToken = String(token || "").trim();
    if (!cleanSlug || !cleanToken || !payload) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const access = await checkStudentAccess(cleanSlug, cleanToken);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    await saveDaily(cleanSlug, payload);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo guardar metas diarias" });
  }
}
