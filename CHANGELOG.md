# Changelog

All notable changes to this project will be documented in this file.

## [0.1.3] - 2026-03-14

### Changed
- Removed percentage-based activation claims from package metadata and README to keep messaging evidence-safe and avoid unsupported numeric assertions.
- Updated README wording to focus on reliability behavior rather than fixed benchmark numbers.

## [0.1.2] - 2026-03-14

### Fixed
- Added automatic compatibility aliases for hyphenated and underscored skill ids (for example: `algorithmic-art` gets an alias `algorithmic art`) so `Skill()` calls still resolve when the runtime normalizes separators.
- Added uninstall cleanup for generated compatibility aliases.
- Added test coverage for alias generation and cleanup lifecycle.

## [0.1.1] - 2026-03-14

### Fixed
- Strengthened forced-eval hook instructions to require exact skill identifiers from `<available_skills>` in `Skill()` calls (prevents hyphen/space normalization issues like `algorithmic-art` vs `algorithmic art`).
- Added troubleshooting guidance for `Unknown skill` errors.

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
