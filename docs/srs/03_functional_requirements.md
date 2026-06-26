# Functional Requirements (Expanded)

## 1. Exam Authoring & Management
* **FR-001:** The system shall allow teachers to create an exam container defining title, subject, class/section, total marks, duration, and instructions.
* **FR-002:** The system shall allow adding questions individually or importing from tagged question banks.
* **FR-003:** Questions shall support types (MCQ, True/False, Short, Long), individual marks, time limits, and rich media.
* **FR-004:** The system shall support grouping questions into distinct, timed sections.
* **FR-005:** Exams shall default to a "Draft" status, invisible to students until published.
* **FR-006:** The system shall dynamically randomize and shuffle question pools and answer options per student based on defined tags.
* **FR-007:** Question bank data must be encrypted at rest (AES-256) and decrypted only in memory.
* **FR-008:** The system shall track versioning for every exam save action, generating a unique content hash.
* **FR-009:** The system shall support an Approval Workflow where an Approver digitally signs a Draft, binding to its content hash.
* **FR-010:** Any edits to an approved exam shall break the content hash and automatically revert the status to Draft.

## 2. Multi-Tenancy & Authorization Constraints
* **FR-011:** Every exam shall generate a globally unique `exam_id` scoped cryptographically under `institution_id`, `teacher_id`, and `class_id`.
* **FR-012:** To prevent broken access control, student queries must be strictly filtered server-side against their `enrollment_id`; students cannot query objects outside their scope.
* **FR-013:** Concurrent exams must run in fully isolated session namespaces (e.g., separate WebSockets and proctoring streams) with zero shared state.
* **FR-014:** Question banks shall remain scoped to the owner unless explicit RBAC permission grants are executed.

## 3. Pre-Exam & Device Validation
* **FR-015:** The system shall execute one-time device registration per student, generating a hardware fingerprint (OS, browser, GPU, MAC hash).
* **FR-016:** The server shall block exam launches on detected virtual machines, emulators, or RDP sessions.
* **FR-017:** The system shall block exam starts if virtual camera/microphone drivers (e.g., OBS) are detected.
* **FR-018:** The native client shall run a silent background process scan targeting known cheat tools, screen-recorders, and secondary monitors.
* **FR-019:** The system shall require facial biometric ID verification against a registered profile at session start.
* **FR-020:** The system shall enforce a mandatory 360-degree environment webcam scan and single-monitor check prior to entry.

## 4. Secure Entry & Lockdown Client
* **FR-021:** The system shall issue a single-use signed token `{student_id, exam_id, hash, device_id, expiry}` upon entry, valid exclusively for that specific instance.
* **FR-022:** The token must be validated server-side on every request; tampered requests must be rejected and logged.
* **FR-023:** Token reuse from mismatched IP or device fingerprints must immediately flag the session for review.
* **FR-024:** Students must use a dedicated, native lockdown application (e.g., Electron) rather than standard browsers.
* **FR-025:** The lockdown client shall disable OS-level alt-tab, kill unauthorized background apps, disable clipboard, block screenshot tools, and disable external monitor outputs.
* **FR-026:** The client shall operate on a whitelist-only browser engine, blocking all unauthorized navigation and AI extensions.

## 5. Exam Delivery (Server-Authoritative)
* **FR-027:** The server shall deliver one question at a time; full payloads are strictly prohibited from client-side delivery.
* **FR-028:** The server shall act as the absolute sole source of truth for all timers and submission deadlines.
* **FR-029:** The server shall enforce a strict single-active-session limit per student; duplicate logins automatically terminate the older session.
* **FR-030:** Answers shall persist to the server database asynchronously and immediately on entry.

## 6. Hybrid AI Proctoring & Geo-Validation
* **FR-031:** The system shall validate IP geolocation and detect VPNs/Proxies/Datacenters via an IP intelligence API.
* **FR-032:** IP switches mid-exam must trigger network change events that flag the session rather than hard-crashing it.
* **FR-033:** The AI engine shall continuously monitor webcam/mic streams for anomalies: missing faces, multiple faces, sustained off-screen gaze, unpermitted devices, and secondary voices.
* **FR-034:** The system shall record client-side behavioral telemetry (tab blur, copy attempts, right-clicks), scoring them into a consolidated risk index.
* **FR-035:** The system shall auto-submit exams if telemetry crosses a hard violation threshold defined by the teacher.
* **FR-036:** AI flags shall never auto-penalize a student; they must enter a queue for human proctor review.
* **FR-037:** The system shall support selectable proctoring tiers: Post-hoc Review, Live-AI with Human Escalation, and Full Live Human Proctoring.
* **FR-038:** The system shall optionally support pairing a secondary device (mobile phone) for a side-angle room view.

## 7. Grading & Audit Pipeline
* **FR-039:** Objective questions shall be auto-graded server-side instantly upon exam submission.
* **FR-040:** Subjective responses shall be processed by AI for suggested scoring, requiring mandatory explicit teacher confirmation to finalize.
* **FR-041:** Finalized results cannot be altered without an explicit, logged "reopen grading" server-side action.
* **FR-042:** Results shall only become visible to students following manual publication by the teacher.
* **FR-043:** All session recordings, reviewer decisions, and grading actions must be stored in tamper-evident (WORM/hash-chained) storage.
* **FR-044:** All generated system and proctor logs must undergo sanitization to securely mask PI/IPs before non-admin staff review.
* **FR-045:** The system shall generate exportable, comprehensive integrity reports detailing all violations, human notes, and identity verifications per student.