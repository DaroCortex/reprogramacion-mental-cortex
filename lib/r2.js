import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const getS3Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Faltan credenciales de Cloudflare R2.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    requestChecksumCalculation: "NEVER",
    responseChecksumValidation: "NEVER",
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
};

const streamToString = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
};

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const getBucket = () => {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    throw new Error("Bucket no configurado");
  }
  return bucket;
};

const getStudentsKey = () => process.env.R2_STUDENTS_KEY || "students.json";
const getAdminsKey = () => process.env.R2_ADMINS_KEY || "admins.json";
const getAppSettingsKey = () => process.env.R2_APP_SETTINGS_KEY || "app-settings.json";
const STUDENTS_SNAPSHOT = Symbol.for("rm.studentsSnapshot");
const PATCH_NO_CHANGE = Symbol("patch-no-change");
const PATCH_DELETE = Symbol("patch-delete");
const MAX_STUDENTS_WRITE_ATTEMPTS = 8;

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const isPlainObject = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const isPreconditionFailed = (error) =>
  error?.$metadata?.httpStatusCode === 412 ||
  error?.name === "PreconditionFailed" ||
  error?.Code === "PreconditionFailed";

const isNotFound = (error) =>
  error?.$metadata?.httpStatusCode === 404 ||
  error?.name === "NoSuchKey" ||
  error?.Code === "NoSuchKey";

const jsonValuesEqual = (left, right) => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => jsonValuesEqual(value, right[index]))
    );
  }
  if (isPlainObject(left) || isPlainObject(right)) {
    if (!isPlainObject(left) || !isPlainObject(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(right, key) &&
          jsonValuesEqual(left[key], right[key])
      )
    );
  }
  return false;
};

const buildJsonPatch = (baseline, desired) => {
  if (jsonValuesEqual(baseline, desired)) return PATCH_NO_CHANGE;
  if (isPlainObject(baseline) && isPlainObject(desired)) {
    const changes = {};
    let changed = false;
    for (const key of new Set([...Object.keys(baseline), ...Object.keys(desired)])) {
      if (!Object.prototype.hasOwnProperty.call(desired, key)) {
        changes[key] = PATCH_DELETE;
        changed = true;
        continue;
      }
      const childPatch = buildJsonPatch(baseline[key], desired[key]);
      if (childPatch !== PATCH_NO_CHANGE) {
        changes[key] = childPatch;
        changed = true;
      }
    }
    return changed ? { type: "merge", changes } : PATCH_NO_CHANGE;
  }
  return { type: "set", value: cloneJson(desired) };
};

const newestTimestampValue = (current, desired) => {
  const currentTs = Date.parse(String(current || ""));
  const desiredTs = Date.parse(String(desired || ""));
  if (!Number.isFinite(currentTs)) return desired;
  if (!Number.isFinite(desiredTs)) return current;
  return currentTs > desiredTs ? current : desired;
};

const applyJsonPatch = (current, patch, path = []) => {
  if (patch === PATCH_NO_CHANGE) return current;
  if (patch?.type === "set") {
    const field = path[path.length - 1];
    if (field === "updatedAt" || field === "lastAudioAccessAt") {
      return newestTimestampValue(current, patch.value);
    }
    return cloneJson(patch.value);
  }
  if (patch?.type !== "merge") return current;

  const output = isPlainObject(current) ? { ...current } : {};
  for (const [key, childPatch] of Object.entries(patch.changes)) {
    if (childPatch === PATCH_DELETE) {
      delete output[key];
      continue;
    }
    output[key] = applyJsonPatch(output[key], childPatch, [...path, key]);
  }
  return output;
};

const studentIdentity = (student = {}) => String(student.slug || "").trim();

const mergeStudentsFromSnapshot = (baseline = [], desired = [], latest = []) => {
  const baselineBySlug = new Map(
    baseline.map((student) => [studentIdentity(student), student]).filter(([slug]) => slug)
  );
  const desiredBySlug = new Map(
    desired.map((student) => [studentIdentity(student), student]).filter(([slug]) => slug)
  );
  const latestSlugs = new Set(latest.map(studentIdentity).filter(Boolean));
  const deletedSlugs = new Set(
    [...baselineBySlug.keys()].filter((slug) => !desiredBySlug.has(slug))
  );

  const merged = latest
    .filter((student) => !deletedSlugs.has(studentIdentity(student)))
    .map((student) => {
      const slug = studentIdentity(student);
      const desiredStudent = desiredBySlug.get(slug);
      if (!desiredStudent) return student;
      const baselineStudent = baselineBySlug.get(slug) || {};
      return applyJsonPatch(student, buildJsonPatch(baselineStudent, desiredStudent));
    });

  for (const desiredStudent of desired) {
    const slug = studentIdentity(desiredStudent);
    if (slug && !latestSlugs.has(slug)) {
      merged.push(cloneJson(desiredStudent));
    }
  }

  return merged;
};

const attachStudentsSnapshot = (students, etag) => {
  const snapshot = {
    etag: String(etag || ""),
    baseline: cloneJson(students)
  };
  Object.defineProperty(students, STUDENTS_SNAPSHOT, {
    value: snapshot,
    enumerable: false,
    configurable: false
  });
  for (const student of students) {
    if (!isPlainObject(student)) continue;
    Object.defineProperty(student, STUDENTS_SNAPSHOT, {
      value: snapshot,
      enumerable: true,
      configurable: false
    });
  }
  return students;
};

const getStudentsSnapshot = (students = []) =>
  students?.[STUDENTS_SNAPSHOT] ||
  students.find((student) => student?.[STUDENTS_SNAPSHOT])?.[STUDENTS_SNAPSHOT] ||
  null;

const clampMagicUnlockScore = (value, fallback = 82) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(60, Math.min(98, Math.round(num)));
};

const readStudents = async () => {
  const snapshot = await readJsonSnapshot(getStudentsKey(), { students: [] });
  const students = Array.isArray(snapshot.value.students) ? snapshot.value.students : [];
  return attachStudentsSnapshot(students, snapshot.etag);
};

const writeStudents = async (students) => {
  const desired = cloneJson(students);
  const initialSnapshot = getStudentsSnapshot(students);
  if (!initialSnapshot?.etag) {
    await writeJson(getStudentsKey(), { students: desired });
    return desired;
  }

  let candidate = desired;
  let expectedEtag = initialSnapshot.etag;
  for (let attempt = 1; attempt <= MAX_STUDENTS_WRITE_ATTEMPTS; attempt += 1) {
    try {
      await writeJson(
        getStudentsKey(),
        { students: candidate },
        { ifMatch: expectedEtag }
      );
      return candidate;
    } catch (error) {
      if (!isPreconditionFailed(error) || attempt === MAX_STUDENTS_WRITE_ATTEMPTS) {
        throw error;
      }
      const latest = await readStudents();
      const latestSnapshot = getStudentsSnapshot(latest);
      candidate = mergeStudentsFromSnapshot(initialSnapshot.baseline, desired, latest);
      expectedEtag = latestSnapshot?.etag || "";
      if (!expectedEtag) {
        throw new Error("No se pudo versionar students.json durante un conflicto");
      }
    }
  }
  throw new Error("No se pudo actualizar students.json después de varios intentos");
};

const readAdmins = async () => {
  const parsed = await readJson(getAdminsKey(), { admins: [] });
  return Array.isArray(parsed.admins) ? parsed.admins : [];
};

const writeAdmins = async (admins) => {
  await writeJson(getAdminsKey(), { admins });
};

const readAppSettings = async () => {
  const parsed = await readJson(getAppSettingsKey(), {});
  return {
    magicUnlockScore: clampMagicUnlockScore(parsed?.magicUnlockScore, 82),
    channelingEnabled: Boolean(parsed?.channelingEnabled)
  };
};

const writeAppSettings = async (settings) => {
  const previous = await readAppSettings();
  const next = {
    magicUnlockScore: clampMagicUnlockScore(
      settings?.magicUnlockScore,
      previous.magicUnlockScore
    ),
    channelingEnabled:
      typeof settings?.channelingEnabled === "boolean"
        ? settings.channelingEnabled
        : previous.channelingEnabled
  };
  await writeJson(getAppSettingsKey(), next);
  return next;
};

const signPutUrl = async (key) => {
  const client = getS3Client();
  const bucket = getBucket();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

const signGetUrl = async (key) => {
  const client = getS3Client();
  const bucket = getBucket();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

const uploadObject = async (key, body, contentType) => {
  const client = getS3Client();
  const bucket = getBucket();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream"
    })
  );
};

const readJson = async (key, fallback = {}) => {
  const client = getS3Client();
  const bucket = getBucket();
  try {
    const data = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const raw = await streamToString(data.Body);
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

const readJsonSnapshot = async (key, fallback = {}) => {
  const client = getS3Client();
  const bucket = getBucket();
  try {
    const data = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const raw = await streamToString(data.Body);
    return {
      value: JSON.parse(raw),
      etag: String(data.ETag || "")
    };
  } catch (error) {
    if (isNotFound(error)) {
      return { value: fallback, etag: "" };
    }
    throw error;
  }
};

const writeJson = async (key, value, options = {}) => {
  const client = getS3Client();
  const bucket = getBucket();
  const body = JSON.stringify(value, null, 2);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
      ...(options.ifMatch ? { IfMatch: options.ifMatch } : {}),
      ...(options.ifNoneMatch ? { IfNoneMatch: options.ifNoneMatch } : {})
    })
  );
};

const listObjects = async (prefix) => {
  const client = getS3Client();
  const bucket = getBucket();
  const output = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    })
  );
  return output.Contents || [];
};

const deleteObject = async (key) => {
  const client = getS3Client();
  const bucket = getBucket();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );
};

const getObjectBuffer = async (key) => {
  const client = getS3Client();
  const bucket = getBucket();
  const output = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );
  return {
    buffer: await streamToBuffer(output.Body),
    contentType: output.ContentType || "application/octet-stream"
  };
};

export {
  getS3Client,
  getBucket,
  readStudents,
  writeStudents,
  readAdmins,
  writeAdmins,
  readAppSettings,
  writeAppSettings,
  signPutUrl,
  signGetUrl,
  uploadObject,
  readJson,
  readJsonSnapshot,
  writeJson,
  listObjects,
  deleteObject,
  getObjectBuffer,
  isPreconditionFailed,
  mergeStudentsFromSnapshot
};
