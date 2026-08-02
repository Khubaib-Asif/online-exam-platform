# M2 — Exam Registration & Access — Component Contracts

**Module:** M2 — Exam Registration & Access
**Primary surface:** Shared web application
**Authoritative references:** `docs/architecture/HIGH_LEVEL_DESIGN.md` §§9, 14; `docs/architecture/LOW_LEVEL_DESIGN.md` §§10, 17; `docs/modules/SCREEN_INVENTORY.md` §6

This document defines M2-owned UI components and application contracts. Detailed database schemas and transport envelope rules remain in the LLD.

---

## 1. Catalogue and details components

| Component | States | Data contract | Security rule |
| --- | --- | --- | --- |
| `ExamCatalogue` | loading / ready / empty / error | Bounded published-exam projection | Never query unpublished exams through a client filter. |
| `ExamCard` | available / registered / pending / closed | Exam identity, title, schedule, policy label, registration state | Do not render question counts or metadata not authorised for discovery. |
| `ExamDetailsPanel` | loading / eligible / unavailable | Published metadata and server eligibility result | Eligibility result is advisory UI only; the command rechecks it. |
| `RegistrationAction` | register / redeem / request / registered / disabled | Allowed action from server policy | Never construct an action from a client-supplied role or class. |
| `RegistrationStatus` | pending / approved / rejected / expired / revoked / closed | Authoritative registration projection | Refresh after every command and on launch preparation. |

## 2. Invitation and approval components

| Component | States | Command | Required behaviour |
| --- | --- | --- | --- |
| `InvitationRedemptionForm` | idle / submitting / invalid / redeemed | `RedeemInvitationCommand` | Token is submitted over TLS, never persisted in browser storage, and never logged. |
| `TeacherRegistrationQueue` | loading / empty / populated / stale | `ListOwnedPendingRegistrationsQuery` | Server scopes rows by authenticated teacher-owned exam IDs. |
| `RegistrationReview` | viewing / approving / rejecting / completed | `DecideRegistrationCommand` | Require a reason only where policy says so; always record decision metadata. |
| `DistributionStatus` | loading / ready / restricted | `GetExamDistributionQuery` | Counts are bounded and cannot reveal another owner's data. |

## 3. Typed commands and projections

```typescript
interface CreateRegistrationCommand {
  examId: string;
  invitationToken?: string;
  idempotencyKey: string;
}

interface DecideRegistrationCommand {
  registrationId: string;
  decision: 'APPROVE' | 'REJECT';
  reason?: string;
  idempotencyKey: string;
}

interface RegistrationProjection {
  examId: string;
  userId: string;
  status: 'NOT_REGISTERED' | 'INVITATION_REQUIRED' | 'REQUEST_PENDING' | 'REGISTERED' | 'REJECTED' | 'EXPIRED' | 'REVOKED' | 'CLOSED';
  policy: 'PUBLIC' | 'INVITATION_ONLY' | 'APPROVAL_REQUIRED';
  canLaunch: boolean;
  serverTime: string;
}
```

The authenticated principal is taken from the request context. `userId`, `teacherId`, `institutionId`, `classId`, and `courseId` are not accepted as authority inputs.

## 4. Module events

| Event | Producer | Consumers | Guarantees |
| --- | --- | --- | --- |
| `registration.requested` | M2 | notification/audit workers | Outboxed, idempotent, no secret token payload |
| `registration.decided` | M2 | M5, audit, notification | Includes decision actor and immutable registration version |
| `registration.revoked` | M2 | M5, M6, audit | Launch eligibility must be invalidated |
| `exam.distribution.changed` | M2 | teacher projections/notifications | Does not contain answer keys or question content |

## 5. Validation and test gates

- Validate exam existence, publication, policy, schedule, and registration window in one server-side command path.
- Enforce ownership in the database query and service policy, not only in route middleware.
- Use a unique registration constraint and idempotency records for retries.
- Test duplicate submissions, concurrent approvals, stale approvals, revocation during launch, invitation replay, token leakage, and cross-owner access.
