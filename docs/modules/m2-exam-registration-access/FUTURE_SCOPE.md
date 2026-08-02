# M2 — Exam Registration & Access — Future Scope

**Module:** M2 — Exam Registration & Access
**Status:** v1 boundary; no open v1 requirements
**Authoritative references:** `docs/architecture/HIGH_LEVEL_DESIGN.md` §§9, 14; `docs/architecture/LOW_LEVEL_DESIGN.md` §10; `docs/modules/MODULE_DECOMPOSITION.md` §2.2

This file records deliberately deferred work. It does not create v1 requirements, schemas, screens, or approval authorities.

## Deferred capabilities

- institution, tenant, class, course, department, term, roster, and academic-membership models;
- institution-admin or super-admin approval workflows;
- bulk roster import and automatic class-based registration;
- recurring exam series and reusable audience groups;
- external identity-provider group synchronisation;
- multi-owner or delegated approval policies; and
- LMS/calendar audience synchronisation.

## Boundary rule

Any future organisation or audience capability requires an architecture review and must not be represented by a client-supplied institution, class, course, or role field in the v1 registration command.
