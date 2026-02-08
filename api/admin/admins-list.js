import { listAdmins, verifyAdminPassword } from "../_auth.js";

export default async function handler(req, res) {
  try {
    const password = String(req.query.password || "").trim();
    if (!(await verifyAdminPassword(password))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const admins = await listAdmins();
    return res.status(200).json({ admins });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo listar administradores" });
  }
}
