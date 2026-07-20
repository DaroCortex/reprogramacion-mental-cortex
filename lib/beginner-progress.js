const BEGINNER_COMPLETION_DAYS_REQUIRED = 7;
const ADVANCED_UNLOCK_POLICIES = Object.freeze({
  LEGACY_IMMEDIATE: "legacy_immediate",
  AFTER_7_BEGINNER_DAYS: "after_7_beginner_days"
});
const BEGINNER_COMPLETION_MIN_PERCENT = 0.92;
const BEGINNER_AUDIO_EVENT_LIMIT = 80;

const clampNumber = (value, min, max, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
};

const safeIso = (value, fallback = new Date().toISOString()) => {
  const date = value ? new Date(value) : new Date(fallback);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

const safeDayKey = (value, fallbackIso) => {
  const candidate = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  return safeIso(fallbackIso).slice(0, 10);
};

const normalizeBeginnerAudioUsage = (usage = {}) => {
  const raw = usage?.beginnerAudioUsage || {};
  const completedByDay =
    raw.completedByDay && typeof raw.completedByDay === "object" && !Array.isArray(raw.completedByDay)
      ? Object.fromEntries(
          Object.entries(raw.completedByDay)
            .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(String(key)))
            .map(([key, value]) => [
              key,
              {
                completedAt: safeIso(value?.completedAt || value?.eventAt || ""),
                count: clampNumber(value?.count, 1, 999, 1),
                kind: String(value?.kind || "beginner")
              }
            ])
        )
      : {};

  const events = Array.isArray(raw.events)
    ? raw.events.slice(0, BEGINNER_AUDIO_EVENT_LIMIT).map((event) => ({
        eventType: String(event?.eventType || "unknown"),
        eventAt: safeIso(event?.eventAt || ""),
        dayKey: safeDayKey(event?.dayKey, event?.eventAt),
        kind: String(event?.kind || "beginner"),
        durationSeconds: clampNumber(event?.durationSeconds, 0, 86400, 0),
        currentTimeSeconds: clampNumber(event?.currentTimeSeconds, 0, 86400, 0),
        playedSeconds: clampNumber(event?.playedSeconds, 0, 86400, 0),
        completionPercent: clampNumber(event?.completionPercent, 0, 1, 0),
        completed: Boolean(event?.completed),
        interrupted: Boolean(event?.interrupted),
        seeked: Boolean(event?.seeked),
        source: String(event?.source || "")
      }))
    : [];

  return {
    completedByDay,
    completedDays: Object.keys(completedByDay).length,
    requiredDays: BEGINNER_COMPLETION_DAYS_REQUIRED,
    remainingDays: Math.max(0, BEGINNER_COMPLETION_DAYS_REQUIRED - Object.keys(completedByDay).length),
    lastEventAt: String(raw.lastEventAt || events[0]?.eventAt || ""),
    lastCompletedAt: String(raw.lastCompletedAt || ""),
    events
  };
};

const normalizeBeginnerAudioEvent = (input = {}, nowIso = new Date().toISOString()) => {
  const eventAt = safeIso(input.eventAt || input.timestamp || nowIso, nowIso);
  const durationSeconds = clampNumber(input.durationSeconds, 0, 86400, 0);
  const currentTimeSeconds = clampNumber(input.currentTimeSeconds, 0, 86400, 0);
  const playedSeconds = clampNumber(input.playedSeconds, 0, 86400, 0);
  const completionPercent = durationSeconds > 0
    ? clampNumber(input.completionPercent ?? playedSeconds / durationSeconds, 0, 1, 0)
    : 0;
  const eventTypeRaw = String(input.eventType || input.type || "event").trim().toLowerCase();
  const eventType = ["started", "resumed", "paused", "stopped", "completed"].includes(eventTypeRaw)
    ? eventTypeRaw
    : "event";
  const seeked = Boolean(input.seeked);
  const completed = Boolean(
    eventType === "completed" &&
      !seeked &&
      durationSeconds >= 60 &&
      completionPercent >= BEGINNER_COMPLETION_MIN_PERCENT &&
      currentTimeSeconds >= durationSeconds * 0.9
  );

  return {
    eventType,
    eventAt,
    dayKey: safeDayKey(input.dayKey, eventAt),
    kind: String(input.kind || "beginner"),
    durationSeconds,
    currentTimeSeconds,
    playedSeconds,
    completionPercent,
    completed,
    interrupted: eventType === "paused" || eventType === "stopped",
    seeked,
    source: String(input.source || "unknown")
  };
};

const applyBeginnerAudioEvent = (student, input, nowIso = new Date().toISOString()) => {
  const event = normalizeBeginnerAudioEvent(input, nowIso);
  const usage = student?.usage || {};
  const previous = normalizeBeginnerAudioUsage(usage);
  const completedByDay = { ...previous.completedByDay };

  if (event.completed) {
    const existing = completedByDay[event.dayKey];
    completedByDay[event.dayKey] = {
      completedAt: event.eventAt,
      count: clampNumber(existing?.count, 0, 999, 0) + 1,
      kind: event.kind
    };
  }

  const events = [event, ...previous.events].slice(0, BEGINNER_AUDIO_EVENT_LIMIT);
  const beginnerAudioUsage = {
    completedByDay,
    completedDays: Object.keys(completedByDay).length,
    requiredDays: BEGINNER_COMPLETION_DAYS_REQUIRED,
    remainingDays: Math.max(0, BEGINNER_COMPLETION_DAYS_REQUIRED - Object.keys(completedByDay).length),
    lastEventAt: event.eventAt,
    lastCompletedAt: event.completed ? event.eventAt : previous.lastCompletedAt,
    events
  };
  const shouldCountAsPractice = event.completed || event.playedSeconds >= 60;

  return {
    ...student,
    usage: {
      ...usage,
      firstActivityAt: shouldCountAsPractice ? usage.firstActivityAt || event.eventAt : usage.firstActivityAt || "",
      lastActivityAt: shouldCountAsPractice ? event.eventAt : usage.lastActivityAt || "",
      practiceActivityByDay: shouldCountAsPractice
        ? {
            ...(usage.practiceActivityByDay || {}),
            [event.dayKey]: Math.max(clampNumber(usage.practiceActivityByDay?.[event.dayKey], 0, 9999, 0), 1)
          }
        : usage.practiceActivityByDay || {},
      beginnerAudioUsage
    },
    lastAudioAccessAt: event.eventAt,
    updatedAt: nowIso
  };
};

const hasBeginnerAudio = (student, workflow = student?.audioWorkflow || {}) =>
  Boolean(student?.audioReady || student?.audioKey || workflow.beginnerAudioKey || workflow.status === "approved");

const safeTime = (value) => {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : 0;
};

const hasApprovedAdvancedAudio = (student, workflow = student?.audioWorkflow || {}) => {
  const rawUploadedAt = Math.max(
    safeTime(workflow.rawUploadedAt),
    safeTime(workflow.submittedAt)
  );
  const editedAt = safeTime(workflow.editedAt);
  const hasWorkflowAdvanced = Boolean(workflow.editorAudioKey || workflow.hasEditedAudio);
  const hasRawRecording = Boolean(
    workflow.rawAudioKey ||
      workflow.hasRawAudio ||
      workflow.rawUploadedAt ||
      workflow.submittedAt
  );
  const hasLegacyAdvanced = Boolean(
    (student?.audioKey || student?.audioReady) && !hasWorkflowAdvanced && !hasRawRecording
  );

  if (hasLegacyAdvanced) return true;
  if (!hasWorkflowAdvanced || workflow.status !== "approved") return false;
  if (rawUploadedAt && (!editedAt || rawUploadedAt > editedAt)) return false;
  return true;
};

const normalizeAdvancedUnlockPolicy = (value) => {
  const policy = String(value || "").trim();
  return Object.values(ADVANCED_UNLOCK_POLICIES).includes(policy) ? policy : "";
};

const hadAdvancedEnabledBeforeMigration = (student, workflow = student?.audioWorkflow || {}) =>
  Boolean(
    student?.features?.advancedReprogrammingEnabled ||
      workflow.advancedUnlockedAt ||
      workflow.advancedUnlockAt
  );

const inferAdvancedUnlockPolicy = (student, workflow = student?.audioWorkflow || {}) => {
  const advancedAudioReady = hasApprovedAdvancedAudio(student, workflow);
  return hadAdvancedEnabledBeforeMigration(student, workflow) && advancedAudioReady
    ? ADVANCED_UNLOCK_POLICIES.LEGACY_IMMEDIATE
    : ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS;
};

const getAdvancedUnlockPolicy = (student, workflow = student?.audioWorkflow || {}) =>
  normalizeAdvancedUnlockPolicy(student?.advancedUnlockPolicy) ||
  inferAdvancedUnlockPolicy(student, workflow);

const hasSubmittedPersonalAudio = (student, workflow = student?.audioWorkflow || {}) =>
  Boolean(
    student?.audioKey ||
      workflow.rawAudioKey ||
      workflow.rawUploadedAt ||
      workflow.submittedAt ||
      workflow.editorAudioKey ||
      workflow.status === "submitted"
  );

const getAdvancedAccessInfo = (student = {}) => {
  const workflow = student?.audioWorkflow || {};
  const progress = normalizeBeginnerAudioUsage(student?.usage || {});
  const completedRequiredDays = progress.completedDays >= BEGINNER_COMPLETION_DAYS_REQUIRED;
  const beginnerReady = hasBeginnerAudio(student, workflow);
  const advancedAudioReady = hasApprovedAdvancedAudio(student, workflow);
  const submittedPersonalAudio = hasSubmittedPersonalAudio(student, workflow);
  const unlockPolicy = getAdvancedUnlockPolicy(student, workflow);
  const legacyImmediate = Boolean(
    unlockPolicy === ADVANCED_UNLOCK_POLICIES.LEGACY_IMMEDIATE && advancedAudioReady
  );
  const autoUnlocked = Boolean(
    unlockPolicy === ADVANCED_UNLOCK_POLICIES.AFTER_7_BEGINNER_DAYS &&
    beginnerReady &&
      completedRequiredDays &&
      submittedPersonalAudio &&
      advancedAudioReady
  );
  const unlocked = legacyImmediate || autoUnlocked;
  let blockedReason = "";

  if (!unlocked) {
    if (unlockPolicy === ADVANCED_UNLOCK_POLICIES.LEGACY_IMMEDIATE) {
      blockedReason = "advanced-audio-pending";
    } else if (!submittedPersonalAudio) blockedReason = "missing-personal-audio";
    else if (!beginnerReady) blockedReason = "missing-beginner-audio";
    else if (!completedRequiredDays) blockedReason = "beginner-days";
    else if (!advancedAudioReady) blockedReason = "advanced-audio-pending";
  }

  return {
    beginnerReady,
    advancedAudioReady,
    submittedPersonalAudio,
    completedRequiredDays,
    unlockPolicy,
    legacyImmediate,
    legacyGrandfathered: legacyImmediate,
    completedDays: progress.completedDays,
    requiredDays: BEGINNER_COMPLETION_DAYS_REQUIRED,
    remainingDays: progress.remainingDays,
    unlocked,
    blockedReason,
    progress
  };
};

export {
  ADVANCED_UNLOCK_POLICIES,
  BEGINNER_COMPLETION_DAYS_REQUIRED,
  applyBeginnerAudioEvent,
  getAdvancedAccessInfo,
  getAdvancedUnlockPolicy,
  hasApprovedAdvancedAudio,
  hadAdvancedEnabledBeforeMigration,
  inferAdvancedUnlockPolicy,
  normalizeAdvancedUnlockPolicy,
  normalizeBeginnerAudioUsage
};
