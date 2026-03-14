import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { runInstall, runStatus, runUninstall } from "../src/installer.js";
import { patchSettings } from "../src/settingsPatcher.js";

function makeSkillContent(description) {
  return `---\nname: testskill\ndescription: \"${description}\"\n---\n# Test\n`;
}

function makeHyphenSkillContent(description) {
  return `---\nname: algorithmic-art\ndescription: \"${description}\"\n---\n# Test\n`;
}

async function createTempClaudeHome() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skill-activate-test-"));
  const homeDir = path.join(tempRoot, "home");
  const skillsDir = path.join(homeDir, ".claude", "skills", "express");

  await fs.ensureDir(skillsDir);
  await fs.writeFile(
    path.join(skillsDir, "SKILL.md"),
    makeSkillContent("Helps with Express.js route building"),
    "utf8"
  );

  return { tempRoot, homeDir };
}

test("install creates hook, settings wiring, and backups", async () => {
  const { tempRoot, homeDir } = await createTempClaudeHome();

  try {
    const result = await runInstall({ homeDir });

    assert.equal(result.scanResult.files.length, 1);
    assert.equal(result.rewriteResults.filter((item) => item.changed).length, 1);
    assert.equal(await fs.pathExists(path.join(homeDir, ".claude", "hooks", "skill-forced-eval-hook.sh")), true);
    assert.equal(await fs.pathExists(`${result.scanResult.files[0]}.bak`), true);
  } finally {
    await fs.remove(tempRoot);
  }
});

test("install is idempotent and does not duplicate settings hook", async () => {
  const { tempRoot, homeDir } = await createTempClaudeHome();

  try {
    await runInstall({ homeDir });
    await runInstall({ homeDir });

    const settingsPath = path.join(homeDir, ".claude", "settings.json");
    const settings = JSON.parse(await fs.readFile(settingsPath, "utf8"));
    const entries = settings.hooks.UserPromptSubmit;

    let hookCount = 0;
    for (const entry of entries) {
      if (!Array.isArray(entry.hooks)) {
        continue;
      }
      for (const hook of entry.hooks) {
        if (hook.type === "command" && hook.command === "~/.claude/hooks/skill-forced-eval-hook.sh") {
          hookCount += 1;
        }
      }
    }

    assert.equal(hookCount, 1);
  } finally {
    await fs.remove(tempRoot);
  }
});

test("settings patcher preserves existing entries and appends command hook", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skill-activate-settings-"));
  const settingsPath = path.join(tempRoot, "settings.json");

  try {
    await fs.writeFile(
      settingsPath,
      JSON.stringify(
        {
          hooks: {
            UserPromptSubmit: [
              {
                hooks: [
                  {
                    type: "command",
                    command: "echo keep-me"
                  }
                ]
              }
            ]
          },
          other: true
        },
        null,
        2
      ),
      "utf8"
    );

    const result = await patchSettings({ settingsPath });
    assert.equal(result.changed, true);

    const patched = JSON.parse(await fs.readFile(settingsPath, "utf8"));
    const commands = [];

    for (const entry of patched.hooks.UserPromptSubmit) {
      if (!Array.isArray(entry.hooks)) {
        continue;
      }
      for (const hook of entry.hooks) {
        if (hook.type === "command") {
          commands.push(hook.command);
        }
      }
    }

    assert.equal(commands.includes("echo keep-me"), true);
    assert.equal(commands.includes("~/.claude/hooks/skill-forced-eval-hook.sh"), true);
    assert.equal(patched.other, true);
  } finally {
    await fs.remove(tempRoot);
  }
});

test("install fails safely on malformed settings.json", async () => {
  const { tempRoot, homeDir } = await createTempClaudeHome();
  const settingsPath = path.join(homeDir, ".claude", "settings.json");

  try {
    await fs.writeFile(settingsPath, "{ bad json", "utf8");

    await assert.rejects(async () => {
      await runInstall({ homeDir });
    }, /Invalid JSON/);
  } finally {
    await fs.remove(tempRoot);
  }
});

test("uninstall removes wiring and restores all backups", async () => {
  const { tempRoot, homeDir } = await createTempClaudeHome();

  try {
    const installResult = await runInstall({ homeDir });
    const skillPath = installResult.scanResult.files[0];

    await fs.writeFile(skillPath, makeSkillContent("Mutated value"), "utf8");

    const uninstallResult = await runUninstall({ homeDir });

    assert.equal(uninstallResult.settingsResult.removedCount >= 1, true);
    assert.equal(uninstallResult.restored.length, 1);

    const restored = await fs.readFile(skillPath, "utf8");
    assert.match(restored, /Helps with Express\.js route building/);
    assert.equal(await fs.pathExists(`${skillPath}.bak`), false);
  } finally {
    await fs.remove(tempRoot);
  }
});

test("status reports healthy after install", async () => {
  const { tempRoot, homeDir } = await createTempClaudeHome();

  try {
    await runInstall({ homeDir });
    const status = await runStatus({ homeDir });

    assert.equal(status.hasClaude, true);
    assert.equal(status.hasHook, true);
    assert.equal(status.wired, true);
    assert.equal(status.skillCount, 1);
  } finally {
    await fs.remove(tempRoot);
  }
});

test("install creates compatibility alias for hyphenated skill ids and uninstall removes it", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skill-activate-alias-"));
  const homeDir = path.join(tempRoot, "home");
  const skillDir = path.join(homeDir, ".claude", "skills", "creative");
  const skillFile = path.join(skillDir, "SKILL.md");

  await fs.ensureDir(skillDir);
  await fs.writeFile(skillFile, makeHyphenSkillContent("Creates algorithmic art patterns"), "utf8");

  try {
    const installResult = await runInstall({ homeDir });
    assert.equal(installResult.aliasResult.created.length, 1);

    const aliasFile = installResult.aliasResult.created[0];
    assert.equal(await fs.pathExists(aliasFile), true);

    const uninstallResult = await runUninstall({ homeDir });
    assert.equal(uninstallResult.aliasCleanup.removed.length, 1);
    assert.equal(await fs.pathExists(aliasFile), false);
  } finally {
    await fs.remove(tempRoot);
  }
});
