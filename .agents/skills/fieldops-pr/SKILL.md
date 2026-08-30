---
name: fieldops-pr
description: Prepare and submit GitHub pull requests for the FieldOps Laravel and React repository. Use when asked to create, open, submit, or update a pull request, or to make a branch ready for review. Do not use for standalone bug investigation or security review without PR delivery.
---

# FieldOps pull requests

Follow the repository's root `AGENTS.md` as the canonical engineering guide. Keep the current task's requested scope and do not silently include unrelated changes.

## Mandatory pre-submit gate

Treat the test gate as a hard prerequisite for both pushing the branch for PR delivery and creating or updating the pull request.

1. Inspect `git status`, the current branch, the upstream branch, and the complete diff.
2. Identify the required checks for the changed areas. For a normal FieldOps PR, use the repository's full CI check:

   ```powershell
   composer ci:check
   composer audit --locked --no-interaction
   npm audit --audit-level=high
   ```

   If the change affects critical browser flows, also run `npm run test:e2e`. Use the Docker equivalents from `AGENTS.md` when the native toolchain is unavailable.
3. A check passes only when the command exits with code 0. Do not infer success from partial output, a previous run, a cached result, or a command that was skipped.
4. If any required check fails, times out, cannot run, or has an ambiguous result, stop before pushing or submitting. Report the exact command, failure, and next action.
5. If application code, tests, configuration, dependencies, or generated inputs change after validation, invalidate the gate and run the affected checks again.
6. Never use `gh pr create`, `gh pr edit`, or an equivalent PR-submission action before the gate passes. Do not bypass the gate because the request is urgent or asks to skip tests.

## Delivery workflow

- Confirm the intended base branch, PR title, description, labels, reviewers, and draft status from the task or repository context. Do not invent reviewers or labels.
- Summarize the change and the validation evidence in the PR body. Include failed or unavailable checks rather than hiding them.
- Only after the gate passes and the user has requested delivery, push the current branch and create or update the PR.
- Verify the resulting PR URL, title, base/head branches, and status. If the GitHub CLI or connector is unavailable, stop with the prepared title/body and the missing capability.
- Do not merge the PR unless the user separately asks for merging and all required repository checks are green.

## Completion report

Report:

- PR URL and status, when created or updated.
- Files or behavior changed.
- Exact validation commands and pass/fail results.
- Any checks not run, with the reason.
