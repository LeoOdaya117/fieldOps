# Replan Record Status Permissions and Three Default Roles

**Status:** Complete

## Summary

The delete failure is caused by the local MySQL database missing `users.session_version`: the migration that adds it is still pending, but user deletion now updates that column. The status permissions are also missing from the role editor because that screen reads permissions from the database, and the permissions migration has not run.

Rebuild the local development database and seed exactly three built-in roles: **Super Admin**, **Admin**, and **User**. Make Super Admin the sole elevated role. Ensure the role editor offers record-status actions for every model using `HasRecordStatus`.

## Implementation Changes

- Reset and seed the local database with `php artisan migrate:fresh --seed`. This deletes all existing local database data; do not use this reset procedure on deployed databases.
- Update the role catalog and authorization code so fresh seeds create only Super Admin, Admin, and User. Super Admin replaces Owner for bootstrap, elevated access, protected-account and system-role safeguards, and platform-image access. Keep custom-role creation and built-in role protections.
- Register `view_deleted` and `update_deleted` as selectable permissions for every `HasRecordStatus` resource: users and invitations under `users`, roles, countries, timezones, IP blocks, organization locations, and media assets. Super Admin and Admin receive both actions by default; User receives neither.
- Ensure fresh migrations and `RbacSeeder` create the permission records and grants consumed by the role editor. Make the actions visible under each resource in role create/edit screens.
- Return `canViewDeleted` and `canUpdateDeleted` consistently as page capabilities wherever record-status controls appear. These are permission-derived page props, not model fields. Keep server-side route authorization and inactive-record visibility checks.
- Update RBAC documentation, bootstrap behavior, and tests to describe the three real built-in roles and Super Admin's elevated responsibilities.

## Test Plan

- Verify `migrate:fresh --seed` completes against the local development database, adds `session_version`, seeds only the three built-in roles, and creates all record-status permissions.
- Verify the role editor displays both actions for every listed resource; confirm the seeded default grants for Super Admin, Admin, and User.
- Cover deletion after migration, including session invalidation and audit behavior; cover denied status changes and inactive-record access without the relevant permission.
- Run Laravel feature tests, frontend role-form and record-status tests, TypeScript, formatting, Pint, PHPStan, and the applicable full project checks.

## Assumptions

- The requested reset applies to the local `fieldops` database and its contents may be discarded.
- Existing role assignments do not need conversion because the chosen local reset recreates the database.
- User invitations use the `users.*` permission group.
- Super Admin is the only elevated role; Admin remains governed by its assigned permissions, and User has no record-status permissions by default.

## Progress and verification

- 2026-09-26: Saved this revised approved plan before application-code edits. The previous record-status implementation is present as uncommitted work and is being preserved.
- 2026-09-26: Read-only inspection confirmed both record-status permission and session-version migrations are pending in local MySQL. The role editor reads persisted `Permission` rows; `canViewDeleted` and `canUpdateDeleted` are page capability props, not model attributes.
- 2026-09-26: Verified the configured reset target is `APP_ENV=local`, `DB_CONNECTION=mysql`, host `127.0.0.1`, database `fieldops`. A Tinker-only configuration probe was blocked because PsySH cannot write its user history; `.env` target values were read directly without exposing credentials.
- 2026-09-26: Architecture and QA mapping confirmed eight `HasRecordStatus` models. Permission entries will cover all eight; status routes and controls remain limited to the five resource groups with existing status screens (users/invitations, roles, countries, timezones, IP blocks). Organization locations and media assets receive assignable permission entries only in this change.
- 2026-09-26: Confirmed the three-role scope means three protected built-in roles; custom roles remain supported. Super Admin becomes the only elevated built-in role and replaces Owner behavior.
- 2026-09-26: Ran the approved `php artisan migrate:fresh --seed` against the verified local `fieldops` MySQL database. It completed successfully. Read-only post-seed verification confirmed the `session_version` column, exactly three built-in roles (`super_admin`, `admin`, `user`), all 14 `view_deleted`/`update_deleted` permission records across seven resource namespaces, both grants for Super Admin and Admin, and neither grant for User.
- 2026-09-26: Updated bootstrap, authorization and protected-account behavior, including Super Admin-only suspension/demotion of Super Admin accounts. Added policy and action-level checks with tests covering Admin denial even when another active Super Admin remains. Updated RBAC documentation and project knowledge.
- 2026-09-26: Full PHPUnit suite passed: 162 tests, 1,431 assertions. The focused access/reference-data suites passed: 43 tests, 633 assertions. The full Vitest suite passed: 30 files, 117 tests.
- 2026-09-26: TypeScript, full ESLint, Prettier format check, Pint, PHPStan (0 errors), production Vite build, and `git diff --check` passed. The small type-only import style issue surfaced by ESLint was corrected. The build completes with the existing Mapbox chunk-size warning.
- 2026-09-26: Attempted `composer ci:check`; its frontend lint, format, TypeScript, Vitest (30 files/117 tests), and Vite build stages passed. Composer then stopped because its Windows script could not resolve the `pint` executable. The equivalent PHP verification commands were run directly and passed: PHPUnit (162 tests/1,431 assertions), Pint, and PHPStan.
