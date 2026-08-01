# Requirements Traceability Matrix

**Project:** `online-exam-platform`
**Document Maintainer:** M. Khubaib Asif
**Version:** 2.0
**Status:** Traceability baseline for the current HLD and LLD
**Last updated:** 2026-07-30

The matrix maps each user-story epic to the functional and non-functional requirements that implement it. Detailed test cases shall reference the stable requirement identifiers directly.

| User-story epic | Functional requirements | Non-functional requirements |
| :--- | :--- | :--- |
| **EPIC 1 — Bootstrap, teacher onboarding, identity, profile, and consent** | FR-001–FR-012 | NFR-01–NFR-06, NFR-10, NFR-13 |
| **EPIC 2 — Question-bank authoring** | FR-020–FR-029 | NFR-01, NFR-02, NFR-04, NFR-06, NFR-10, NFR-11, NFR-12 |
| **EPIC 3 — Exam authoring, timing, and publication** | FR-030–FR-042 | NFR-01, NFR-04, NFR-07, NFR-10–NFR-12 |
| **EPIC 4 — Discovery and registration** | FR-043–FR-054 | NFR-01–NFR-04, NFR-07–NFR-12 |
| **EPIC 5 — Persistent devices and secure entry** | FR-055–FR-072 | NFR-01–NFR-06, NFR-08–NFR-12 |
| **EPIC 6 — Secure exam delivery and timing** | FR-083–FR-096 | NFR-01–NFR-05, NFR-07–NFR-12 |
| **EPIC 7 — Proctoring and integrity** | FR-073–FR-082 | NFR-01–NFR-06, NFR-08–NFR-12, NFR-14 |
| **EPIC 8 — Grading, review, and publication** | FR-097–FR-107 | NFR-01, NFR-04, NFR-06–NFR-12, NFR-14 |
| **EPIC 9 — Audit, privacy, and operations** | FR-108–FR-120 | NFR-01–NFR-06, NFR-08–NFR-12, NFR-14 |

## Functional requirement coverage by capability

| Capability | Requirement IDs |
| :--- | :--- |
| Bootstrap, teacher onboarding, identity, and consent | FR-001–FR-012 |
| Role and resource authorisation | FR-013–FR-019 |
| Question bank and immutable question versions | FR-020–FR-029 |
| Exam composition and immutable revisions | FR-030–FR-042 |
| Public, invitation-only, and approval-required access | FR-043–FR-054 |
| Persistent two-device registration | FR-055–FR-062 |
| Electron-only entry and shared web application URL | FR-063–FR-072 |
| Per-attempt gates and proctoring | FR-073–FR-082 |
| Session state, navigation, answers, and timing | FR-083–FR-096 |
| Objective and subjective grading | FR-097–FR-103 |
| Teacher publication and student result dashboard | FR-104–FR-107 |
| Audit, evidence, retention, API safety, and recovery | FR-108–FR-120 |

## Critical invariant coverage

| Invariant | Requirement IDs | Required validation |
| :--- | :--- | :--- |
| Bootstrap is available only before the first owner exists | FR-001–FR-003 | Fresh-deployment, already-bootstrapped, missing-secret, malformed-secret, expiry, replay, rate-limit, and concurrent-bootstrap tests |
| Bootstrap secret is never persisted, returned, logged, or committed | FR-002; FR-003 | Secret-redaction, database-inspection, response, log, repository, and configuration-output tests |
| Exactly one owner is created under concurrent bootstrap requests | FR-001–FR-003 | Transaction/advisory-lock concurrency test with one success and all other requests rejected |
| Teacher accounts are created only through owner-issued invitations | FR-004–FR-007 | Student role-escalation, invitation-email binding, expiry, replay, revocation, wrong-email, and successful activation tests |
| No institution/tenant/class/course core model | FR-019 | Schema inspection, API contract inspection, forbidden-field scan |
| Teacher is the only v1 registration approver | FR-051–FR-055 | Role matrix, ownership tests, concurrent approval tests |
| At most two active devices; third requires non-current revocation | FR-057–FR-061 | Database concurrency and revocation tests |
| Persistent device registration is separate from per-attempt gates | FR-061–FR-064, FR-073–FR-076 | Repeat-attempt gate tests |
| Every actual attempt runs in Electron | FR-063–FR-072 | Browser denial, launch-ticket, attestation, and Electron E2E tests |
| Electron loads the deployed web application URL; no separate renderer frontend | FR-064, FR-070; NFR-05, NFR-11 | Build tree, origin allowlist, navigation, and IPC tests |
| Whole-paper, section, question, and mixed timing are supported | FR-033–FR-037 | Configuration validation and timing-state tests |
| Fully section-timed duration sum equals paper duration | FR-035, FR-038 | Boundary and invalid-configuration tests |
| Forward-only navigation and permanent question locks | FR-086–FR-088 | Replay, backtracking, stale-sequence, and duplicate-submit tests |
| Timeout locks unanswered work deterministically | FR-089–FR-091 | Question, section, and paper timeout tests |
| Bounded reconnect with maximum three attempts | FR-092–FR-095; NFR-08 | Disconnect, reconnect, expiry, replay, and no-extra-time tests |
| One attempt per registration | FR-043, FR-083 | Concurrent launch and duplicate-attempt tests |
| AI suggestions are pending; teacher makes final subjective decision | FR-098–FR-103; NFR-14 | Provider failure, suggestion, override, and publication-precondition tests |
| Teacher explicitly publishes results | FR-104–FR-106 | Publication authorization and student-visibility tests |
| Server is authoritative for all consequential state | FR-009, FR-014, FR-055, FR-069, FR-076–FR-077, FR-095, FR-105–FR-106, FR-118–FR-120; NFR-04 | Tampered-request, concurrency, recovery, and audit tests |

## Traceability maintenance rule

A pull request that changes a requirement, HLD decision, LLD contract, schema, API, screen, or security invariant shall update this matrix and add or update the corresponding acceptance and negative tests. A requirement without a mapped design contract and validation path is incomplete.
