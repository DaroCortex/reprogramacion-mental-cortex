import crypto from "crypto";

const getSupportSecret = () => {
  const secret = String(process.env.STUDENT_SUPPORT_CREDENTIAL_SECRET || "").trim();
  if (secret.length < 32) {
    throw new Error("STUDENT_SUPPORT_CREDENTIAL_SECRET no configurado");
  }
  return secret;
};

const getCredentialVersion = (student = {}) =>
  String(
    student?.auth?.passwordHash ||
      student?.passwordHash ||
      student?.auth?.passwordSetAt ||
      student?.createdAt ||
      "v1"
  );

const deriveStudentSupportPassword = (student = {}) => {
  const identity = `${String(student.slug || "").trim()}:${String(student.email || "")
    .trim()
    .toLowerCase()}`;
  const digest = crypto
    .createHmac("sha256", getSupportSecret())
    .update(`student-support:v1:${identity}:${getCredentialVersion(student)}`)
    .digest("base64url");
  return `Cortex-${digest.slice(0, 16)}`;
};

const verifyStudentSupportPassword = (student, candidate) => {
  const expected = Buffer.from(deriveStudentSupportPassword(student), "utf8");
  const actual = Buffer.from(String(candidate || ""), "utf8");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

export { deriveStudentSupportPassword, verifyStudentSupportPassword };
