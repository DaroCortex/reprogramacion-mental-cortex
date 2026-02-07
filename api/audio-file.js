import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getBucket, getS3Client, readStudents } from "./_r2.js";

const PUBLIC_AUDIO_SLUGS = new Set(["respira", "bosq", "inala"]);

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
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

    const isPublicAudio = PUBLIC_AUDIO_SLUGS.has(slug);
    if (!isPublicAudio && (!token || token !== String(student.token || ""))) {
      return res.status(403).json({ error: "Token inválido" });
    }

    const client = getS3Client();
    const bucket = getBucket();
    const requestedRange = req.headers?.range;
    const output = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: student.audioKey,
        ...(requestedRange ? { Range: requestedRange } : {})
      })
    );

    const data = await streamToBuffer(output.Body);
    res.setHeader("Content-Type", output.ContentType || "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Disposition", "inline");
    if (output.ContentLength != null) {
      res.setHeader("Content-Length", String(output.ContentLength));
    }
    if (output.ContentRange) {
      res.setHeader("Content-Range", output.ContentRange);
    }
    res.setHeader("Cache-Control", "no-store");
    const statusCode = requestedRange && output.ContentRange ? 206 : 200;
    return res.status(statusCode).send(data);
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo cargar el audio",
      detail: error?.message || "error"
    });
  }
}
