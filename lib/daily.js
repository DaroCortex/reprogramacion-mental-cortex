import { deleteObject, listObjects, readJson, writeJson } from "./r2.js";
import { verifyAdminPassword } from "./auth.js";

const keyCurrent = (slug) => `daily-goals/${slug}/current.json`;
const keyBackupPrefix = (slug) => `daily-goals/${slug}/backups/`;
const backupKey = (slug) => `${keyBackupPrefix(slug)}${Date.now()}.json`;
const MAX_AGE_MS = 72 * 60 * 60 * 1000;

const checkStudentAccess = async (slug, token) => {
  const studentsData = await readJson(process.env.R2_STUDENTS_KEY || "students.json", { students: [] });
  const students = Array.isArray(studentsData.students) ? studentsData.students : [];
  const student = students.find((item) => item.slug === slug);
  if (!student) return { ok: false, error: "Estudiante no encontrado", status: 404 };
  if (String(student.token || "") !== String(token || "")) {
    return { ok: false, error: "Token inválido", status: 403 };
  }
  return { ok: true, student };
};

const loadDaily = async (slug) => {
  return readJson(keyCurrent(slug), {
    studentId: slug,
    studentName: slug,
    coachNotes: "",
    templates: [],
    store: { days: {}, activeTemplateIds: null },
    updatedAt: ""
  });
};

const pruneBackups = async (slug) => {
  const objects = await listObjects(keyBackupPrefix(slug));
  const now = Date.now();
  const stale = objects.filter((item) => {
    if (!item?.Key || !item?.LastModified) return false;
    return now - new Date(item.LastModified).getTime() > MAX_AGE_MS;
  });
  await Promise.all(stale.map((item) => deleteObject(item.Key)));
};

const saveDaily = async (slug, payload) => {
  const current = await loadDaily(slug);
  if (current?.updatedAt) {
    await writeJson(backupKey(slug), current);
  }

  const next = {
    ...payload,
    updatedAt: new Date().toISOString()
  };
  await writeJson(keyCurrent(slug), next);
  await pruneBackups(slug);
};

const listBackups = async ({ slug, adminPassword }) => {
  if (!(await verifyAdminPassword(adminPassword))) {
    throw new Error("No autorizado");
  }
  const objects = await listObjects(keyBackupPrefix(slug));
  const now = Date.now();
  return objects
    .filter((item) => item?.Key)
    .map((item) => ({
      key: item.Key,
      updatedAt: item.LastModified ? new Date(item.LastModified).toISOString() : "",
      expired: item.LastModified ? now - new Date(item.LastModified).getTime() > MAX_AGE_MS : false
    }))
    .filter((item) => !item.expired)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

const restoreBackup = async ({ slug, backupObjectKey, adminPassword }) => {
  if (!(await verifyAdminPassword(adminPassword))) {
    throw new Error("No autorizado");
  }
  if (!backupObjectKey?.startsWith(keyBackupPrefix(slug))) {
    throw new Error("Backup inválido");
  }
  const backupData = await readJson(backupObjectKey, null);
  if (!backupData) {
    throw new Error("Backup no encontrado");
  }
  await writeJson(keyCurrent(slug), {
    ...backupData,
    restoredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
};

export { checkStudentAccess, loadDaily, saveDaily, listBackups, restoreBackup };
