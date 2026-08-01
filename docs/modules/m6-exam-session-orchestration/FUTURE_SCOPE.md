# M6 — Exam Session Orchestration — Future Scope

**Module:** M6 — Exam Session Orchestration
**Status:** v1 boundary; no open v1 requirements
**Authoritative references:** `docs/HIGH_LEVEL_DESIGN.md` §§12, 16; `docs/LOW_LEVEL_DESIGN.md` §§12–14

## Deferred capabilities

- backtracking or answer revision after question lock;
- collaborative or multi-user attempts;
- offline exam execution;
- adaptive runtime section paths;
- client-authoritative pause/resume; and
- alternate delivery clients outside the signed Electron shell.

## Boundary rule

Any future session capability must preserve server-authoritative timing, forward-only navigation, durable answer state, one-attempt enforcement, and browser rejection.
