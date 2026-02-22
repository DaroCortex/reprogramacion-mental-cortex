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

const clampMagicUnlockScore = (value, fallback = 82) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(60, Math.min(98, Math.round(num)));
};

const readStudents = async () => {
  const parsed = await readJson(getStudentsKey(), { students: [] });
  return Array.isArray(parsed.students) ? parsed.students : [];
};

const writeStudents = async (students) => {
  await writeJson(getStudentsKey(), { students });
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
    magicUnlockScore: clampMagicUnlockScore(parsed?.magicUnlockScore, 82)
  };
};

const writeAppSettings = async (settings) => {
  const next = {
    magicUnlockScore: clampMagicUnlockScore(settings?.magicUnlockScore, 82)
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

const writeJson = async (key, value) => {
  const client = getS3Client();
  const bucket = getBucket();
  const body = JSON.stringify(value, null, 2);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/json"
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
  writeJson,
  listObjects,
  deleteObject,
  getObjectBuffer
};
