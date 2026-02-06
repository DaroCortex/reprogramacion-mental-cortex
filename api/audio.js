import fs from "fs/promises";
import path from "path";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();

const withGeneratedSlugs = (items) => {
  const seen = new Map();
  return items.map((item) => {
    const base = item.slug ? slugify(item.slug) : slugify(item.name || "");
    const safeBase = base || "estudiante";
    const count = (seen.get(safeBase) || 0) + 1;
    seen.set(safeBase, count);
    const slug = count === 1 ? safeBase : `${safeBase}-${count}`;
    return { ...item, slug };
  });
};

const readStudents = async () => {
  const filePath = path.join(process.cwd(), "public", "students.json");
  const raw = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(raw);
  const students = Array.isArray(data.students) ? data.students : [];
  return withGeneratedSlugs(students);
};

const getS3Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Faltan credenciales de Cloudflare R2.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
};

export default async function handler(req, res) {
  try {
    const slug = String(req.query.slug || "").trim();
    const token = String(req.query.token || "").trim();
    if (!slug) {
      return res.status(400).json({ error: "Slug requerido" });
    }

    const students = await readStudents();
    const student = students.find((item) => item.slug === slug);

    if (!student || !student.audioKey) {
      return res.status(404).json({ error: "Audio no encontrado" });
    }

    if (!token || token !== String(student.token || "")) {
      return res.status(403).json({ error: "Token inválido" });
    }

    const bucket = process.env.R2_BUCKET;
    if (!bucket) {
      return res.status(500).json({ error: "Bucket no configurado" });
    }

    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: student.audioKey
    });

    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    return res.status(200).json({ url });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo firmar el audio" });
  }
}
