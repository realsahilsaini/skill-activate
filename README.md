# skill-activate

[![npm version](https://img.shields.io/npm/v/skill-activate.svg)](https://www.npmjs.com/package/skill-activate)
[![GitHub Repo](https://img.shields.io/badge/GitHub-realsahilsaini%2Fskill--activate-181717?logo=github)](https://github.com/realsahilsaini/skill-activate)
[![GitHub stars](https://img.shields.io/github/stars/realsahilsaini/skill-activate?style=social)](https://github.com/realsahilsaini/skill-activate/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

Star the repo: https://github.com/realsahilsaini/skill-activate

Claude Code can miss relevant skills when responding to prompts.

`skill-activate` installs a forced-eval hook and rewrites skill descriptions so Claude evaluates and activates relevant skills before every response.

## One-line install

```bash
npx skill-activate install
```

Revert to original state anytime:

```bash
npx skill-activate uninstall
```

Follow development and contribute: https://github.com/realsahilsaini/skill-activate

## Reliability impact

- Before: skill activation can be inconsistent for relevant prompts.
- After install: prompts are forced through explicit skill evaluation and activation before implementation.

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

Activation consistency improved with forced-eval hook.
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

If this helped you, please star and watch the repo for updates:

- Star: https://github.com/realsahilsaini/skill-activate/stargazers
- Watch: https://github.com/realsahilsaini/skill-activate/watchers
- Issues: https://github.com/realsahilsaini/skill-activate/issues

## Compatibility

- Node.js 18+
- macOS and Linux (native shell hook execution)
- Windows with WSL for shell hook execution

## Troubleshooting

- Error: `Unknown skill: ...`
: This usually means the skill id was normalized (for example, `algorithmic-art` changed to `algorithmic art`).
    Re-run `npx skill-activate@latest install` to apply the newest compatibility behavior.
    Version `0.1.2+` automatically creates compatibility aliases for hyphenated and underscored skill ids.

## License

MIT
