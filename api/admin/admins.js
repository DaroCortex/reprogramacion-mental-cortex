import { addAdmin, isSuperAdmin, listAdmins, removeAdmin, verifyAdminPassword } from "../../lib/auth.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const password = String(req.query.password || "").trim();
      if (!(await verifyAdminPassword(password))) {
        return res.status(401).json({ error: "No autorizado" });
      }
      const admins = await listAdmins();
      return res.status(200).json({ admins });
    }

    if (req.method === "POST") {
      const { password, name, adminPassword, confirmationText, confirmedTwice } = req.body || {};
      const cleanName = String(name || "").trim();
      const expected = `CONFIRMAR ${cleanName}`;

      if (!isSuperAdmin(password)) {
        return res.status(401).json({ error: "Solo admin principal" });
      }
      if (!cleanName) {
        return res.status(400).json({ error: "Nombre requerido" });
      }
      if (String(confirmationText || "").trim() !== expected || !confirmedTwice) {
        return res.status(400).json({ error: `Confirma exactamente: ${expected}` });
      }

      await addAdmin({ superPassword: password, name: cleanName, adminPassword });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
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
    }

    return res.status(405).json({ error: "Metodo no permitido" });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Error admin" });
  }
}
