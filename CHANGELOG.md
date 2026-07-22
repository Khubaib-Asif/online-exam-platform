# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This is a docs-first project: the history below reflects design, specification,
and repository-tooling work that precedes implementation code. No versioned
release has been cut yet — everything is under **Unreleased**. When the first
release is tagged (`vX.Y.Z`), the release workflow extracts that version's
section from this file as the GitHub Release notes.

## [Unreleased]

### Added
- UI design guidelines (#7).
- Module decomposition document and screen inventory (M1–M8), with open items
  flagged for contributors.
- M1 (Auth & Identity) module design artifacts (`FLOW.md`, `COMPONENTS.md`) and
  screen designs (PNG mockups + Figma source files) for all 10 M1 screens.
- Low-level design (#5).
- High-level design (#4).
- Functional and non-functional requirements (#3).
- CI and security-scan workflow scaffolding, and a CODEOWNERS file for
  automated PR review routing.

### Changed
- Reworked the Electron client to a hybrid architecture with attestation.
- Hardened session security: stable HMAC secret for entry-token signing with
  signature verification, and Redis-backed RESUME tokens (session + device
  bound, reissued per reconnect) (#6).
- Enforced least-privilege `permissions:` on GitHub Actions workflows (#2).

### Fixed
- Resolved full LLD audit findings across security, database, API,
  implementation, and reliability areas.
- Atomic `riskScore` increment + clamp, and an atomic grade-update guard, to
  fix race conditions; question-ownership validation before accepting answers;
  flat reconnect risk penalty with a configurable cap (#6).
- Corrected CI job-id formatting for branch-ruleset alignment (#1).

### Security
- Added new error codes E5008 (grade published) and E5009 (reconnect limit) as
  part of reconnect-abuse hardening (#6).

<!--
When cutting a release, move the relevant items from [Unreleased] into a new
dated version section, e.g.:

## [0.1.0] - 2026-08-01
### Added
- ...
-->
