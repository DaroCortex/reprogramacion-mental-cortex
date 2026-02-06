import crypto from "crypto";
import { readStudents, writeStudents, uploadObject } from "../_r2.js";

const isAllowed = (password) => {
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  return password && adminPassword && password === adminPassword;
};

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

    const { password, name, fileName, audioBase64, contentType } = req.body || {};
    if (!isAllowed(password)) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if (!name || !fileName || !audioBase64) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const safeName = String(fileName)
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    const key = `audios/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(String(audioBase64), "base64");

    await uploadObject(key, buffer, contentType);

    const students = await readStudents();
    const slug = uniqueSlug(name, students);
    const token = makeToken();
    const student = {
      name,
      audioKey: key,
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
