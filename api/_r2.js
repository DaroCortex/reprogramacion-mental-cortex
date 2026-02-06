import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
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

const getBucket = () => {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    throw new Error("Bucket no configurado");
  }
  return bucket;
};

const getStudentsKey = () => process.env.R2_STUDENTS_KEY || "students.json";

const readStudents = async () => {
  const client = getS3Client();
  const bucket = getBucket();
  const key = getStudentsKey();
  try {
    const data = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const raw = await streamToString(data.Body);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.students) ? parsed.students : [];
  } catch (error) {
    return [];
  }
};

const writeStudents = async (students) => {
  const client = getS3Client();
  const bucket = getBucket();
  const key = getStudentsKey();
  const body = JSON.stringify({ students }, null, 2);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/json"
    })
  );
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

export { getS3Client, readStudents, writeStudents, signPutUrl, signGetUrl };
