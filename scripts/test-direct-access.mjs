import assert from "node:assert/strict";
import {
  DIRECT_ACCESS_WINDOW_MS,
  activateDirectAccess,
  isDirectAccessExpired
} from "../lib/student-direct-access.js";
import {
  createSessionForStudent,
  findStudentBySession
} from "../lib/student-auth.js";

const start = Date.parse("2026-08-03T12:00:00.000Z");
const borja = { slug: "borja-garcia-calvo", name: "Borja Garcia Calvo", auth: {} };

const activated = activateDirectAccess(borja, start);
assert.equal(activated.ok, true);
assert.equal(Date.parse(activated.expiresAt), start + DIRECT_ACCESS_WINDOW_MS);

const repeated = activateDirectAccess(activated.student, start + 10 * 24 * 60 * 60 * 1000);
assert.equal(repeated.ok, true);
assert.equal(repeated.expiresAt, activated.expiresAt, "Una nueva visita no debe extender los 30 días");

const expired = activateDirectAccess(activated.student, start + DIRECT_ACCESS_WINDOW_MS);
assert.equal(expired.ok, false);
assert.equal(expired.reason, "expired");
assert.equal(isDirectAccessExpired(activated.student, start + DIRECT_ACCESS_WINDOW_MS), true);

const anotherStudent = activateDirectAccess({ slug: "otro-estudiante" }, start);
assert.equal(anotherStudent.ok, false);
assert.equal(anotherStudent.reason, "not-eligible");

const cappedSession = createSessionForStudent(activated.student, { expiresAt: activated.expiresAt });
assert.equal(cappedSession.expiresAt, activated.expiresAt);

const cookieRequest = {
  headers: { cookie: `rm_session=${encodeURIComponent(cappedSession.token)}` }
};
assert.ok(findStudentBySession([cappedSession.student], cookieRequest));
const expiredStudent = {
  ...cappedSession.student,
  auth: {
    ...cappedSession.student.auth,
    directAccess: {
      ...cappedSession.student.auth.directAccess,
      expiresAt: new Date(Date.now() - 1000).toISOString()
    }
  }
};
assert.equal(findStudentBySession([expiredStudent], cookieRequest), null);

console.log("Acceso directo de Borja: pruebas correctas");
