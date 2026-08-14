import crypto from "node:crypto";

const ALLOWED_CATEGORIES = new Map([
  ["salud", "Salud"],
  ["sistema", "Sistema"],
  ["recuperacion", "Recuperacion"],
  ["familia", "Familia"],
  ["ventas", "Ventas"],
  ["liderazgo", "Liderazgo"],
  ["personal", "Personal"]
]);

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const stableFragment = (value, fallback) => {
  const result = normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
  return result || fallback;
};

const checksumForChecks = (checks) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(checks))
    .digest("hex");

const buenosAiresDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const parseReportCheck = (rawCheck, index) => {
  const raw = String(rawCheck || "").trim();
  const match = raw.match(
    /^-\s*\[([^\]]+)\]\s*(.*?)\s*\|\s*Cr[ií]tico:\s*(S[ií]|No)\s*\|\s*Puntos:\s*(\d{1,2})\s*$/i
  );
  if (!match) {
    throw new Error(`Check ${index + 1}: formato invalido`);
  }

  const category = ALLOWED_CATEGORIES.get(normalize(match[1]));
  const text = String(match[2] || "").trim();
  const points = Number(match[4]);
  if (!category) {
    throw new Error(`Check ${index + 1}: categoria invalida`);
  }
  if (!text || text.length > 90) {
    throw new Error(`Check ${index + 1}: texto invalido`);
  }
  if (!Number.isInteger(points) || points < 8 || points > 12) {
    throw new Error(`Check ${index + 1}: puntos fuera de rango`);
  }

  return {
    text,
    category,
    critical: normalize(match[3]) === "si",
    points
  };
};

const parseReportChecks = (rawChecks) => {
  if (!Array.isArray(rawChecks) || rawChecks.length !== 12) {
    throw new Error("El plan debe contener exactamente 12 checks");
  }

  const parsed = rawChecks.map(parseReportCheck);
  if (parsed.filter((check) => check.critical).length !== 5) {
    throw new Error("El plan debe contener exactamente 5 checks criticos");
  }

  const distinct = new Set(parsed.map((check) => normalize(check.text)));
  if (distinct.size !== parsed.length) {
    throw new Error("El plan contiene checks duplicados");
  }
  return parsed;
};

const buildTemplates = ({ checks, submissionId }) => {
  const source = stableFragment(submissionId, "informe");
  return checks.map((check, index) => {
    const digest = crypto
      .createHash("sha256")
      .update(`${check.category}|${check.text}|${check.critical}|${check.points}`)
      .digest("hex")
      .slice(0, 10);
    return {
      id: `report-${source}-${index + 1}-${digest}`,
      ...check
    };
  });
};

const buildReportPlanPayload = ({
  student,
  current,
  submissionId,
  reportGeneratedAt,
  rawChecks,
  now = new Date()
}) => {
  const checks = parseReportChecks(rawChecks);
  const checksum = checksumForChecks(checks);
  const safeCurrent = current && typeof current === "object" ? current : {};
  if (
    safeCurrent.sourceReport?.submissionId === submissionId &&
    safeCurrent.sourceReport?.checksum === checksum
  ) {
    return { payload: safeCurrent, unchanged: true };
  }

  const previousStore =
    safeCurrent.store && typeof safeCurrent.store === "object"
      ? safeCurrent.store
      : {};
  const previousDays =
    previousStore.days && typeof previousStore.days === "object"
      ? previousStore.days
      : {};
  const todayKey = buenosAiresDateKey(now);
  const days = { ...previousDays };
  delete days[todayKey];

  return {
    unchanged: false,
    payload: {
      ...safeCurrent,
      studentId: student.slug,
      studentName: student.name || safeCurrent.studentName || student.slug,
      coachNotes: "Plan generado desde el informe de tu reunion.",
      templates: buildTemplates({ checks, submissionId }),
      store: {
        ...previousStore,
        days,
        activeTemplateIds: null
      },
      sourceReport: {
        system: "formulario-cortex",
        submissionId,
        generatedAt: reportGeneratedAt || "",
        checksum,
        syncedAt: now.toISOString()
      }
    }
  };
};

const VALID_DAILY_STATUSES = new Set(["done", "partial", "missed", "pending", "na"]);
const MAX_STUDENT_CUSTOM_TEMPLATES = 20;

const cleanStudentTaskText = (value) => {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text.length >= 4 && text.length <= 90 ? text : "";
};

const cleanStudentEditDate = (value) => {
  const text = String(value || "").trim();
  if (!text || Number.isNaN(Date.parse(text))) return "";
  return new Date(text).toISOString();
};

const mergeStudentEditableTemplates = ({ currentTemplates, incomingTemplates, now }) => {
  const incomingById = new Map(
    incomingTemplates
      .filter((template) => template?.id)
      .map((template) => [String(template.id), template])
  );
  const currentIds = new Set(currentTemplates.map((template) => String(template?.id || "")));

  const merged = currentTemplates.map((template) => {
    const id = String(template?.id || "");
    const incoming = incomingById.get(id);
    if (!incoming) return template;

    const nextText = cleanStudentTaskText(incoming.text);
    const incomingEditedAt = cleanStudentEditDate(incoming.studentEditedAt);
    const currentEditedAt = cleanStudentEditDate(template.studentEditedAt);
    const editIsNewer = incomingEditedAt && (!currentEditedAt || incomingEditedAt > currentEditedAt);
    if (!nextText || nextText === template.text || !editIsNewer) return template;

    return {
      ...template,
      sourceText: template.sourceText || template.text,
      text: nextText,
      studentEditedAt: incomingEditedAt
    };
  });

  const customTemplates = incomingTemplates
    .filter((template) => template?.recurringCustom === true)
    .filter((template) => !currentIds.has(String(template?.id || "")))
    .slice(0, MAX_STUDENT_CUSTOM_TEMPLATES)
    .map((template, index) => {
      const text = cleanStudentTaskText(template.text);
      if (!text) return null;
      const rawId = String(template.id || "").trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100);
      const id = rawId || `student-custom-${now.getTime()}-${index + 1}`;
      return {
        id,
        text,
        category: "Personal",
        critical: false,
        points: 8,
        recurringCustom: true,
        createdBy: "student",
        studentEditedAt: cleanStudentEditDate(template.studentEditedAt) || now.toISOString()
      };
    })
    .filter(Boolean);

  return [...merged, ...customTemplates];
};

const normalizeDailyItem = (item, templateById = null) => {
  if (!item || typeof item !== "object") return null;
  const templateId = String(item.templateId || "");
  const template = templateId && templateById ? templateById.get(templateId) : null;
  if (templateId && templateById && !template) return null;
  if (!template) {
    return { ...item };
  }
  return {
    ...item,
    text: template.text,
    category: template.category,
    critical: template.critical,
    points: template.points,
    recurringCustom: Boolean(template.recurringCustom),
    status: VALID_DAILY_STATUSES.has(item.status) ? item.status : "pending"
  };
};

const normalizeDailyDay = (day, templateById = null) => {
  if (!day || typeof day !== "object") return null;
  const sourceItems = Array.isArray(day.items) ? day.items : [];
  const items = sourceItems
    .map((item) => normalizeDailyItem(item, templateById))
    .filter(Boolean);
  if (sourceItems.length && !items.length) return null;
  return { ...day, items };
};

const mergeProtectedDailyDays = ({
  currentDays,
  incomingDays,
  todayKey,
  templateById = null
}) => {
  const normalizedIncomingDays = Object.fromEntries(
    Object.entries(incomingDays || {})
      .map(([dayKey, day]) => [dayKey, normalizeDailyDay(day, templateById)])
      .filter(([, day]) => Boolean(day))
  );
  const mergedDays = { ...normalizedIncomingDays };

  for (const [dayKey, currentDay] of Object.entries(currentDays || {})) {
    if (dayKey > todayKey) continue;
    const incomingDay = normalizedIncomingDays[dayKey];
    if (!incomingDay) {
      mergedDays[dayKey] = currentDay;
      continue;
    }

    const currentItems = Array.isArray(currentDay?.items) ? currentDay.items : [];
    const incomingItems = Array.isArray(incomingDay.items) ? incomingDay.items : [];
    const incomingById = new Map(
      incomingItems.filter((item) => item?.id).map((item) => [item.id, item])
    );
    const currentIds = new Set(currentItems.map((item) => item?.id).filter(Boolean));
    const protectedItems = currentItems.map((currentItem) => {
      const incomingItem = incomingById.get(currentItem.id);
      if (!incomingItem) return currentItem;
      if (dayKey === todayKey) return incomingItem;
      if (!VALID_DAILY_STATUSES.has(incomingItem.status)) return currentItem;
      return { ...currentItem, status: incomingItem.status };
    });
    const additions = dayKey === todayKey
      ? incomingItems.filter((item) => item?.id && !currentIds.has(item.id))
      : [];

    mergedDays[dayKey] = {
      ...currentDay,
      ...(dayKey === todayKey ? incomingDay : {}),
      items: [...protectedItems, ...additions]
    };
  }

  return mergedDays;
};

const resolveActiveTemplateIds = ({ currentValue, incomingValue, validTemplateIds = null }) => {
  if (Array.isArray(incomingValue)) {
    const unique = Array.from(new Set(incomingValue.filter(Boolean)));
    return validTemplateIds ? unique.filter((id) => validTemplateIds.has(id)) : unique;
  }
  if (incomingValue === null) {
    return Array.isArray(currentValue) ? currentValue : null;
  }
  return currentValue ?? null;
};

const mergeClientDailyPayload = ({ current, incoming, now = new Date() }) => {
  const safeCurrent = current && typeof current === "object" ? current : {};
  const safeIncoming = incoming && typeof incoming === "object" ? incoming : {};
  const currentStore =
    safeCurrent.store && typeof safeCurrent.store === "object"
      ? safeCurrent.store
      : {};
  const incomingStore =
    safeIncoming.store && typeof safeIncoming.store === "object"
      ? safeIncoming.store
      : {};
  const currentDays =
    currentStore.days && typeof currentStore.days === "object"
      ? currentStore.days
      : {};
  const rawIncomingDays =
    incomingStore.days && typeof incomingStore.days === "object"
      ? incomingStore.days
      : {};
  const todayKey = buenosAiresDateKey(now);

  if (!safeCurrent.sourceReport?.checksum) {
    return {
      ...safeIncoming,
      store: {
        ...incomingStore,
        days: mergeProtectedDailyDays({
          currentDays,
          incomingDays: rawIncomingDays,
          todayKey
        }),
        activeTemplateIds: resolveActiveTemplateIds({
          currentValue: currentStore.activeTemplateIds,
          incomingValue: incomingStore.activeTemplateIds
        })
      }
    };
  }

  const currentTemplates = Array.isArray(safeCurrent.templates)
    ? safeCurrent.templates
    : [];
  const incomingTemplates = Array.isArray(safeIncoming.templates)
    ? safeIncoming.templates
    : [];
  const mergedTemplates = mergeStudentEditableTemplates({
    currentTemplates,
    incomingTemplates,
    now
  });
  const validTemplateIds = new Set(
    mergedTemplates.map((template) => template?.id).filter(Boolean)
  );
  const templateById = new Map(
    mergedTemplates.map((template) => [template.id, template])
  );
  const incomingDays = mergeProtectedDailyDays({
    currentDays,
    incomingDays: rawIncomingDays,
    todayKey,
    templateById
  });

  const incomingActiveTemplateIds = incomingStore.activeTemplateIds;
  const currentActiveTemplateIds = currentStore.activeTemplateIds;
  const activeTemplateIds = resolveActiveTemplateIds({
    currentValue: currentActiveTemplateIds,
    incomingValue: incomingActiveTemplateIds,
    validTemplateIds
  });

  return {
    ...safeIncoming,
    studentId: safeCurrent.studentId || safeIncoming.studentId,
    studentName: safeCurrent.studentName || safeIncoming.studentName,
    coachNotes: safeCurrent.coachNotes || safeIncoming.coachNotes,
    templates: mergedTemplates,
    store: {
      ...incomingStore,
      days: incomingDays,
      activeTemplateIds
    },
    sourceReport: safeCurrent.sourceReport
  };
};

export {
  buenosAiresDateKey,
  buildReportPlanPayload,
  mergeClientDailyPayload,
  parseReportChecks
};
