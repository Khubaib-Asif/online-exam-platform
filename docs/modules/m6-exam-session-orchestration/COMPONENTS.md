# M6 — Exam Session Orchestration — Component Contracts

**Module:** M6 — Exam Session Orchestration
**Primary surface:** Shared web application inside signed Electron
**Authoritative references:** `docs/architecture/HIGH_LEVEL_DESIGN.md` §§5, 12, 16; `docs/architecture/LOW_LEVEL_DESIGN.md` §§12–14

## 1. Live-session components

| Component | States | Data contract | Security rule |
| --- | --- | --- | --- |
| `LiveExamSession` | loading / active / reconnecting / submitted / terminated | Authoritative session projection | Renders only the current server-authorised question. |
| `QuestionPanel` | unanswered / answered / locked / timeout | Current question and answer projection | Cannot request a previous question. |
| `TimerDisplay` | synchronised / stale / expired | Server deadline projection | Never submits a client-calculated deadline. |
| `ForwardNavigation` | enabled / locked / pending | Next-question command | No back button or arbitrary question index. |
| `ReconnectOverlay` | reconnecting / resumed / exhausted | Resume projection | Bounded policy; no indefinite pause. |
| `SubmissionConfirmation` | pending / accepted / already complete | Submission result | Idempotent command result only. |

## 2. State and command contracts

```typescript
type AttemptStatus = 'CREATED' | 'ACTIVE' | 'PAUSED_RECONNECT' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'TERMINATED' | 'GRADING_PENDING';
type QuestionState = 'UNSEEN' | 'ACTIVE' | 'ANSWERED' | 'SKIPPED' | 'TIMED_OUT' | 'LOCKED';

type SessionProjection = {
  attemptId: string;
  status: AttemptStatus;
  sequence: number;
  currentQuestionId: string | null;
  questionDeadline: string | null;
  paperDeadline: string | null;
  sectionDeadline: string | null;
  navigation: 'FORWARD_ONLY';
};

type SubmitQuestionCommand = {
  attemptId: string;
  questionId: string;
  answer?: unknown;
  clientSequence: number;
  idempotencyKey: string;
};
```

The server validates attempt ownership, entry authorisation, sequence, deadline, current-question identity, and question state before mutating anything.

## 3. Persistence and concurrency

- Persist answer and question lock in the same transaction.
- Use a unique attempt/question key and idempotency record for retries.
- Use row/advisory locking for the active attempt transition.
- Never store live session state only in process memory.
- Redis may coordinate liveness and fan-out, but PostgreSQL remains the durable authority.
- Emit an outbox event after the committed state transition.

## 4. Test gates

Test forward-only enforcement, backtracking attempts, duplicate submits, answer overwrite after lock, question/section/paper timeout races, reconnect at deadline, duplicate final submit, stale sequence, browser session rejection, and process restart with durable recovery.
