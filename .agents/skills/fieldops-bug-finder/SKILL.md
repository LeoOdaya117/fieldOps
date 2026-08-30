---
name: fieldops-bug-finder
description: Investigate and reproduce suspected bugs, regressions, and incorrect behavior in the FieldOps Laravel, Inertia, React, and TypeScript codebase. Use when asked to find, diagnose, reproduce, or explain a bug. Do not use as a substitute for a security audit or for implementing a fix unless the user asks for one.
---

# FieldOps bug finder

Read the repository's root `AGENTS.md` before investigating. Keep the investigation evidence-driven and scoped to the reported behavior.

## Investigation workflow

1. Restate the observed behavior, expected behavior, affected user or workflow, and the smallest reproducible scope.
2. Inspect the working tree, recent relevant changes, routes, controllers, Form Requests, Actions, models, Inertia props, React feature code, and existing tests. Follow the request/data path instead of guessing from filenames.
3. Reproduce the issue with the narrowest safe command or test available. Record the exact command, inputs, environment assumptions, and result.
4. Trace the failure to the earliest incorrect state or decision. Distinguish the confirmed root cause from contributing factors and hypotheses.
5. Check adjacent failure paths: authentication and authorization, validation, persistence and transactions, error handling, loading/empty states, and responsive or light/dark behavior when the bug is user-facing.
6. Compare against existing tests and conventions. Identify the smallest regression test that would prove the bug and prevent recurrence.
7. Do not change application behavior, delete data, contact external systems, or create a PR during an investigation unless the user explicitly requests that additional work.

## Evidence standards

- Prefer a failing test, reproducible command, log excerpt, request/response, or focused code path over speculation.
- Do not expose secrets, credentials, personal data, or full sensitive payloads in the report.
- If the issue cannot be reproduced, say so clearly and list the evidence gathered, attempted reproductions, and the information still needed.
- If multiple causes remain plausible, rank them and explain what would distinguish them.

## Completion report

Report:

- Concise bug summary and expected versus actual behavior.
- Reproduction steps and exact result.
- Confirmed root cause with file and line references.
- Impact, affected paths, and confidence level.
- Recommended fix and focused regression-test plan.
- Limitations or follow-up evidence needed.
