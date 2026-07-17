import { checkStudentAccess, listBackups, loadDaily, restoreBackup, saveDaily } from "../../lib/daily.js";
import { readStudents } from "../../lib/r2.js";
import { findStudentBySession } from "../../lib/student-auth.js";

const resolveSessionStudent = async (req) => {
  const students = await readStudents();
  return findStudentBySession(students, req)?.student || null;
};

const resolveStudentAccess = async ({ req, slug, token }) => {
  const sessionStudent = await resolveSessionStudent(req);
  const requestedSlug = String(slug || "").trim();
  if (sessionStudent && (!requestedSlug || requestedSlug === sessionStudent.slug)) {
    return { ok: true, student: sessionStudent, slug: sessionStudent.slug };
  }

  const legacySlug = requestedSlug;
  const legacyToken = String(token || "").trim();
  if (!legacySlug || !legacyToken) {
    return { ok: false, status: 400, error: "Slug y token requeridos" };
  }

  const access = await checkStudentAccess(legacySlug, legacyToken);
  return { ...access, slug: legacySlug };
};

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const action = String(req.query.action || "get").trim();

      if (action === "backups") {
        const slug = String(req.query.slug || "").trim();
        const password = String(req.query.password || "").trim();
        if (!slug || !password) {
          return res.status(400).json({ error: "Slug y password requeridos" });
        }
        const backups = await listBackups({ slug, adminPassword: password });
        return res.status(200).json({ backups });
      }

      const access = await resolveStudentAccess({
        req,
        slug: req.query.slug,
        token: req.query.token
      });
      if (!access.ok) return res.status(access.status).json({ error: access.error });
      const data = await loadDaily(access.slug);
      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      const action = String(req.body?.action || "save").trim();

      if (action === "restore") {
        const slug = String(req.body?.slug || "").trim();
        const password = String(req.body?.password || "").trim();
        const backupKey = String(req.body?.backupKey || "").trim();
        if (!slug || !password || !backupKey) {
          return res.status(400).json({ error: "Datos incompletos" });
        }
        await restoreBackup({
          slug,
          backupObjectKey: backupKey,
          adminPassword: password
        });
        return res.status(200).json({ ok: true });
      }

      const slug = String(req.body?.slug || "").trim();
      const token = String(req.body?.token || "").trim();
      const payload = req.body?.payload;
      if (!payload) {
        return res.status(400).json({ error: "Datos incompletos" });
      }
      const access = await resolveStudentAccess({ req, slug, token });
      if (!access.ok) return res.status(access.status).json({ error: access.error });
      await saveDaily(access.slug, payload);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Metodo no permitido" });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Error metas diarias" });
  }
}
