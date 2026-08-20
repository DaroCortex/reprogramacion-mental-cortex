import { readStudents, uploadObject, writeStudents } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import { isActiveStudent } from "../../lib/student-operational-status.js";
import { buildTransfer, safeSlug } from "../../lib/student-email-transfer.js";
import { isValidEmail, normalizeEmail } from "../../lib/student-auth.js";

export default async function handler(req, res) {
  let backupKey = "";
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    if (!(await verifyAdminPassword(String(req.body?.password || "")))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const sourceSlug = safeSlug(req.body?.sourceSlug);
    const targetSlug = safeSlug(req.body?.targetSlug);
    const email = normalizeEmail(req.body?.email);
    const expectedConfirmation = `TRANSFER ${email} ${sourceSlug} ${targetSlug}`;
    if (!sourceSlug || !targetSlug || !isValidEmail(email)) {
      return res.status(400).json({ error: "Datos de transferencia invalidos" });
    }
    if (String(req.body?.confirm || "") !== expectedConfirmation) {
      return res.status(400).json({ error: `Confirma exactamente: ${expectedConfirmation}` });
    }

    const students = await readStudents();
    const nowIso = new Date().toISOString();
    const transfer = buildTransfer(students, { sourceSlug, targetSlug, email, nowIso });
    if (!transfer.changed) {
      return res.status(200).json({
        ok: true,
        changed: false,
        email,
        sourceSlug,
        targetSlug,
      });
    }

    const stamp = nowIso.replace(/[:.]/g, "-");
    backupKey = `backups/students-before-email-transfer-${stamp}-${targetSlug}.json`;
    await uploadObject(
      backupKey,
      Buffer.from(JSON.stringify({ students }, null, 2), "utf8"),
      "application/json",
    );
    await writeStudents(transfer.students);

    const verified = await readStudents();
    const source = verified.find((student) => safeSlug(student?.slug) === sourceSlug);
    const target = verified.find((student) => safeSlug(student?.slug) === targetSlug);
    const owners = verified.filter((student) => normalizeEmail(student?.email) === email);
    if (
      normalizeEmail(source?.email) ||
      normalizeEmail(target?.email) !== email ||
      owners.length !== 1 ||
      !isActiveStudent(target)
    ) {
      throw new Error("La verificacion posterior de identidad no fue consistente");
    }

    return res.status(200).json({
      ok: true,
      changed: true,
      email,
      sourceSlug,
      targetSlug,
      backupKey,
      verified: true,
    });
  } catch (error) {
    console.error("student email transfer error:", error);
    return res.status(error?.status || 500).json({
      error: error?.message || "No se pudo transferir el email",
      ...(backupKey ? { backupKey } : {}),
    });
  }
}
