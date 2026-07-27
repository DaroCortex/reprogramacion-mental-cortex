import {
  BEGINNER_COMPLETION_DAYS_REQUIRED,
  BEGINNER_COMPLETION_SECONDS,
  normalizeBeginnerAudioEvent,
  normalizeBeginnerAudioUsage
} from "../lib/beginner-progress.js";
import { readStudents, writeStudents } from "../lib/r2.js";

const apply = process.argv.includes("--apply");
const students = await readStudents();
const changes = [];

const nextStudents = students.map((student) => {
  const usage = student?.usage || {};
  const progress = normalizeBeginnerAudioUsage(usage);
  const completedByDay = { ...progress.completedByDay };
  const additions = [];

  for (const rawEvent of progress.events) {
    const event = normalizeBeginnerAudioEvent(rawEvent, rawEvent.eventAt);
    if (!event.completed || completedByDay[event.dayKey]) continue;

    completedByDay[event.dayKey] = {
      completedAt: event.eventAt,
      count: 1,
      kind: event.kind
    };
    additions.push({
      dayKey: event.dayKey,
      seconds: Math.round(Math.min(event.currentTimeSeconds, event.playedSeconds)),
      kind: event.kind,
      source: event.source
    });
  }

  if (!additions.length) return student;

  const completedDays = Object.keys(completedByDay).length;
  changes.push({
    name: student.name,
    slug: student.slug,
    before: progress.completedDays,
    added: additions,
    after: completedDays,
    reachesSeven: completedDays >= BEGINNER_COMPLETION_DAYS_REQUIRED
  });

  return {
    ...student,
    usage: {
      ...usage,
      beginnerAudioUsage: {
        ...(usage.beginnerAudioUsage || {}),
        completedByDay,
        completedDays,
        requiredDays: BEGINNER_COMPLETION_DAYS_REQUIRED,
        remainingDays: Math.max(0, BEGINNER_COMPLETION_DAYS_REQUIRED - completedDays),
        lastCompletedAt: Object.values(completedByDay)
          .map((entry) => String(entry?.completedAt || ""))
          .sort()
          .at(-1) || progress.lastCompletedAt,
        events: progress.events
      }
    },
    updatedAt: apply ? new Date().toISOString() : student.updatedAt
  };
});

if (apply && changes.length) {
  await writeStudents(nextStudents);
}

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  cutoffSeconds: BEGINNER_COMPLETION_SECONDS,
  changedStudents: changes.length,
  changes
}, null, 2));
