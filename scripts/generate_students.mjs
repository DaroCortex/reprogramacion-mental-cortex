import fs from "fs/promises";
import crypto from "crypto";
import path from "path";

const root = process.cwd();
const sourcePath = path.join(root, "public", "students-source.json");
const outputPath = path.join(root, "public", "students.json");
const csvPath = path.join(root, "public", "students-links.csv");
const baseUrl = process.env.BASE_URL || "https://tu-dominio.vercel.app";

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();

const withGeneratedSlugs = (items) => {
  const seen = new Map();
  return items.map((item) => {
    const base = item.slug ? slugify(item.slug) : slugify(item.name || "");
    const safeBase = base || "estudiante";
    const count = (seen.get(safeBase) || 0) + 1;
    seen.set(safeBase, count);
    const slug = count === 1 ? safeBase : `${safeBase}-${count}`;
    return { ...item, slug };
  });
};

const makeToken = () => crypto.randomBytes(16).toString("hex");

const main = async () => {
  const raw = await fs.readFile(sourcePath, "utf-8");
  const data = JSON.parse(raw);
  const students = Array.isArray(data.students) ? data.students : [];

  const normalized = withGeneratedSlugs(students).map((item) => ({
    name: item.name,
    audioKey: item.audioKey,
    slug: item.slug,
    token: item.token || makeToken()
  }));

  await fs.writeFile(outputPath, JSON.stringify({ students: normalized }, null, 2));
  const csvLines = [
    "name,slug,token,link",
    ...normalized.map((item) => {
      const link = `${baseUrl}/s/${item.slug}?t=${item.token}`;
      const safeName = String(item.name || "").replace(/\"/g, '\"\"');
      return `"${safeName}",${item.slug},${item.token},${link}`;
    })
  ];
  await fs.writeFile(csvPath, csvLines.join("\n"));
  console.log(`Listo. Generado ${outputPath}`);
  console.log(`Listo. Generado ${csvPath}`);
};

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
