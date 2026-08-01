# M8 — Grading, Results & Audit — Flow Design

**Module:** M8 — Grading, Results & Audit
**Primary actors:** Teacher, Student, AI grading worker, authorised reviewer
**Primary surface:** Shared web application
**Authoritative references:** `docs/HIGH_LEVEL_DESIGN.md` §§9, 11, 13, 16; `docs/LOW_LEVEL_DESIGN.md` §16; `docs/modules/MODULE_DECOMPOSITION.md` §3; `docs/modules/SCREEN_INVENTORY.md` §12

M8 converts a submitted attempt into a reviewable result, obtains teacher decisions for subjective answers, publishes an immutable result snapshot, and records the audit trail. The teacher who owns the exam publishes results; no class or institution assignment is required in v1.

---

## 1. Grading lifecycle

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED
    SUBMITTED --> OBJECTIVE_GRADED: deterministic answer-key grading
    OBJECTIVE_GRADED --> AI_SUGGESTIONS_PENDING: subjective answers exist
    OBJECTIVE_GRADED --> READY_FOR_PUBLICATION: objective-only or no subjective work
    AI_SUGGESTIONS_PENDING --> TEACHER_REVIEW
    TEACHER_REVIEW --> READY_FOR_PUBLICATION: teacher confirms final marks
    TEACHER_REVIEW --> TEACHER_REVIEW: teacher edits decision
    READY_FOR_PUBLICATION --> PUBLISHED: teacher publishes snapshot
    PUBLISHED --> [*]
```

AI suggestions never become final marks automatically. A result is not student-visible until the authorised teacher publishes it.

## 2. Grading and publication flow

```mermaid
flowchart TD
    A["M6 submitted attempt"] --> B["M8 grading queue"]
    B --> C["Objective grading"]
    C --> D{"Subjective answers?"}
    D -->|No| E["Ready for publication"]
    D -->|Yes| F["AI suggestion worker"]
    F --> G["Teacher grade review"]
    G --> H["Teacher confirms marks"]
    H --> E
    E --> I["Teacher publishes result snapshot"]
    I --> J["Student Results & Feedback"]
    I --> K["Audit and grade history"]
```

## 3. Detailed review flow

```mermaid
sequenceDiagram
    actor Teacher
    participant Web
    participant M8 as Grading Module
    participant AI as AI Worker
    participant DB as PostgreSQL
    participant Audit as Audit Writer

    M8->>DB: Read immutable submitted-attempt snapshot
    M8->>M8: Grade objective answers against immutable keys
    opt Subjective answers exist
        M8->>AI: Submit bounded grading suggestion request
        AI-->>M8: Suggestion, evidence, model/version, or failure
    end
    M8-->>Teacher: Review projection with pending decisions
    Teacher->>Web: Confirm/edit subjective marks
    Web->>M8: Submit teacher decision with idempotency key
    M8->>DB: Persist final mark and grade history
    M8->>Audit: Append decision event
    Teacher->>Web: Publish completed result
    Web->>M8: Publish command
    M8->>DB: Freeze result snapshot and publication state
    M8->>Audit: Append publication event
    M8-->>Web: Published result projection
```

## 4. Rules and failure paths

| Condition | Required behaviour |
| --- | --- |
| Objective answer | Grade deterministically from the immutable question version/key. |
| Subjective answer | AI may suggest; teacher must confirm final mark. |
| AI unavailable | Keep item pending; never fabricate or silently assign final mark. |
| Concurrent teacher decision | Idempotency and row/version checks prevent lost updates. |
| Result publication | Only completed, authorised teacher-owned result can publish. |
| Post-publication edit | Create a controlled correction/version and audit it; never mutate history silently. |
| Student access | Return only the authenticated student's published snapshot. |

## 5. Screen contract map

| Screen ID | Transition | Owning contract |
| --- | --- | --- |
| M8-S01 | teacher dashboard → grading queue | Submitted-attempt query |
| M8-S02 | queue → grade review | Grading projection |
| M8-S03 | review → grade confirmation | Teacher decision command |
| M8-S04 | completed review → publication | Result publication command |
| M8-S05 | student dashboard → results | Published student projection |
| M8-S06 | authorised staff → audit log | Audit query contract |
| M8-S07 | results → detail | Immutable result projection |

## 6. Exit criteria

M8 is complete when objective grading is deterministic, subjective marks remain teacher-controlled, result publication is explicit and ownership-scoped, student visibility is publication-gated, and grading/publication corrections are auditable.
