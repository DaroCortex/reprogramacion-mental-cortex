import { isSuperAdmin, removeAdmin } from "../_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { password, name, confirmationText, confirmedTwice } = req.body || {};
    const cleanName = String(name || "").trim();
    const expected = `ELIMINAR ${cleanName}`;

    if (!isSuperAdmin(password)) {
      return res.status(401).json({ error: "Solo admin principal" });
    }
    if (!cleanName) {
      return res.status(400).json({ error: "Nombre requerido" });
    }
    if (String(confirmationText || "").trim() !== expected || !confirmedTwice) {
      return res.status(400).json({ error: `Confirma exactamente: ${expected}` });
    }

    await removeAdmin({ superPassword: password, name: cleanName });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "No se pudo eliminar administrador" });
  }
}
