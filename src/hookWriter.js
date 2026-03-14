import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

export const HOOK_FILE_NAME = "skill-forced-eval-hook.sh";
export const HOOK_COMMAND = `~/.claude/hooks/${HOOK_FILE_NAME}`;

function defaultHookPath() {
  return path.join(os.homedir(), ".claude", "hooks", HOOK_FILE_NAME);
}

function templatePathFromModule() {
  return new URL("../templates/forced-eval-hook.sh", import.meta.url);
}

export async function installHook(options = {}) {
  const hookPath = options.hookPath ?? defaultHookPath();
  const templatePath = options.templatePath ?? templatePathFromModule();

  const templateContent = await fs.readFile(templatePath, "utf8");
  const normalizedTemplate = templateContent.replace(/\r\n/g, "\n");

  await fs.ensureDir(path.dirname(hookPath));

  let changed = true;
  if (await fs.pathExists(hookPath)) {
    const existing = (await fs.readFile(hookPath, "utf8")).replace(/\r\n/g, "\n");
    changed = existing !== normalizedTemplate;
  }

  if (changed) {
    await fs.writeFile(hookPath, normalizedTemplate, "utf8");
  }

  let executable = true;
  try {
    await fs.chmod(hookPath, 0o755);
  } catch {
    executable = process.platform === "win32";
  }

  return { hookPath, changed, executable };
}

export async function removeHook(options = {}) {
  const hookPath = options.hookPath ?? defaultHookPath();
  if (await fs.pathExists(hookPath)) {
    await fs.remove(hookPath);
    return { hookPath, removed: true };
  }

  return { hookPath, removed: false };
}
