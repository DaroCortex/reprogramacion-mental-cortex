import { readAdmins, writeAdmins } from "./r2.js";

const hashPassword = (value) => {
  const input = String(value || "");
  // Hash simple determinístico sin dependencias nativas.
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return `h${(hash >>> 0).toString(16)}`;
};

const isSuperAdmin = (password) => {
  const master = process.env.ADMIN_PASSWORD || "";
  return Boolean(password && master && password === master);
};

const verifyAdminPassword = async (password) => {
  if (isSuperAdmin(password)) return true;
  if (!password) return false;
  const admins = await readAdmins();
  const hash = hashPassword(password);
  return admins.some((item) => item.passwordHash === hash);
};

const splitEditorPasswords = (value) =>
  String(value || "")
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf(":");
      return separatorIndex >= 0 ? item.slice(separatorIndex + 1).trim() : item;
    })
    .filter(Boolean);

const getEditorPasswords = () => [
  process.env.EDITOR_PASSWORD,
  process.env.EDITOR_MATHI_PASSWORD,
  process.env.EDITOR_NICO_PASSWORD,
  ...splitEditorPasswords(process.env.EDITOR_PASSWORDS)
].map((item) => String(item || "").trim()).filter(Boolean);

const verifyEditorPassword = async (password) => {
  const cleanPassword = String(password || "").trim();
  if (!cleanPassword) return false;
  if (await verifyAdminPassword(cleanPassword)) return true;
  return getEditorPasswords().includes(cleanPassword);
};

const listAdmins = async () => {
  const admins = await readAdmins();
  return admins.map((item) => ({
    name: item.name,
    createdAt: item.createdAt || ""
  }));
};

const addAdmin = async ({ superPassword, name, adminPassword }) => {
  if (!isSuperAdmin(superPassword)) {
    throw new Error("Solo el admin principal puede crear administradores");
  }
  const cleanName = String(name || "").trim();
  const cleanPass = String(adminPassword || "").trim();
  if (!cleanName || cleanPass.length < 6) {
    throw new Error("Nombre y password (min 6) requeridos");
  }

  const admins = await readAdmins();
  if (admins.some((item) => item.name.toLowerCase() === cleanName.toLowerCase())) {
    throw new Error("Ya existe un administrador con ese nombre");
  }

  admins.push({
    name: cleanName,
    passwordHash: hashPassword(cleanPass),
    createdAt: new Date().toISOString()
  });
  await writeAdmins(admins);
};

const removeAdmin = async ({ superPassword, name }) => {
  if (!isSuperAdmin(superPassword)) {
    throw new Error("Solo el admin principal puede eliminar administradores");
  }
  const cleanName = String(name || "").trim();
  const admins = await readAdmins();
  const next = admins.filter((item) => item.name !== cleanName);
  await writeAdmins(next);
};

export {
  hashPassword,
  isSuperAdmin,
  verifyAdminPassword,
  verifyEditorPassword,
  listAdmins,
  addAdmin,
  removeAdmin
};
