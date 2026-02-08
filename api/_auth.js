import crypto from "crypto";
import { readAdmins, writeAdmins } from "./_r2.js";

const hashPassword = (value) =>
  crypto.createHash("sha256").update(String(value || "")).digest("hex");

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

export { hashPassword, isSuperAdmin, verifyAdminPassword, listAdmins, addAdmin, removeAdmin };
