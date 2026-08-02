# M1 — Auth & Identity — Future Scope

**Module:** M1 — Auth & Identity
**Status:** v1 boundary; no open v1 requirements
**Authoritative references:** `docs/architecture/HIGH_LEVEL_DESIGN.md` §§5, 9, 11, 13; `docs/architecture/LOW_LEVEL_DESIGN.md` §§5–7, 19; `docs/modules/SCREEN_INVENTORY.md` §5

## Deferred capabilities

- self-service teacher registration without owner invitation;
- additional administrative roles or delegated invitation authority;
- multi-tenant, institution, class, course, department, or academic-roster identity;
- social login and external identity-provider federation;
- profile-photo replacement and biometric re-enrolment workflows beyond the v1 signup capture;
- account merging and cross-account identity recovery; and
- mobile companion authentication.

## Boundary rule

Future identity capabilities must preserve server-derived roles, one-time bootstrap closure, invitation binding, secure password/token handling, profile-photo minimisation, encrypted storage, attempt-time identity matching, and append-only auditability.
