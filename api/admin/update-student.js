import { deleteObject, getObjectBuffer, readStudents, writeStudents, uploadObject } from "../../lib/r2.js";
import { verifyAdminPassword, verifyEditorPassword } from "../../lib/auth.js";
import { buildAudioKey, optimizeAudioBuffer } from "../../lib/audio-optimizer.js";
import { normalizeEmail } from "../../lib/student-auth.js";
import {
  ADVANCED_UNLOCK_POLICIES,
  getAdvancedUnlockPolicy
} from "../../lib/beginner-progress.js";

const uniqueKeysReferencedByOthers = (students, slug, key) =>
  students.some((item) => {
    if (item.slug === slug) return false;
    const workflow = item.audioWorkflow || {};
    return (
      item.audioKey === key ||
      workflow.rawAudioKey === key ||
      workflow.beginnerAudioKey === key ||
      workflow.beginnerAltAudioKey === key ||
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

const safeTimestamp = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
};

const assertCurrentAdvancedAudio = (workflow = {}, advancedKey = "") => {
  const key = String(advancedKey || workflow.editorAudioKey || "").trim();
  if (!key) {
    throw new Error("Falta el audio final Advanced");
  }
  if (workflow.beginnerAudioKey && key === workflow.beginnerAudioKey) {
    throw new Error("El audio Advanced no puede ser el mismo archivo de Principiante");
  }
  if (workflow.beginnerAltAudioKey && key === workflow.beginnerAltAudioKey) {
    throw new Error("El audio Advanced no puede ser el mismo archivo de Principiante 2");
  }

  const rawUploadedAt = Math.max(
    safeTimestamp(workflow.rawUploadedAt),
    safeTimestamp(workflow.submittedAt)
  );
  const editedAt = safeTimestamp(workflow.editedAt);
  if (rawUploadedAt && (!editedAt || rawUploadedAt > editedAt)) {
    throw new Error("El audio final Advanced debe cargarse despues del crudo actual");
  }

  return key;
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
      rawAudioKey,
      beginnerAudioKey,
      beginnerAltAudioKey,
      editorAudioKey,
      audioBase64,
      fileName,
      rawFileName,
      beginnerFileName,
      beginnerAltFileName,
      editorFileName,
      contentType,
      settings,
      email,
      sourceExternalId,
      sourceSystem,
      studentStatus,
      requestType,
      requestLabel,
      requestSource
    } = req.body || {};
    const isAdmin = await verifyAdminPassword(password);
    const isEditorAction =
      action === "attach-edited-audio" ||
      action === "attach-beginner-audio" ||
      action === "attach-beginner-alt-audio" ||
      action === "attach-raw-audio" ||
      action === "unlock-advanced";
    const isEditor = !isAdmin && isEditorAction ? await verifyEditorPassword(password) : false;
    if (!isAdmin && !isEditor) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const hasAudioUpdate = Boolean(
      audioKey || rawAudioKey || beginnerAudioKey || beginnerAltAudioKey || editorAudioKey || audioBase64
    );
    const hasSettingsUpdate = Boolean(settings && typeof settings === "object");
    const hasAction = Boolean(action);
    if (isEditor && hasSettingsUpdate) {
      return res.status(403).json({ error: "Editor sin permiso para cambiar configuracion" });
    }
    if (!slug || (!hasAudioUpdate && !hasSettingsUpdate && !hasAction)) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const nextRawAudioKey = String(rawAudioKey || "").trim();
    let nextAudioKey = String(audioKey || beginnerAudioKey || beginnerAltAudioKey || editorAudioKey || "").trim();
    const nextFileName = fileName || rawFileName || beginnerFileName || beginnerAltFileName || editorFileName;
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
    let processedRawUpload = null;
    if (action === "attach-raw-audio") {
      if (!nextRawAudioKey) {
        throw new Error("Falta audio original legacy");
      }
      const { buffer: rawBuffer, contentType: rawContentType } = await getObjectBuffer(nextRawAudioKey);
      const legacyFileName = String(nextFileName || "audio-legacy-alumno");
      const optimized = await optimizeAudioBuffer({
        inputBuffer: rawBuffer,
        fileName: legacyFileName
      });
      optimization = optimized.optimization;
      nextAudioKey = buildAudioKey(legacyFileName, optimized.extension || "mp3");
      await uploadObject(nextAudioKey, optimized.buffer, optimized.contentType || rawContentType || contentType);
      processedRawUpload = {
        rawAudioKey: nextRawAudioKey,
        rawFileName: legacyFileName,
        editorAudioKey: nextAudioKey,
        editorFileName: `${legacyFileName} procesado`
      };
    }
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
    const safeEmail = normalizeEmail(email);
    const safeSourceExternalId = String(sourceExternalId || "").trim();
    const safeSourceSystem = String(sourceSystem || (safeSourceExternalId ? "formulario-cortex" : "")).trim();

    const next = students.map((item) => {
      if (item.slug !== slug) return item;

      const nextFeatures = {
        ...(item.features || {}),
        ...(settings?.features || {})
      };
      let nextWorkflow = { ...(item.audioWorkflow || {}) };
      let activeAudioKey = item.audioKey || "";
      let nextAdvancedUnlockPolicy = getAdvancedUnlockPolicy(item, nextWorkflow);
      let nextStatus = item.status === "inactive" || item.inactive ? "inactive" : "active";

      if (action === "set-student-status") {
        const safeStatus = String(studentStatus || "").trim().toLowerCase();
        if (safeStatus !== "active" && safeStatus !== "inactive") {
          throw new Error("Estado invalido");
        }
        nextStatus = safeStatus;
      }

      let nextEmail = item.email || "";
      let nextSource = item.source || item.externalSource || null;
      if (action === "update-profile") {
        if (safeEmail) nextEmail = safeEmail;
        if (safeSourceExternalId) {
          nextSource = {
            ...(nextSource || {}),
            system: safeSourceSystem,
            externalId: safeSourceExternalId
          };
        }
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

      if (action === "attach-beginner-alt-audio") {
        if (!nextAudioKey) {
          throw new Error("Falta audio principiante 2");
        }
        const previousBeginnerAltKey = nextWorkflow.beginnerAltAudioKey || "";
        if (previousBeginnerAltKey && previousBeginnerAltKey !== nextAudioKey && previousBeginnerAltKey !== activeAudioKey) {
          cleanupCandidates.push(previousBeginnerAltKey);
        }
        nextWorkflow = {
          ...nextWorkflow,
          status: "edited",
          beginnerAltAudioKey: nextAudioKey,
          beginnerAltFileName: String(nextFileName || nextWorkflow.rawFileName || "audio-principiante-2"),
          beginnerAltEditedAt: nowIso
        };
      }

      if (action === "attach-raw-audio") {
        const previousRawKey = nextWorkflow.rawAudioKey || "";
        const previousEditedKey = nextWorkflow.editorAudioKey || "";
        if (previousRawKey && previousRawKey !== processedRawUpload.rawAudioKey && previousRawKey !== activeAudioKey) {
          cleanupCandidates.push(previousRawKey);
        }
        if (previousEditedKey && previousEditedKey !== activeAudioKey) {
          cleanupCandidates.push(previousEditedKey);
        }
        nextWorkflow = {
          ...nextWorkflow,
          status: "edited",
          rawAudioKey: processedRawUpload.rawAudioKey,
          rawFileName: processedRawUpload.rawFileName,
          rawSource: "editor-legacy",
          rawUploadedAt: nowIso,
          submittedAt: nowIso,
          editorAudioKey: processedRawUpload.editorAudioKey,
          editorFileName: processedRawUpload.editorFileName,
          editedAt: nowIso
        };
      }

      if (action === "approve-edited-audio") {
        const advancedKey = nextWorkflow.editorAudioKey || nextAudioKey;
        const beginnerKey = nextWorkflow.beginnerAudioKey || "";
        if (!beginnerKey) {
          throw new Error("Falta el audio editado 30 min para Principiante");
        }
        const currentAdvancedKey = assertCurrentAdvancedAudio(nextWorkflow, advancedKey);
        if (activeAudioKey && currentAdvancedKey && activeAudioKey !== currentAdvancedKey) {
          cleanupCandidates.push(activeAudioKey);
        }
        activeAudioKey = currentAdvancedKey;
        nextWorkflow = {
          ...nextWorkflow,
          status: "approved",
          beginnerAudioKey: beginnerKey,
          beginnerFileName: nextWorkflow.beginnerFileName || "",
          beginnerAltAudioKey: nextWorkflow.beginnerAltAudioKey || "",
          beginnerAltFileName: nextWorkflow.beginnerAltFileName || "",
          editorAudioKey: currentAdvancedKey,
          approvedAt: nowIso,
          advancedUnlockAt: "",
          advancedUnlockedAt: ""
        };
        nextFeatures.beginnerReprogrammingEnabled = true;
        nextFeatures.advancedReprogrammingEnabled = false;
        nextAdvancedUnlockPolicy = ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS;
      }

      if (action === "unlock-advanced") {
        const approvedKey = assertCurrentAdvancedAudio(nextWorkflow, nextWorkflow.editorAudioKey || nextAudioKey);
        activeAudioKey = approvedKey;
        const hasBeginnerKey = Boolean(nextWorkflow.beginnerAudioKey);
        nextWorkflow = {
          ...nextWorkflow,
          status: "approved",
          editorAudioKey: nextWorkflow.editorAudioKey || approvedKey,
          editorFileName: nextWorkflow.editorFileName || nextWorkflow.rawFileName || "audio-crudo-advanced",
          approvedAt: nowIso,
          advancedUnlockAt: nowIso,
          advancedUnlockedAt: nowIso
        };
        nextFeatures.beginnerReprogrammingEnabled = hasBeginnerKey;
        nextFeatures.advancedReprogrammingEnabled = true;
        nextAdvancedUnlockPolicy = ADVANCED_UNLOCK_POLICIES.LEGACY_IMMEDIATE;
      }

      if (
        hasAudioUpdate &&
        action !== "attach-beginner-audio" &&
        action !== "attach-beginner-alt-audio" &&
        action !== "attach-raw-audio" &&
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
            beginnerAltAudioKey: nextWorkflow.beginnerAltAudioKey || "",
            beginnerAltFileName: nextWorkflow.beginnerAltFileName || "",
            editorAudioKey: nextAudioKey,
            editorFileName: String(fileName || nextWorkflow.editorFileName || "audio-aprobado"),
            editedAt: nowIso,
            approvedAt: nowIso,
            advancedUnlockAt: "",
            advancedUnlockedAt: ""
          };
          nextFeatures.beginnerReprogrammingEnabled = true;
          nextFeatures.advancedReprogrammingEnabled = false;
          nextAdvancedUnlockPolicy = ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS;
        }
      }

      return {
        ...item,
        email: nextEmail,
        ...(nextSource ? { source: nextSource } : {}),
        audioKey: activeAudioKey,
        audioWorkflow: nextWorkflow,
        advancedUnlockPolicy: nextAdvancedUnlockPolicy,
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
      action !== "attach-beginner-alt-audio" &&
      action !== "attach-raw-audio" &&
      action !== "attach-edited-audio"
    ) {
      cleanupCandidates.push(previousAudioKey);
    }
    if (
      previousWorkflow.beginnerAltAudioKey &&
      action === "attach-beginner-alt-audio" &&
      previousWorkflow.beginnerAltAudioKey !== nextAudioKey
    ) {
      cleanupCandidates.push(previousWorkflow.beginnerAltAudioKey);
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
