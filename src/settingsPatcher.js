import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { HOOK_COMMAND } from "./hookWriter.js";

function defaultSettingsPath() {
  return path.join(os.homedir(), ".claude", "settings.json");
}

function ensureHookContainers(settings, diffLines) {
  if (!settings.hooks || typeof settings.hooks !== "object" || Array.isArray(settings.hooks)) {
    settings.hooks = {};
    diffLines.push("+ created hooks object");
  }

  if (!Array.isArray(settings.hooks.UserPromptSubmit)) {
    settings.hooks.UserPromptSubmit = [];
    diffLines.push("+ created hooks.UserPromptSubmit array");
  }
}

function hasCommandHook(entries, command) {
  for (const entry of entries) {
    if (!entry || !Array.isArray(entry.hooks)) {
      continue;
    }

    for (const hook of entry.hooks) {
      if (hook?.type === "command" && hook?.command === command) {
        return true;
      }
    }
  }

  return false;
}

function dedupeCommandHooks(entries) {
  const seen = new Set();

  for (const entry of entries) {
    if (!entry || !Array.isArray(entry.hooks)) {
      continue;
    }

    entry.hooks = entry.hooks.filter((hook) => {
      if (!hook || hook.type !== "command") {
        return true;
      }

      const key = `${hook.type}::${hook.command}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }
}

async function loadSettings(settingsPath) {
  if (!(await fs.pathExists(settingsPath))) {
    return { settings: {}, created: true };
  }

  const raw = await fs.readFile(settingsPath, "utf8");
  if (!raw.trim()) {
    return { settings: {}, created: false };
  }

  try {
    return { settings: JSON.parse(raw), created: false };
  } catch (error) {
    const message = `Invalid JSON in ${settingsPath}. Please fix it, then run skill-activate again. Details: ${error.message}`;
    throw new Error(message);
  }
}

export async function patchSettings(options = {}) {
  const settingsPath = options.settingsPath ?? defaultSettingsPath();
  const command = options.command ?? HOOK_COMMAND;
  const diffLines = [];

  await fs.ensureDir(path.dirname(settingsPath));

  const { settings, created } = await loadSettings(settingsPath);
  if (created) {
    diffLines.push("+ created settings.json");
  }

  ensureHookContainers(settings, diffLines);

  const entries = settings.hooks.UserPromptSubmit;
  const alreadyExists = hasCommandHook(entries, command);

  if (!alreadyExists) {
    entries.push({
      hooks: [
        {
          type: "command",
          command
        }
      ]
    });
    diffLines.push(`+ added UserPromptSubmit command hook: ${command}`);
  }

  dedupeCommandHooks(entries);
  await fs.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

  if (diffLines.length === 0) {
    diffLines.push("= no changes (already wired)");
  }

  return {
    settingsPath,
    changed: diffLines.some((line) => line.startsWith("+")),
    diffLines,
    settings
  };
}

export async function removeHookFromSettings(options = {}) {
  const settingsPath = options.settingsPath ?? defaultSettingsPath();
  const command = options.command ?? HOOK_COMMAND;

  if (!(await fs.pathExists(settingsPath))) {
    return { settingsPath, changed: false, removedCount: 0 };
  }

  const raw = await fs.readFile(settingsPath, "utf8");
  if (!raw.trim()) {
    return { settingsPath, changed: false, removedCount: 0 };
  }

  let settings;
  try {
    settings = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${settingsPath}. Fix it manually before uninstall. Details: ${error.message}`);
  }

  const entries = settings?.hooks?.UserPromptSubmit;
  if (!Array.isArray(entries)) {
    return { settingsPath, changed: false, removedCount: 0 };
  }

  let removedCount = 0;

  for (const entry of entries) {
    if (!entry || !Array.isArray(entry.hooks)) {
      continue;
    }

    const before = entry.hooks.length;
    entry.hooks = entry.hooks.filter((hook) => !(hook?.type === "command" && hook?.command === command));
    removedCount += before - entry.hooks.length;
  }

  if (removedCount === 0) {
    return { settingsPath, changed: false, removedCount: 0 };
  }

  await fs.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return { settingsPath, changed: true, removedCount };
}

export async function isHookConfigured(options = {}) {
  const settingsPath = options.settingsPath ?? defaultSettingsPath();
  const command = options.command ?? HOOK_COMMAND;

  if (!(await fs.pathExists(settingsPath))) {
    return false;
  }

  const raw = await fs.readFile(settingsPath, "utf8");
  if (!raw.trim()) {
    return false;
  }

  let settings;
  try {
    settings = JSON.parse(raw);
  } catch {
    return false;
  }

  const entries = settings?.hooks?.UserPromptSubmit;
  if (!Array.isArray(entries)) {
    return false;
  }

  return hasCommandHook(entries, command);
}
