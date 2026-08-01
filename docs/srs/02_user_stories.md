# User Stories & Epics

**Project:** `online-exam-platform`
**Document Maintainer:** M. Khubaib Asif
**Version:** 2.0
**Status:** Aligned with the current single-platform architecture
**Last updated:** 2026-07-30

## EPIC 1: Identity, profile, and consent

* **US-1.0:** As the deployment owner, I want a one-time bootstrap flow that creates the first owner account without storing a reusable bootstrap secret, so that the platform can be initialised securely without shell commands for each teacher.
* **US-1.0a:** As the platform owner, I want to onboard teachers from an authenticated owner console, so that teacher role assignment is controlled and auditable while students cannot self-assign it.
* **US-1.1:** As a user, I want to create and verify an account so that exam registration and result ownership are tied to a verified identity.
* **US-1.2:** As a user, I want secure login, logout, recovery, and session revocation so that an account compromise can be contained.
* **US-1.3:** As a user, I want to manage my profile, consent, reference identity data, and security settings so that the platform can run the required entry gates lawfully and consistently.
* **US-1.4:** As a user, I want to see my security and device status without seeing secrets such as private keys, biometric references, or attestation material.

## EPIC 2: Question-bank authoring

* **US-2.1:** As a teacher, I want to create and manage my own question banks so that questions can be reused across exams without copying content manually.
* **US-2.2:** As a teacher, I want to create immutable question versions with type, marks, options, media, tags, and answer-key metadata so that later edits cannot change a historical attempt.
* **US-2.3:** As a teacher, I want to define objective answer keys and subjective grading evidence using keywords, supplied references, or no reference so that grading policy is explicit.
* **US-2.4:** As a teacher, I want authorised previews that never expose answer keys or private grading evidence to students.

## EPIC 3: Exam authoring, timing, and publication

* **US-3.1:** As a teacher, I want to compose an exam from question-bank versions or new questions so that the paper is assembled from controlled, versioned content.
* **US-3.2:** As a teacher, I want to divide the paper into sections such as MCQs, true/false, short questions, and long questions so that each section can have its own marks, order, and policy.
* **US-3.3:** As a teacher, I want to choose one whole-paper timer, section timers, question timers, or a mixed timing policy so that the exam reflects its assessment design.
* **US-3.4:** As a teacher, I want the system to validate timing before publication, including the rule that fully section-timed papers must have section durations whose sum equals the paper duration.
* **US-3.5:** As a teacher, I want to configure access as public, invitation-only, or approval-required so that I can balance reach, candidate control, and review workload.
* **US-3.6:** As a teacher, I want to publish an immutable exam revision and create a new draft revision for later changes so that existing registrations and attempts remain reproducible.

## EPIC 4: Discovery and registration

* **US-4.1:** As an authenticated user, I want to discover safe metadata for eligible public and approval-required exams without receiving question content.
* **US-4.2:** As a teacher, I want to issue scoped invitations to selected users without exposing the exam content through the invitation.
* **US-4.3:** As a user, I want to register for a public exam and receive an authoritative registration record.
* **US-4.4:** As a user, I want to redeem a valid invitation and receive an authorised registration without being able to alter its scope.
* **US-4.5:** As a user, I want to request registration for an approval-required exam and see whether the teacher has approved or rejected it.
* **US-4.6:** As a teacher, I want to review and approve or reject only my own exam's pending registrations so that candidate access remains under my control.
* **US-4.7:** As a teacher, I want capacity, registration-window, duplicate-registration, and one-attempt rules enforced transactionally so that concurrent requests cannot create invalid access.

## EPIC 5: Persistent devices and secure entry

* **US-5.1:** As a user, I want to explicitly register a device after the device challenge and identity gates pass so that approved devices can be reused across eligible exams.
* **US-5.2:** As a user, I want at most two active registered devices so that account access is constrained without forcing registration at every exam start.
* **US-5.3:** As a user, I want to revoke a non-current device and then register a replacement device when both slots are occupied.
* **US-5.4:** As a user, I want the platform to run security gates again for every attempt so that persistent device registration does not become a permanent trust decision.
* **US-5.5:** As a user, I want to launch an approved attempt only through the signed Electron application, which loads the deployed web application URL in a locked native shell.
* **US-5.6:** As a platform operator, I want launch tickets, attestation, gate outcomes, and attempt credentials bound to the user, registration, device, revision, and session so that replay or parameter substitution is rejected.

## EPIC 6: Secure exam delivery and timing

* **US-6.1:** As a student, I want to see one authorised current question at a time so that the complete paper and answer key are not delivered to the client.
* **US-6.2:** As a student, I want clear server-synchronised time remaining so that I can make decisions without relying on a manipulable local clock.
* **US-6.3:** As a student, I want to move only forward so that a submitted question cannot be reopened or changed.
* **US-6.4:** As a student, I want a submitted question to be permanently locked and acknowledged by the server so that my answer state is unambiguous.
* **US-6.5:** As a student, I want question and section timeouts to be handled automatically so that the platform produces a deterministic outcome even if I do nothing.
* **US-6.6:** As a student, I want a bounded reconnect window after a network interruption so that a transient outage does not immediately destroy an attempt, while repeated or prolonged loss still terminates it under policy.
* **US-6.7:** As a student, I want exactly one attempt for an exam registration so that the assessment policy is enforced consistently.

## EPIC 7: Proctoring and integrity

* **US-7.1:** As a teacher, I want to select an exam-specific proctoring policy so that security controls match the assessment risk.
* **US-7.2:** As a student, I want the required consent and entry gates explained before capture or verification begins.
* **US-7.3:** As a teacher or authorised proctor, I want evidence, flags, risk changes, and event timelines linked to an attempt so that review is evidence-based.
* **US-7.4:** As a student, I want a network or telemetry anomaly to be recorded and reviewed rather than treated as an automatic finding of misconduct.
* **US-7.5:** As a teacher, I want a configured hard integrity threshold to trigger the server's auto-submit policy when required, while preserving an auditable review record.
* **US-7.6:** As a teacher, I want optional secondary-device pairing and bounded native telemetry without allowing a client-reported event to directly terminate or grade an attempt.

## EPIC 8: Grading, review, and publication

* **US-8.1:** As a teacher, I want objective answers graded automatically against the immutable answer key after submission.
* **US-8.2:** As a teacher, I want short and long answers sent to an AI grading workflow for a suggested mark, confidence, rationale evidence, and provenance.
* **US-8.3:** As a teacher, I want to provide keywords, a supplied book/reference, or no answer key for subjective grading; when permitted by policy, controlled web retrieval may supply evidence but never final authority.
* **US-8.4:** As a teacher, I want to confirm, change, or explicitly mark a subjective suggestion as reviewed, with every decision recorded in grade history.
* **US-8.5:** As a teacher, I want results blocked from publication while required subjective decisions are pending.
* **US-8.6:** As a teacher, I want to publish final results explicitly so that students see results only when I decide they are ready.
* **US-8.7:** As a student, I want to see my own published result and permitted integrity status in my dashboard without seeing answer keys, private notes, AI chain-of-thought, or other students' data.

## EPIC 9: Audit, privacy, and operations

* **US-9.1:** As a teacher, I want an integrity report containing relevant gates, events, flags, evidence references, review decisions, and grade history so that disputes can be investigated.
* **US-9.2:** As an authorised reviewer, I want sensitive logs and evidence access controlled and audited so that privacy is preserved.
* **US-9.3:** As an operator, I want queues, timers, WebSockets, evidence processing, grading, and publication monitored so that high-load exam windows remain reliable.
* **US-9.4:** As an operator, I want recovery from Redis, worker, provider, or client failure to reconstruct authority from PostgreSQL without granting extra time or losing committed answers.
