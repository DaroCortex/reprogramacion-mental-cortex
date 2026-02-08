import crypto from "crypto";
import { readStudents, writeStudents } from "../_r2.js";
import { verifyAdminPassword } from "../_auth.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();

const uniqueSlug = (name, existing) => {
  const base = slugify(name || "");
  const safeBase = base || "estudiante";
  let slug = safeBase;
  let counter = 2;
  const taken = new Set(existing.map((item) => item.slug));
  while (taken.has(slug)) {
    slug = `${safeBase}-${counter}`;
    counter += 1;
  }
  return slug;
};

const makeToken = () => crypto.randomBytes(16).toString("hex");

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const { password, name, audioKey } = req.body || {};
    if (!(await verifyAdminPassword(password))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if (!name || !audioKey) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const students = await readStudents();
    const slug = uniqueSlug(name, students);
    const token = makeToken();
    const student = {
      name,
      audioKey,
      slug,
      token,
      createdAt: new Date().toISOString()
    };

    const next = [...students, student];
    await writeStudents(next);
    return res.status(200).json({ student });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo crear estudiante" });
  }
}
