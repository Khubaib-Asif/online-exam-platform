# M6 — Exam Session Orchestration — Flow Design

**Module:** M6 — Exam Session Orchestration
**Primary actor:** Student
**Primary surface:** Shared web application loaded inside the signed Electron shell
**Authoritative references:** `docs/architecture/HIGH_LEVEL_DESIGN.md` §§5, 9, 11, 12, 16; `docs/architecture/LOW_LEVEL_DESIGN.md` §§12–14; `docs/modules/MODULE_DECOMPOSITION.md` §3; `docs/modules/SCREEN_INVENTORY.md` §10

M6 is the server-authoritative execution engine. It owns attempt state, deadlines, navigation, answer persistence, reconnect, and submission. It does not own identity, registration approval, device enrolment, proctoring evidence policy, or final marks.

---

## 1. Attempt lifecycle

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> ACTIVE: signed entry authorisation consumed
    ACTIVE --> PAUSED_RECONNECT: connection lost within policy
    PAUSED_RECONNECT --> ACTIVE: resume nonce and session proof accepted
    PAUSED_RECONNECT --> TERMINATED: reconnect policy exhausted
    ACTIVE --> SUBMITTED: explicit final submission
    ACTIVE --> AUTO_SUBMITTED: paper/section/question timeout
    ACTIVE --> TERMINATED: security/session policy says terminate
    SUBMITTED --> GRADING_PENDING
    AUTO_SUBMITTED --> GRADING_PENDING
    GRADING_PENDING --> [*]
    TERMINATED --> [*]
```

The server derives current time and authoritative state. Client countdowns and navigation controls are projections only.

## 2. Question flow

```mermaid
flowchart TD
    A["M5 entry authorisation"] --> B["Create/resume attempt"]
    B --> C["Deliver current question projection"]
    C --> D{"Student action"}
    D -->|Answer and submit| E["Persist answer idempotently"]
    E --> F["Lock question permanently"]
    D -->|Skip| G["Mark blank and lock"]
    D -->|Question timeout| H["Auto-submit current answer or blank"]
    H --> F
    G --> I["Advance forward"]
    F --> I
    I --> J{"More questions/section?"}
    J -->|Yes| C
    J -->|No| K["Submit attempt"]
```

Navigation is strictly forward-only. A skipped question is permanently locked; a timeout auto-submits the current answer or marks it blank and locks it according to the configured policy. Backtracking is impossible after the server transition.

## 3. Timer and reconnect flow

```mermaid
sequenceDiagram
    actor Student
    participant Electron
    participant Web
    participant M6 as Session Engine
    participant DB as PostgreSQL
    participant Redis

    Electron->>Web: Load EXAM_WEB_URL with signed entry authorisation
    Web->>M6: Exchange entry authorisation for session
    M6->>DB: Create attempt and initialise deadlines
    loop Every command/heartbeat
        Web->>M6: Command with session nonce and client sequence
        M6->>Redis: Coordinate liveness and bounded reconnect state
        M6->>DB: Validate deadline, state, sequence, and persistence
        M6-->>Web: Authoritative state projection
    end
    Web-->>M6: Connection lost
    M6->>M6: Pause only under approved reconnect policy
    Web->>M6: Resume with bounded reconnect proof
    M6->>DB: Revalidate deadline and session state
    alt Resume accepted
        M6-->>Web: Current projection and remaining time
    else Resume rejected
        M6->>DB: Terminate attempt and persist reason
        M6-->>Web: Attempt Terminated
    end
```

## 4. Timeout and submission rules

| Event | Server action |
| --- | --- |
| Whole-paper deadline | Auto-submit/lock active question and complete attempt. |
| Section deadline | Auto-submit/lock active question/section and advance according to policy. |
| Question deadline | Auto-submit current answer or blank, lock question, advance. |
| Explicit question submit | Persist answer and permanently lock question. |
| Final submit | Close attempt idempotently and create grading input. |
| Duplicate command | Return current authoritative projection without a second mutation. |

## 5. Screen contract map

| Screen ID | Transition | Owning contract |
| --- | --- | --- |
| M6-S01 | gate pass → live session | Session query/command contract |
| M6-S02 | connection loss → reconnect | Resume contract |
| M6-S03 | reconnect failure → termination | Termination projection |
| M6-S04 | submit/timeout → confirmation | Submission contract |
| M6-S05 | final close → complete | Completion projection |

## 6. Exit criteria

M6 is complete when every state transition, deadline, answer write, lock, reconnect, and submission is server-authoritative, idempotent, durable, and auditable, with no browser live-attempt path.
