import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getBucket, getS3Client, readStudents, signGetUrl, writeStudents } from "../lib/r2.js";
import { verifyAdminPassword, verifyEditorPassword } from "../lib/auth.js";
import { findStudentBySession } from "../lib/student-auth.js";

const PUBLIC_AUDIO_SLUGS = new Set(["respira", "bosq", "inala", "oceano", "balance", "gamma", "trance"]);

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const safeTimestamp = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasApprovedEditedAudio = (student, workflow = {}) => {
  const rawUploadedAt = Math.max(
    safeTimestamp(workflow.rawUploadedAt),
    safeTimestamp(workflow.submittedAt)
  );
  const editedAt = safeTimestamp(workflow.editedAt);

  const hasWorkflowAdvancedKey = Boolean(workflow.editorAudioKey);
  const isLegacyAudioKey = Boolean(student?.audioKey && !hasWorkflowAdvancedKey && !rawUploadedAt);
  if (isLegacyAudioKey) return true;
  if (!hasWorkflowAdvancedKey) return false;

  const status = workflow.status || "";
  if (status !== "approved") return false;

  if (rawUploadedAt && (!editedAt || rawUploadedAt > editedAt)) {
    return false;
  }

  return true;
};

export default async function handler(req, res) {
  try {
    let slug = String(req.query.slug || "").trim();
    const token = String(req.query.token || "").trim();
    const kind = String(req.query.kind || "").trim();
    const password = String(req.query.password || "");

    const students = await readStudents();
    const sessionAuth = findStudentBySession(students, req);
    if (!slug && sessionAuth) {
      slug = sessionAuth.student.slug;
    }
    if (!slug) {
      return res.status(400).json({ error: "Slug requerido" });
    }

    const student = students.find((item) => item.slug === slug);
    const workflow = student?.audioWorkflow || {};
    let selectedKey = student?.audioKey || "";
    const isWorkflowPreview = kind === "raw" || kind === "edited";
    const isSessionOwner = Boolean(sessionAuth?.student?.slug && sessionAuth.student.slug === slug);

    if (isWorkflowPreview) {
      selectedKey = kind === "raw"
        ? workflow.rawAudioKey || ""
        : workflow.editorAudioKey || (hasApprovedEditedAudio(student, workflow) ? student?.audioKey || "" : "");
      const isAdmin = await verifyAdminPassword(password);
      const isEditor = isAdmin || (await verifyEditorPassword(password));
      const isOwner = isSessionOwner || (token && token === String(student?.token || ""));
      if (!isEditor && !isOwner) {
        return res.status(403).json({ error: "No autorizado" });
      }
      if (kind === "edited" && isOwner && !isEditor && !hasApprovedEditedAudio(student, workflow)) {
        return res.status(404).json({ error: "Audio no encontrado" });
      }
    }

    if (kind === "beginner" || kind === "beginner-alt") {
      selectedKey = kind === "beginner-alt"
        ? workflow.beginnerAltAudioKey || ""
        : workflow.beginnerAudioKey || (!workflow.editorAudioKey ? student?.audioKey || "" : "");
      const isAdmin = password ? await verifyAdminPassword(password) : false;
      const isEditor = isAdmin || (password ? await verifyEditorPassword(password) : false);
      const isOwner = isSessionOwner || (token && token === String(student?.token || ""));
      if (!isEditor && !isOwner) {
        return res.status(403).json({ error: "No autorizado" });
      }
    }

    if (!student || !selectedKey) {
      return res.status(404).json({ error: "Audio no encontrado" });
    }

    const isPublicAudio = PUBLIC_AUDIO_SLUGS.has(slug);
    if (!isPublicAudio && !isWorkflowPreview && kind !== "beginner" && kind !== "beginner-alt" && !isSessionOwner && (!token || token !== String(student.token || ""))) {
      return res.status(403).json({ error: "Token inválido" });
    }

    if (!isWorkflowPreview && kind !== "beginner" && kind !== "beginner-alt") {
      // Marca uso real del audio para limpieza automática a 90 días.
      // Se limita la frecuencia para evitar escrituras excesivas por requests de rango.
      const nowIso = new Date().toISOString();
      const lastSeen = student.lastAudioAccessAt ? Date.parse(student.lastAudioAccessAt) : 0;
      const shouldStampAccess = !lastSeen || Number.isNaN(lastSeen) || Date.now() - lastSeen > 10 * 60 * 1000;
      if (shouldStampAccess) {
        const nextStudents = students.map((item) =>
          item.slug === slug ? { ...item, lastAudioAccessAt: nowIso, updatedAt: nowIso } : item
        );
        try {
          await writeStudents(nextStudents);
        } catch (trackError) {
          console.warn("audio-file access tracking warning:", trackError?.message || trackError);
        }
      }
    }

    const shouldRedirectToSignedUrl = kind === "beginner" || kind === "beginner-alt" || isWorkflowPreview;
    if (shouldRedirectToSignedUrl) {
      const signedUrl = await signGetUrl(selectedKey);
      res.setHeader("Cache-Control", isWorkflowPreview ? "private, max-age=60" : "no-store");
      return res.redirect(302, signedUrl);
    }

    const client = getS3Client();
    const bucket = getBucket();
    const requestedRange = req.headers?.range;
    const output = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: selectedKey,
        ...(requestedRange ? { Range: requestedRange } : {})
      })
    );

    const data = await streamToBuffer(output.Body);
    res.setHeader("Content-Type", output.ContentType || "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "no-store");
    if (output.ContentLength != null) {
      res.setHeader("Content-Length", String(output.ContentLength));
    }
    if (output.ContentRange) {
      res.setHeader("Content-Range", output.ContentRange);
    }
    const statusCode = requestedRange && output.ContentRange ? 206 : 200;
    return res.status(statusCode).send(data);
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo cargar el audio",
      detail: error?.message || "error"
    });
  }
}
