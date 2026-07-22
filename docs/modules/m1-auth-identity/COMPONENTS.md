# M1 — Auth & Identity — Component Design

**Module:** M1 — Auth & Identity
**Surface:** Web only (Electron never shows login — see `SCREEN_INVENTORY.md` §8)
**Sources of truth:**
- Validation → `LOW_LEVEL_DESIGN.md` §3.3 Zod schemas (`LoginSchema`, `RegisterSchema`)
- Screens + backend contracts → `SCREEN_INVENTORY.md` §4
- Endpoints → `LOW_LEVEL_DESIGN.md` §22 (API Reference)
- Device/cap logic → `LOW_LEVEL_DESIGN.md` §12
- Flow context → `./FLOW.md`

**Scope:** field-level component spec. 

**Grounding rule:** every field, validation rule, and action traces to one of the
sources above. Anything not grounded is marked **`⚠`** with its gap ID (G1–G5 /
`SCREEN_INVENTORY.md` §12 Issue #) — never replaced with a plausible-looking
value. Gap IDs G1–G4 carry over from `FLOW.md`; **G5 is new** (see recap).

**States legend:** each component row lists which of
*default / loading / error / disabled / success* apply. "—" = not applicable.

---

## 1. Landing Page

Static pre-auth entry point (`SCREEN_INVENTORY.md` §4 — "static", no backend
contract). No data binding, no validation.

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| "Login" button/link | default | — | Navigates to Login (no endpoint) | — |
| "Sign up" button/link (students) | default | — | Navigates to Student Signup (no endpoint) | — |
| Institution branding / marketing content | default | — (static) | — | — |

---

## 2. Login

Backend contract: `AuthService.login` → `POST /auth/login`, body `LoginSchema`
(`SCREEN_INVENTORY.md` §4; `LOW_LEVEL_DESIGN.md` §7.2, §22.1).

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Email input | default / error / disabled | `LoginSchema.email` | — (submitted with form) | `z.string().email().max(254).toLowerCase()` — valid email, max 254 chars, lowercased (§3.3) |
| Password input | default / error / disabled | `LoginSchema.password` | — (submitted with form) | `z.string().min(8).max(128)` — 8–128 chars (§3.3) |
| "Sign in" submit button | default / loading / disabled / error / success | whole `LoginSchema` payload | `POST /auth/login` (`AuthService.login`) | Disabled until both fields valid; on submit runs `LoginSchema` |
| Invalid-credentials error banner | error | server error `E1001 INVALID_CREDENTIALS` | — | Shown on `E1001` (§7.2). Message must not reveal whether email or password was wrong |
| Account-locked error banner | error | server error `E1002 ACCOUNT_DISABLED` | — | Shown after 5 failed attempts → locked 15 min (`recordFailedLogin`, §7.2) |
| "Forgot Password?" link | default | — | Navigates to Forgot Password (no endpoint) | — |

---

## 3. Student Signup

Backend contract: `AuthService.register` → `POST /auth/register`, body
`RegisterSchema` (`SCREEN_INVENTORY.md` §4; `LOW_LEVEL_DESIGN.md` §7.2, §22.1).
Role constrained to STUDENT per SEC-1's intended fix.

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| First name input | default / error / disabled | `RegisterSchema.firstName` | — (submitted with form) | `z.string().min(1).max(64).trim()` (§3.3) |
| Last name input | default / error / disabled | `RegisterSchema.lastName` | — (submitted with form) | `z.string().min(1).max(64).trim()` (§3.3) |
| Email input | default / error / disabled | `RegisterSchema.email` | — (submitted with form) | `z.string().email().max(254).toLowerCase()` (§3.3) |
| Password input | default / error / disabled | `RegisterSchema.password` | — (submitted with form) | min 12 chars ("Password must be at least 12 characters"); max 128; requires uppercase ("Must contain an uppercase letter"), lowercase ("Must contain a lowercase letter"), number ("Must contain a number"), special char ("Must contain a special character") — §3.3 |
| Password rule checklist / hint | default / error / success | mirrors `RegisterSchema.password` regex set | — | Reflects the five §3.3 password rules above; no new rule |
| "Create account" submit button | default / loading / disabled / error / success | whole `RegisterSchema` payload | `POST /auth/register` (`AuthService.register`) | Disabled until valid; runs `RegisterSchema` on submit |
| Duplicate-email error | error | server error `E4002 CONFLICT` | — | Shown on `E4002` ("Email already registered", §7.2) |
| **Institution selector / source** | ⚠ default / error | `RegisterSchema.institutionId` (`z.string().uuid()`, required — §3.3) | — | ⚠ **Gap (Issue #4):** schema *requires* a uuid `institutionId`, but a public self-registering student has no grounded way to supply/choose it. Field is real; its data source is not specified. Do not invent a picker contract. |
| **Reference profile photo capture** | ⚠ default / loading / error / success | ⚠ not in LLD | ⚠ photo upload — no endpoint | ⚠ **Gap (Issue #8):** §4 says signup "captures the reference profile photo" for M5 face-match, but no field/endpoint/rule exists in the LLD (`RegisterSchema` has no photo). Do not invent capture rules. |
| **Role constraint** | ⚠ (not a visible field) | `RegisterSchema.role` | — | ⚠ **Gap (Issue #4):** §4 assumes STUDENT-only, but `RegisterSchema.role = z.enum(['TEACHER','STUDENT','PROCTOR','APPROVER'])` is **not** STUDENT-constrained. Signup should force STUDENT; schema doesn't yet enforce it. |

---

## 4. Forgot Password

`SCREEN_INVENTORY.md` §4: "Enter email to request a reset link" — **⚠ not in
LLD (Issue #1 / gap G2).** No `requestPasswordReset` endpoint or schema exists.

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Email input | default / error / disabled | ⚠ no schema in LLD | — | ⚠ **G2:** no Zod schema governs this field. Reasonable to reuse `LoginSchema.email` shape, but that is **not stated** in the LLD — left as a gap, not asserted. |
| "Send reset link" submit button | default / loading / disabled / success | email value | ⚠ `AuthService.requestPasswordReset` — **not in LLD (Issue #1)** | ⚠ endpoint does not exist yet |
| Confirmation transition | success | — | Navigates to Check Your Email | — |

---

## 5. Check Your Email

`SCREEN_INVENTORY.md` §4: confirmation shown after Forgot Password submit,
**deliberately identical whether or not the email exists** (no account-existence
leak). Static screen — **⚠ recovery backend is Issue #1 / G2.**

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Confirmation message | default | — (static) | — | Copy must be identical regardless of whether the account exists (§4 — no leak) |
| "Resend email" control (if present) | default / loading / disabled | — | ⚠ `AuthService.requestPasswordReset` — **not in LLD (Issue #1)** | ⚠ endpoint does not exist yet |
| "Back to login" link | default | — | Navigates to Login | — |

---

## 6. Reset Password

Reached via emailed link (token in URL). `SCREEN_INVENTORY.md` §4 — **⚠ not in
LLD (Issue #1 / gap G2).**

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Reset token (from URL) | — | ⚠ no token contract in LLD | — | ⚠ **G2:** `SCREEN_INVENTORY.md` §12 suggests a short-lived signed token (HMAC pattern), but none is specified |
| New password input | default / error / disabled | ⚠ no schema in LLD | — | ⚠ **G2:** no Zod schema governs the reset password field. `RegisterSchema.password`'s rules are the *natural* choice but are **not stated** for reset — left as a gap, not asserted |
| Confirm password input | default / error / disabled | ⚠ not in LLD | — | ⚠ **G2:** "must match" is a conventional rule but is not specified anywhere in the sources — flagged, not invented |
| "Set new password" submit button | default / loading / disabled / error / success | new password value + token | ⚠ `AuthService.resetPassword` — **not in LLD (Issue #1)** | ⚠ endpoint does not exist yet |
| Invalid/expired-token error | error | ⚠ not in LLD | — | ⚠ **G2:** error path not specified |
| Success → login transition | success | — | Navigates to Login | — |

---

## 7. Verify Email

Nag state until the emailed verification link is clicked; confirmation screen
when it is (`SCREEN_INVENTORY.md` §4). **⚠ not in LLD (Issue #1 / gap G1).**
Note: `User.isEmailVerified` / `emailVerifiedAt` fields exist (§4 schema) but
nothing sets them (Issue #1).

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Nag banner ("verify your email") | default | `User.isEmailVerified = false` (§4 schema field) | — | Shown while `isEmailVerified` is false |
| "Resend verification email" control | default / loading / disabled / success | — | ⚠ `AuthService.verifyEmail` / resend — **not in LLD (Issue #1)** | ⚠ endpoint does not exist yet |
| Verification token (from URL) | — | ⚠ no token contract in LLD | — | ⚠ **G1:** short-lived signed token suggested in §12, not specified |
| Confirmation message (verified) | success | `User.isEmailVerified = true`, `emailVerifiedAt` | — | Shown once verified |
| Invalid/expired-link error | error | ⚠ not in LLD | — | ⚠ **G1:** error path not specified |
| Continue → Register Device | success | — | Navigates to Register Device (per §4 nav edges) | — |

---

## 8. Register Device

Backend contract: `DeviceGateService.register` → `POST /devices/register`
(`SCREEN_INVENTORY.md` §4; `LOW_LEVEL_DESIGN.md` §12.1, §22.6). Shown after
login on a first-time (unregistered) device. **Background-collection screen —
no user-entered form fields.** Fingerprint is collected automatically and hashed;
registration auto-submits when collection completes.

**⚠ Composition note (gaps G3, G5):** This is a **Web** screen, but
`LOW_LEVEL_DESIGN.md` §12's `DeviceFingerprint` interface is an **Electron**
shape (`platform, osVersion, arch, totalMemory, cpuModel, screenCount, macHash,
electronVersion`). A browser cannot produce `macHash` or `electronVersion` at any
permission level. The Web fingerprint composition and the registration-time
environment checks below are a **product decision this session**, not from the
LLD — see recap.

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| "Registering your device…" status | loading / success / error | collection progress | — | Loading is the primary state; resolves to success (→ dashboard) or error |
| Web device-fingerprint collection (background) | loading / error | ⚠ Web fingerprint signals: screen resolution, `platform`, `hardwareConcurrency`, `deviceMemory`, WebGL renderer, timezone, canvas/audio — hashed into one device hash | — (feeds the register call) | ⚠ **G3 (product decision):** composed of browser-available signals, **not** §12's `DeviceFingerprint`. Only `platform` and screen info map to §12 (`platform`, `screenCount`); `macHash`/`electronVersion` are **uncollectable on Web**; GPU (WebGL renderer) is **not in §12** and is unreliable |
| Environment check (e.g. fullscreen / viewport fit) | default / error | ⚠ browser viewport / fullscreen state | — | ⚠ **G5 (product decision):** registration-time environment checks (e.g. "not fullscreen / screen doesn't fit") are **not in the LLD** — the LLD only runs display/environment gates at M5 exam-entry (`runGates`, §12) |
| Device label input (optional) | default / disabled | `DeviceProfile.label` (`String? "Home laptop"` — §4 schema) | — (sent with register) | Optional; grounded field (`DeviceProfile.label?`, §12/§4). No stated length rule beyond `VarChar(128)` |
| Auto-submit registration | loading / success / error | computed device hash (+ optional label) | `POST /devices/register` (`DeviceGateService.register`) | Fires automatically once collection completes (no manual button) |
| Cap-reached block state | error | server error `E4002 CONFLICT` | — | Cap = **2** (`deviceCount >= 2` → `E4002`, §12.1). On this new device this is a **read-only block**: "sign in on a registered device to free a slot" (see My Devices; product decision G3) |
| Continue → dashboard | success | — | Navigates to role-appropriate dashboard (exits M1) | — |

---

## 9. My Devices

Backend contract: list + `DELETE /devices/:id` (`SCREEN_INVENTORY.md` §4;
`LOW_LEVEL_DESIGN.md` §22.6). Reached **post-login only** via the user menu
(§2 shared shell), not part of the auth sequence.

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Device list | default / loading / error | `DeviceProfile[]` — `label`, `platform`, `lastSeenAt` (§4: "label, platform, last-seen"; §12 schema fields) | `GET /devices` | — |
| Empty state | default | — (list is empty) | — | Shown when no registered devices |
| Per-device row | default | one `DeviceProfile` (`label`, `platform`, `lastSeenAt`) | — | — |
| "Revoke" button (per device) | default / loading / disabled / success / error | `DeviceProfile.id` | `DELETE /devices/:id` | Frees a slot against the cap of 2 (§4, §12) |
| Revoke confirmation | default | selected `DeviceProfile.id` | — (confirms the DELETE) | Conventional confirm-before-destroy; no specific rule in sources |
| Cap indicator (e.g. "2 of 2 used") | default | count of active `DeviceProfile` rows | — | Cap = 2 (§12.1) |

---

## 10. My Profile / Account Settings

Backend contract: `GET /auth/me` (`SCREEN_INVENTORY.md` §4; `LOW_LEVEL_DESIGN.md`
§22.1). **View is grounded; edit is not (gap G4).**

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Profile detail display | default / loading / error | current user from `GET /auth/me` (`id, email, role, firstName, lastName, institutionId` — §7.5 controller `me`) | `GET /auth/me` | Read-only; grounded |
| **Edit fields (name, etc.)** | ⚠ default / error / disabled | ⚠ no update schema in LLD | ⚠ no endpoint | ⚠ **G4:** `GET /auth/me` is read-only; there is **no** PUT/update-self endpoint or schema in the LLD. Do not invent edit rules |
| **Save changes button** | ⚠ default / loading / disabled | ⚠ not in LLD | ⚠ no self-update endpoint — **not in LLD** | ⚠ **G4:** editing own account has no backend contract |
| Logout control (from shared shell) | default / loading | current session | `POST /auth/logout` (§22.1) | Grounded; part of §2 shared shell user menu |

---

## Gaps recap

Rows marked `⚠` above are not grounded in the sources. IDs G1–G4 carry over from
`FLOW.md`; **G5 is introduced here.** Resolve in `LOW_LEVEL_DESIGN.md` (same
discipline as `SCREEN_INVENTORY.md` §12), then update this table.

| ID | Screen(s) | Gap | Source / disposition |
|---|---|---|---|
| G1 | Verify Email | No `verifyEmail` endpoint or token contract; `isEmailVerified`/`emailVerifiedAt` exist but nothing sets them | `SCREEN_INVENTORY.md` §12 **Issue #1** |
| G2 | Forgot Password, Check Your Email, Reset Password | No `requestPasswordReset` / `resetPassword` endpoints; no Zod schema for the reset-password field; no "must match" / token rules | `SCREEN_INVENTORY.md` §12 **Issue #1** |
| G3 | Register Device (+ M5 gate) | Web fingerprint composition is a product decision, not §12; `macHash`/`electronVersion` uncollectable on Web, GPU not in §12. **Parity risk:** M5 `runGates` Gate 1 compares `fingerprintHash` — a Web-collected hash and an Electron-collected hash of the same machine won't match, breaking exam entry | **Product decision this session** — needs an LLD reconciliation (Web fingerprint variant, or move Register Device to Electron) |
| G4 | My Profile | `GET /auth/me` is read-only; no self-update endpoint/schema for editing own account | Not in LLD; same class as Issue #1 |
| G5 | Register Device | Registration-time environment checks (fullscreen / viewport fit) not in LLD — LLD only runs environment gates at M5 exam-entry | **Product decision this session** — not yet in LLD |
| — | Student Signup | `RegisterSchema.institutionId` required (uuid) with no student-facing source; `RegisterSchema.role` not STUDENT-constrained; profile-photo capture has no field/endpoint | `SCREEN_INVENTORY.md` §12 **Issue #4** (role/institution) and **Issue #8** (photo) |

---

*No field, validation rule, or endpoint in this document was invented. Every
grounded value cites `LoginSchema` / `RegisterSchema` (§3.3), a §22 endpoint, or
`SCREEN_INVENTORY.md` §4. Every ungrounded need is marked `⚠` with its gap ID
rather than filled with a plausible-looking value.*
