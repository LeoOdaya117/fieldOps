# Execute global table exports

**Status:** Complete

## Summary

Implement reusable, permission-based export actions for every current listing table. Add an Export dropdown to the shared `DataTable` toolbar, beside existing table actions and Manage Columns. Exports contain all rows matching current filters and sort across pagination. Each listing defines safe columns, independent of Manage Columns visibility.

## Execution steps

1. Preserve this approved plan before application-code edits.
2. Add resource-scoped PDF, CSV, XLSX, and Print permissions; seed Admin and Super Admin, and migrate existing databases. Build shared export generation, private artifact storage, queued processing, notifications, protected download/print routes, and resource export endpoints.
3. Add the reusable permission-aware export dropdown and wire users, invitations, registrations, roles, audit, IP blocks, visit logs, Files, countries, and timezones listings.
4. Integrate backend and frontend work. Generate reports up to 500 rows immediately; queue larger reports, notify on completion or failure, expire artifacts after 24 hours, and reject requests over 10,000 rows. Recheck ownership and current format permissions on download.
5. Review the integrated behavior with QA and security review. Run relevant test and quality checks and record observed results here.

## Contracts and safeguards

- Use resource-scoped `export_pdf`, `export_csv`, `export_xlsx`, and `export_print` permissions. CSV/XLSX/PDF/Print use each listing’s defined safe columns and include all filtered and sorted rows across pages.
- Keep Files exports scoped to the viewer’s eligible modules and permissions. Require `users.review_registrations` for registrations in addition to the relevant export permission.
- Use one shared PDF layout and one shared browser Print layout, A4 portrait with 15 mm margins, consistent header, footer, and table styling. Use PhpSpreadsheet for XLSX/CSV and Dompdf for PDF. XLSX page setup also uses A4 portrait.
- Store artifacts on the private disk. Link ready exports through the existing notification inbox, rechecking permission and expiry when resolving the link. Sanitize formula-leading values in CSV and keep XLSX strings as text; exclude secrets and internal storage paths.
- Automatically download ready PDF, CSV, and XLSX exports when their request completes; do not require a second download-link click. Print opens its popup and invokes the browser print dialog.
- Show export progress, ready, queued, and failure feedback through the shared Sonner toast UI. Keep feedback out of the DataTable toolbar; offer the blocked-popup Print fallback as a toast action.

## Tests and acceptance

- PHPUnit covers successful formats, active filters and sorting, cross-page completeness, role grants, authentication and permission denial, registration review access, inactive rows, Files module scoping, queued success/failure, owner checks, revocation, expiry, and row-limit boundaries.
- Vitest/Playwright cover permission-filtered menus, hidden menus when no format is allowed, keyboard use, automatic ready-file downloads, toast feedback, queued feedback, responsive layouts, and light/dark themes. Inspect representative output from each format, including empty results and safe cell handling.
- Run focused Laravel and frontend tests, then formatting, lint, type checks, PHPStan, Pint, production build, and dependency audits. Record only checks actually run.

## Delegation boundary

- Main task owns this plan, integration, reviews, verification, and progress record.
- Backend specialist owns permission registration and migration, server routes/controllers/actions, export definitions, storage/queue/notification lifecycle, and backend tests.
- Frontend specialist owns the shared DataTable export interface/dropdown, listing integration, and frontend tests. File scopes must not overlap with backend work.
- QA and security reviewers inspect the integrated implementation read-only.

## Progress and verification

- 2026-09-30: Saved the approved conversational plan before application-code edits. The initial working tree was clean.
- 2026-09-30: Architecture and QA specialists completed read-only mapping. Confirmed RBAC permissions are enum/config/seeder driven, existing installations need a forward data migration for new permissions and grants, queue connection defaults to database, notifications use the database inbox, and the default disk is private local storage. Identified Users sub-list access differences and Files’ module-specific visibility as required safeguards.
- 2026-10-01: Implemented resource-format permissions and Admin/Super Admin grants, a forward migration, a shared filtered-query action, ten safe export datasets, private expiring artifacts, queue/notification handling, protected download/print routes, a shared DataTable dropdown, and per-table export wiring. Added and documented the shared query/artifact architecture in project knowledge.
- 2026-10-01: Security review found and fixed Files and invitation visibility mismatches. Files exports now require Files view access and eligible module export grants; invitation exports follow the Users listing’s `users.view` access. No further concrete security findings were reported.
- 2026-10-01: Independent code review found no confirmed flow defects and requested direct query/filter/sort parity checks for six datasets. Added comparisons for invitations, roles, audit, IP blocks, visit logs, and timezones.
- Verification passed: `composer ci:check` (ESLint, Prettier, TypeScript, 34 Vitest files/221 tests, production build, Pint, PHPStan, and the Laravel suite: 220 tests/2,051 assertions); focused `ExportTest` (23 tests/235 assertions); affected listing suites (97 tests/1,049 assertions); and `git diff --check`.
- Browser verification passed: `npx playwright test tests/e2e/access.spec.ts --grep 'administrator can open the export menu'` passed on mobile, tablet, and desktop, including keyboard access and light/dark themes. The run used a temporary SQLite database/storage because the configured `fieldops.test` admin credentials did not match; the stale `public/hot` pointer was temporarily moved so the production build loaded and then restored.
- Dependency audits: `composer audit --locked --no-interaction` found no advisories. `npm audit --audit-level=high` exited successfully with three moderate Vitest-related advisories; the available fix requires a Vitest major upgrade and was left unapplied.
- Resolved during verification: updated stale Inertia test mocks for `usePage`, tightened Eloquent builder/cast types after PHPStan findings, and revised an RBAC test that incorrectly expected Admin audit permissions to exclude the newly granted export formats. Final integrated checks pass.
- Build note: Vite reports the existing `mapbox-gl` chunk exceeds 500 kB; the production build succeeds.
- 2026-10-02: Fixed the ready-export workflow after browser verification showed that a scripted hidden-anchor click did not request the artifact URL. Ready PDF/CSV/XLSX responses now navigate directly to the protected attachment endpoint, which starts the browser download automatically; the visible download link is removed. The Export status remains beside the menu, and Print continues to open a popup and invoke `window.print()`.
- 2026-10-02 verification: focused Vitest suites passed (46 tests across export actions, table components, and browser download navigation); TypeScript, ESLint, targeted Prettier, and the production Vite build passed. The export Playwright flow passed on mobile, tablet, and desktop (3 runs), verifying a CSV download event and filename, no visible Download CSV link, responsive toolbar behavior, theme modes, and the Print popup/print call.
- Remaining implementation limitations: queued exports still complete through the existing notification inbox, because their file is not ready in the initiating browser response. The moderate npm audit advisories and existing chunk-size warning are recorded above.
- 2026-10-02: Updated the shared PDF/Print paper rule and the XLSX page setup to A4 portrait. Focused export tests now verify the print CSS, PDF page dimensions, and XLSX paper/orientation settings. `ExportTest` passed (23 tests, 242 assertions); targeted Pint and `git diff --check` passed.
- 2026-10-02: Moved export progress, ready, queued, and error feedback from beneath the Export control into the app's shared Sonner toasts. The blocked-print fallback is now a toast action, and the shared toolbar retains centered alignment. Focused Vitest passed (45 tests); TypeScript, ESLint, targeted Prettier, production build, and Playwright export flow passed on mobile, tablet, and desktop. Browser verification first exposed a filter-loading wait and then an ambiguous email substring matching both Admin and Super Admin; the test now waits for the exact email cell, and the final three-viewport run passed.
