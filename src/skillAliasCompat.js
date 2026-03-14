import fs from "fs-extra";
import path from "node:path";
import yaml from "js-yaml";

const MANIFEST_FILE = ".skill-activate-aliases.json";

function splitFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 3 || lines[0].trim() !== "---") {
    return null;
  }

  let endLine = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      endLine = i;
      break;
    }
  }

  if (endLine === -1) {
    return null;
  }

  const frontmatter = lines.slice(1, endLine).join("\n");
  const body = lines.slice(endLine + 1).join("\n");

  return { frontmatter, body };
}

function toAliasName(skillName) {
  return skillName.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function shouldAliasName(skillName) {
  return /[-_]/.test(skillName);
}

function manifestPath(skillsDir) {
  return path.join(skillsDir, MANIFEST_FILE);
}

async function readManifest(skillsDir) {
  const file = manifestPath(skillsDir);
  if (!(await fs.pathExists(file))) {
    return { file, items: [] };
  }

  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return { file, items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { file, items: [] };
  }
}

async function writeManifest(skillsDir, items) {
  const file = manifestPath(skillsDir);
  await fs.writeFile(file, `${JSON.stringify({ items }, null, 2)}\n`, "utf8");
  return file;
}

export async function createCompatibilityAliases(options = {}) {
  const { skillsDir, skillFiles } = options;
  const created = [];

  if (!skillsDir || !Array.isArray(skillFiles) || skillFiles.length === 0) {
    return { created, manifestFile: null };
  }

  for (const skillFile of skillFiles) {
    const raw = await fs.readFile(skillFile, "utf8");
    const split = splitFrontmatter(raw);
    if (!split) {
      continue;
    }

    const frontmatterObj = yaml.load(split.frontmatter) ?? {};
    const skillName = typeof frontmatterObj.name === "string" ? frontmatterObj.name.trim() : "";
    if (!skillName || !shouldAliasName(skillName)) {
      continue;
    }

    const aliasName = toAliasName(skillName);
    if (!aliasName || aliasName === skillName) {
      continue;
    }

    const skillDir = path.dirname(skillFile);
    const skillDirParent = path.dirname(skillDir);
    const aliasDir = path.join(skillDirParent, aliasName);
    const aliasFile = path.join(aliasDir, "SKILL.md");

    if (await fs.pathExists(aliasFile)) {
      continue;
    }

    const aliasFrontmatter = {
      ...frontmatterObj,
      name: aliasName,
      "x-skill-activate-generated-alias": true,
      "x-skill-activate-alias-of": skillName
    };

    const aliasContent = `---\n${yaml.dump(aliasFrontmatter).trim()}\n---\n${split.body}`;

    await fs.ensureDir(aliasDir);
    await fs.writeFile(aliasFile, aliasContent, "utf8");
    created.push(aliasFile);
  }

  const { items: existing } = await readManifest(skillsDir);
  const merged = [...new Set([...existing, ...created])];
  const manifestFile = await writeManifest(skillsDir, merged);

  return { created, manifestFile };
}

export async function removeCompatibilityAliases(options = {}) {
  const { skillsDir } = options;
  if (!skillsDir) {
    return { removed: [] };
  }

  const { file, items } = await readManifest(skillsDir);
  const removed = [];

  for (const aliasFile of items) {
    if (!(await fs.pathExists(aliasFile))) {
      continue;
    }

    await fs.remove(aliasFile);
    removed.push(aliasFile);

    const aliasDir = path.dirname(aliasFile);
    const entries = await fs.readdir(aliasDir).catch(() => []);
    if (entries.length === 0) {
      await fs.remove(aliasDir);
    }
  }

  if (await fs.pathExists(file)) {
    await fs.remove(file);
  }

  return { removed };
}
