import { signPutUrl } from "../_r2.js";
import { verifyAdminPassword } from "../_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { password, fileName } = req.body || {};
    if (!(await verifyAdminPassword(password))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if (!fileName) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const safeName = String(fileName)
      .trim()
      .replace(/\\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    const key = `audios/${Date.now()}-${safeName}`;

    const uploadUrl = await signPutUrl(key);
    return res.status(200).json({ key, uploadUrl });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo firmar la subida" });
  }
}
