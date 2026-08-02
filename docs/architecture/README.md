# Software Architecture Specification

**Project:** `online-exam-platform`
**Document Maintainer:** M. Khubaib Asif
**Version:** 2.0
**Status:** Frozen, signed-off design sources
**Last updated:** 2026-08-01

## 1. Purpose

This directory contains the foundational design documents for the Online Exam Platform v1. The architecture defines the system boundaries, data flows, infrastructure components, and technical decisions that realize the normative software requirements defined in the SRS. These documents serve as the strict technical contract for all module development.

## 2. Document set

| File | Responsibility |
| :--- | :--- |
| `HIGH_LEVEL_DESIGN.md` | Macro-level architecture, infrastructure components (Postgres, Redis), deployment model, and security perimeters. |
| `LOW_LEVEL_DESIGN.md` | Micro-level technical specifics, database schemas, API contracts, atomic operations, and internal module logic. |
| `README.md` | This directory index and architectural governance rules. |

## 3. Authority and alignment

The v1 platform architecture implements a single-platform exam product. It uses one repository and one Simple Poly-App application codebase containing a modular-monolith backend and the shared web application. The architecture explicitly excludes institution, tenant, class, course, department, term, or academic-roster entities to maintain strict, simplified module boundaries.

The backend infrastructure is the absolute authority for identity, access, registration, devices, security gates, timing, navigation, answers, scoring, proctoring actions, and result publication. The architecture treats the client (whether the signed Electron shell or a standard browser) as completely untrusted. The client can request an action and provide evidence; it cannot decide the outcome.

## 4. Design conventions

- `HIGH_LEVEL_DESIGN.md` is the ultimate source of truth for system boundaries and external dependencies.
- `LOW_LEVEL_DESIGN.md` is the ultimate source of truth for internal implementation details and data models.
- **Security by Design:** The server must validate every state transition. No architectural flow may introduce a client-trusted identity, timer, score, registration, device, gate, or publication decision.
- Module implementation must perfectly reflect the data flows and state machines defined in these documents.

## 5. Change control

These design documents are frozen. Any proposed change to the approved architecture requires an explicit issue discussion and direct approval from the repository owner as defined in the `CODEOWNERS` file. Any modification to the HLD or LLD must trigger corresponding updates to the SRS, screen inventory, and affected module documentation in the same reviewed change.