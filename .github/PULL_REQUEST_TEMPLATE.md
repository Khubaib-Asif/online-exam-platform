## Summary

<!-- What does this PR do, and why? 1–3 sentences. -->

## Changes

<!-- Bulleted list of the concrete changes, like the merged PR history:
- Redis-backed RESUME tokens (session+device bound, reissued per reconnect)
- Atomic riskScore increment + clamp (fixes race conditions)
- New error codes: E5008 (grade published), E5009 (reconnect limit)
-->
-

## Notes for reviewers

<!-- Anything reviewers should know: tricky decisions, deferred follow-ups,
     areas you specifically want scrutinised, or "none". -->

## Checklist

- [ ] Scope is a single module / fix — no unrelated refactors (per CLAUDE.md workflow)
- [ ] No frozen docs modified without an explicit reason stated above
      (`docs/srs`, `docs/architecture`, `docs/compliance`, `docs/design/UI_GUIDELINES.md`,
      `docs/HIGH_LEVEL_DESIGN.md`, `docs/LOW_LEVEL_DESIGN.md`, `docs/modules`)
- [ ] Follows the relevant LLD section exactly; deviations flagged, not silent
- [ ] CI is green (docs-lint today; lint/typecheck/tests once code exists)
- [ ] Linked the relevant issue / module (M1–M8) below

<!-- Closes #___ · Module: M_ -->
