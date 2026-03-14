# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-14

### Added
- Initial CLI package scaffold for skill-activate.
- Commands: install, scan, uninstall, and status.
- Skill scanner for recursive SKILL.md discovery under ~/.claude/skills.
- Description rewriter for YAML frontmatter description to directive format with .bak backups.
- Forced-eval hook installer from template and hook removal support.
- settings.json patcher with safe creation, append behavior, dedupe, and cleanup support.
- Setup validator with human-readable report output.
- Test suite covering install flow, idempotency, malformed JSON safety, uninstall restore, and status.
- README, MIT license, and npm publish ignore defaults.
