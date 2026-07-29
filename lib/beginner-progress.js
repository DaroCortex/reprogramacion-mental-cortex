const BEGINNER_COMPLETION_DAYS_REQUIRED = 7;
const ADVANCED_UNLOCK_POLICIES = Object.freeze({
  LEGACY_IMMEDIATE: "legacy_immediate",
  AFTER_7_BEGINNER_DAYS: "after_7_beginner_days"
});
const BEGINNER_COMPLETION_SECONDS = 25 * 60;
const BEGINNER_COMPLETION_MIN_PERCENT = 0.92;
const BEGINNER_AUDIO_EVENT_LIMIT = 80;
const BEGINNER_AUDIO_SESSION_LIMIT = 40;

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

const safeIdentifier = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, "")
    .slice(0, 160);

const latestIso = (...values) =>
  values
    .map((value) => safeIso(value || "", ""))
    .filter(Boolean)
    .sort()
    .at(-1) || "";

const normalizeBeginnerSession = (session = {}) => ({
  sessionId: safeIdentifier(session.sessionId),
  lastEventId: safeIdentifier(session.lastEventId || session.eventId),
  lastSequence: clampNumber(session.lastSequence ?? session.sequence, 0, 1000000, 0),
  dayKey: safeDayKey(session.dayKey, session.lastEventAt || session.startedAt),
  kind: String(session.kind || "beginner"),
  source: String(session.source || "unknown"),
  startedAt: safeIso(session.startedAt || session.lastEventAt || ""),
  lastEventAt: safeIso(session.lastEventAt || session.startedAt || ""),
  eventType: String(session.eventType || "event"),
  durationSeconds: clampNumber(session.durationSeconds, 0, 86400, 0),
  currentTimeSeconds: clampNumber(session.currentTimeSeconds, 0, 86400, 0),
  playedSeconds: clampNumber(session.playedSeconds, 0, 86400, 0),
  completionPercent: clampNumber(session.completionPercent, 0, 1, 0),
  completed: Boolean(session.completed),
  seeked: Boolean(session.seeked)
});

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
                kind: String(value?.kind || "beginner"),
                sessionIds: Array.isArray(value?.sessionIds)
                  ? [...new Set(value.sessionIds.map(safeIdentifier).filter(Boolean))].slice(0, 40)
                  : []
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
        source: String(event?.source || ""),
        sessionId: safeIdentifier(event?.sessionId),
        eventId: safeIdentifier(event?.eventId),
        sequence: clampNumber(event?.sequence, 0, 1000000, 0)
      }))
    : [];

  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions
        .map(normalizeBeginnerSession)
        .filter((session) => session.sessionId)
        .sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt))
        .slice(0, BEGINNER_AUDIO_SESSION_LIMIT)
    : [];

  return {
    completedByDay,
    completedDays: Object.keys(completedByDay).length,
    requiredDays: BEGINNER_COMPLETION_DAYS_REQUIRED,
    remainingDays: Math.max(0, BEGINNER_COMPLETION_DAYS_REQUIRED - Object.keys(completedByDay).length),
    lastEventAt: String(raw.lastEventAt || events[0]?.eventAt || ""),
    lastCompletedAt: String(raw.lastCompletedAt || ""),
    events,
    sessions
  };
};

const mergeBeginnerProgressMonotonic = (currentRaw = {}, incomingRaw = {}) => {
  const current = normalizeBeginnerAudioUsage(
    currentRaw?.beginnerAudioUsage ? currentRaw : { beginnerAudioUsage: currentRaw }
  );
  const incoming = normalizeBeginnerAudioUsage(
    incomingRaw?.beginnerAudioUsage ? incomingRaw : { beginnerAudioUsage: incomingRaw }
  );
  const completedByDay = {};

  for (const dayKey of new Set([
    ...Object.keys(current.completedByDay),
    ...Object.keys(incoming.completedByDay)
  ])) {
    const previous = current.completedByDay[dayKey] || {};
    const next = incoming.completedByDay[dayKey] || {};
    completedByDay[dayKey] = {
      completedAt: latestIso(previous.completedAt, next.completedAt),
      count: Math.max(
        clampNumber(previous.count, 0, 999, 0),
        clampNumber(next.count, 0, 999, 0),
        1
      ),
      kind: String(next.kind || previous.kind || "beginner"),
      sessionIds: [
        ...new Set([
          ...(Array.isArray(previous.sessionIds) ? previous.sessionIds : []),
          ...(Array.isArray(next.sessionIds) ? next.sessionIds : [])
        ].map(safeIdentifier).filter(Boolean))
      ].slice(0, 40)
    };
  }

  const currentLastEventAt = safeIso(current.lastEventAt || "", "");
  const incomingLastEventAt = safeIso(incoming.lastEventAt || "", "");
  const base = incomingLastEventAt >= currentLastEventAt ? incoming : current;

  return {
    ...base,
    completedByDay,
    completedDays: Object.keys(completedByDay).length,
    requiredDays: BEGINNER_COMPLETION_DAYS_REQUIRED,
    remainingDays: Math.max(
      0,
      BEGINNER_COMPLETION_DAYS_REQUIRED - Object.keys(completedByDay).length
    ),
    lastEventAt: latestIso(current.lastEventAt, incoming.lastEventAt),
    lastCompletedAt: latestIso(current.lastCompletedAt, incoming.lastCompletedAt)
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
  const eventType = ["started", "resumed", "checkpoint", "paused", "stopped", "completed"].includes(eventTypeRaw)
    ? eventTypeRaw
    : "event";
  const seeked = Boolean(input.seeked);
  const reachedPracticeCutoff = Boolean(
    durationSeconds >= BEGINNER_COMPLETION_SECONDS &&
      currentTimeSeconds >= BEGINNER_COMPLETION_SECONDS &&
      playedSeconds >= BEGINNER_COMPLETION_SECONDS
  );
  const reachedTrackEnd = Boolean(
    eventType === "completed" &&
      durationSeconds >= 60 &&
      completionPercent >= BEGINNER_COMPLETION_MIN_PERCENT &&
      currentTimeSeconds >= durationSeconds * 0.9
  );
  const completed = Boolean(
    !seeked && (reachedPracticeCutoff || reachedTrackEnd)
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
    source: String(input.source || "unknown"),
    sessionId: safeIdentifier(input.sessionId),
    eventId: safeIdentifier(input.eventId),
    sequence: clampNumber(input.sequence, 0, 1000000, 0)
  };
};

const applyBeginnerAudioEvent = (student, input, nowIso = new Date().toISOString()) => {
  const usage = student?.usage || {};
  const previous = normalizeBeginnerAudioUsage(usage);
  const incoming = normalizeBeginnerAudioEvent(input, nowIso);
  const previousSession = incoming.sessionId
    ? previous.sessions.find((session) => session.sessionId === incoming.sessionId)
    : null;
  const duplicateEvent = Boolean(
    incoming.eventId &&
      (
        previousSession?.lastEventId === incoming.eventId ||
        previous.events.some((event) => event.eventId === incoming.eventId)
      )
  );
  const staleSequence = Boolean(
    previousSession &&
      incoming.sequence > 0 &&
      previousSession.lastSequence > 0 &&
      incoming.sequence <= previousSession.lastSequence
  );
  if (duplicateEvent || staleSequence) {
    return student;
  }

  const event = normalizeBeginnerAudioEvent(
    {
      ...incoming,
      durationSeconds: Math.max(previousSession?.durationSeconds || 0, incoming.durationSeconds),
      currentTimeSeconds: Math.max(previousSession?.currentTimeSeconds || 0, incoming.currentTimeSeconds),
      playedSeconds: Math.max(previousSession?.playedSeconds || 0, incoming.playedSeconds),
      seeked: Boolean(previousSession?.seeked || incoming.seeked)
    },
    nowIso
  );
  const sessionCompletedBefore = Boolean(previousSession?.completed);
  const effectiveCompleted = Boolean(sessionCompletedBefore || event.completed);
  const effectiveEvent = effectiveCompleted === event.completed
    ? event
    : { ...event, completed: effectiveCompleted };
  const completedByDay = { ...previous.completedByDay };

  if (effectiveEvent.completed) {
    const existing = completedByDay[effectiveEvent.dayKey];
    const sessionIds = [
      ...new Set([
        ...(Array.isArray(existing?.sessionIds) ? existing.sessionIds : []),
        effectiveEvent.sessionId
      ].filter(Boolean))
    ].slice(0, 40);
    completedByDay[effectiveEvent.dayKey] = {
      completedAt: latestIso(existing?.completedAt, effectiveEvent.eventAt),
      count:
        clampNumber(existing?.count, 0, 999, 0) +
        (sessionCompletedBefore || (effectiveEvent.sessionId && existing?.sessionIds?.includes(effectiveEvent.sessionId))
          ? 0
          : 1),
      kind: effectiveEvent.kind,
      sessionIds
    };
  }

  const retainedEvents = previous.events.filter((storedEvent) => {
    if (!effectiveEvent.sessionId || storedEvent.sessionId !== effectiveEvent.sessionId) return true;
    if (storedEvent.eventType !== "checkpoint") return true;
    return false;
  });
  const events = [effectiveEvent, ...retainedEvents].slice(0, BEGINNER_AUDIO_EVENT_LIMIT);
  const nextSession = effectiveEvent.sessionId
    ? normalizeBeginnerSession({
        ...previousSession,
        sessionId: effectiveEvent.sessionId,
        lastEventId: effectiveEvent.eventId,
        lastSequence: effectiveEvent.sequence,
        dayKey: previousSession?.dayKey || effectiveEvent.dayKey,
        kind: effectiveEvent.kind,
        source: effectiveEvent.source,
        startedAt: previousSession?.startedAt || effectiveEvent.eventAt,
        lastEventAt: latestIso(previousSession?.lastEventAt, effectiveEvent.eventAt),
        eventType: effectiveEvent.completed ? "completed" : effectiveEvent.eventType,
        durationSeconds: effectiveEvent.durationSeconds,
        currentTimeSeconds: effectiveEvent.currentTimeSeconds,
        playedSeconds: effectiveEvent.playedSeconds,
        completionPercent: effectiveEvent.completionPercent,
        completed: effectiveEvent.completed,
        seeked: effectiveEvent.seeked
      })
    : null;
  const sessions = nextSession
    ? [
        nextSession,
        ...previous.sessions.filter((session) => session.sessionId !== nextSession.sessionId)
      ]
        .sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt))
        .slice(0, BEGINNER_AUDIO_SESSION_LIMIT)
    : previous.sessions;
  const beginnerAudioUsage = {
    completedByDay,
    completedDays: Object.keys(completedByDay).length,
    requiredDays: BEGINNER_COMPLETION_DAYS_REQUIRED,
    remainingDays: Math.max(0, BEGINNER_COMPLETION_DAYS_REQUIRED - Object.keys(completedByDay).length),
    lastEventAt: latestIso(previous.lastEventAt, effectiveEvent.eventAt),
    lastCompletedAt: effectiveEvent.completed
      ? latestIso(previous.lastCompletedAt, effectiveEvent.eventAt)
      : previous.lastCompletedAt,
    events,
    sessions
  };
  const shouldCountAsPractice = effectiveEvent.completed || effectiveEvent.playedSeconds >= 60;

  return {
    ...student,
    usage: {
      ...usage,
      firstActivityAt: shouldCountAsPractice
        ? usage.firstActivityAt || effectiveEvent.eventAt
        : usage.firstActivityAt || "",
      lastActivityAt: shouldCountAsPractice
        ? latestIso(usage.lastActivityAt, effectiveEvent.eventAt)
        : usage.lastActivityAt || "",
      practiceActivityByDay: shouldCountAsPractice
        ? {
            ...(usage.practiceActivityByDay || {}),
            [effectiveEvent.dayKey]: Math.max(
              clampNumber(usage.practiceActivityByDay?.[effectiveEvent.dayKey], 0, 9999, 0),
              1
            )
          }
        : usage.practiceActivityByDay || {},
      beginnerAudioUsage
    },
    lastAudioAccessAt: latestIso(student?.lastAudioAccessAt, effectiveEvent.eventAt),
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
  BEGINNER_COMPLETION_SECONDS,
  BEGINNER_COMPLETION_DAYS_REQUIRED,
  applyBeginnerAudioEvent,
  getAdvancedAccessInfo,
  getAdvancedUnlockPolicy,
  hasApprovedAdvancedAudio,
  hadAdvancedEnabledBeforeMigration,
  inferAdvancedUnlockPolicy,
  mergeBeginnerProgressMonotonic,
  normalizeAdvancedUnlockPolicy,
  normalizeBeginnerAudioEvent,
  normalizeBeginnerAudioUsage
};
