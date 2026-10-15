# Build the Record Status Switch

**Status:** Implemented; backend PHPUnit verification is blocked by unavailable SQLite PDO

## Summary

Implement the approved status-control feature across existing `record_status` tables and detail views. Authorized users can switch records between Active and Inactive; users without update permission see a status badge. Users with deleted-record visibility can filter for inactive records and open their details.

## Approved implementation plan

- **Backend and access:** Add resource-scoped `view_deleted` and `update_deleted` permissions for users/invitations, roles, countries, timezones, and IP blocks. Add an existing-installation migration and update RBAC configuration so Admin and Super Admin receive both permissions; leave the `administrator` alias unchanged. Add a reusable `ChangeRecordStatus` action with explicit resource routes and controller capability props. Allow inactive detail access and filtering only with `view_deleted`; authorize either transition with `update_deleted`. Preserve resource safeguards and keep IP block activation separate from `record_status`.
- **UI and guidance:** Replace existing status displays with a shared switch for users with `update_deleted` and a badge for others. Require confirmation for both transitions. Add Active/Inactive table filters for users with `view_deleted`, defaulting to Active. Update controller guidance for future status-enabled resources; do not add a custom Artisan generator.
- **Delegation and integration:** Architecture mapping and QA scenario design are complete as read-only specialist tasks. Use non-overlapping backend and frontend scopes, integrate changes centrally, then have QA inspect the combined behavior.
- **Verification and recordkeeping:** Add feature and frontend tests for permission failures, filtering, detail access, both transitions, audit updates, confirmation, and resource safeguards. Run applicable project checks and record actual results, failures, and skipped checks here.

## Acceptance criteria

- Authorized users can confirm either status transition; unauthorized users see a badge and cannot mutate status.
- Only users with `view_deleted` can filter for or open inactive records; users without it cannot reveal them through crafted requests.
- Existing safeguards remain enforced, including timezone availability, protected roles and accounts, and the separate IP block activation state.
- Verification results are recorded below.

## Assumptions

- `record_status = 0` is labeled “Inactive”; records remain stored for audit.
- Scope covers current status displays, including user invitations, but does not add status UI to models that do not currently expose it.
- Admin and Super Admin receive the permissions; the `administrator` alias remains unchanged.

## Progress and verification

- 2026-09-26: Saved this approved plan before application-code edits. Worktree was clean.
- 2026-09-26: Architecture mapping and QA scenario design completed as read-only specialist reviews.
- 2026-09-26: Implemented resource permissions, existing-installation migrations, explicit status routes, shared mutation action, capability props, inactive filters/detail visibility gates, and the shared switch/badge UI. User invitations are included; IP block activation remains independent.
- 2026-09-26: Added session-version invalidation for user status changes and existing session-revocation flows. Existing signed-in sessions without a version snapshot will be required to sign in again at their next authenticated request after rollout.
- 2026-09-26: QA review identified two safeguard gaps; fixed Owner reactivation authorization and role assignment checks to include inactive users. Added regression tests for both cases.
- 2026-09-26: QA rechecked both fixes and confirmed the safeguards now cover both transition directions and inactive role assignments.
- Passed: `npm.cmd run types:check`.
- Passed: `npm.cmd run test:unit -- --run` — 30 files, 116 tests.
- Passed: `npm.cmd run format:check`.
- Passed: Scoped ESLint on modified frontend files.
- Passed: `php vendor/bin/pint --test`.
- Passed: `php vendor/bin/phpstan analyse --no-progress` — 0 errors.
- Passed: `php artisan route:list --name=record-status` — six explicit PATCH routes.
- Passed: `git diff --check`.
- Security review follow-up: no remaining confirmed issue in session invalidation or reviewed authorization paths.
- Blocked environment check: targeted PHPUnit feature suites could not initialize SQLite (`could not find driver`); 23 tests errored before assertions. PHPUnit runtime verification must be repeated in an environment with SQLite PDO enabled.
- Full `npm.cmd run lint:check` reports one existing lint error in untouched `resources/js/components/platform-shell-parts.tsx:3` (`import/consistent-type-specifier-style`). Modified frontend files pass scoped lint.
