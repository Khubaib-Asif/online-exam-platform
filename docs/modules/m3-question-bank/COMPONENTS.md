# M3 — Question Bank — Component Contracts

**Module:** M3 — Question Bank
**Primary surface:** Shared web application
**Authoritative references:** `docs/architecture/HIGH_LEVEL_DESIGN.md` §9; `docs/architecture/LOW_LEVEL_DESIGN.md` §8; `docs/modules/SCREEN_INVENTORY.md` §7

This document defines M3-owned components and their boundaries. The LLD remains authoritative for transport envelopes, database schema, and shared validation primitives.

---

## 1. Authoring components

| Component | States | Data contract | Security rule |
| --- | --- | --- | --- |
| `QuestionBankList` | loading / empty / ready / error | Ownership-scoped question summary | Server applies ownership and pagination. |
| `QuestionEditor` | draft / dirty / validating / saved / invalid | Type-specific draft model | Never trusts client type or answer-key shape without server validation. |
| `QuestionTypeEditor` | MCQ / MSQ / TRUE_FALSE / SHORT / LONG | Type-specific fields | Fill-in-the-blank is rejected, not silently transformed. |
| `QuestionPreview` | loading / ready / unavailable | Student-visible version projection | Excludes objective keys and private reference material. |
| `QuestionImport` | idle / uploading / validating / complete / failed | Bounded import command/result | Enforce size, row, text, and nesting limits server-side. |
| `QuestionOrganisation` | ready / editing / saved | Tags, archive state, ownership | Cannot change ownership through tags or hidden fields. |
| `VersionHistory` | loading / ready / empty | Immutable version summaries and references | Historical data is read-only. |

## 2. Type contracts

```typescript
type QuestionType = 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER';

type QuestionDraft = {
  questionId?: string;
  type: QuestionType;
  prompt: string;
  options?: Array<{ id: string; text: string }>;
  objectiveKey?: string[];
  subjectiveRubric?: { keywords: string[]; referenceText?: string; maxMarks: number };
  marks: number;
};

type QuestionVersionProjection = {
  questionId: string;
  version: number;
  type: QuestionType;
  prompt: string;
  options?: Array<{ id: string; text: string }>;
  marks: number;
  immutable: true;
};
```

`objectiveKey` and private subjective material are accepted only by teacher-authorised commands and are stripped from student projections.

## 3. Commands and events

| Command/event | Owner | Contract rule |
| --- | --- | --- |
| `question.draft.upsert` | M3 | Idempotent command; authenticated teacher owns the question. |
| `question.version.create` | M3 | Validates type, marks, options, answer metadata, and limits. |
| `question.archive` | M3 | Refuses destructive mutation when a live/published reference requires retention. |
| `question.import.validate` | M3 | Bounded, quarantined validation before persistence. |
| `question.version.created` | M3 | Immutable event consumed by M4 through a typed projection. |
| `question.version.referenced` | M4 → M3 | Prevents in-place mutation or deletion of a required version. |

## 4. Validation and test gates

- Reject unsupported types explicitly.
- Require exactly one valid objective key shape for objective types.
- Require bounded rubric/reference data for subjective types.
- Reject zero/negative marks, malformed options, duplicate option IDs, and invalid answer references.
- Test cross-teacher access, version immutability, import abuse, answer-key leakage, concurrent edits, and archive/restore behaviour.
