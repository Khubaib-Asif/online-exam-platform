# M8 — Grading, Results & Audit — Component Contracts

**Module:** M8 — Grading, Results & Audit
**Primary surface:** Shared web application
**Authoritative references:** `docs/HIGH_LEVEL_DESIGN.md` §§9, 13; `docs/LOW_LEVEL_DESIGN.md` §16; `docs/modules/SCREEN_INVENTORY.md` §12

## 1. Grading components

| Component | States | Data contract | Security rule |
| --- | --- | --- | --- |
| `GradingQueue` | loading / empty / ready / error | Submitted-attempt summary | Scope to exams owned by authenticated teacher. |
| `GradeReview` | loading / objective-complete / AI-pending / review | Answer, key-derived mark, AI suggestion, evidence | Never exposes another student's attempt. |
| `TeacherMarkEditor` | unchanged / dirty / saving / saved / conflict | Teacher final mark command | Teacher decision supersedes suggestion only through audited command. |
| `ResultPublication` | blocked / ready / publishing / published | Publication command/result | Require all subjective decisions complete. |
| `StudentResults` | loading / empty / ready | Published result projection | Authenticated student scope only. |
| `ResultDetail` | loading / ready / restricted | Immutable snapshot and permitted feedback | Do not expose private keys or evidence beyond policy. |
| `AuditLogViewer` | loading / ready / restricted | Authorised audit projection | Redact secrets and sensitive media metadata. |

## 2. Grading contracts

```typescript
type GradeItem = {
  questionId: string;
  questionVersionId: string;
  awardedMarks: number | null;
  maxMarks: number;
  source: 'OBJECTIVE_KEY' | 'TEACHER' | 'AI_SUGGESTION';
  status: 'AUTO_GRADED' | 'PENDING_REVIEW' | 'CONFIRMED';
};

type ResultPublicationCommand = {
  attemptId: string;
  expectedGradeVersion: number;
  idempotencyKey: string;
};

type PublishedResultProjection = {
  resultId: string;
  attemptId: string;
  publishedAt: string;
  totalMarks: number;
  items: Array<Pick<GradeItem, 'questionId' | 'awardedMarks' | 'maxMarks'>>;
};
```

The server recomputes totals from grade items and refuses client-supplied totals or publication of pending subjective items.

## 3. Events and audit contracts

| Event/command | Rule |
| --- | --- |
| `attempt.submitted` | Consumed from M6 as an immutable grading input. |
| `grading.objective.completed` | Deterministic key-based result. |
| `grading.ai.suggestion.created` | Includes provider/model/version and remains non-final. |
| `grade.teacher.confirmed` | Authenticated owner decision with grade version. |
| `result.published` | Immutable snapshot, publication actor, and timestamp. |
| `audit.event.appended` | Append-only, integrity-protected event; query access is separately authorised. |

## 4. Test gates

Test objective-key correctness, subjective pending state, AI failure/retry, teacher ownership, stale grade versions, duplicate publication, student cross-account access, correction history, audit integrity, and private-key/evidence redaction.
