# Functional Requirements

**Project:** `online-exam-platform`
**Document Maintainer:** M. Khubaib Asif
**Version:** 2.0
**Status:** Normative functional baseline aligned with the HLD and LLD
**Last updated:** 2026-07-30

The requirements in this document are mandatory unless explicitly marked otherwise. Every requirement is enforced by the backend modular monolith; client validation is supplementary only.

## 1. Identity, account, and consent

* **FR-001:** On a fresh deployment, the system shall expose a one-time bootstrap flow only while no `OWNER` account exists and the bootstrap state is `UNINITIALISED`; a successful transaction shall create exactly one owner account.
* **FR-002:** The bootstrap secret shall be supplied through protected deployment secret management, shall be verified without plaintext persistence, shall be rate-limited and replay-resistant, and shall be invalidated atomically after successful bootstrap or explicit rotation.
* **FR-003:** The authenticated owner shall be able to create a short-lived, single-use teacher onboarding invitation bound to the invitee email and `TEACHER` role; invitation creation, delivery, expiry, revocation, and redemption shall be auditable.
* **FR-004:** A teacher shall activate an owner-issued invitation only after matching-email verification and normal password setup; the server shall derive `TEACHER` from the invitation and ignore client-supplied privileged roles.
* **FR-005:** Public self-registration shall create `STUDENT` accounts only and shall not expose a role selector or accept a client-selected `OWNER`, `TEACHER`, or `PROCTOR` role.
* **FR-006:** Public self-registration shall allow a user to create a `STUDENT` account with a unique normalised email address and a password satisfying the configured password policy.
* **FR-007:** The system shall require email verification before the account can register for or attempt an exam.
* **FR-008:** The system shall support login, logout, refresh-token rotation, password recovery, session revocation, failed-login throttling, and account status enforcement.
* **FR-009:** The system shall derive the authenticated user identity from the verified access token and server-side account record; it shall reject client-supplied identity substitutions.
* **FR-010:** The system shall allow a user to maintain profile, consent, identity-verification, and reference-photo/biometric-enrolment state according to the configured privacy policy.
* **FR-011:** The system shall record consent version, timestamp, purpose, actor, and policy reference before collecting protected biometric, camera, microphone, or evidence data.
* **FR-012:** The system shall never expose passwords, refresh tokens, private device keys, biometric reference material, or raw proctoring media in ordinary API responses or logs.

## 2. Roles and authorisation

* **FR-013:** The system shall support the v1 roles `OWNER`, `TEACHER`, `STUDENT`, and optional `PROCTOR`, plus machine identities for controlled workers and providers.
* **FR-014:** The system shall assign `OWNER` only through successful bootstrap, assign `TEACHER` only through owner-authorised onboarding, enforce role and resource authorisation at the API boundary, and enforce it again in the application service before every consequential operation.
* **FR-015:** The owner shall manage onboarding and account status but shall not gain exam-content, answer-key, proctoring-evidence, grade, or result access merely from the `OWNER` role. A teacher shall access only question banks, exams, revisions, registrations, sessions, grades, evidence, and results owned by that teacher or explicitly assigned by a future reviewed permission.
* **FR-016:** A student shall access only their own profile, registrations, devices, attempts, answers through the active session protocol, and published results.
* **FR-017:** A proctor shall access only assigned proctoring evidence and review actions; a proctor shall not approve exam registrations, change grades, or publish results in v1.
* **FR-018:** The system shall return an indistinguishable not-found or unauthorised response where exposing resource existence would disclose another user's data.
* **FR-019:** The v1 data model and API shall not contain institution, tenant, class, course, department, term, academic-roster, or institution-administrator scope.

## 3. Question-bank authoring

* **FR-020:** The system shall allow a teacher to create, rename, archive, and manage question banks owned by that teacher.
* **FR-021:** The system shall support the question types `MCQ`, `MSQ`, `TRUE_FALSE`, `SHORT`, and `LONG`; it shall not include fill-in-the-blank as a v1 question type.
* **FR-022:** A question shall support marks, prompt content, optional media, tags, explanation/reference metadata, and type-specific validation.
* **FR-023:** Objective questions shall support an immutable answer key stored separately from the student-facing question payload.
* **FR-024:** Subjective questions shall support optional teacher-provided keywords, rubric criteria, supplied reference books/documents, and an explicit no-key mode.
* **FR-025:** The system shall create immutable question versions. An edit shall create a new version and shall not mutate the content used by a historical exam revision or attempt.
* **FR-026:** The system shall validate question type, option count, option uniqueness, mark bounds, media references, answer-key shape, and content-size limits before a version is usable.
* **FR-027:** Question-bank and answer-key data shall be encrypted at rest using application-layer envelope encryption with separated key access.
* **FR-028:** The system shall provide teacher-only previews that may include answer keys and grading evidence, while student-facing payloads shall exclude them.
* **FR-029:** Question imports shall be validated, malware-scanned where files are accepted, rate-limited, and committed atomically; a partial import shall not create usable orphan questions.

## 4. Exam authoring and immutable revisions

* **FR-030:** The system shall allow a teacher to create an exam shell with title, description, instructions, subject metadata, marks, registration window, attempt window, capacity, and policies.
* **FR-031:** The system shall allow a teacher to compose an exam from immutable question versions and preserve the selected order, marks, section membership, and revision references.
* **FR-032:** The system shall allow a teacher to create sections with title, order, question list, marks, navigation policy, and optional section duration.
* **FR-033:** The system shall support paper timing modes `WHOLE_PAPER`, `SECTION_TIMED`, `QUESTION_TIMED`, and `MIXED`.
* **FR-034:** `WHOLE_PAPER` shall define one server-authoritative paper deadline.
* **FR-035:** `SECTION_TIMED` shall define a server-authoritative duration for each timed section. When every section is timed, the sum of section durations shall equal the paper duration exactly.
* **FR-036:** `QUESTION_TIMED` shall define a server-authoritative duration for each timed question. A question timer shall start only when the server activates that question.
* **FR-037:** `MIXED` shall allow the validated combination of paper, section, and question timing rules; overlapping or ambiguous deadlines shall be rejected before publication.
* **FR-038:** The system shall reject a revision with negative or zero durations, unreachable questions, duplicate question references, invalid section order, marks inconsistent with questions, or an incomplete timing configuration.
* **FR-039:** The system shall calculate a canonical content hash over exam identity, revision, sections, question-version references, order, marks, timing, access, proctoring, grading, and authoring policies.
* **FR-040:** A published revision shall be immutable. Any change shall create a new draft revision and a new content hash.
* **FR-041:** Existing registrations and attempts shall retain the exact revision snapshot used at registration or session creation; a later revision shall not rewrite historical assessment content.
* **FR-042:** The system shall support exam lifecycle states sufficient to distinguish draft, published, closed, archived, and invalidated revisions, with server-checked transition rules.

## 5. Exam access, discovery, invitations, and registration

* **FR-043:** The system shall support access policies `PUBLIC`, `INVITATION_ONLY`, and `APPROVAL_REQUIRED`.
* **FR-044:** `PUBLIC` exams shall expose safe metadata to authenticated users and shall automatically approve a valid registration request, subject to window, capacity, duplicate, and eligibility checks.
* **FR-045:** `INVITATION_ONLY` exams shall not be broadly discoverable and shall require a valid, unexpired, single-use or policy-scoped invitation token bound to the intended exam and, where configured, candidate identity.
* **FR-046:** `APPROVAL_REQUIRED` exams shall be discoverable through safe metadata or a direct link; a user request shall remain `REQUESTED` until the owning teacher explicitly approves or rejects it.
* **FR-047:** The teacher shall be the only v1 actor authorised to approve or reject an approval-required registration.
* **FR-048:** The system shall enforce registration opening/closing times, attempt windows, capacity, duplicate-registration prevention, and one-registration-per-user-per-exam rules transactionally.
* **FR-049:** Registration approval shall bind the user, exam, published revision, access policy, registration decision, decision actor, decision time, and audit event.
* **FR-050:** A rejected registration shall not be converted to approved by the student, invitation URL, client parameter, or replayed request.
* **FR-051:** A registration shall not itself grant question access, an active attempt, or an Electron launch credential. Only the complete entry flow may issue an attempt credential.
* **FR-052:** Catalogue and registration responses shall exclude question content, answer keys, private teacher notes, hidden proctoring thresholds, another user's registration data, and private invitation data.
* **FR-053:** Teachers shall be able to list and filter their exam registrations by status and shall be able to approve or reject only pending registrations for their own exam.
* **FR-054:** The system shall make registration mutations idempotent and shall handle concurrent requests without creating duplicate approved registrations or exceeding capacity.

## 6. Persistent device registration

* **FR-055:** The system shall provide an explicit device-registration flow using an authenticated challenge, device public key, native attestation where available, account security gates, and server-side verification.
* **FR-056:** The system shall persist the device registration per user and device identity; a registered device shall not be silently re-created at every exam start.
* **FR-057:** The system shall allow at most two active registered devices per user.
* **FR-058:** If both device slots are occupied, the system shall require the user to revoke a non-current device before registering a third device.
* **FR-059:** The system shall reject revocation of the device currently bound to the active operation and shall require reauthentication and configured step-up verification for revocation.
* **FR-060:** The system shall make device registration and revocation transactional and auditable, using a concurrency control that cannot create a third active device.
* **FR-061:** Persistent registration shall answer whether the device is an approved user device; it shall not replace the per-attempt security gates.
* **FR-062:** The system shall list a user's registered devices using safe metadata only, including label, platform, registration time, last-used time, current-use state, and status; private keys and raw fingerprints shall never be returned.

## 7. Electron-only secure entry

* **FR-063:** Every actual exam attempt shall run inside the signed Electron application and shall not be startable from a normal browser tab.
* **FR-064:** The Electron application shall load the deployed web application URL from the allowlisted `EXAM_WEB_URL` configuration and shall not ship a separate exam-renderer frontend or duplicate exam UI codebase.
* **FR-065:** The Electron main process shall enforce the allowed origin, secure window configuration, disabled Node integration in the loaded page, disabled remote module, restricted navigation, context isolation, preload isolation, and signed release policy.
* **FR-066:** The preload bridge shall expose only named, schema-validated native capabilities required for launch, lockdown, attestation, evidence, liveness, and controlled shutdown.
* **FR-067:** The system shall issue a short-lived, single-use launch ticket bound to user, registration, exam, revision hash, registered device, client version, nonce, and expiry.
* **FR-068:** The server shall exchange the launch ticket only after device eligibility, per-attempt gates, attestation, consent, and registration state pass.
* **FR-069:** The issued attempt credential shall be bound to one user, one registration, one device, one session, one revision, and one active client connection; replay, substitution, and reuse shall be rejected.
* **FR-070:** The normal browser application shall support authentication, discovery, registration, device management, authoring, grading, proctor review, and results, but shall not obtain active question content or an exam-session credential.
* **FR-071:** Electron lockdown shall restrict navigation, external windows, downloads, clipboard paths, printing, developer tools, unauthorized IPC, and disallowed display/process conditions according to the exam policy and platform capability.
* **FR-072:** The system shall treat native lockdown and attestation as evidence rather than an absolute security guarantee and shall preserve server-side enforcement if the client is modified.

## 8. Per-attempt gates and proctoring

* **FR-073:** The system shall execute the configured identity, consent, device, native-attestation, environment, network, and proctoring gates at every attempt start, even when the device has persistent registration.
* **FR-074:** The system shall persist each gate's version, input/evidence reference, outcome, timestamp, reason code, and policy decision without storing sensitive raw data in ordinary logs.
* **FR-075:** The system shall support configurable gate policies for identity verification, reference-photo/biometric match, camera and microphone readiness, environment scan, single-monitor or display checks, virtualisation/RDP checks, process checks, network intelligence, and optional secondary-device pairing, subject to platform capability and consent.
* **FR-076:** A failed mandatory gate shall prevent entry or place the attempt into the configured review/failure state; a client cannot mark a failed gate as passed.
* **FR-077:** The system shall ingest signed, fresh, bounded telemetry and evidence with per-session sequence numbers, size limits, quotas, deduplication, and rate limits.
* **FR-078:** The system shall support proctoring signals including face presence, multiple faces, gaze/attention anomalies, secondary voices, prohibited process/display signals, network changes, focus changes, clipboard attempts, and evidence availability where configured.
* **FR-079:** Client-reported telemetry shall create a reviewable signal only; it shall not directly change risk, submit an attempt, assign a grade, or publish a result.
* **FR-080:** The server shall calculate risk from policy-versioned signal deltas and shall apply the configured hard-threshold action through the session state machine. The same event shall be idempotent.
* **FR-081:** AI and automated proctoring shall not make a final misconduct or disciplinary decision. The system shall preserve evidence and human review state.
* **FR-082:** The system shall provide authorised teacher/proctor review of flags, evidence references, timelines, decisions, notes, and integrity status, with access auditing.

## 9. Exam session, navigation, answers, and timing

* **FR-083:** The system shall create at most one active attempt for a registration and shall enforce one attempt per registration.
* **FR-084:** The session service shall be the sole authority for session state, current question, section, server time, deadlines, sequence, answer acceptance, question locks, and terminal transitions.
* **FR-085:** The system shall expose only the server-authorised current question and permitted answer controls to the active Electron session.
* **FR-086:** Question navigation shall be strictly forward-only. Back navigation, question revisiting, arbitrary question selection, and client-chosen question IDs shall be rejected.
* **FR-087:** A question submission shall be durable, idempotent, sequence-checked, and permanently lock that question. A later command shall not edit or reopen it.
* **FR-088:** Objective answer values shall be validated against the immutable question version; invalid options, duplicate values, oversized values, and malformed answer kinds shall be rejected.
* **FR-089:** At question timeout, the server shall auto-submit the active question according to the approved unanswered-answer policy, lock it permanently, emit an auditable timeout event, and advance according to the server policy.
* **FR-090:** At section timeout, the server shall auto-submit and lock the active question if necessary, then skip and permanently lock every unreached question in that section; no section timeout may reopen or extend a deadline.
* **FR-091:** At whole-paper timeout, the server shall auto-submit/lock the active state, skip/lock all remaining questions, transition the attempt to `AUTO_SUBMITTED`, and begin grading.
* **FR-092:** The system shall support a bounded reconnect window after a transport interruption. The server shall pause the active timing authority only in the `PAUSED_RECONNECT` state, enforce the configured reconnect deadline and maximum of three reconnect attempts, and terminate the attempt when the bound is exceeded.
* **FR-093:** Reconnection shall require the same user, registered device, session, credential family, fresh presence/attestation as configured, and the last accepted sequence; it shall not restore an older state or grant additional time.
* **FR-094:** The system shall persist answers and state transitions in PostgreSQL before acknowledging authoritative success. Redis, WebSocket memory, or client cache shall not be the sole copy.
* **FR-095:** The system shall reject stale, duplicate, out-of-order, cross-session, expired, or cross-question commands without mutating the attempt.
* **FR-096:** The system shall support controlled, idempotent student submission and server-authorised automatic submission, with an append-only event for each transition.

## 10. Grading, AI assistance, and results

* **FR-097:** After submission or auto-submission, the system shall grade `MCQ`, `MSQ`, and `TRUE_FALSE` responses automatically against the immutable answer key.
* **FR-098:** The system shall send `SHORT` and `LONG` responses to the AI grading workflow when enabled and shall store a pending suggestion containing score, confidence/uncertainty, rubric/key evidence, model/provider version, and provenance.
* **FR-099:** A teacher may configure subjective grading evidence as keywords, a supplied book/document/reference, or no answer key.
* **FR-100:** When the policy permits web research and no sufficient teacher-provided evidence exists, the system may retrieve controlled external evidence and shall store URL, provider, retrieval time, content hash, quote/evidence span, and request ID. External web content shall never be final authority.
* **FR-101:** AI suggestions shall remain non-final and pending until the exam owner teacher explicitly confirms, changes, or records a reviewed decision for each required subjective grade.
* **FR-102:** A teacher grade decision shall validate score bounds, required decision fields, ownership, revision, and grade state; it shall create immutable grade history and an audit-chain event in the same transaction.
* **FR-103:** The system shall prevent result publication while objective grading is incomplete or any required subjective grade remains pending, unless an explicit exam policy supports a teacher-recorded incomplete result state.
* **FR-104:** Only the exam owner teacher shall publish final results in v1. Publication shall be explicit, idempotent, revision-bound, and audited.
* **FR-105:** Before publication, the system shall generate a result snapshot containing total score, maximum score, percentage or configured outcome, per-question permitted breakdown, integrity status, and publication metadata.
* **FR-106:** A student shall see only their own published result. The response shall exclude answer keys, private teacher notes, raw proctoring evidence, AI chain-of-thought, hidden thresholds, and another student's information.
* **FR-107:** Reopening or changing a final result shall require an explicit teacher-authorised workflow, new grade history, reason, actor, timestamp, and audit event; silent mutation shall be impossible.

## 11. Audit, evidence, and retention

* **FR-108:** The system shall create an append-only audit event for authentication changes, registration decisions, device changes, launch/gate outcomes, session commands, answer locks, timeout transitions, proctoring decisions, grade decisions, and result publication.
* **FR-109:** Audit events shall include correlation ID, actor, resource, session/device where applicable, action, outcome, reason code, timestamp, and previous-event hash.
* **FR-110:** The system shall deliver consequential audit events through a durable outbox and shall make worker delivery idempotent.
* **FR-111:** Evidence shall use encrypted object storage, opaque paths, access control, short-lived signed retrieval, retention policy, deletion policy, and access logging.
* **FR-112:** Raw biometric data, camera/microphone media, and sensitive evidence shall not be written to ordinary application logs.
* **FR-113:** The system shall export an integrity report containing authorised gate summaries, telemetry/flag summaries, evidence references, review decisions, grade history, and result state without exposing data outside the requester's scope.

## 12. API, concurrency, and failure behaviour

* **FR-114:** Every state-changing API shall validate a strict schema, authenticate the request, authorise the resource, enforce idempotency where applicable, execute the domain transition transactionally, and emit the required audit event.
* **FR-115:** The system shall use server-side resource relationships rather than client-provided scope identifiers to authorise exam, registration, device, session, grade, evidence, and result access.
* **FR-116:** Capacity, two-device limits, one-attempt limits, registration decisions, question locks, grade confirmation, publication, and terminal session transitions shall be safe under concurrent requests.
* **FR-117:** Redis may coordinate presence, rate limits, queues, and ephemeral reconnect state, but PostgreSQL shall remain authoritative for durable exam state.
* **FR-118:** On Redis loss, a worker retry, WebSocket reconnect, provider timeout, or process restart, the system shall reconstruct authority from PostgreSQL and shall not grant extra time, duplicate a grade, duplicate a publication, or lose a committed answer.
* **FR-119:** Non-critical provider failure shall produce an explicit pending, failed, or review state; it shall not silently pass a security gate or fabricate a grade/evidence result.
* **FR-120:** The system shall expose correlation IDs and safe error codes while preventing sensitive data disclosure through errors, logs, timing side channels, or resource enumeration.
