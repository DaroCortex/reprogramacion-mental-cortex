import { deleteObject, readStudents, writeStudents, uploadObject } from "../../lib/r2.js";
import { verifyAdminPassword, verifyEditorPassword } from "../../lib/auth.js";
import { buildAudioKey, optimizeAudioBuffer } from "../../lib/audio-optimizer.js";

const BEGINNER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const uniqueKeysReferencedByOthers = (students, slug, key) =>
  students.some((item) => {
    if (item.slug === slug) return false;
    const workflow = item.audioWorkflow || {};
    return (
      item.audioKey === key ||
      workflow.rawAudioKey === key ||
      workflow.beginnerAudioKey === key ||
      workflow.editorAudioKey === key
    );
  });

const cleanupKey = async (students, slug, key) => {
  if (!key || uniqueKeysReferencedByOthers(students, slug, key)) return;
  try {
    await deleteObject(key);
  } catch (cleanupError) {
    console.warn("update-student audio cleanup warning:", cleanupError?.message || cleanupError);
  }
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const {
      password,
      slug,
      action = "",
      audioKey,
      beginnerAudioKey,
      editorAudioKey,
      audioBase64,
      fileName,
      beginnerFileName,
      editorFileName,
      contentType,
      settings,
      studentStatus,
      requestType,
      requestLabel,
      requestSource
    } = req.body || {};
    const isAdmin = await verifyAdminPassword(password);
    const isEditorAction = action === "attach-edited-audio" || action === "attach-beginner-audio";
    const isEditor = !isAdmin && isEditorAction ? await verifyEditorPassword(password) : false;
    if (!isAdmin && !isEditor) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const hasAudioUpdate = Boolean(audioKey || beginnerAudioKey || editorAudioKey || audioBase64);
    const hasSettingsUpdate = Boolean(settings && typeof settings === "object");
    const hasAction = Boolean(action);
    if (isEditor && hasSettingsUpdate) {
      return res.status(403).json({ error: "Editor sin permiso para cambiar configuracion" });
    }
    if (!slug || (!hasAudioUpdate && !hasSettingsUpdate && !hasAction)) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    let nextAudioKey = String(audioKey || beginnerAudioKey || editorAudioKey || "").trim();
    const nextFileName = fileName || beginnerFileName || editorFileName;
    let optimization = null;
    if (hasAudioUpdate && !nextAudioKey && audioBase64 && nextFileName) {
      const inputBuffer = Buffer.from(String(audioBase64), "base64");
      const optimized = await optimizeAudioBuffer({ inputBuffer, fileName: nextFileName });
      optimization = optimized.optimization;
      nextAudioKey = buildAudioKey(nextFileName, optimized.extension || "mp3");
      await uploadObject(nextAudioKey, optimized.buffer, optimized.contentType || contentType);
    }

    const students = await readStudents();
    const index = students.findIndex((item) => item.slug === slug);
    if (index < 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    const current = students[index];
    const previousAudioKey = current.audioKey || "";
    const previousWorkflow = current.audioWorkflow || {};
    const nowIso = new Date().toISOString();
    const workflowRequestMeta = (workflow = {}) => {
      const safeType = String(requestType || workflow.requestType || "student-audio").trim();
      const safeLabel = String(
        requestLabel ||
          workflow.requestLabel ||
          (safeType === "special-binaural" ? "Pedido especial binaural" : "Audio de estudiante")
      ).trim();
      const safeSource = String(
        requestSource || workflow.requestSource || (safeType === "special-binaural" ? "special" : "admin")
      ).trim();
      return {
        requestType: safeType,
        requestLabel: safeLabel,
        requestSource: safeSource
      };
    };
    let cleanupCandidates = [];

    const next = students.map((item) => {
      if (item.slug !== slug) return item;

      const nextFeatures = {
        ...(item.features || {}),
        ...(settings?.features || {})
      };
      let nextWorkflow = { ...(item.audioWorkflow || {}) };
      let activeAudioKey = item.audioKey || "";
      let nextStatus = item.status === "inactive" || item.inactive ? "inactive" : "active";

      if (action === "set-student-status") {
        const safeStatus = String(studentStatus || "").trim().toLowerCase();
        if (safeStatus !== "active" && safeStatus !== "inactive") {
          throw new Error("Estado invalido");
        }
        nextStatus = safeStatus;
      }

      if (action === "request-audio") {
        nextWorkflow = {
          ...nextWorkflow,
          status: nextWorkflow.status === "approved" ? "approved" : "requested",
          requestedAt: nextWorkflow.requestedAt || nowIso,
          ...workflowRequestMeta(nextWorkflow)
        };
      }

      if (action === "attach-edited-audio") {
        if (!nextAudioKey) {
          throw new Error("Falta audio crudo Advanced");
        }
        const previousEditedKey = nextWorkflow.editorAudioKey || "";
        if (previousEditedKey && previousEditedKey !== nextAudioKey && previousEditedKey !== activeAudioKey) {
          cleanupCandidates.push(previousEditedKey);
        }
        nextWorkflow = {
          ...nextWorkflow,
          status: "edited",
          editorAudioKey: nextAudioKey,
          editorFileName: String(nextFileName || nextWorkflow.rawFileName || "audio-crudo-advanced"),
          editedAt: nowIso
        };
      }

      if (action === "attach-beginner-audio") {
        if (!nextAudioKey) {
          throw new Error("Falta audio principiante");
        }
        const previousBeginnerKey = nextWorkflow.beginnerAudioKey || "";
        if (previousBeginnerKey && previousBeginnerKey !== nextAudioKey && previousBeginnerKey !== activeAudioKey) {
          cleanupCandidates.push(previousBeginnerKey);
        }
        nextWorkflow = {
          ...nextWorkflow,
          status: "edited",
          beginnerAudioKey: nextAudioKey,
          beginnerFileName: String(nextFileName || nextWorkflow.rawFileName || "audio-principiante"),
          beginnerEditedAt: nowIso
        };
      }

      if (action === "approve-edited-audio") {
        const advancedKey = nextWorkflow.editorAudioKey || nextAudioKey;
        const beginnerKey = nextWorkflow.beginnerAudioKey || "";
        if (!beginnerKey) {
          throw new Error("Falta el audio editado 30 min para Principiante");
        }
        if (!advancedKey) {
          throw new Error("Falta el audio crudo para Advanced");
        }
        if (activeAudioKey && advancedKey && activeAudioKey !== advancedKey) {
          cleanupCandidates.push(activeAudioKey);
        }
        activeAudioKey = advancedKey;
        nextWorkflow = {
          ...nextWorkflow,
          status: "approved",
          beginnerAudioKey: beginnerKey,
          beginnerFileName: nextWorkflow.beginnerFileName || "",
          editorAudioKey: advancedKey,
          approvedAt: nowIso,
          advancedUnlockAt: nextWorkflow.advancedUnlockAt || new Date(Date.now() + BEGINNER_DAYS * DAY_MS).toISOString()
        };
        nextFeatures.beginnerReprogrammingEnabled = true;
        nextFeatures.advancedReprogrammingEnabled = false;
      }

      if (action === "unlock-advanced") {
        if (!activeAudioKey && !nextWorkflow.editorAudioKey) {
          throw new Error("Primero debe haber un audio aprobado");
        }
        const approvedKey = activeAudioKey || nextWorkflow.editorAudioKey;
        activeAudioKey = approvedKey;
        nextWorkflow = {
          ...nextWorkflow,
          status: "approved",
          editorAudioKey: nextWorkflow.editorAudioKey || approvedKey,
          approvedAt: nextWorkflow.approvedAt || nowIso,
          advancedUnlockAt: nowIso,
          advancedUnlockedAt: nowIso
        };
        nextFeatures.beginnerReprogrammingEnabled = true;
        nextFeatures.advancedReprogrammingEnabled = true;
      }

      if (
        hasAudioUpdate &&
        action !== "attach-beginner-audio" &&
        action !== "attach-edited-audio" &&
        action !== "approve-edited-audio" &&
        action !== "unlock-advanced"
      ) {
        if (nextAudioKey) {
          if (activeAudioKey && activeAudioKey !== nextAudioKey) {
            cleanupCandidates.push(activeAudioKey);
          }
          activeAudioKey = nextAudioKey;
          nextWorkflow = {
            ...nextWorkflow,
            status: "approved",
            beginnerAudioKey: nextAudioKey,
            beginnerFileName: String(fileName || nextWorkflow.beginnerFileName || "audio-principiante"),
            beginnerEditedAt: nowIso,
            editorAudioKey: nextAudioKey,
            editorFileName: String(fileName || nextWorkflow.editorFileName || "audio-aprobado"),
            editedAt: nowIso,
            approvedAt: nowIso,
            advancedUnlockAt: new Date(Date.now() + BEGINNER_DAYS * DAY_MS).toISOString()
          };
          nextFeatures.beginnerReprogrammingEnabled = true;
          nextFeatures.advancedReprogrammingEnabled = false;
        }
      }

      return {
        ...item,
        audioKey: activeAudioKey,
        audioWorkflow: nextWorkflow,
        features: nextFeatures,
        status: nextStatus,
        inactive: nextStatus === "inactive",
        updatedAt: nowIso,
        lastAudioAccessAt: activeAudioKey ? item.lastAudioAccessAt || nowIso : item.lastAudioAccessAt || ""
      };
    });

    await writeStudents(next);
    if (
      previousAudioKey &&
      nextAudioKey &&
      previousAudioKey !== nextAudioKey &&
      action !== "attach-beginner-audio" &&
      action !== "attach-edited-audio"
    ) {
      cleanupCandidates.push(previousAudioKey);
    }
    if (
      previousWorkflow.beginnerAudioKey &&
      action === "attach-beginner-audio" &&
      previousWorkflow.beginnerAudioKey !== nextAudioKey
    ) {
      cleanupCandidates.push(previousWorkflow.beginnerAudioKey);
    }
    if (
      previousWorkflow.editorAudioKey &&
      action === "attach-edited-audio" &&
      previousWorkflow.editorAudioKey !== nextAudioKey
    ) {
      cleanupCandidates.push(previousWorkflow.editorAudioKey);
    }
    for (const key of [...new Set(cleanupCandidates)]) {
      await cleanupKey(next, slug, key);
    }

    return res.status(200).json({ ok: true, optimization });
  } catch (error) {
    console.error("update-student error:", error);
    return res.status(500).json({
      error: "No se pudo actualizar",
      detail: error?.message || "error"
    });
  }
}
