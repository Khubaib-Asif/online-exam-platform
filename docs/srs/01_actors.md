# System Actors

**Project:** `online-exam-platform`
**Document Maintainer:** M. Khubaib Asif
**Version:** 2.0
**Status:** Normative actor and authority model
**Last updated:** 2026-07-30

This document defines the actors that interact with the Online Exam Platform v1 and the decisions each actor is authorised to make.

## 1. Human actors

| Actor | Description | Authoritative actions | Explicit limits |
| :--- | :--- | :--- | :--- |
| **Deployment Owner** | The first privileged human account created during secure deployment bootstrap. | Completes the one-time bootstrap; signs in to the owner console; invites and revokes teachers; reviews bootstrap and invitation audit events; performs owner account recovery through the approved operational procedure. | Cannot access student answers, question keys, proctoring evidence, or grades merely by being the deployment owner unless a separate explicit permission is granted. Bootstrap is unavailable after the first owner exists. |
| **Teacher** | A user activated through a deployment-owner invitation and authorised to operate the exam lifecycle. | Creates question banks; creates and versions exams; configures sections, timing, access, proctoring, and grading policies; publishes valid revisions; approves or rejects registration requests; monitors authorised sessions; reviews proctoring evidence; confirms or changes subjective grades; publishes results. | Can access only owned or explicitly authorised exam resources. Cannot self-assign `TEACHER`, edit an immutable published revision, read unrelated students' data, bypass a device cap, override server timing, or publish incomplete results. The teacher is the only v1 approval authority for registration requests and subjective grade decisions. |
| **Student/User** | Authenticated candidate who discovers, receives, registers for, and attempts exams. | Public self-registration creates this role only. Creates and manages the account; completes identity and consent gates; registers at most two devices; revokes a non-current device; registers for eligible exams; enters an approved attempt in Electron; submits answers; views owned registrations and published results. | Cannot select or claim `TEACHER`, access question content through the normal browser; cannot register a third device without revocation; cannot revoke the current device; cannot backtrack or unlock a submitted question; cannot alter timing, grades, risk, or results. |
| **Proctor** *(optional)* | Authorised reviewer for live or post-hoc integrity evidence when the exam policy enables proctor review. | Reviews permitted flags and evidence; records a review decision and note within the assigned scope. | Cannot change exam content, timing, answers, grades, registration decisions, or result publication unless a separate explicit teacher-authorised permission is added in a future version. A proctor is not an exam-registration approver in v1. |
## 2. Machine actors

| Actor | Description | Authority and limits |
| :--- | :--- | :--- |
| **Web Application** | The shared React/TypeScript presentation surface served by the platform. It supports non-exam workflows and is also loaded inside Electron during an attempt. | Untrusted presentation client. It renders server-authorised state and sends commands. It never becomes the authority for identity, access, deadlines, navigation, answer locks, grades, risk, or publication. |
| **Electron Main Process** | The signed native lockdown shell that loads the deployed web application URL for exam attempts. | Provides native launch, window, navigation, process, display, IPC, attestation, and evidence capabilities. It cannot grant an attempt or make a server-authoritative decision. |
| **Electron Preload Bridge** | A minimal, allowlisted IPC bridge between the loaded web application and the Electron main process. | Exposes named, schema-validated capabilities only. It does not expose Node.js, arbitrary IPC channels, filesystem access, shell execution, or unrestricted message forwarding. |
| **Exam Session Service** | Backend module that creates and advances isolated attempts. | Sole authority for session lifecycle, server time, question order, forward-only navigation, answer persistence, locks, timeout transitions, and terminal states. |
| **System / Worker Engine** | Backend workers for email, timers, telemetry analysis, evidence processing, objective grading, AI suggestions, notifications, outbox delivery, and retention. | Performs only idempotent, policy-constrained work. Workers cannot bypass domain transitions or publish a result without the required teacher decision. |
| **External Providers** | Email, IP intelligence, object storage, AI grading, controlled retrieval, and optional media/proctoring providers. | Untrusted dependencies. Provider output is evidence or a delivery result, never identity, timing, grade, risk, or access authority. |

## 3. Authority model

1. The authenticated server context determines the actor identity; client-supplied `userId`, `teacherId`, `studentId`, `examId`, `deviceId`, `sessionId`, and result-owner fields are never trusted.
2. Teacher ownership and authenticated exam registration are the only v1 distribution relationships. Institution, tenant, class, course, department, term, and academic-roster actors are out of scope.
3. The teacher is the only v1 actor who approves or rejects an `APPROVAL_REQUIRED` registration and the only actor who makes a subjective grade final.
4. A student may see only safe exam metadata before registration and only their own registration, attempt state, and published result afterward.
Before the first owner account exists, the deployment owner may perform one-time bootstrap using the deployment-provided bootstrap secret. The bootstrap secret is not a normal login credential, is never stored in plaintext, is single-use, is invalidated after successful bootstrap or explicit rotation, and cannot create a student, proctor, or privileged operator account.

The bootstrap flow creates exactly one `OWNER` account in a controlled first-run state. The owner must complete email verification, replace the bootstrap-derived credential with a normal password, enrol a second factor where enabled, and then use the authenticated web console to create or approve teacher accounts. The owner is not an exam-domain teacher unless explicitly assigned that role by the bootstrap transaction.

A teacher account is created only through an owner-authorised onboarding action. Public self-registration cannot select or claim the `TEACHER` role, and client-supplied role values are ignored or rejected.
5. Every consequential actor action is authenticated, resource-authorised, idempotent where applicable, and recorded in the append-only audit chain.
