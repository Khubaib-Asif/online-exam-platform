# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities **privately**. Do not open a public
issue, pull request, or discussion for a suspected vulnerability.

Preferred channel: use GitHub's **[Report a vulnerability](https://github.com/Khubaib-Asif/online-exam-platform/security/advisories/new)**
(Security → Advisories) to open a private security advisory. If that is
unavailable to you, contact the repository owner (@Khubaib-Asif) directly.

When reporting, please include:

- A description of the vulnerability and its impact.
- Steps to reproduce, or a proof of concept.
- Affected area (module M1–M8, a workflow, a dependency, etc.) if known.
- Any suggested remediation.

## What to expect

- We aim to acknowledge a report within a few days.
- We'll investigate, keep you updated on progress, and credit you on request
  once a fix is released.
- Please give us reasonable time to remediate before any public disclosure.

## Sensitive context — proctored examinations

This is an **online proctored-exam platform**. Security reports may touch
academic-integrity-sensitive material — for example proctoring bypasses,
device-gate or face-verification weaknesses, session/reconnect abuse, or ways
to view or alter grades. Please handle such reports with particular discretion:

- **Do not** include real candidate personal data, exam content, captured
  proctoring media, session tokens, or credentials in your report. Redact or
  synthesise instead.
- Be aware that a disclosed bypass could enable exam cheating; treat details as
  confidential until a fix is in place.

## Scope

The repository currently contains design documentation and CI/CD tooling;
implementation code will follow. Reports are welcome against anything in the
repository, including the documented design (a design-level security flaw is in
scope) and the GitHub Actions workflows.

## Secret scanning

GitHub secret scanning and push protection are enabled at the repository level
(Settings → Code security). If you believe a secret has been committed, report
it privately via the channel above rather than opening a public issue.
