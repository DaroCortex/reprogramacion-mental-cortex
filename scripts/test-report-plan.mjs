import assert from "node:assert/strict";
import {
  buenosAiresDateKey,
  buildReportPlanPayload,
  mergeClientDailyPayload,
  parseReportChecks
} from "../lib/report-plan.js";

const checks = [
  "- [Salud] Respiracion matutina con audio | Critico: Si | Puntos: 12",
  "- [Sistema] Revisar prioridades del dia | Critico: Si | Puntos: 11",
  "- [Recuperacion] Dormir siete horas | Critico: Si | Puntos: 10",
  "- [Familia] Conversar sin pantallas | Critico: Si | Puntos: 9",
  "- [Ventas] Contactar dos prospectos | Critico: Si | Puntos: 8",
  "- [Liderazgo] Delegar una tarea | Critico: No | Puntos: 10",
  "- [Personal] Escribir tres logros | Critico: No | Puntos: 9",
  "- [Salud] Caminar veinte minutos | Critico: No | Puntos: 8",
  "- [Sistema] Actualizar el registro diario | Critico: No | Puntos: 8",
  "- [Familia] Compartir una comida | Critico: No | Puntos: 8",
  "- [Recuperacion] Evitar pantallas al dormir | Critico: No | Puntos: 9",
  "- [Personal] Leer diez paginas | Critico: No | Puntos: 8"
];

assert.equal(parseReportChecks(checks).length, 12);
assert.throws(
  () => parseReportChecks(checks.slice(0, 11)),
  /exactamente 12/
);

const now = new Date("2026-07-25T15:00:00.000Z");
const today = buenosAiresDateKey(now);
const oldDay = "2026-07-24";
const current = {
  studentId: "old",
  templates: [{ id: "old-task" }],
  store: {
    days: {
      [oldDay]: { items: [{ id: "historic" }] },
      [today]: { items: [{ id: "replace-today" }] }
    },
    activeTemplateIds: ["old-task"]
  }
};
const first = buildReportPlanPayload({
  student: { slug: "alumna", name: "Alumna" },
  current,
  submissionId: "submission-123",
  reportGeneratedAt: "2026-07-25T14:00:00.000Z",
  rawChecks: checks,
  now
});

assert.equal(first.unchanged, false);
assert.equal(first.payload.templates.length, 12);
assert.equal(first.payload.store.days[today], undefined);
assert.deepEqual(first.payload.store.days[oldDay], current.store.days[oldDay]);
assert.equal(first.payload.store.activeTemplateIds, null);
assert.equal(first.payload.templates.filter((item) => item.critical).length, 5);

const second = buildReportPlanPayload({
  student: { slug: "alumna", name: "Alumna" },
  current: first.payload,
  submissionId: "submission-123",
  reportGeneratedAt: "2026-07-25T14:00:00.000Z",
  rawChecks: checks,
  now
});
assert.equal(second.unchanged, true);

const staleClientSave = mergeClientDailyPayload({
  current: first.payload,
  incoming: {
    studentId: "alumna",
    studentName: "Alumna",
    templates: [{ id: "old-task" }],
    store: {
      days: {
        [today]: {
          items: [{ id: "old-today", templateId: "old-task" }]
        },
        [oldDay]: current.store.days[oldDay]
      },
      activeTemplateIds: ["old-task"]
    }
  },
  now
});
assert.equal(staleClientSave.templates.length, 12);
assert.equal(staleClientSave.store.days[today], undefined);
assert.deepEqual(staleClientSave.store.days[oldDay], current.store.days[oldDay]);
assert.equal(staleClientSave.sourceReport.checksum, first.payload.sourceReport.checksum);

console.log("report plan tests passed");
