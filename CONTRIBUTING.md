# Contributing

Thanks for your interest in the online-exam-platform. This document describes
the **actual** workflow this project follows — please read it before opening a
PR, because a few conventions here are stricter than a typical repo.

## Project shape

This is a **docs-first** project. The specification and design are complete and
signed off before implementation begins:

- `docs/srs/` — actors, user stories, functional & non-functional requirements,
  traceability matrix.
- `docs/architecture/HIGH_LEVEL_DESIGN.md`, `docs/architecture/LOW_LEVEL_DESIGN.md` — the HLD and LLD.
- `docs/architecture/`, `docs/compliance/`, `docs/design/UI_GUIDELINES.md`.
- `docs/modules/` — module decomposition, screen inventory, and per-module
  design artifacts (`FLOW.md`, `COMPONENTS.md`).

The system is decomposed into eight modules:

| Module | Area |
|--------|------|
| M1 | Auth & Identity |
| M2 | Institution & Tenant Management |
| M3 | Question Bank |
| M4 | Exam Builder & Approval |
| M5 | Device & Security Gate |
| M6 | Session Orchestration Core |
| M7 | Proctoring Engine & Dashboard |
| M8 | Grading & Audit |

## Frozen documents

Once a design document is signed off it is **frozen** and treated as a source of
truth. Do not modify these without an explicit reason stated in the PR:

- `docs/srs/`
- `docs/architecture/README.md`
- `docs/compliance/README.md`
- `docs/design/UI_GUIDELINES.md`
- `docs/architecture/HIGH_LEVEL_DESIGN.md`
- `docs/architecture/LOW_LEVEL_DESIGN.md`
- `docs/modules/`

If implementation reveals that a frozen spec is wrong or incomplete, **stop and
raise an issue** rather than silently deviating from — or silently "fixing" —
the spec.

## Workflow

1. **One change per branch.** Branch off `main` (e.g. `feat/m3-question-bank`,
   `fix/...`, `docs/...`). Keep the branch scoped to a single module or fix.
2. **Follow the LLD exactly** for the module you're implementing. Don't invent
   scope, refactor unrelated code, or "improve" adjacent areas in the same PR.
3. **Module by module.** Implement → open a PR → review → merge, then move on.
   The whole system is not generated in one pass.
4. **Open a PR into `main`.** Fill out the PR template (Summary / Changes /
   Notes for reviewers). All changes are reviewed before merge — direct pushes
   to `main` are not the workflow.
5. **No fake work.** No mock data, stubbed implementations, or "TODO, fill in
   later" presented as done. If something can't be fully implemented, say so in
   the PR.
6. **Update the changelog.** Add your change under `[Unreleased]` in
   `CHANGELOG.md`.

## Continuous integration

CI is built ahead of the implementation code, so it is already active:

- **`docs-lint`** runs today on every PR: Markdown linting and link checking
  across `docs/**`.
- **Code jobs** (install, lint, typecheck, unit tests, integration tests against
  real Postgres + Redis service containers, and build) are gated on a
  `package.json` existing. They report as *skipped* until implementation code
  lands, then activate automatically — no manual step required.
- **Security scanning** (CodeQL, Semgrep, Trivy) runs on every PR and weekly.
- **CodeRabbit** reviews every PR automatically.

Please make sure CI is green before requesting review.

## Commit messages

Use clear, conventional-style prefixes consistent with the existing history:
`feat`, `fix`, `docs`, `chore`, optionally scoped — e.g. `fix(design): ...`,
`docs(design): ...`, `chore(deps): ...`.

## Code of conduct

Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
