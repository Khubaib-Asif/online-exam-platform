# M4 — Exam Builder & Publication — Component Contracts

**Module:** M4 — Exam Builder & Publication
**Primary surface:** Shared web application
**Authoritative references:** `docs/HIGH_LEVEL_DESIGN.md` §§9, 12, 14; `docs/LOW_LEVEL_DESIGN.md` §9; `docs/modules/SCREEN_INVENTORY.md` §8

This document defines M4-owned authoring and publication components. M6 remains the authority for runtime timing and navigation.

---

## 1. Authoring components

| Component | States | Data contract | Security rule |
| --- | --- | --- | --- |
| `ExamList` | loading / empty / ready / error | Ownership-scoped exam summary | Server scopes by authenticated teacher. |
| `ExamBuilder` | clean / dirty / saving / invalid / saved | Draft revision projection | No direct mutation of published revision. |
| `SectionEditor` | adding / editing / reordered / invalid | Section draft and question-version refs | Validate ordering and section ownership server-side. |
| `QuestionVersionSelector` | loading / selected / unavailable | M3 immutable version projection | Never accepts arbitrary question IDs without M3 resolution. |
| `ExamSettingsAudience` | editing / invalid / saved | Timing, policy, schedule, proctoring, result policy | No institution/class/course audience fields in v1. |
| `ExamPreview` | loading / ready / invalid | Student-visible revision projection | Excludes keys, private rubric data, and hidden author metadata. |
| `PublishExam` | validating / publishing / published / failed | Publication command/result | Requires all revision invariants and idempotency. |
| `DistributionStatus` | loading / ready / restricted | Publication and registration summary | M2 owns registration state; M4 only projects it. |

## 2. Revision and policy contracts

```typescript
type TimingMode = 'WHOLE_PAPER' | 'SECTION_TIMED' | 'QUESTION_TIMED' | 'MIXED';
type RegistrationPolicy = 'PUBLIC' | 'INVITATION_ONLY' | 'APPROVAL_REQUIRED';

type ExamRevisionDraft = {
  examId?: string;
  title: string;
  sections: Array<{ id: string; title: string; questionVersionIds: string[]; durationSeconds?: number }>;
  paperDurationSeconds: number;
  timingMode: TimingMode;
  registrationPolicy: RegistrationPolicy;
  navigation: 'FORWARD_ONLY';
  shufflePolicy: 'NONE' | 'WITHIN_SECTION';
};
```

The server rejects unsupported question types, invalid marks, empty required sections, duplicate references, invalid durations, and a section-duration sum that does not equal the paper duration when all sections are timed.

## 3. Publication transaction and events

| Command/event | Owner | Contract rule |
| --- | --- | --- |
| `exam.draft.upsert` | M4 | Teacher ownership and revision status are rechecked. |
| `exam.revision.validate` | M4 | Resolves M3 versions and runs all publication invariants. |
| `exam.revision.publish` | M4 | Freezes immutable revision and creates catalogue projection atomically. |
| `exam.revision.unpublish` | M4 | Stops new registration according to policy while retaining history. |
| `exam.published` | M4 | Outboxed event consumed by M2 and notification workers. |
| `exam.unpublished` | M4 | Invalidates discovery/registration projections; never mutates live attempts. |

## 4. Validation and test gates

- A teacher may mutate only exams they own.
- Publication is idempotent and safe under concurrent clicks.
- Published question-version references cannot be changed in place.
- Test timing-sum errors, duplicate question references, stale drafts, unpublication during registration, policy changes, and cross-owner access.
