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

const splitPasswords = (value) =>
  String(value || "")
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf(":");
      return separatorIndex >= 0 ? item.slice(separatorIndex + 1).trim() : item;
    })
    .filter(Boolean);

const getEnvAdminDefinitions = () => {
  const definitions = [
    {
      name: "Dario",
      role: "admin-total",
      locked: true,
      passwords: [
        process.env.ADMIN_PASSWORD,
        process.env.SUPER_ADMIN_PASSWORD,
        process.env.ADMIN_DARIO_PASSWORD
      ]
    },
    {
      name: "Fiore",
      role: "admin",
      locked: true,
      passwords: [process.env.ADMIN_FIORE_PASSWORD]
    },
    {
      name: "Mariam",
      role: "admin",
      locked: true,
      passwords: [process.env.ADMIN_MARIAM_PASSWORD]
    }
  ];

  const extraAdmins = String(process.env.ADMIN_PASSWORDS || "")
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf(":");
      if (separatorIndex < 0) {
        return {
          name: "Admin extra",
          role: "admin",
          locked: true,
          passwords: [item]
        };
      }
      return {
        name: item.slice(0, separatorIndex).trim() || "Admin extra",
        role: "admin",
        locked: true,
        passwords: [item.slice(separatorIndex + 1).trim()]
      };
    });

  return [...definitions, ...extraAdmins].map((item) => ({
    ...item,
    passwords: item.passwords.map((password) => String(password || "").trim()).filter(Boolean)
  })).filter((item) => item.passwords.length > 0);
};

const isSuperAdmin = (password) => {
  const cleanPassword = String(password || "").trim();
  if (!cleanPassword) return false;
  const superPasswords = getEnvAdminDefinitions()
    .filter((item) => item.role === "admin-total")
    .flatMap((item) => item.passwords);
  return superPasswords.includes(cleanPassword);
};

const verifyAdminPassword = async (password) => {
  if (isSuperAdmin(password)) return true;
  if (!password) return false;
  const cleanPassword = String(password || "").trim();
  if (getEnvAdminDefinitions().some((item) => item.passwords.includes(cleanPassword))) {
    return true;
  }
  const admins = await readAdmins();
  const hash = hashPassword(password);
  return admins.some((item) => item.passwordHash === hash);
};

const getEditorPasswords = () => [
  process.env.EDITOR_PASSWORD,
  process.env.EDITOR_MATHI_PASSWORD,
  process.env.EDITOR_MATHIAS_PASSWORD,
  process.env.EDITOR_NICO_PASSWORD,
  ...splitPasswords(process.env.EDITOR_PASSWORDS)
].map((item) => String(item || "").trim()).filter(Boolean);

const verifyEditorPassword = async (password) => {
  const cleanPassword = String(password || "").trim();
  if (!cleanPassword) return false;
  if (await verifyAdminPassword(cleanPassword)) return true;
  return getEditorPasswords().includes(cleanPassword);
};

const listAdmins = async () => {
  const admins = await readAdmins();
  const envAdmins = getEnvAdminDefinitions().map((item) => ({
    name: item.name,
    createdAt: "",
    source: "env",
    role: item.role,
    locked: item.locked
  }));
  const r2Admins = admins.map((item) => ({
    name: item.name,
    createdAt: item.createdAt || "",
    source: "r2",
    role: "admin",
    locked: false
  }));
  const seen = new Set();
  return [...envAdmins, ...r2Admins].filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
