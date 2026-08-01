# Software Requirements Specification

**Project:** `online-exam-platform`
**Document Maintainer:** M. Khubaib Asif
**Version:** 2.0
**Status:** Aligned with the current HLD and LLD baseline
**Last updated:** 2026-07-30

## 1. Purpose

This directory contains the normative software requirements for the Online Exam Platform v1. The requirements describe the externally observable behaviour that the implementation must provide. The High-Level Design and Low-Level Design define the architecture and implementation contracts that realise these requirements.

## 2. Document set

| File | Responsibility |
| :--- | :--- |
| `01_actors.md` | Human and machine actors, authority, and access boundaries. |
| `02_user_stories.md` | User goals and acceptance-oriented product stories. |
| `03_functional_requirements.md` | Normative functional requirements with stable `FR-*` identifiers. |
| `04_non_functional_requirements.md` | Security, performance, reliability, privacy, scalability, and operational requirements with stable `NFR-*` identifiers. |
| `05_traceability_matrix.md` | Traceability from user stories to functional and non-functional requirements. |

## 3. Authority and alignment

The v1 platform is a single-platform exam product. It uses one repository and one Simple Poly-App application codebase containing a modular-monolith backend and the shared web application. It does not contain institution, tenant, class, course, department, term, or academic-roster entities.

A teacher owns exams and question banks. Users discover or receive exams and register according to the exam access policy. Every actual attempt runs inside the signed Electron shell, which loads the deployed web application URL; the project does not ship a second Electron renderer frontend. The web application provides authentication, discovery, registration, device management, authoring, grading, proctoring review, and result dashboards, but must not expose active exam question content through ordinary browser navigation.

The server is authoritative for identity, access, registration, devices, security gates, timing, navigation, answers, scoring, proctoring actions, and result publication. The client can request an action and provide evidence; it cannot decide the outcome.

## 4. Requirement conventions

- `shall` is mandatory for v1.
- `should` is a strong implementation expectation; deviation requires an architecture decision record.
- `may` is optional and must not weaken a mandatory security or integrity requirement.
- Requirement identifiers are stable. If behaviour changes, update the requirement and its traceability rather than silently reusing an identifier for a different contract.
- No requirement may introduce a client-trusted identity, timer, score, registration, device, gate, or publication decision.

## 5. Change control

Any change to an approved requirement must update the affected HLD/LLD sections, screen inventory, module documentation, and this traceability matrix in the same reviewed change. A requirement is not considered implemented until its positive, negative, concurrency, security, and failure-path tests are defined.
