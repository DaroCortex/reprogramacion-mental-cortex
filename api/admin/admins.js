import crypto from "crypto";
import { addAdmin, isSuperAdmin, listAdmins, removeAdmin, verifyAdminPassword } from "../../lib/auth.js";
import { readStudents, writeStudents } from "../../lib/r2.js";

const DEFAULT_SEGUIMIENTO_URL =
  "https://seguimiento-academia-v2-m4j7pg92s-darocortexs-projects.vercel.app/data/students.json";

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();

const uniqueSlug = (name, existingStudents) => {
  const base = slugify(name) || "estudiante";
  const taken = new Set(existingStudents.map((item) => item.slug));
  let slug = base;
  let index = 2;
  while (taken.has(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }
  return slug;
};

const makeToken = () => crypto.randomBytes(16).toString("hex");

const createDefaultUsage = () => ({
  firstSessionAt: "",
  lastSessionAt: "",
  totalSessions: 0,
  totalRounds: 0,
  totalBreaths: 0,
  sessionsByDay: {},
  apneaRoundSums: [0, 0, 0, 0, 0],
  apneaRoundCounts: [0, 0, 0, 0, 0],
  flowStats: {
    onboarding: 0,
    prePractice: 0,
    practice: 0
  },
  colorVisionUsage: {
    totalSessions: 0,
    totalHits: 0,
    totalMisses: 0,
    totalDetections: 0,
    averageAccuracy: 0,
    lastSessionAt: "",
    lastSession: null
  },
  lastSession: null
});

const normalizeLegacyStudent = (item) => ({
  id: item?.id ?? null,
  nombre: String(item?.nombre || "").trim(),
  fechaIngreso: item?.fechaIngreso || "",
  telefono: item?.telefono || "",
  audioAsignado: item?.audioAsignado || "",
  estadoManual: item?.estadoManual || "",
  estadoAlumno: item?.estadoAlumno || "",
  keywords: item?.keywords || "",
  notaMeet: item?.notaMeet || "",
  stageStatus: item?.stageStatus && typeof item.stageStatus === "object" ? item.stageStatus : {}
});

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

    if (req.method === "PUT") {
      const { password, sourceUrl } = req.body || {};
      if (!(await verifyAdminPassword(password))) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const url = String(sourceUrl || DEFAULT_SEGUIMIENTO_URL).trim();
      const externalResponse = await fetch(url);
      if (!externalResponse.ok) {
        return res.status(400).json({ error: "No se pudo leer la base externa" });
      }
      const externalRaw = await externalResponse.json();
      const externalStudents = Array.isArray(externalRaw) ? externalRaw : [];
      if (!externalStudents.length) {
        return res.status(400).json({ error: "La base externa no tiene estudiantes" });
      }

      const students = await readStudents();
      let created = 0;
      let updated = 0;
      const now = new Date().toISOString();

      for (const rawItem of externalStudents) {
        const legacy = normalizeLegacyStudent(rawItem);
        if (!legacy.nombre) continue;
        const byNameIndex = students.findIndex(
          (item) => String(item.name || "").trim().toLowerCase() === legacy.nombre.toLowerCase()
        );

        if (byNameIndex >= 0) {
          students[byNameIndex] = {
            ...students[byNameIndex],
            legacyTracking: legacy,
            updatedAt: now
          };
          updated += 1;
          continue;
        }

        const slug = uniqueSlug(legacy.nombre, students);
        students.push({
          name: legacy.nombre,
          audioKey: "",
          slug,
          token: makeToken(),
          createdAt: now,
          updatedAt: now,
          lastAudioAccessAt: "",
          usage: createDefaultUsage(),
          features: {
            colorVisionEnabled: false
          },
          legacyTracking: legacy
        });
        created += 1;
      }

      await writeStudents(students);
      return res.status(200).json({
        ok: true,
        sourceUrl: url,
        totalSource: externalStudents.length,
        created,
        updated,
        totalStudents: students.length
      });
    }

    return res.status(405).json({ error: "Metodo no permitido" });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Error admin" });
  }
}
