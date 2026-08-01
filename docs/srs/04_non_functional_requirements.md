# Non-Functional Requirements

**Project:** `online-exam-platform`
**Document Maintainer:** M. Khubaib Asif
**Version:** 2.0
**Status:** Normative quality, security, and operations baseline aligned with the HLD and LLD
**Last updated:** 2026-07-30

## NFR-01 — Security architecture

* Bootstrap secrets shall be supplied through deployment secret management or a protected one-time initialisation channel, never committed to the repository, baked into an image, placed in client code, or exposed in ordinary configuration output.
* Bootstrap and teacher-invitation endpoints shall use strict rate limits, generic failure responses, correlation IDs, structured security events, replay protection, and alerting for repeated failures.
* A successful bootstrap shall be atomic and replay-safe: concurrent requests shall result in exactly one owner account and exactly one consumed bootstrap secret; subsequent requests shall be rejected without creating or mutating an owner.
* Teacher activation shall require a single-use, short-lived, server-generated invitation, verified email ownership, password policy, account-status checks, and append-only audit events for creation, redemption, expiry, revocation, and failed redemption.
The platform shall use defence in depth across transport, authentication, authorisation, application validation, database constraints, encrypted storage, signed Electron distribution, native evidence, monitoring, and audit. No single client-side control shall be treated as sufficient.

## NFR-02 — Transport and application security

* All production traffic shall use TLS 1.3 where supported and no lower than the platform-approved TLS baseline; HTTP shall redirect or be rejected.
* HSTS, secure cookies where used, strict content security policy, clickjacking protection, MIME sniffing protection, and restrictive cross-origin policy shall be enabled.
* The Electron shell shall enforce the allowlisted deployed web origin, context isolation, disabled Node integration in the loaded page, restricted navigation, disabled arbitrary popups/downloads, secure preload, and signed release verification.
* The application shall use parameterised database access, output encoding, strict schema validation, bounded payloads, safe file handling, dependency scanning, secret scanning, and security headers.
* The platform shall protect against XSS, CSRF where cookie authentication is used, SSRF, SQL injection, command injection, path traversal, prototype pollution, unsafe deserialisation, IPC channel confusion, and insecure direct object references.

## NFR-03 — Identity, authorisation, and session security

* Access tokens shall be short-lived, audience/issuer checked, and bound to a rotated refresh-token family.
* Privileged operations shall reload role and resource ownership from the server rather than relying solely on token claims.
* Authentication, registration, device, launch, session, grade, evidence, and result endpoints shall have separate rate limits and abuse controls.
* The system shall use generic responses where resource existence or account state must not be disclosed.
* Every security-sensitive mutation shall be auditable and idempotent where retry is expected.

## NFR-04 — Server authority and integrity

* PostgreSQL shall be the durable source of truth for identity, registration, device state, exam revision, timing policy, attempt state, question lock, answer, grade, result, and audit records.
* Redis, browser state, Electron memory, WebSocket memory, and worker memory shall never be the only copy of an authoritative fact.
* Server deadlines shall use a trusted server time basis. Client clocks, client countdowns, client sequence values, client IDs, client risk scores, and client grades shall not determine outcomes.
* The system shall use transactional constraints, row/advisory locking, unique keys, monotonic sequences, optimistic or pessimistic concurrency control, and idempotency keys for competing mutations.
* Audit events shall be append-only and hash-chained; application roles shall not update or delete historical audit records.

## NFR-05 — Electron and native boundary

* The signed Electron application shall load the same deployed web application URL used by the platform, with no separate exam-renderer frontend and no second exam UI codebase.
* The native main process and preload bridge shall expose the minimum capability surface and shall reject unknown channels, malformed payloads, stale launch context, and calls outside an active session.
* The web application loaded in Electron shall remain untrusted; native evidence improves assurance but cannot replace server verification.
* Electron releases shall be reproducibly built, signed, published through a controlled channel, and checked for version compatibility before launch.

## NFR-06 — Privacy and data governance

* The platform shall obtain purpose-specific consent before biometric, camera, microphone, environment, or evidence capture.
* Sensitive data shall be encrypted in transit and at rest with key separation, rotation, access logging, and least privilege.
* Raw biometric material, evidence media, student answers, answer keys, and private teacher notes shall have explicit retention and deletion policies.
* Evidence access shall be scoped, short-lived where externally retrieved, logged, and reviewable.
* The platform shall support privacy-safe failure messages and shall not expose sensitive content in logs, metrics, traces, URLs, or error responses.

## NFR-07 — Performance and latency

The following are v1 service objectives measured under the supported production workload and excluding an unavailable external provider:

| Operation | Target |
| :--- | :--- |
| Authentication and safe catalogue metadata | p95 ≤ 500 ms; p99 ≤ 1.5 s |
| Registration request or teacher decision | p95 ≤ 750 ms; p99 ≤ 2 s |
| Device and gate command acknowledgement | p95 ≤ 1 s; p99 ≤ 3 s |
| Current-question load or next-question transition | p95 ≤ 750 ms; p99 ≤ 2 s |
| Answer submission acknowledgement | p95 ≤ 500 ms; p99 ≤ 1.5 s |
| Result dashboard read after publication | p95 ≤ 750 ms; p99 ≤ 2 s |
| WebSocket command acknowledgement during a healthy session | p95 ≤ 500 ms; p99 ≤ 1.5 s |

The platform shall define and test a capacity envelope for concurrent registrations, launches, active Electron sessions, WebSocket connections, telemetry events, evidence uploads, AI grading jobs, and result publications. Capacity claims shall be load-tested rather than inferred from request averages.

## NFR-08 — Availability and reliability

* The core API, PostgreSQL, session command path, and WebSocket path shall target at least 99.9% monthly availability during declared exam windows, excluding declared maintenance and force-majeure events.
* A transient connection interruption shall enter the bounded reconnect policy without granting extra time.
* The maximum reconnect count shall be three unless an explicit approved policy version changes it; the reconnect deadline shall be server-enforced.
* A process restart, worker retry, Redis loss, or provider timeout shall not lose a committed answer or duplicate a terminal transition.
* Recovery procedures shall include PostgreSQL point-in-time recovery, Redis reconstruction, outbox replay, queue redrive, evidence reconciliation, and audit-chain verification.
* Restore drills and exam-window failure exercises shall be performed before production release.

## NFR-09 — Scalability and backpressure

* The modular monolith shall scale horizontally as stateless application instances behind the edge layer; durable authority remains in PostgreSQL.
* WebSocket presence, rate limits, reconnect leases, and ephemeral coordination may use Redis with explicit TTLs and recovery behaviour.
* Long-running AI grading, controlled retrieval, evidence processing, notifications, and audit delivery shall use durable queues/outbox processing rather than blocking the request path.
* Every queue shall expose depth, age, processing rate, retry count, and dead-letter metrics.
* Telemetry and evidence ingestion shall enforce per-user, per-device, per-session, per-IP, and global quotas with bounded payload sizes.
* Backpressure shall fail or defer non-critical work explicitly; it shall never silently drop a committed answer, timer transition, security gate result, grade decision, or publication event.

## NFR-10 — Observability and auditability

* Logs shall be structured and include correlation ID, actor category, resource type, session ID, device ID where safe, operation, outcome, and latency.
* Logs shall never include passwords, tokens, private keys, raw biometric data, answer keys, full student answers, private teacher notes, or raw proctoring media.
* Metrics shall cover authentication failures, registrations, approvals, device-cap rejections, gate outcomes, launch failures, active sessions, command rejection, timer lag, reconnects, telemetry, evidence, queue lag, AI grading, grade confirmation, publication, and database saturation.
* Distributed traces shall stop or redact at sensitive-data boundaries.
* Security events and audit-chain verification failures shall alert operators without disclosing student content.

## NFR-11 — Maintainability and module isolation

* The implementation shall be one repository and one Simple Poly-App codebase with a modular-monolith backend, shared contracts, web application, Electron shell, database schema, workers, scripts, tests, and documentation.
* Domain modules shall communicate through explicit application services and contracts; identity shall not write answers, registration shall not deliver questions, proctoring shall not change grades, and grading shall not bypass session state.
* Shared contracts shall be serialisable, versioned, schema-validated, and free of database or UI concerns.
* The web application loaded in Electron shall reuse the same deployed site and shall not duplicate exam business logic in a separate renderer frontend.
* Architecture, API, schema, security, and screen changes shall update the affected source-of-truth documents and traceability entries.

## NFR-12 — Testability and release gates

Before release, the platform shall pass unit, integration, API-contract, database-concurrency, WebSocket, Electron security, preload/IPC, end-to-end, load, chaos, restore, accessibility, privacy, and penetration tests. Release evidence shall include signed Electron artefact verification, dependency and secret scans, migration review, threat-model review, queue/reconnect tests, audit-chain verification, and result-publication invariant tests.

## NFR-13 — Accessibility and usability

* Authentication, catalogue, registration, device management, authoring, grading, proctor review, and result dashboards shall meet the project's approved WCAG target.
* Error messages shall be actionable without exposing security-sensitive details.
* Timing, lock, timeout, reconnect, gate, approval, grading, and publication states shall have clear visible and accessible status indicators.
* The Electron exam surface shall communicate current question, section, server-synchronised remaining time, submission/lock state, and terminal state without relying on colour alone.

## NFR-14 — AI and external-provider governance

* AI providers shall be abstracted behind a versioned service contract with timeouts, quotas, retry policy, provider/model identifiers, and failure states.
* AI output shall be treated as an untrusted suggestion and shall retain confidence/uncertainty, evidence provenance, prompt/input version, model version, and request ID.
* Student answers, teacher references, and retrieved web content shall be treated as untrusted prompt data; prompt injection shall not alter system policy or authority.
* Controlled retrieval shall store source URL, retrieval time, content hash, quoted evidence, and provider response identifier where used.
* Provider failure shall leave objective grading available and subjective grading explicitly pending or reviewable.
