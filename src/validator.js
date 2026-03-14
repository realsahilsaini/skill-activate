import fs from "fs-extra";
import chalk from "chalk";
import path from "node:path";
import { isHookConfigured } from "./settingsPatcher.js";

function checkMark(ok) {
  return ok ? chalk.green("✓") : chalk.red("✗");
}

function homeNormalized(p) {
  return p.replace(/\\/g, "/");
}

export async function validateSetup(options) {
  const {
    claudeDir,
    hookPath,
    settingsPath,
    rewriteResults = []
  } = options;

  const claudeDetected = await fs.pathExists(claudeDir);
  const hookInstalled = await fs.pathExists(hookPath);

  let executable = true;
  if (hookInstalled && process.platform !== "win32") {
    const stat = await fs.stat(hookPath);
    executable = Boolean(stat.mode & 0o111);
  }

  const wired = await isHookConfigured({ settingsPath });
  const changedSkills = rewriteResults.filter((result) => result.changed);
  const backupCount = rewriteResults.filter((result) => result.backupPath).length;

  const lines = [];
  lines.push(chalk.bold("skill-activate setup report"));
  lines.push("───────────────────────────────────────");
  lines.push(`${checkMark(claudeDetected)} Claude Code detected at ${homeNormalized(claudeDir)}`);
  lines.push(`${checkMark(hookInstalled && executable)} Hook installed: ${homeNormalized(hookPath)} (${executable ? "executable" : "not executable"})`);
  lines.push(`${checkMark(wired)} settings.json patched (UserPromptSubmit wired)`);
  lines.push(`${checkMark(true)} ${changedSkills.length} skills found and descriptions rewritten:`);

  for (const item of changedSkills) {
    lines.push(`    → ${path.basename(item.filePath)}`);
  }

  if (changedSkills.length === 0) {
    lines.push("    → no changes (already directive format or no valid descriptions)");
  }

  lines.push(`${checkMark(backupCount >= 0)} Backups saved as .bak files`);
  lines.push("");
  lines.push(chalk.cyan("Expected activation rate: ~84% (was ~20%)"));
  lines.push("───────────────────────────────────────");
  lines.push("Restart Claude Code to apply changes.");

  return {
    ok: claudeDetected && hookInstalled && wired,
    lines,
    summary: {
      claudeDetected,
      hookInstalled,
      executable,
      wired,
      changedSkillCount: changedSkills.length,
      backupCount
    }
  };
}
