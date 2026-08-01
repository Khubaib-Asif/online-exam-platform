# M7 — Proctoring & Integrity — Component Contracts

**Module:** M7 — Proctoring & Integrity
**Primary surfaces:** Electron-loaded web application for capture/telemetry; shared web application for review
**Authoritative references:** `docs/HIGH_LEVEL_DESIGN.md` §§5, 9, 13; `docs/LOW_LEVEL_DESIGN.md` §15

## 1. Capture and review components

| Component | States | Data contract | Security rule |
| --- | --- | --- | --- |
| `MediaCapabilityProbe` | pending / granted / denied / unavailable | Capability report | Never claims capture success without browser/native evidence. |
| `ProctoringStream` | starting / active / degraded / stopped | Approved media/telemetry envelope | Bound to authenticated attempt and sequence. |
| `IntegrityTimeline` | loading / ready / redacted / denied | Authorised evidence projection | Never exposes another exam owner's evidence. |
| `SignalSummary` | calculating / clear / review / unavailable | Versioned signal projection | Client cannot set score or outcome. |
| `IntegrityReview` | viewing / deciding / saved | Review command | Decision actor and reason are audited. |
| `ReconnectDecision` | permitted / denied / decided | Policy-scoped reconnect review | Cannot override M6 without an explicit server contract. |

## 2. Evidence contract

```typescript
type EvidenceEnvelope = {
  attemptId: string;
  sequence: number;
  capturedAt: string;
  kind: 'CAMERA' | 'MICROPHONE' | 'SCREEN' | 'ENVIRONMENT' | 'CLIENT_EVENT';
  payloadRef: string;
  contentHash: string;
  clientVersion: string;
};

type IntegritySignal = {
  attemptId: string;
  signalType: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';
  algorithmVersion: string;
  observedAt: string;
  evidenceRefs: string[];
};
```

`payloadRef` is an opaque encrypted-storage reference. Raw media is not embedded in general API responses, logs, audit messages, or client projections.

## 3. Event and review contracts

| Event/command | Rule |
| --- | --- |
| `proctoring.session.started` | M6 attempt exists and policy enables proctoring. |
| `evidence.accept` | Validate auth, sequence, size, hash, timestamp, and retention policy. |
| `integrity.signal.created` | Version algorithm and link evidence references. |
| `integrity.review.record` | Authorised reviewer, immutable decision record, audit event. |
| `proctoring.session.ended` | Close ingestion and schedule retention processing. |

## 4. Test gates

Test camera/mic denial, degraded network, duplicate/out-of-order evidence, oversized payloads, hash mismatch, cross-attempt injection, access-control failures, retention deletion, signal reproducibility, teacher review auditability, and AI/provider failure.
