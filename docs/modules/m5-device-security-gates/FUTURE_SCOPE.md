# M5 — Device & Security Gates — Future Scope

**Module:** M5 — Device & Security Gates
**Status:** v1 boundary; no open v1 requirements
**Authoritative references:** `docs/architecture/HIGH_LEVEL_DESIGN.md` §§5, 13, 16; `docs/architecture/LOW_LEVEL_DESIGN.md` §§11, 14

## Deferred capabilities

- hardware-backed attestation where platform support is available;
- managed-device policy integration;
- native OS policy enforcement beyond the v1 lockdown contract;
- recovery workflows for lost devices requiring controlled support intervention;
- additional biometric modalities; and
- third-party identity-verification provider integration.

## Boundary rule

Future gates must preserve server authority, per-attempt evaluation, signed Electron entry, minimal evidence, and the two-active-device invariant.
