# M7 — Proctoring & Integrity — Flow Design

**Module:** M7 — Proctoring & Integrity
**Primary actors:** Student, Teacher, Proctor if enabled, system/AI workers
**Primary surfaces:** Evidence originates from the Electron-loaded web application; review uses the shared web application
**Authoritative references:** `docs/HIGH_LEVEL_DESIGN.md` §§9, 11, 13, 16; `docs/LOW_LEVEL_DESIGN.md` §15; `docs/modules/MODULE_DECOMPOSITION.md` §3; `docs/modules/SCREEN_INVENTORY.md` §11

M7 ingests and evaluates integrity evidence. It does not become the authority for identity, timing, answer state, grading, or result publication.

---

## 1. Integrity lifecycle

```mermaid
stateDiagram-v2
    [*] --> NOT_STARTED
    NOT_STARTED --> ACTIVE: M6 attempt begins
    ACTIVE --> REVIEW_REQUIRED: policy threshold or anomaly
    ACTIVE --> CLEAR: attempt ends with no review trigger
    REVIEW_REQUIRED --> CLEARED: authorised review decision
    REVIEW_REQUIRED --> FLAGGED: authorised integrity finding
    REVIEW_REQUIRED --> INCONCLUSIVE: evidence insufficient
    CLEAR --> [*]
    CLEARED --> [*]
    FLAGGED --> [*]
    INCONCLUSIVE --> [*]
```

A signal or AI output is not itself a final disciplinary result. The configured policy and authorised review workflow determine the integrity state.

## 2. Evidence and review flow

```mermaid
flowchart TD
    A["M6 active attempt"] --> B["Electron/web media and telemetry"]
    B --> C["Validate, redact, deduplicate, order"]
    C --> D["Encrypted evidence/object storage"]
    C --> E["Integrity signal computation"]
    E --> F{"Threshold or policy event?"}
    F -->|No| G["Continue monitoring"]
    F -->|Yes| H["Review queue"]
    H --> I["Teacher/authorised reviewer"]
    I --> J{"Review outcome"}
    J -->|Clear| K["CLEARED"]
    J -->|Flag| L["FLAGGED → M8 input"]
    J -->|Insufficient| M["INCONCLUSIVE"]
```

Camera and microphone capture uses lightweight client capabilities, but M7 trusts only validated server-ingested evidence and policy-versioned signals. It never accepts a client-supplied `riskScore` or `flagged` decision.

## 3. Live monitoring flow

```mermaid
sequenceDiagram
    actor Student
    participant Electron
    participant Web
    participant M7 as Proctoring Module
    participant Store as Encrypted Object Storage
    participant Audit as Audit Writer
    actor Teacher

    Electron->>Web: Provide approved camera/mic capability stream
    Web->>M7: Submit bounded telemetry/evidence envelope
    M7->>M7: Authenticate attempt and validate sequence/hash
    M7->>Store: Store encrypted media/evidence reference where policy permits
    M7->>M7: Compute versioned integrity signals
    M7->>Audit: Append evidence and signal event
    M7-->>Web: Continue/limited-review signal
    Teacher->>Web: Open integrity detail
    Web->>M7: Query owned-attempt evidence projection
    M7-->>Teacher: Redacted, authorised timeline
    Teacher->>Web: Record review decision
    Web->>M7: Submit auditable review command
```

## 4. Integrity rules

| Rule | Required behaviour |
| --- | --- |
| Identity mismatch | Record a policy-versioned signal; do not change M6 identity or timing state directly. |
| Camera/mic unavailable | Apply the exam's configured server policy; never silently bypass a required gate. |
| Evidence ordering | Validate per-attempt sequence, timestamp bounds, and deduplication key. |
| Storage | Encrypt evidence, separate keys, restrict access, and apply retention/deletion jobs. |
| Teacher review | Scope to exam-owner or explicitly authorised reviewer policy; audit every decision. |
| AI output | Advisory/policy input only; no unaudited final disciplinary result. |

## 5. Screen contract map

| Screen ID | Transition | Owning contract |
| --- | --- | --- |
| M7-S01 | Teacher dashboard → live monitor | Active-attempt monitoring projection |
| M7-S02 | monitor → evidence detail | Redacted evidence timeline |
| M7-S03 | detail → integrity review | Auditable review command |
| M7-S04 | review → reconnect decision | Policy-scoped reconnect review |

## 6. Exit criteria

M7 is complete when media/telemetry is validated and bounded, evidence is encrypted and access-controlled, signals are deterministic/versioned, teacher review is auditable, and no proctoring path can mutate timing, answers, marks, or publication directly.
