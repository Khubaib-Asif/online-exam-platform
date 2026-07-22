# M1 — Auth & Identity — Open Issues (Ungrounded UI Elements)

**What this file is:** the `screens/` designs (PNG mockups + Figma source) render
some elements that are **not** grounded in `COMPONENTS.md` / `LOW_LEVEL_DESIGN.md`
— included because they complete the screen professionally and/or execute the
UI_GUIDELINES §5 Signature Motif. In the mockups they look finished (no
placeholder styling, no disclaimers). This file is the developer-facing index of
what needs backend/LLD work before any of it is real.

**Legend:** each row = Element · What it needs in the LLD.
Gap IDs (G1–G5) cross-reference `COMPONENTS.md`'s gaps recap where applicable.

---

## Signature Motif — Credential Panel reference codes (all screens)

The rebuild executes the §5 Signature Motif: every screen has a dark-navy
Credential Panel carrying a **monospace reference code** on a perforated
ticket-stub edge. These codes are **decorative-but-justified** per the Motif —
they frame the product as credentialing/identity infrastructure and change
meaningfully per screen. **One exception is grounded:** on Register Device the
code is the real computed device fingerprint hash (§8), not decorative.

| Panel code (screen) | What it would need to be real |
|---|---|
| `NODE · EXP-EDU-01` (Landing) | Decorative venue/exam-node identifier. No exam-node registry exists in the LLD. Purely framing. |
| `SESSION · EXP-2026-…` (Login) | Decorative sign-in session stub. Real sessions are issued *after* auth by `TokenService`; this pre-auth code is not backed. |
| `CANDIDATE · PROV-2026-…` (Signup) | Decorative provisional-candidate number. No enrollment-number issuance exists; `RegisterSchema` has no such field. |
| `RECOVERY · PWR-2026-…` (Forgot Password, Check Your Email) | Decorative recovery-request reference. Ties to the missing recovery contract (G2). |
| `RESET · ****-…` (Reset Password) | Decorative masked reset-token stub. No reset-token contract exists (G2). |
| `VERIFY · EVR-2026-…` (Verify Email) | Decorative verification reference. No verify-email contract exists (G1). |
| `SLOT n / 2` + fingerprint hash (Register Device) | **Grounded:** hash + cap are real (§8, §12.1). The `SLOT` label styling is presentational only. |
| `SLOTS 2 / 2` (My Devices) | **Grounded** cap state (§12.1); presented in the panel rather than invented. |
| identity credential — user id / role / institution (My Profile) | **Grounded** from `GET /auth/me` (§10); surfaced in the panel, not invented. |

---

## Landing Page (`landing.png`)

| Element | What it would need in the LLD |
|---|---|
| Headline / subtitle marketing copy ("Secure online examinations", etc.) | Copywriting decision only — no backend. `SCREEN_INVENTORY.md` §4 marks Landing "static"; exact copy is unspecified. |
| "Staff and proctor accounts are provisioned by your institution" note | Reflects §4's provisioning model (M2), but the exact wording is not specified. Copy-only. |
| Exam-node code `NODE · EXP-EDU-01` | See Signature Motif table above — decorative venue plate. |

## Login (`login.png`)

| Element | What it would need in the LLD |
|---|---|
| Institution code field | `LoginSchema` (§2) is email + password only; login is email-global (§7.2 has no per-institution login scoping). Field would need an institution-resolution step + schema change. |
| "Keep me signed in" checkbox | No persistent-session / remember-me flag in `TokenService` or `LoginSchema`. Would need a token-lifetime option in the auth contract. |
| SSO buttons (Google / Microsoft / SAML) | `AuthService` supports only local email/password (§7.2). No OAuth/OIDC/SAML provider integration exists in the LLD. |
| `SESSION · EXP-2026-…` panel code | See Signature Motif table — decorative pre-auth session stub (real sessions issued post-auth by `TokenService`). |

## Student Signup (`signup.png`)

| Element | What it would need in the LLD |
|---|---|
| Institution selector | ⚠ GROUNDED-BUT-GAPPED (Issue #4): `RegisterSchema.institutionId` is a required uuid, but a public student has no grounded source to pick it. Needs an institution-lookup endpoint or invite/domain-based resolution. |
| Reference photo capture | ⚠ GROUNDED-BUT-GAPPED (Issue #8): §4 says signup captures a reference photo for M5 face-match, but no field/endpoint/validation exists in the LLD. Needs a media-upload contract + storage. |
| Terms of Service / Privacy checkbox | Not in `RegisterSchema` or COMPONENTS.md §3. Needs a consent-capture decision (store acceptance timestamp/version). |
| SSO buttons (Google / Microsoft / SAML) | `AuthService` supports only local registration. No OAuth/OIDC/SAML provider integration exists. |
| `CANDIDATE · PROV-2026-…` panel code + 3-step tracker | See Signature Motif table — decorative provisional-candidate number. No enrollment-number issuance exists; the step tracker is presentational framing of the signup→verify→device flow. |

## Forgot Password (`forgot-password.png`)

| Element | What it would need in the LLD |
|---|---|
| Whole screen (email field + "Send reset link") | ⚠ GAP G2 (Issue #1): SCREEN_INVENTORY §4 lists this screen, but no `requestPasswordReset` endpoint or Zod schema exists in the LLD. The email field uses `LoginSchema.email`'s shape as a non-asserted default. Needs a recovery contract (endpoint, token issuance, expiry, rate-limit). |
| `RECOVERY · PWR-2026-…` panel code | See Signature Motif table — decorative recovery-ticket reference, tied to the missing G2 contract. Carried forward unchanged onto Check Your Email. |

## Check Your Email (`check-email.png`)

| Element | What it would need in the LLD |
|---|---|
| "Resend email" control (+ loading / cooldown) | ⚠ GAP G2 (Issue #1): no `requestPasswordReset` endpoint exists to re-trigger. Cooldown timer implies a rate-limit that isn't specified. Needs the same recovery contract as Forgot Password. |
| `RECOVERY · PWR-2026-…` panel code | See Signature Motif table — the same decorative reference carried forward from Forgot Password (intentionally identical value), tied to G2. |

## Reset Password (`reset-password.png`)

| Element | What it would need in the LLD |
|---|---|
| Whole screen (token + new/confirm password + submit) | ⚠ GAP G2 (Issue #1): no `resetPassword` endpoint, no reset-token contract, no Zod schema for the field. `RegisterSchema.password` rules are shown as a non-asserted default. Needs the recovery contract (token validation, single-use, expiry) end-to-end. |
| "Passwords don't match" rule | Conventional confirm-password rule; not specified in the LLD. Would live in the (missing) reset schema. |
| Invalid / expired token state | ⚠ G2: the error path (expired/used/invalid token) is not specified. Needs token-lifecycle definition. |
| `RESET · ****-2026-…` panel code (+ expiry / void states) | See Signature Motif table — decorative masked token stub, tied to G2. Void (line-through) on success/expired is presentational. |

## Verify Email (`verify-email.png`)

| Element | What it would need in the LLD |
|---|---|
| "Resend verification email" (+ loading / cooldown) | ⚠ GAP G1 (Issue #1): no `verifyEmail`/resend endpoint or token contract in the LLD. Needs a verification-token issuance + resend endpoint with rate-limit. |
| Token-from-URL confirmation path | ⚠ G1: nothing currently sets `User.isEmailVerified` / `emailVerifiedAt`. The nag (false) and verified (true) states are grounded on the §4 field, but the transition mechanism is unspecified. |
| Invalid / expired link state | ⚠ G1: the error path is not specified. Needs verification-token lifecycle. |
| `VERIFY · EVR-2026-…` panel code (+ confirmed / void states) | See Signature Motif table — decorative verification reference, tied to G1. Confirmed (✓) and void (line-through) styling is presentational. |

## Register Device (`register-device.png`)

| Element | What it would need in the LLD |
|---|---|
| Web fingerprint signal set (screen res, platform, cores/memory, WebGL renderer, timezone/canvas/audio hash) | ⚠ GAP G3: LLD §12 `DeviceFingerprint` is an **Electron** shape (`platform`, `osVersion`, `arch`, `totalMemory`, `cpuModel`, `screenCount`, `macHash`, `electronVersion`). A browser cannot produce `macHash`/`electronVersion`, and WebGL GPU is not in §12. Needs a defined **Web** fingerprint composition + hashing contract for `POST /devices/register`. |
| "MAC hash · Electron version — unavailable on web" row | ⚠ G3: shown explicitly as uncollectable to flag the Electron/Web mismatch. Rendered as a warning state, not a real captured signal. |
| Environment-warning state (fullscreen / window-fills-screen check at registration) | ⚠ GAP G5: registration-time environment checks are **not** in the LLD — the LLD only gates environment at M5 exam-entry (`runGates`, §12). Needs a product decision on whether device registration enforces any environment preconditions. |
| Computed fingerprint hash in the panel (SHA-256 readout) | **Grounded** on §8's device registration, but the exact hash **input composition** depends on resolving G3. The value shown is illustrative of a real minted credential, not decorative. |
| `SLOT n / 2` slot meter | **Grounded** cap (§12.1, `deviceCount >= 2 -> E4002`). Only the meter's visual styling is presentational. |
| Cap-reached `E4002` block + "View my registered devices" hop | **Grounded** (§8 cap; FLOW.md G3 cross-device resolution). New/unproven device is correctly a **read-only** block — it cannot evict a trusted device from this screen. |
| Optional device name field | **Grounded**: `DeviceProfile.label` (`String?`, VarChar(128)). |

## My Devices (`my-devices.png`)

| Element | What it would need in the LLD |
|---|---|
| Device list + revoke + cap | **Grounded**: `GET /devices`, `DELETE /devices/:id`, cap = 2 (§12.1). `DeviceProfile.label` / `platform` / `lastSeenAt` all real (§4). No gap. |
| "This device" badge / current-device can't self-revoke | Convention, not asserted by the LLD. Needs the API to mark which listed device matches the caller's current fingerprint (identify-self) so the client can disable its own Revoke. Low-risk product decision, not a schema gap. |
| Panel identity (account email + role) | **Grounded** from `GET /auth/me` (§10). Surfaced in the panel, not invented. Email is truncated for display only. |
| `SLOTS n / 2` slot ledger | **Grounded** cap (§12.1). Only the meter's visual styling is presentational. |

## My Profile / Account Settings (`my-profile.png`)

| Element | What it would need in the LLD |
|---|---|
| Read-only detail display (first/last name, email, role, institution ID, user ID) | **Grounded**: `GET /auth/me` (§7.5 controller `me`) returns id, email, role, firstName, lastName, institutionId. No gap. |
| Sign out control | **Grounded**: `POST /auth/logout` (§22.1). No gap. |
| Edit mode (editable name fields) | ⚠ GAP G4: `GET /auth/me` is **read-only** — there is NO `PUT`/self-update endpoint or Zod schema in the LLD. Name fields are shown editable as a natural default. Needs a self-update contract (endpoint, schema, which fields are user-mutable). |
| "Save changes" button (+ saving state) | ⚠ G4: has no endpoint to call. Rendered fully but non-functional until the self-update contract exists. |
| Email/role/institution shown read-only in edit mode | Convention (these are institution-managed, not self-editable). Reasonable, but which fields are mutable is itself part of the missing G4 contract. |
| Panel identity credential (name, role, institution, masked user ID) | **Grounded** from `GET /auth/me` (§7.5). Surfaced in the panel, not invented. The dot-grouped user-ID formatting + masked email are display-only styling. |

<!-- Subsequent screens appended below as they are built. -->
