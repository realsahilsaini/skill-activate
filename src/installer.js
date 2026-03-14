import chalk from "chalk";
import fs from "fs-extra";
import ora from "ora";
import os from "node:os";
import path from "node:path";
import { scanBackupFiles, scanSkills } from "./scanner.js";
import { rewriteSkillDescriptions } from "./descriptionRewriter.js";
import { installHook, removeHook, HOOK_COMMAND, HOOK_FILE_NAME } from "./hookWriter.js";
import { patchSettings, removeHookFromSettings, isHookConfigured } from "./settingsPatcher.js";
import { validateSetup } from "./validator.js";
import { createCompatibilityAliases, removeCompatibilityAliases } from "./skillAliasCompat.js";

function getPaths(options = {}) {
  const homeDir = options.homeDir ?? os.homedir();
  const claudeDir = path.join(homeDir, ".claude");
  const skillsDir = path.join(claudeDir, "skills");
  const hooksDir = path.join(claudeDir, "hooks");
  const settingsPath = path.join(claudeDir, "settings.json");
  const hookPath = path.join(hooksDir, HOOK_FILE_NAME);

  return {
    homeDir,
    claudeDir,
    skillsDir,
    hooksDir,
    settingsPath,
    hookPath
  };
}

function startSpinner(text) {
  return ora({ text }).start();
}

export async function runInstall(options = {}) {
  const paths = getPaths(options);
  const templatePath = options.templatePath;

  const detectSpinner = startSpinner("Step 1/6: Detecting Claude Code installation");
  const hasClaude = await fs.pathExists(paths.claudeDir);

  if (!hasClaude) {
    detectSpinner.fail("Claude Code installation not found.");
    throw new Error(
      "Claude Code is not installed (missing ~/.claude). Install Claude Code first: https://docs.anthropic.com/en/docs/claude-code"
    );
  }

  detectSpinner.succeed("Claude Code installation detected");

  const scanSpinner = startSpinner("Step 2/6: Scanning installed skills");
  const scanResult = await scanSkills({ skillsDir: paths.skillsDir });
  scanSpinner.succeed(`Found ${scanResult.files.length} SKILL.md file(s)`);

  const rewriteSpinner = startSpinner("Step 3/6: Rewriting skill descriptions to directive format");
  const rewriteResults = await rewriteSkillDescriptions(scanResult.files);
  const rewrittenCount = rewriteResults.filter((item) => item.changed).length;
  rewriteSpinner.succeed(`Rewrote ${rewrittenCount} description(s)`);

  const aliasSpinner = startSpinner("Adding compatibility aliases for hyphenated skill ids");
  const aliasResult = await createCompatibilityAliases({
    skillsDir: paths.skillsDir,
    skillFiles: scanResult.files
  });
  aliasSpinner.succeed(`Created ${aliasResult.created.length} compatibility alias(es)`);

  const hookSpinner = startSpinner("Step 4/6: Installing forced-eval hook script");
  const hookResult = await installHook({ hookPath: paths.hookPath, templatePath });
  hookSpinner.succeed(hookResult.changed ? "Hook installed/updated" : "Hook already up to date");

  const settingsSpinner = startSpinner("Step 5/6: Patching Claude settings.json");
  const patchResult = await patchSettings({ settingsPath: paths.settingsPath, command: HOOK_COMMAND });
  settingsSpinner.succeed(patchResult.changed ? "settings.json patched" : "settings.json already wired");

  console.log(chalk.dim("\nsettings.json diff:"));
  for (const line of patchResult.diffLines) {
    console.log(chalk.dim(`  ${line}`));
  }

  const validateSpinner = startSpinner("Step 6/6: Validating setup");
  const validation = await validateSetup({
    claudeDir: paths.claudeDir,
    hookPath: paths.hookPath,
    settingsPath: paths.settingsPath,
    rewriteResults
  });

  validateSpinner.succeed(validation.ok ? "Validation complete" : "Validation completed with warnings");
  console.log("");
  for (const line of validation.lines) {
    console.log(line);
  }

  return {
    paths,
    scanResult,
    rewriteResults,
    aliasResult,
    hookResult,
    patchResult,
    validation
  };
}

export async function runScan(options = {}) {
  const paths = getPaths(options);
  const scanResult = await scanSkills({ skillsDir: paths.skillsDir });

  console.log(chalk.bold("Detected SKILL.md files"));
  if (scanResult.files.length === 0) {
    console.log(chalk.yellow(`No skills found in ${paths.skillsDir}`));
    return scanResult;
  }

  for (const filePath of scanResult.files) {
    console.log(`- ${filePath}`);
  }

  return scanResult;
}

export async function runStatus(options = {}) {
  const paths = getPaths(options);

  const hasClaude = await fs.pathExists(paths.claudeDir);
  const hasHook = await fs.pathExists(paths.hookPath);
  const wired = await isHookConfigured({ settingsPath: paths.settingsPath, command: HOOK_COMMAND });
  const scanResult = await scanSkills({ skillsDir: paths.skillsDir });

  console.log(chalk.bold("skill-activate status"));
  console.log("───────────────────────────────────────");
  console.log(`${hasClaude ? chalk.green("✓") : chalk.red("✗")} Claude dir: ${paths.claudeDir}`);
  console.log(`${hasHook ? chalk.green("✓") : chalk.red("✗")} Hook file: ${paths.hookPath}`);
  console.log(`${wired ? chalk.green("✓") : chalk.red("✗")} UserPromptSubmit wired in settings.json`);
  console.log(`${chalk.green("✓")} Skills detected: ${scanResult.files.length}`);
  console.log("───────────────────────────────────────");

  return {
    hasClaude,
    hasHook,
    wired,
    skillCount: scanResult.files.length,
    paths
  };
}

export async function runUninstall(options = {}) {
  const paths = getPaths(options);

  const uninstallSpinner = startSpinner("Removing forced-eval hook");
  const hookRemoval = await removeHook({ hookPath: paths.hookPath });
  uninstallSpinner.succeed(hookRemoval.removed ? "Hook removed" : "Hook not present");

  const settingsSpinner = startSpinner("Removing hook wiring from settings.json");
  const settingsResult = await removeHookFromSettings({ settingsPath: paths.settingsPath, command: HOOK_COMMAND });
  settingsSpinner.succeed(
    settingsResult.changed
      ? `Removed ${settingsResult.removedCount} hook entr${settingsResult.removedCount === 1 ? "y" : "ies"}`
      : "No matching hook wiring found"
  );

  const restoreSpinner = startSpinner("Restoring skill backups (*.bak)");
  const aliasCleanup = await removeCompatibilityAliases({ skillsDir: paths.skillsDir });
  const backupScan = await scanBackupFiles({ skillsDir: paths.skillsDir });
  const restored = [];

  for (const backupPath of backupScan.files) {
    const originalPath = backupPath.slice(0, -4);
    await fs.copy(backupPath, originalPath, { overwrite: true });
    await fs.remove(backupPath);
    restored.push(originalPath);
  }

  restoreSpinner.succeed(`Restored ${restored.length} backup file(s)`);

  console.log(chalk.bold("\nUninstall summary"));
  console.log(`- Hook removed: ${hookRemoval.removed ? "yes" : "no"}`);
  console.log(`- settings.json entries removed: ${settingsResult.removedCount}`);
  console.log(`- Skill files restored from backups: ${restored.length}`);
  console.log(`- Compatibility aliases removed: ${aliasCleanup.removed.length}`);

  return {
    hookRemoval,
    settingsResult,
    restored,
    aliasCleanup
  };
}
