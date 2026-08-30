---
name: fieldops-security-audit
description: Audit FieldOps code, branches, diffs, and pull requests for security vulnerabilities and unsafe reliability patterns. Use when asked for a security audit, security review, vulnerability check, or pre-PR security assessment. Do not silently fix findings or submit a PR unless the user explicitly asks.
---

# FieldOps security audit

Read the repository's root `AGENTS.md` and review the requested scope before auditing. Treat the audit as read-only unless the user explicitly authorizes fixes.

## Audit workflow

1. Establish scope: working-tree changes, a branch range, a pull request, a feature, or the whole repository. Inspect `git status`, the relevant diff, routes, configuration, dependencies, and tests.
2. Build a short threat model for the affected users, roles, data, trust boundaries, external calls, uploads, background work, and state-changing endpoints.
3. Review at minimum:
   - Server-side authentication, authorization, policies, tenant or ownership boundaries, and negative tests.
   - Form Request validation, normalization, bounds, mass assignment, injection risks, and unsafe deserialization.
   - CSRF/session protections, throttling, password confirmation, replay or idempotency behavior, and state-changing routes.
   - Inertia props, API responses, logs, errors, notifications, and client rendering for secrets, sensitive fields, IDOR, XSS, and over-disclosure.
   - File uploads, paths, MIME and size checks, storage disks, generated names, downloads, and archive handling.
   - Database writes, constraints, transactions, race conditions, queues, notifications, and external integrations.
   - Dependency and configuration risk, including Composer and npm audit results, debug settings, secrets, unsafe defaults, and exposed development tooling.
4. Run appropriate read-only checks. For this repository, use `composer audit --locked --no-interaction` and `npm audit --audit-level=high` when dependencies are in scope. Do not treat an audit command's success as proof that application code is secure.
5. Validate each candidate finding against the actual code path and tests. Separate confirmed vulnerabilities from hardening suggestions, assumptions, and false positives.
6. Do not exploit production systems, access real user data, weaken controls, print secrets, modify dependencies, or submit a PR during the audit unless explicitly requested and authorized.

## Finding format

For every confirmed or plausible issue, report:

- Severity: Critical, High, Medium, or Low, with a brief rationale.
- Location: absolute or repository-relative file path and tight line reference.
- Vulnerability and affected trust boundary.
- Concrete exploit or failure scenario and impact.
- Evidence and confidence.
- Minimal remediation and regression-test recommendation.

Prioritize actionable vulnerabilities over style concerns. If no issue is found, state what was checked, what commands ran, and the audit's limitations; do not claim that the repository is universally secure.
