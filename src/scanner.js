import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

function defaultSkillsDir() {
  return path.join(os.homedir(), ".claude", "skills");
}

async function walkForSkillFiles(dirPath, out) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await walkForSkillFiles(entryPath, out);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase() === "skill.md") {
      out.push(entryPath);
    }
  }
}

export async function scanSkills(options = {}) {
  const skillsDir = options.skillsDir ?? defaultSkillsDir();
  const found = [];

  if (!(await fs.pathExists(skillsDir))) {
    return { skillsDir, files: [] };
  }

  await walkForSkillFiles(skillsDir, found);
  found.sort((a, b) => a.localeCompare(b));

  return { skillsDir, files: found };
}

export async function scanBackupFiles(options = {}) {
  const skillsDir = options.skillsDir ?? defaultSkillsDir();
  const found = [];

  if (!(await fs.pathExists(skillsDir))) {
    return { skillsDir, files: [] };
  }

  async function walk(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(".bak")) {
        found.push(entryPath);
      }
    }
  }

  await walk(skillsDir);
  found.sort((a, b) => a.localeCompare(b));

  return { skillsDir, files: found };
}
