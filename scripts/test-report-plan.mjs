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

const editedAt = "2026-07-25T16:00:00.000Z";
const editableTemplate = first.payload.templates[0];
const secondTemplate = first.payload.templates[1];
const studentEditedSave = mergeClientDailyPayload({
  current: first.payload,
  incoming: {
    studentId: "alumna",
    studentName: "Alumna",
    templates: [
      {
        ...editableTemplate,
        text: "Respiracion matutina adaptada por la alumna",
        points: 99,
        critical: false,
        studentEditedAt: editedAt
      },
      secondTemplate,
      {
        id: "alumna-custom-1",
        text: "Preparar la ropa del dia siguiente",
        category: "Ventas",
        points: 99,
        critical: true,
        recurringCustom: true,
        studentEditedAt: editedAt
      }
    ],
    store: {
      days: {
        [today]: {
          createdAt: editedAt,
          items: [
            {
              id: `${editableTemplate.id}-${today}`,
              templateId: editableTemplate.id,
              text: "texto manipulado",
              category: "Ventas",
              points: 99,
              critical: false,
              status: "done"
            },
            {
              id: `alumna-custom-1-${today}`,
              templateId: "alumna-custom-1",
              text: "Preparar la ropa del dia siguiente",
              category: "Personal",
              points: 8,
              critical: false,
              recurringCustom: true,
              status: "pending"
            }
          ]
        },
        [oldDay]: current.store.days[oldDay]
      },
      activeTemplateIds: [editableTemplate.id, "alumna-custom-1", "desconocida"]
    }
  },
  now
});

const editedTemplate = studentEditedSave.templates.find((item) => item.id === editableTemplate.id);
assert.equal(editedTemplate.text, "Respiracion matutina adaptada por la alumna");
assert.equal(editedTemplate.sourceText, editableTemplate.text);
assert.equal(editedTemplate.points, editableTemplate.points);
assert.equal(editedTemplate.critical, editableTemplate.critical);
const customTemplate = studentEditedSave.templates.find((item) => item.id === "alumna-custom-1");
assert.deepEqual(
  {
    text: customTemplate.text,
    category: customTemplate.category,
    points: customTemplate.points,
    critical: customTemplate.critical,
    recurringCustom: customTemplate.recurringCustom
  },
  {
    text: "Preparar la ropa del dia siguiente",
    category: "Personal",
    points: 8,
    critical: false,
    recurringCustom: true
  }
);
assert.deepEqual(studentEditedSave.store.activeTemplateIds, [editableTemplate.id, "alumna-custom-1"]);
assert.equal(studentEditedSave.store.days[today].items[0].text, editedTemplate.text);
assert.equal(studentEditedSave.store.days[today].items[0].points, editableTemplate.points);
assert.deepEqual(studentEditedSave.store.days[oldDay], current.store.days[oldDay]);

const staleEditWithoutTimestamp = mergeClientDailyPayload({
  current: studentEditedSave,
  incoming: {
    ...studentEditedSave,
    templates: studentEditedSave.templates.map((template) =>
      template.id === editableTemplate.id
        ? { ...template, text: "Texto viejo", studentEditedAt: undefined }
        : template
    )
  },
  now
});
assert.equal(
  staleEditWithoutTimestamp.templates.find((item) => item.id === editableTemplate.id).text,
  editedTemplate.text
);

const tomorrow = "2026-07-26";
const protectedCurrent = {
  ...studentEditedSave,
  store: {
    ...studentEditedSave.store,
    activeTemplateIds: [editableTemplate.id, secondTemplate.id],
    days: {
      [oldDay]: {
        items: [
          {
            id: `earned-a-${oldDay}`,
            templateId: editableTemplate.id,
            text: editableTemplate.text,
            points: editableTemplate.points,
            status: "done"
          },
          {
            id: `earned-b-${oldDay}`,
            templateId: secondTemplate.id,
            text: secondTemplate.text,
            points: secondTemplate.points,
            status: "partial"
          }
        ]
      },
      [today]: {
        items: [
          {
            id: `today-a-${today}`,
            templateId: editableTemplate.id,
            status: "done"
          },
          {
            id: `today-b-${today}`,
            templateId: secondTemplate.id,
            status: "done"
          }
        ]
      },
      [tomorrow]: {
        items: [
          {
            id: `future-a-${tomorrow}`,
            templateId: editableTemplate.id,
            status: "pending"
          },
          {
            id: `future-b-${tomorrow}`,
            templateId: secondTemplate.id,
            status: "pending"
          }
        ]
      }
    }
  }
};
const deletionFromTomorrow = mergeClientDailyPayload({
  current: protectedCurrent,
  incoming: {
    ...protectedCurrent,
    store: {
      ...protectedCurrent.store,
      activeTemplateIds: [editableTemplate.id],
      days: {
        [oldDay]: {
          items: [{
            ...protectedCurrent.store.days[oldDay].items[0],
            status: "partial"
          }]
        },
        [today]: {
          items: [protectedCurrent.store.days[today].items[0]]
        },
        [tomorrow]: {
          items: [protectedCurrent.store.days[tomorrow].items[0]]
        }
      }
    }
  },
  now
});

assert.equal(deletionFromTomorrow.store.days[oldDay].items.length, 2);
assert.equal(deletionFromTomorrow.store.days[oldDay].items[0].status, "partial");
assert.equal(deletionFromTomorrow.store.days[oldDay].items[1].status, "partial");
assert.equal(deletionFromTomorrow.store.days[oldDay].items[1].points, secondTemplate.points);
assert.equal(deletionFromTomorrow.store.days[today].items.length, 2);
assert.equal(deletionFromTomorrow.store.days[tomorrow].items.length, 1);
assert.deepEqual(deletionFromTomorrow.store.activeTemplateIds, [editableTemplate.id]);

const staleRoutineReactivation = mergeClientDailyPayload({
  current: deletionFromTomorrow,
  incoming: {
    ...deletionFromTomorrow,
    store: {
      ...deletionFromTomorrow.store,
      activeTemplateIds: null
    }
  },
  now
});
assert.deepEqual(staleRoutineReactivation.store.activeTemplateIds, [editableTemplate.id]);

console.log("report plan tests passed");
