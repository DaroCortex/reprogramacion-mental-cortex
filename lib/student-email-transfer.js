import { isActiveStudent } from "./student-operational-status.js";
import { normalizeEmail } from "./student-auth.js";

const safeSlug = (value) => String(value || "").trim();

const buildTransfer = (students, { sourceSlug, targetSlug, email, nowIso }) => {
  const sourceIndex = students.findIndex((student) => safeSlug(student?.slug) === sourceSlug);
  const targetIndex = students.findIndex((student) => safeSlug(student?.slug) === targetSlug);
  if (sourceIndex < 0 || targetIndex < 0) {
    const error = new Error("No se encontro la cuenta origen o destino");
    error.status = 404;
    throw error;
  }
  if (sourceIndex === targetIndex) {
    const error = new Error("La cuenta origen y destino deben ser distintas");
    error.status = 400;
    throw error;
  }

  const source = students[sourceIndex];
  const target = students[targetIndex];
  if (isActiveStudent(source)) {
    const error = new Error("La cuenta origen debe estar inactiva");
    error.status = 409;
    throw error;
  }
  if (!isActiveStudent(target)) {
    const error = new Error("La cuenta destino debe estar activa");
    error.status = 409;
    throw error;
  }

  const sourceEmail = normalizeEmail(source.email);
  const targetEmail = normalizeEmail(target.email);
  if (targetEmail === email && !sourceEmail) {
    return { changed: false, students, source, target };
  }
  if (sourceEmail !== email) {
    const error = new Error("El email no pertenece a la cuenta origen");
    error.status = 409;
    throw error;
  }
  if (targetEmail && targetEmail !== email) {
    const error = new Error("La cuenta destino ya tiene otro email");
    error.status = 409;
    throw error;
  }
  const conflictingOwner = students.find(
    (student, index) =>
      index !== sourceIndex &&
      index !== targetIndex &&
      normalizeEmail(student?.email) === email,
  );
  if (conflictingOwner) {
    const error = new Error("El email tambien pertenece a otra cuenta");
    error.status = 409;
    throw error;
  }

  const nextStudents = students.slice();
  nextStudents[sourceIndex] = {
    ...source,
    email: "",
    identityTransfer: {
      role: "source",
      transferredAt: nowIso,
      counterpartSlug: targetSlug,
    },
    updatedAt: nowIso,
  };
  nextStudents[targetIndex] = {
    ...target,
    email,
    identityTransfer: {
      role: "target",
      transferredAt: nowIso,
      counterpartSlug: sourceSlug,
    },
    updatedAt: nowIso,
  };
  return {
    changed: true,
    students: nextStudents,
    source: nextStudents[sourceIndex],
    target: nextStudents[targetIndex],
  };
};

export { buildTransfer, safeSlug };
