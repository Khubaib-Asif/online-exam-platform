# Online Exam Platform — Module Decomposition

**Project:** `online-exam-platform`
**Document Maintainer:** M. Khubaib Asif
**Version:** 1.0
**Related Documents:** `HIGH_LEVEL_DESIGN.md`, `LOW_LEVEL_DESIGN.md`, `docs/srs/`

---

## Table of Contents

1. [Methodology](#1-methodology)
2. [Module List](#2-module-list)
3. [Traceability](#3-traceability)
4. [Dependency Graph & Priority Order](#4-dependency-graph--priority-order)
5. [Not Modules — Shared Infrastructure & Client Surfaces](#5-not-modules--shared-infrastructure--client-surfaces)

---

## 1. Methodology

Module boundaries are derived using two established standards:

1. **Domain-Driven Design — Bounded Contexts** (Evans, 2003). Each module
   owns its own data and business rules within a single bounded context.
   This matches the sequence Microsoft's own architecture guidance
   prescribes: analyze the domain → define bounded contexts → apply
   tactical DDD patterns → derive module/service boundaries.
2. **Parnas' Criteria for Decomposing Systems into Modules** (Parnas,
   1972). Within a bounded context, a sub-module boundary is valid only
   when it hides one design decision likely to change independently of
   the rest  e.g., swapping the proctoring vendor should not require
   touching session-state logic, which is why Device & Security Gate
   (M5) is separated from Session Orchestration Core (M6) even though
   both sit inside the same HLD domain.

The outer boundaries (bounded contexts) come from `HIGH_LEVEL_DESIGN.md`
§9 (Core Domain Modules). The finer splits come from where
`LOW_LEVEL_DESIGN.md` already treats concerns as separate `##` sections 
that separation is itself evidence the detailed design already applies
Parnas' criterion, even though it was never named as such.

---

## 2. Module List

| # | Module | HLD Domain (§9) | LLD §§ |
|---|---|---|---|
| M1 | Auth & Identity | Auth & RBAC | §7 |
| M2 | Institution & Tenant Management | Auth & RBAC | §8 |
| M3 | Question Bank | Exam Authoring | §10 |
| M4 | Exam Builder & Approval | Exam Authoring | §9 |
| M5 | Device & Security Gate | Session Orchestration | §12 |
| M6 | Session Orchestration Core | Session Orchestration | §11, §13, §20 |
| M7 | Proctoring Engine & Dashboard | Proctoring | §14, §13 (`/proctor` ns) |
| M8 | Grading & Audit | Grading & Audit | §15 |

---

## 3. Traceability

Every module mapped against the functional requirements it implements.
Confirmed against `docs/srs/03_functional_requirements.md` directly. 

| Module | FR Coverage |
|---|---|
| M1 — Auth & Identity | FR-011–014 (partial — RBAC enforcement) |
| M2 — Institution & Tenant Mgmt | FR-011–014 (partial — tenant scoping) |
| M3 — Question Bank | FR-002, FR-003, FR-004, FR-007 |
| M4 — Exam Builder & Approval | FR-001, FR-005, FR-006, FR-008, FR-009, FR-010 |
| M5 — Device & Security Gate | FR-015–020, FR-021, FR-024–026 (partial) |
| M6 — Session Orchestration Core | FR-006 (delivery-time), FR-021–023 (token validation), FR-027–030 |
| M7 — Proctoring Engine & Dashboard | FR-031–038 |
| M8 — Grading & Audit | FR-039–045 |

Note FR-006 (shuffle) and FR-021–026 (entry/lockdown) each span two
modules — this is expected under DDD: authoring-time definition (M4) vs.
delivery-time application (M6) are genuinely different design decisions
that happen to serve one requirement.

---

## 4. Dependency Graph & Priority Order

```
M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8
```

Topological order derived from HLD §9's domain dependency graph
(Auth → Exam Authoring → Session Orchestration → Proctoring → Grading),
refined to 8 nodes.

---

## 5. Not Modules,  Shared Infrastructure & Client Surfaces

**Shared infrastructure** (no independent lifecycle or UI; consumed by
multiple modules above, built on-demand by whichever module needs it
first):
- Background Job Workers — LLD §16
- Encryption Service — LLD §17
- Audit Log Service — LLD §18

**Client-surface dimension** (applies within each module's wireframe and
implementation, not a bounded context of its own):
- Web Frontend, Electron Client, Mobile App — LLD §19–21