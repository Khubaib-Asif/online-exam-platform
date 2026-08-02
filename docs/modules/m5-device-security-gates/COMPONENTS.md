# M5 — Device & Security Gates — Component Contracts

**Module:** M5 — Device & Security Gates
**Primary surfaces:** Shared web application and signed Electron shell
**Authoritative references:** `docs/architecture/HIGH_LEVEL_DESIGN.md` §§5, 9, 13; `docs/architecture/LOW_LEVEL_DESIGN.md` §§11, 14, 17

M5 defines device and entry components only. Live timing and question rendering belong to M6; proctoring evidence evaluation belongs to M7.

---

## 1. Web components

| Component | States | Data contract | Security rule |
| --- | --- | --- | --- |
| `DeviceList` | loading / ready / empty / error | Redacted device projection | Never expose device private keys or raw fingerprints. |
| `RegisterDeviceAction` | idle / challenge / registering / success / blocked | Device challenge command | Server enforces the two-device cap. |
| `RevokeDeviceDialog` | closed / confirm / rejected / success | Non-current revoke command | Current device cannot be revoked. |
| `LaunchExamAction` | unavailable / preparing / opening / failed | Launch-ticket request | Requires M2 registration and schedule eligibility. |
| `GateFailure` | remediation / terminal | Safe code and next action | Do not reveal detection thresholds or sensitive evidence. |

## 2. Electron/web boundary

The Electron process is a signed shell. It loads the deployed `EXAM_WEB_URL`; it does not ship a separate exam renderer frontend. Native capabilities are exposed only through a narrow preload bridge. The web application remains the source of presentation and calls the backend for every authoritative decision.

```typescript
interface SecurityBridge {
  getDeviceAttestation(challenge: string): Promise<AttestationEnvelope>;
  getEnvironmentReport(): Promise<EnvironmentReport>;
  requestMediaCapabilities(): Promise<MediaCapabilityReport>;
  closeExamShell(): Promise<void>;
}
```

Every bridge response is schema-validated by the server. The bridge cannot set timer, answer, registration, gate, or result state.

## 3. Gate contracts

```typescript
type GateName = 'IDENTITY' | 'DEVICE' | 'ENVIRONMENT' | 'LOCKDOWN' | 'CONSENT' | 'ATTESTATION';
type GateStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'REQUIRES_REVIEW';

type GateResult = {
  name: GateName;
  status: GateStatus;
  policyVersion: string;
  evidenceRef?: string;
  evaluatedAt: string;
};
```

The server signs the complete entry authorisation only after all required gates pass according to the exam policy. A previous attempt's gate result is not a new attempt's verdict.

## 4. Events and test gates

| Event | Producer | Consumers | Guarantee |
| --- | --- | --- | --- |
| `device.registered` | M5 | M1/audit/notifications | Unique active binding and encrypted metadata. |
| `device.revoked` | M5 | M6/audit | Current binding cannot be revoked. |
| `security.gates.completed` | M5 | M6/M7/audit | Per-attempt, policy-versioned verdict. |
| `entry.authorised` | M5 | M6 | Short-lived, signed, one-time consumption. |

Test the device-cap race, current-device revoke, ticket replay, browser launch, stale registration, malformed attestation, bridge isolation, gate retry, and secret/evidence redaction.
