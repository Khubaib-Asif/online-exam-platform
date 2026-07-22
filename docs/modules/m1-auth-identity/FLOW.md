# M1 — Auth & Identity — Screen Flow

**Module:** M1 — Auth & Identity
**Surface:** Web only (Electron never shows login — see `SCREEN_INVENTORY.md` §8)
**Sources of truth:** `SCREEN_INVENTORY.md` §4 (screens + backend contracts),
`LOW_LEVEL_DESIGN.md` §7 (Auth module, Zod schemas), §12 (Device module).
**Scope:** wireframe flow spec only 

This document contains **one** Mermaid `flowchart` covering all ten M1 screens
from `SCREEN_INVENTORY.md` §4:

Landing Page · Login · Student Signup · Forgot Password · Check Your Email ·
Reset Password · Verify Email · Register Device · My Devices · My Profile.

Every failure / validation / error branch is drawn.

---

## Legend

| Shape / style | Meaning |
|---|---|
| Rectangle | A screen (a real destination in §4) |
| Diamond | A decision / branch point |
| Rounded (stadium) | A terminal that exits M1 scope (e.g. role dashboard = M2+) or an email side-channel |
| Solid arrow | In-app navigation |
| Dashed arrow | A **cross-device physical hop** (student switches machines) or an out-of-app step (clicking an emailed link) |
| `⚠` prefix on a node/edge | **Not grounded in the LLD** — a gap or a product decision made this session. See "Grounding & open gaps" below. |

`classDef` styling in the diagram:
- **screen** — normal screens
- **error** — failure / locked / validation-error states
- **gap** — `⚠` nodes and edges that are not backed by the LLD

---

## Flow diagram

```mermaid
flowchart TD
    %% ─────────────────────────────────────────────
    %% Class definitions
    %% ─────────────────────────────────────────────
    classDef screen fill:#1e293b,stroke:#475569,color:#e2e8f0;
    classDef error  fill:#7f1d1d,stroke:#b91c1c,color:#fee2e2;
    classDef gap    fill:#78350f,stroke:#d97706,color:#fef3c7,stroke-dasharray: 4 3;
    classDef term   fill:#334155,stroke:#64748b,color:#f1f5f9;

    %% ═════════════════════════════════════════════
    %% SUBGRAPH 1 — PRE-AUTH ENTRY
    %% ═════════════════════════════════════════════
    subgraph PRE[Pre-Auth Entry]
        LAND[Landing Page]:::screen
        LOGIN[Login]:::screen
        LAND -->|existing user| LOGIN
        LAND -->|new student| SIGNUP[Student Signup]:::screen
    end

    %% ═════════════════════════════════════════════
    %% SUBGRAPH 2 — LOGIN BRANCHES  (AuthService.login)
    %% ═════════════════════════════════════════════
    subgraph L[Login — AuthService.login]
        LOGIN --> LOGINSUB{Submit credentials}
        LOGINSUB -->|"wrong credentials<br/>E1001 INVALID_CREDENTIALS"| LOGINERR[Login error:<br/>invalid credentials]:::error
        LOGINERR -.->|retry| LOGIN
        LOGINSUB -->|"5 failed attempts<br/>E1002 account locked 15 min"| LOCKED[Account locked message]:::error
        LOCKED -.->|wait / use recovery| FORGOT
        LOGINSUB -->|success| DEVCHECK{Current device<br/>already registered?}
    end

    %% Forgot-password entry from Login
    LOGIN -->|Forgot Password?| FORGOT[Forgot Password]:::screen

    %% ═════════════════════════════════════════════
    %% SUBGRAPH 3 — SIGNUP + EMAIL VERIFICATION
    %% ═════════════════════════════════════════════
    subgraph S[Signup & Email Verification — AuthService.register]
        SIGNUP --> SIGNSUB{Submit signup<br/>RegisterSchema}
        SIGNSUB -->|"validation errors<br/>Zod RegisterSchema"| SIGNERR[Signup validation errors:<br/>inline per field]:::error
        SIGNERR -.->|correct & resubmit| SIGNUP
        SIGNSUB -->|"duplicate email<br/>E4002 CONFLICT"| DUPERR[Email already registered]:::error
        DUPERR -.->|use another email| SIGNUP
        DUPERR -.->|go sign in| LOGIN
        SIGNSUB -->|success| VNAG[Verify Email — nag state<br/>persists until link clicked]:::screen
        VNAG -.->|emailed verification link| VMAIL([Verification email<br/>⚠ no backend contract]):::gap
        VMAIL -.->|click link| VTOKEN{Token valid?}
        VTOKEN -->|"⚠ invalid/expired<br/>not in LLD"| VTOKERR[Verification link invalid/expired]:::gap
        VTOKERR -.->|resend| VNAG
        VTOKEN -->|valid| VDONE[Verify Email — confirmation]:::screen
    end

    VDONE --> DEVCHECK

    %% ═════════════════════════════════════════════
    %% SUBGRAPH 4 — PASSWORD RECOVERY  (⚠ no LLD contract, Issue #1)
    %% ═════════════════════════════════════════════
    subgraph P[Password Recovery — ⚠ no backend contract, Issue #1]
        FORGOT --> FSUB{Submit email}
        FSUB --> CHECKMAIL[Check Your Email<br/>identical whether or not<br/>the account exists — no leak]:::screen
        CHECKMAIL -.->|emailed reset link| RMAIL([Reset email<br/>⚠ no backend contract]):::gap
        RMAIL -.->|click link, token in URL| RTOKEN{Token valid?}
        RTOKEN -->|"⚠ invalid/expired<br/>not in LLD"| RTOKERR[Reset link invalid/expired]:::gap
        RTOKERR -.->|request again| FORGOT
        RTOKEN -->|valid| RESET[Reset Password<br/>enter new password]:::screen
        RESET --> RESETSUB{Submit new password}
        RESETSUB -->|"⚠ validation<br/>rule source TBD, Issue #1"| RESETERR[Reset validation error]:::gap
        RESETERR -.->|retry| RESET
        RESETSUB -->|success| RESETOK[Password reset — success]:::screen
    end

    RESETOK -.->|return to sign in| LOGIN

    %% ═════════════════════════════════════════════
    %% SUBGRAPH 5 — DEVICE REGISTRATION + CAP FLOW  (DeviceGateService.register)
    %% ═════════════════════════════════════════════
    subgraph D[Device Registration — DeviceGateService.register]
        DEVCHECK -->|"returning, device known"| DASH([Role-appropriate dashboard<br/>exits M1 → M2+]):::term
        DEVCHECK -->|"first time on this device"| REGDEV[Register Device]:::screen
        REGDEV --> REGSUB{Register fingerprint<br/>POST /devices/register}
        REGSUB -->|"success (< 2 devices)"| DASH
        REGSUB -->|"cap reached: 2 devices<br/>E4002 CONFLICT"| CAPBLOCK[Device limit reached<br/>read-only block on this new device:<br/>sign in on a registered device<br/>to free a slot]:::error
    end

    %% ── Cross-device cap-resolution loop (⚠ product decision this session) ──
    CAPBLOCK -.->|"⚠ switch to a registered device"| MYDEV[My Devices]:::screen
    MYDEV --> REVOKE{Revoke a device<br/>DELETE /devices/:id}
    REVOKE -->|"slot freed"| SLOTFREE([Slot freed<br/>⚠ no cross-device signal in LLD]):::gap
    SLOTFREE -.->|"⚠ switch back to the new device, retry"| REGDEV

    %% ═════════════════════════════════════════════
    %% SUBGRAPH 6 — POST-LOGIN ACCOUNT (via user menu, not the auth sequence)
    %% ═════════════════════════════════════════════
    subgraph A[Post-Login Account — reached via user menu, §2 shared shell]
        MENU([User menu<br/>post-login only]):::term
        MENU --> MYDEV
        MENU --> PROFILE[My Profile / Account Settings]:::screen
        PROFILE --> PVIEW{View / edit}
        PVIEW -->|"view — GET /auth/me"| PDATA[Profile details displayed]:::screen
        PVIEW -->|"⚠ edit — no PUT endpoint in LLD"| PEDITGAP[Edit account details<br/>⚠ no backend contract, Issue #1 style]:::gap
    end

    DASH -.->|opens user menu| MENU
```

---

## Grounding & open gaps

Everything drawn as a solid node/edge traces to `SCREEN_INVENTORY.md` §4 or
`LOW_LEVEL_DESIGN.md` §7/§12. The `⚠` items below are **not** grounded and are
surfaced here so they can be resolved and folded back into the LLD (same
discipline as `SCREEN_INVENTORY.md` §12).

| # | `⚠` item in diagram | Why it's a gap | Source / disposition |
|---|---|---|---|
| G1 | Verify Email — email side-channel, token validity, invalid/expired branch | No `verifyEmail` endpoint or token contract exists in the LLD | `SCREEN_INVENTORY.md` §12 **Issue #1** — suggested `AuthService.verifyEmail` w/ short-lived signed token |
| G2 | Forgot Password → Check Your Email → Reset Password (whole subgraph), incl. reset-link validity & reset password-field validation | No `requestPasswordReset` / `resetPassword` endpoints; no Zod schema governs the new-password field on reset | `SCREEN_INVENTORY.md` §12 **Issue #1** — suggested `AuthService.requestPasswordReset` / `resetPassword` |
| G3 | Cap-reached cross-device loop: block on new device → revoke on a registered device → return & retry | The LLD enforces the cap (`DeviceService.register` throws `E4002` at `deviceCount >= 2`) but has **no cross-device coordination** — nothing signals the new device that a slot was freed | **Product decision this session** .
| G4 | My Profile — edit account details | `GET /auth/me` exists (read); there is **no** update/PUT endpoint for a user editing their own account | Not in LLD; same class as Issue #1. View is grounded, edit is not. |

### Grounded facts (for `COMPONENTS.md`)

- **Login** → `AuthService.login` (`POST /auth/login`, `LoginSchema`). Wrong
  credentials = `E1001`; lock after **5** failed attempts for **15 min** =
  `E1002` (LLD §7.2 `recordFailedLogin`).
- **Student Signup** → `AuthService.register` (`POST /auth/register`,
  `RegisterSchema`). Duplicate email = `E4002 CONFLICT` (LLD §7.2). ⚠ Note two
  real frictions carried into `COMPONENTS.md`: `RegisterSchema.role` is **not**
  STUDENT-constrained (`SCREEN_INVENTORY.md` §12 Issue #4) and `RegisterSchema`
  **requires `institutionId` (uuid)**, which a public self-registering student
  has no obvious way to supply. Photo capture at signup is ⚠ Issue #8 (not in
  LLD).
- **Register Device** → `DeviceGateService.register` (`POST /devices/register`).
  Cap = **2** (`deviceCount >= 2` → `E4002`), LLD §12.1.
- **My Devices** → list + `DELETE /devices/:id`, per §4. Reachable **post-login
  only** via the user menu (§2 shared shell), not part of the auth sequence.
- **My Profile** → `GET /auth/me`, per §4.

---

*No fields, validation rules, or endpoints in this document were invented. Where
a screen needs something neither `SCREEN_INVENTORY.md` §4 nor
`LOW_LEVEL_DESIGN.md` provides, it is marked `⚠` and listed above rather than
filled in with a plausible-looking value.*
