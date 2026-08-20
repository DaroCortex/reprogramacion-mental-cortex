import { readStudents } from "../../lib/r2.js";
import { verifyAdminPassword } from "../../lib/auth.js";
import { resolveStudentOperationalStatus } from "../../lib/student-operational-status.js";

const MAX_LOOKUPS = 500;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    if (!(await verifyAdminPassword(String(req.body?.password || "")))) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const lookups = Array.isArray(req.body?.lookups) ? req.body.lookups : [];
    if (!lookups.length || lookups.length > MAX_LOOKUPS) {
      return res.status(400).json({ error: `Se requieren entre 1 y ${MAX_LOOKUPS} consultas` });
    }

    const students = await readStudents();
    const results = lookups.map((lookup) =>
      resolveStudentOperationalStatus(
        students,
        {
          requestId: String(lookup?.requestId || "").trim(),
          slug: String(lookup?.slug || "").trim(),
          email: String(lookup?.email || "").trim(),
          name: String(lookup?.name || "").trim(),
        },
        { allowName: lookup?.allowName === true },
      ),
    );

    return res.status(200).json({
      ok: true,
      count: results.length,
      foundCount: results.filter((result) => result.studentExists).length,
      results,
    });
  } catch (error) {
    console.error("student operational statuses error:", error);
    return res.status(500).json({ error: "No se pudo consultar el estado de los alumnos" });
  }
}
