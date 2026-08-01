# M1 — Auth & Identity — Component Design

**Module:** M1 — Auth & Identity
**Surface:** Web only (Electron never shows login — see `SCREEN_INVENTORY.md` §8)
**Sources of truth:**
- Validation → `LOW_LEVEL_DESIGN.md` §3.3 and §7.1 Zod schemas (`LoginSchema`, `RegisterStudentSchema`, `RegisterStudentPhotoMetadataSchema`)
- Screens + backend contracts → `SCREEN_INVENTORY.md` §5
- Endpoints → `LOW_LEVEL_DESIGN.md` §17 (API Reference)
- Device/cap logic → `LOW_LEVEL_DESIGN.md` §11
- Identity-gate contract → `LOW_LEVEL_DESIGN.md` §11.1 and §15
- Flow context → `./FLOW.md`

**Scope:** field-level component spec.

**Grounding rule:** every field, validation rule, and action traces to one of the
sources above. Anything not yet specified is marked **`⚠`** and retained as
future contract work — never replaced with a plausible-looking value. The
signup profile-photo contract is resolved in HLD §11.2 and LLD §7.1; it is not
an open issue.

**States legend:** each component row lists which of
*default / loading / error / disabled / success* apply. "—" = not applicable.

---

## 1. First-Run Bootstrap

Backend contract: `POST /v1/bootstrap/owner`, `BootstrapOwnerSchema` (`LOW_LEVEL_DESIGN.md` §5.2, §7.1). This route is available only while the server reports `PlatformState.bootstrapStatus = UNINITIALISED`.

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Bootstrap secret input | default / error / disabled | `BootstrapOwnerSchema.bootstrapSecret` | submitted only to `POST /v1/bootstrap/owner` | 32–256 characters; never persisted, logged, echoed, or placed in client storage |
| Owner name and email fields | default / error / disabled | `BootstrapOwnerSchema.email`, `firstName`, `lastName` | submitted with bootstrap request | normal email and name schemas; no role or permission field |
| Owner password input | default / error / disabled | `BootstrapOwnerSchema.password` | submitted with bootstrap request | 12–128 characters with upper, lower, number, and special character |
| Bootstrap submit control | default / loading / disabled / error / success | whole schema payload | `POST /v1/bootstrap/owner` | server verifies first-run state, rate limit, secret, and transaction outcome |
| Generic bootstrap error | error | safe error code and request ID | — | never reveals whether an owner exists or whether the secret was close to valid |
| Bootstrap success | success | owner account state | routes to email verification, then owner console | only after atomic owner creation and secret invalidation |

---

## 2. Owner Console

Backend contract: `POST /v1/owner/teacher-invitations`, `POST /v1/teacher-invitations/:id/revoke` (`LOW_LEVEL_DESIGN.md` §5.2–§5.3).

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Teacher email input | default / error / disabled | `CreateTeacherInvitationSchema.email` | owner submits invitation request | normalised email; server assigns `TEACHER`; no role selector |
| Invitation expiry selector | default / error / disabled | `expiresInSeconds` | part of invitation request | 900–604800 seconds |
| Create invitation control | default / loading / success / error | invitation request | `POST /v1/owner/teacher-invitations` | owner auth, step-up policy, idempotency key, and audit required |
| One-time invitation delivery | success / error | masked email, expiry, status | email provider or one-time owner-only copy action | raw token is never logged or persisted and is shown only at creation |
| Invitation status list | loading / empty / populated / error | invitation ID, masked email, status, expiry | `GET /v1/owner/teacher-invitations` | safe metadata only; no token hash or raw token |
| Revoke invitation control | default / loading / success / error | invitation ID | `POST /v1/teacher-invitations/:id/revoke` | only unused invitations; owner scope and audit required |

---

## 3. Teacher Invitation Activation

Backend contract: `POST /v1/teacher-invitations/redeem`, `RedeemTeacherInvitationSchema`.

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Invitation token context | loading / invalid / expired / revoked / valid | token status and masked target email | redeem endpoint | token is short-lived, single-use, hash-compared, and email-bound |
| Teacher first/last name | default / error / disabled | redemption schema | submitted with activation | normalised bounded names |
| Teacher email verification | pending / success / error | invitation target email | normal email verification flow | matching email is required; client cannot change role |
| Teacher password input | default / error / disabled | `RedeemTeacherInvitationSchema.password` | submitted with redemption | same account password policy as bootstrap |
| Activate invitation control | default / loading / success / error | redemption schema | `POST /v1/teacher-invitations/redeem` | locks invitation and creates exactly one `TEACHER` account transactionally |

---

## 4. Landing Page

Static pre-auth entry point (`SCREEN_INVENTORY.md` §5 — "static", no backend
contract). No data binding, no validation.

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| "Login" button/link | default | — | Navigates to Login (no endpoint) | — |
| "Sign up" button/link (students) | default | — | Navigates to Student Signup (no endpoint) | — |
| Product branding / marketing content | default | — (static) | — | — |

---

## 5. Login

Backend contract: `AuthService.login` → `POST /auth/login`, body `LoginSchema`
(`SCREEN_INVENTORY.md` §5; `LOW_LEVEL_DESIGN.md` §7.2, §22.1).

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Email input | default / error / disabled | `LoginSchema.email` | — (submitted with form) | `z.string().email().max(254).toLowerCase()` — valid email, max 254 chars, lowercased (§3.3) |
| Password input | default / error / disabled | `LoginSchema.password` | — (submitted with form) | `z.string().min(1).max(128)` — 8–128 chars (§3.3) |
| "Sign in" submit button | default / loading / disabled / error / success | whole `LoginSchema` payload | `POST /auth/login` (`AuthService.login`) | Disabled until both fields valid; on submit runs `LoginSchema` |
| Invalid-credentials error banner | error | server error `E1001 INVALID_CREDENTIALS` | — | Shown on `E1001` (§7.2). Message must not reveal whether email or password was wrong |
| Account-locked error banner | error | server error `E1002 ACCOUNT_DISABLED` | — | Shown after 5 failed attempts → locked 15 min (`recordFailedLogin`, §7.2) |
| "Forgot Password?" link | default | — | Navigates to Forgot Password (no endpoint) | — |

---

## 6. Student Signup

Backend contract: `AuthService.register` → `POST /auth/register`, body
`RegisterStudentSchema` and `RegisterStudentPhotoMetadataSchema` (`SCREEN_INVENTORY.md` §5; `LOW_LEVEL_DESIGN.md` §7.1, §17.1).
Role is server-derived as `STUDENT`; the client cannot submit or select a role.

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| First name input | default / error / disabled | `RegisterStudentSchema.firstName` | — (submitted with form) | `z.string().min(1).max(64).trim()` (§3.3) |
| Last name input | default / error / disabled | `RegisterStudentSchema.lastName` | — (submitted with form) | `z.string().min(1).max(64).trim()` (§3.3) |
| Email input | default / error / disabled | `RegisterStudentSchema.email` | — (submitted with form) | `z.string().email().max(254).toLowerCase()` (§3.3) |
| Password input | default / error / disabled | `RegisterStudentSchema.password` | — (submitted with form) | min 12 chars ("Password must be at least 12 characters"); max 128; requires uppercase ("Must contain an uppercase letter"), lowercase ("Must contain a lowercase letter"), number ("Must contain a number"), special char ("Must contain a special character") — §3.3 |
| Password rule checklist / hint | default / error / success | mirrors `RegisterStudentSchema.password` regex set | — | Reflects the five §3.3 password rules above; no new rule |
| "Create account" submit button | default / loading / disabled / error / success | textual `RegisterStudentSchema` fields + required photo + existing terms checkbox | `POST /auth/register` (`AuthService.register`) | Disabled until fields, photo, and terms checkbox are valid; submits one multipart command |
| Duplicate-email error | error | server error `E4002 CONFLICT` | — | Shown on `E4002` ("Email already registered", §7.2) |
| Profile photo input | default / preview / invalid / submitting / submit-failed | required `profilePhoto` part plus `RegisterStudentPhotoMetadataSchema` | submitted in the same `multipart/form-data` request to `POST /v1/auth/register` | JPEG, PNG, or WebP; maximum 5 MB; server verifies magic bytes and decoded dimensions, strips metadata, computes canonical SHA-256, and stores only a private opaque reference; no client-controlled object key |
| Existing terms-and-conditions checkbox | unchecked / checked / validation error | existing signup consent field | submitted with the same registration command | Must be checked; this remains the single consent control for the profile photo; no separate photo-consent screen |
| Photo upload failure | error | safe validation/storage error | — | Account is not created; staged object is removed; error must not reveal storage internals |

---

## 7. Forgot Password

Backend contract: `PasswordResetRequestSchema` and `PasswordResetSchema` (`LOW_LEVEL_DESIGN.md` §7.1); endpoints `POST /v1/auth/password-reset/request` and `POST /v1/auth/password-reset/redeem` (`LOW_LEVEL_DESIGN.md` §17.1).

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Email input | default / error / disabled | `PasswordResetRequestSchema.email` | submitted to reset request | email max 254, normalised lowercase |
| "Send reset link" submit button | default / loading / disabled / success | email value | `POST /v1/auth/password-reset/request` | generic response for existing and unknown accounts |
| Confirmation transition | success | — | Navigates to Check Your Email | no account-existence disclosure |

---

## 8. Check Your Email

Static confirmation after a reset request. The message is identical whether or not the account exists.

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Confirmation message | default | — | — | must not reveal account existence |
| "Back to login" link | default | — | Navigates to Login | — |

---

## 9. Reset Password

Backend contract: `PasswordResetSchema` and `POST /v1/auth/password-reset/redeem` (`LOW_LEVEL_DESIGN.md` §§7.1, 17.1).

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Reset token | loading / invalid / expired / valid | one-time URL token | submitted as part of reset command | server stores only a hash; token is short-lived and single-use |
| New password input | default / error / disabled | `PasswordResetSchema.password` | submitted with token | same 12–128 character complexity policy as registration |
| Confirm password input | default / error / disabled | local confirmation value | client confirmation only; server validates final password | must match before submit |
| Set new password control | default / loading / success / error | token + password | `POST /v1/auth/password-reset/redeem` | atomic token redemption; rotate/revoke affected sessions |

---

## 10. Verify Email

Backend contract: `VerifyEmailSchema` and `POST /v1/auth/verify-email` (`LOW_LEVEL_DESIGN.md` §§7.1, 17.1).

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Verification token | loading / invalid / expired / valid | one-time URL token | `POST /v1/auth/verify-email` | token hash, expiry, and single-use redemption are server-enforced |
| Verification result | success / error | `isEmailVerified`, `emailVerifiedAt` | — | invalid links reveal no token storage details |
| Resend verification control | default / loading / success / error | authenticated or invitation context | identity-service resend contract | rate-limited and enumeration-safe |

---

---

## 11. Register Device

Backend contract: `DeviceGateService.register` → `POST /devices/register`
(`SCREEN_INVENTORY.md` §5; `LOW_LEVEL_DESIGN.md` §12.1, §22.6). Shown after
login on a first-time (unregistered) device. **Background-collection screen —
no user-entered form fields.** Fingerprint is collected automatically and hashed;
registration auto-submits when collection completes.



---

## 12. My Devices

Backend contract: list + `DELETE /devices/:id` (`SCREEN_INVENTORY.md` §5;
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

## 13. My Profile / Account Settings

Backend contract: `GET /v1/auth/me` (`SCREEN_INVENTORY.md` §5; `LOW_LEVEL_DESIGN.md`
§17.1). The response exposes safe profile metadata and photo-enrolment status only.

| Component | States | Data it binds to | Action + endpoint | Validation rules |
|---|---|---|---|---|
| Profile detail display | default / loading / error | current user from `GET /v1/auth/me` (`id, email, role, firstName, lastName, profilePhotoEnrolled` — LLD §17.1) | `GET /v1/auth/me` | Display safe metadata and enrolled-photo status only; never display the private photo object or key |
| **Edit fields (name, etc.)** | ⚠ default / error / disabled | ⚠ no update schema in LLD | ⚠ no endpoint | ⚠ **G4:** `GET /auth/me` is read-only; there is **no** PUT/update-self endpoint or schema in the LLD. Do not invent edit rules |
| **Save changes button** | ⚠ default / loading / disabled | ⚠ not in LLD | ⚠ no self-update endpoint — **not in LLD** | ⚠ **G4:** editing own account has no backend contract |
| Logout control (from shared shell) | default / loading | current session | `POST /auth/logout` (§22.1) | Grounded; part of §2 shared shell user menu |

---

## Future contract work

Only capabilities outside the current v1 M1 boundary are listed here.

| Area | Status | Owning source |
|---|---|---|
| My Profile self-edit | Deferred; current contract is read-only `GET /v1/auth/me`. | LLD §17.1 and approved change request |
| Profile-photo replacement or re-enrolment | Deferred; v1 captures the required photo only during signup. | HLD §11.2; LLD §7.1 |
| External SSO and social login | Deferred from v1. | HLD/LLD change request |
| Additional delegated administration roles | Deferred; owner bootstrap and owner-issued teacher invitations are the v1 path. | HLD §11.1; LLD §5 |
