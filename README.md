# skill-activate

[![npm version](https://img.shields.io/npm/v/skill-activate.svg)](https://www.npmjs.com/package/skill-activate)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

Claude Code ignores your skills 80% of the time.

`skill-activate` installs a forced-eval hook and rewrites skill descriptions so Claude evaluates and activates relevant skills before every response.

## One-line install

```bash
npx skill-activate install
```

## Before vs after

- Before: ~20% skill activation (most relevant skills silently skipped)
- After description rewrite only: ~50% to 90% (depends on skill quality)
- After rewrite + forced-eval hook: ~84% to near 100%

## How it works

- Rewrites each skill `description` into a directive format with clear triggers and a hard activation instruction.
- Installs a `UserPromptSubmit` hook that injects a mandatory evaluation-and-activation sequence before every prompt.
- Patches Claude settings safely and idempotently, then validates everything with a readable report.

## Commands

| Command | What it does |
| --- | --- |
| `npx skill-activate install` | Full setup: rewrite descriptions, install hook, patch settings, validate |
| `npx skill-activate scan` | Detect and list installed `SKILL.md` files only |
| `npx skill-activate uninstall` | Remove hook wiring and restore all `.bak` files under skills |
| `npx skill-activate status` | Verify if hook is present and correctly wired |

## How this works under the hood

`skill-activate` uses Claude Code's `UserPromptSubmit` lifecycle hook to prepend a mandatory instruction block on each user message. That block forces Claude to:

1. Evaluate each available skill (`YES` or `NO` with reason)
2. Activate every `YES` skill through `Skill()` immediately
3. Only then continue with implementation

Reference: Anthropic Claude Code hooks docs: https://docs.anthropic.com/en/docs/claude-code/hooks

## Output example

```text
skill-activate setup report
───────────────────────────────────────
✓ Claude Code detected at ~/.claude
✓ Hook installed: ~/.claude/hooks/skill-forced-eval-hook.sh (executable)
✓ settings.json patched (UserPromptSubmit wired)
✓ 3 skills found and descriptions rewritten:
    → express-skill.md
    → mongoose-skill.md
    → jwt-auth-skill.md
✓ Backups saved as .bak files

Expected activation rate: ~84% (was ~20%)
───────────────────────────────────────
Restart Claude Code to apply changes.
```

## Development

```bash
npm install
npm test
node bin/cli.js install
```

## How to contribute

1. Fork the repo and create a feature branch.
2. Run tests locally (`npm test`) before opening a PR.
3. Add or update tests for behavior changes.
4. Keep changes local-only (no external API dependencies).
5. Open a PR with a clear before/after summary.

## Compatibility

- Node.js 18+
- macOS and Linux (native shell hook execution)
- Windows with WSL for shell hook execution

## Troubleshooting

- Error: `Unknown skill: ...`
: This usually means the skill id was normalized (for example, `algorithmic-art` changed to `algorithmic art`).
    Re-run `npx skill-activate install` to refresh the latest hook instructions and ensure the skill identifier from `<available_skills>` is used verbatim in `Skill()` calls.

## License

MIT
