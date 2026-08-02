# M2 — Exam Registration & Access — Flow Design

**Module:** M2 — Exam Registration & Access
**Primary actors:** Student, Teacher
**Primary surface:** Shared web application
**Authoritative references:** `docs/architecture/HIGH_LEVEL_DESIGN.md` §§9, 11, 14; `docs/architecture/LOW_LEVEL_DESIGN.md` §§10, 17; `docs/modules/MODULE_DECOMPOSITION.md` §§2–4; `docs/modules/SCREEN_INVENTORY.md` §6

M2 converts a published teacher-owned exam into a server-authorised registration. It owns discovery, policy evaluation, invitations, registration state, and teacher approval. It does not own accounts, exam composition, devices, live sessions, proctoring, grading, or results.

---

## 1. Registration state machine

```mermaid
stateDiagram-v2
    [*] --> NOT_REGISTERED
    NOT_REGISTERED --> INVITATION_REQUIRED: INVITATION_ONLY
    NOT_REGISTERED --> REQUEST_PENDING: APPROVAL_REQUIRED / submit request
    NOT_REGISTERED --> REGISTERED: PUBLIC / eligibility passes
    INVITATION_REQUIRED --> REGISTERED: valid invitation redeemed
    REQUEST_PENDING --> REGISTERED: teacher approves
    REQUEST_PENDING --> REJECTED: teacher rejects
    REQUEST_PENDING --> EXPIRED: registration window closes
    REGISTERED --> REVOKED: owner/system revokes access
    REGISTERED --> CLOSED: exam or registration closes
    REJECTED --> NOT_REGISTERED: policy permits retry
    EXPIRED --> [*]
    REVOKED --> [*]
    CLOSED --> [*]
```

`REGISTERED` is necessary but not sufficient for exam entry. M5 independently evaluates persistent device eligibility and per-attempt security gates before M6 can create an attempt.

## 2. Student discovery and registration

```mermaid
flowchart TD
    A["Student Dashboard"] --> B["Exam Catalogue"]
    B --> C["Exam Details"]
    C --> D{"Published and registration window open?"}
    D -->|No| E["Safe unavailable state"]
    D -->|Yes| F{"Registration policy"}
    F -->|PUBLIC| G{"Authenticated and policy eligible?"}
    G -->|No| H["Safe eligibility failure"]
    G -->|Yes| I["Create REGISTERED"]
    F -->|INVITATION_ONLY| J["Redeem invitation"]
    J --> K{"Valid, unexpired, bound to user and exam?"}
    K -->|No| L["Safe invitation failure"]
    K -->|Yes| I
    F -->|APPROVAL_REQUIRED| M["Submit registration request"]
    M --> N["Create REQUEST_PENDING"]
    I --> O["Registration Status: REGISTERED"]
    N --> P["Registration Status: PENDING"]
    O --> Q["Open Electron launch path"]
```

The client never supplies a role, teacher ID, institution, class, course, or eligibility verdict. The server derives the user from the authenticated session and evaluates the immutable published exam revision.

## 3. Teacher approval flow

```mermaid
sequenceDiagram
    actor Student
    actor Teacher
    participant Web
    participant M2 as Registration Module
    participant DB as PostgreSQL
    participant Audit as Audit Writer

    Student->>Web: Submit approval-required registration
    Web->>M2: POST /v1/exams/{examId}/registrations
    M2->>M2: Authenticate and validate published policy
    M2->>DB: Insert REQUEST_PENDING atomically
    M2->>Audit: Append request-created event
    M2-->>Student: Safe pending projection

    Teacher->>Web: Open owned registration requests
    Web->>M2: GET pending requests
    M2->>DB: Query by authenticated teacher ownership
    M2-->>Teacher: Bounded request projection

    Teacher->>Web: Approve or reject request
    Web->>M2: POST decision with idempotency key
    M2->>DB: Lock request and verify exam ownership
    M2->>DB: Transition REQUEST_PENDING to REGISTERED or REJECTED
    M2->>Audit: Append decision event
    M2-->>Teacher: Decision projection
```

Only the exam owner/teacher may decide. No institution administrator, super administrator, class administrator, or automated client-side approval path exists in v1.

## 4. Failure and security rules

| Condition | Required behaviour |
| --- | --- |
| Unknown or unauthorised exam | Return the standard safe not-found/unauthorised response. |
| Duplicate registration | Return the current projection; do not create a second record. |
| Concurrent student commands | Enforce unique `(examId, userId)` and idempotent command handling. |
| Concurrent teacher decisions | Lock the registration row and accept only `REQUEST_PENDING`. |
| Closed registration window | Reject without exposing unpublished or restricted content. |
| Teacher no longer owns exam | Reject and append a security-relevant audit event. |
| Registration revoked | M5 launch-ticket issuance must fail even if an old page is open. |
| Stale client state | Re-read server state before every mutating decision. |

## 5. Screen contract map

| Screen ID | Transition | Owning contract |
| --- | --- | --- |
| M2-S01 | Dashboard → catalogue | Published catalogue query |
| M2-S02 | Catalogue → details | Eligibility and policy projection |
| M2-S03 | Details → invitation redemption | Single-use user-bound redemption |
| M2-S04 | Details → request pending | Idempotent registration command |
| M2-S05 | Registration command → status | Registration state projection |
| M2-S06 | Teacher dashboard → request queue | Teacher-owned pending query |
| M2-S07 | Queue → review → decision | Auditable approve/reject command |
| M2-S08 | Teacher dashboard → distribution | Counts and policy-window projection |

## 6. Exit criteria

M2 is complete when published discovery never leaks question content, policy is evaluated server-side, teacher approval is ownership-scoped, every transition is auditable and idempotent, and only `REGISTERED` users can proceed to M5 launch-ticket evaluation.
