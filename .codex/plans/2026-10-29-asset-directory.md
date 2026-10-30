# Phase 3 — Asset directory

Status: implementation verified on `codex/asset-directory`; based on GitHub `main` at `4f5faabb5a994ce3c93549f02b97f5e40dbc530a`. PR and merge handoff pending. Approved roadmap: `2026-10-22-fieldops-roadmap.md`.

## Goal and bounded acceptance

Deliver an authenticated, permission-controlled Asset directory with unique asset codes, names, categories, operational condition, optional coordinates, searchable/filterable paginated listings, and create/edit/detail pages. Reuse existing Laravel/Inertia, permissions, Wayfinder, design primitives, map, and record-status patterns. Do not modify existing operational dashboard sample data.

Included:

- Dedicated `Asset` model/table, separate from `MediaAsset` uploaded-file identity.
- Existing `assets.view/create/update/view_deleted/update_deleted` permissions only; do not change protected-role grants or add row-scope assumptions.
- Canonical uppercase trimmed codes with a database unique constraint that reserves inactive codes.
- Bounded category text (80 characters) and condition values: `operational`, `needs_maintenance`, `out_of_service`.
- Coordinates either both absent or both present within latitude/longitude ranges; manual labeled inputs remain usable without Mapbox token/WebGL.
- Shared `HasRecordStatus` lifecycle, status route/action, authorized inactive list/detail access, and status capability props. Deactivation preserves records and codes for future references.
- No hard-delete or export controls/endpoints in this phase. No activity-history workspace or private evidence; those remain Phase 4.

## Interfaces

- Named Laravel routes under `assets.*`: index, create, store, show, edit, update, record-status.
- Form input keys: `code`, `name`, `category`, `condition`, `latitude`, `longitude`.
- Index Inertia props: paginated `assets`, capability booleans, and normalized search/status/page filters.
- Asset listing/detail DTO: stable ID, code/name/category/condition/coordinates, record status/status URL, timestamps, and audit actor summaries only.
- Existing generated Wayfinder imports are build artifacts and must not be committed.

## Verification criteria

- Authentication and view/create/update/status authorization, including denied requests.
- Duplicate/case/whitespace code handling, update self-exclusion, and DB uniqueness; validation of text lengths, category/condition, paired/ranged coordinates.
- Search/filter/sort allowlists, bounded pagination, inactive visibility and update permission gates, safe Inertia props, audited persistence, and historical-safe deactivation.
- Frontend accessibility, keyboard and error behavior, empty/list states, both themes and mobile/tablet/desktop; manual coordinate entry with map unavailable.
- Focused browser create/edit/detail flow across mobile, tablet, and desktop, both themes, keyboard-accessible condition selection, overflow, and Axe.
- Before merge: passing component checks, Composer and npm audits, focused E2E, full diff/status inspection, independent review, and observed remote checks. Report every unavailable check.

## Progress and delivery evidence

- Read the canonical engineering guide, all three project knowledge files, approved roadmap, Phase 1 operational permission matrix, and Phase 2 shared-hosting handoff.
- Phase 1 PR #23 and Phase 2 PR #25 are merged; current GitHub `main` and local base both equal `4f5faabb5a994ce3c93549f02b97f5e40dbc530a`.
- Architecture and QA read-only mappings confirm existing `Country` CRUD, `BuildListingQuery`, `ChangeRecordStatus`, and `MapboxMap` as the relevant source patterns.
- Initial implementation contract confirmed with backend/frontend ownership split. Status handling is included now to provide a complete inactive-record lifecycle; history/evidence remain excluded.
- Resolved the managed Git metadata write restriction using the approved elevated branch switch; the active branch is `codex/asset-directory` and the working tree began clean.
- Final verification on 2026-10-30: `php artisan test` passed all 397 tests (393 passed, 4 skipped; 3,787 assertions); frontend Vitest passed 40 files / 303 tests; Playwright passed all 3 viewport projects. `npm run build`, ESLint, Prettier, TypeScript, Pint, PHPStan, Composer audit, npm audit, and `git diff --check` passed. Composer audit found no advisories; npm audit found zero vulnerabilities.
- The browser run used a uniquely named temporary SQLite database and loopback server. The server used database-backed sessions so the app's authenticated browser flow persisted across requests. Chromium and test logs stayed in temporary directories; build output and generated Wayfinder files are ignored.
- Composer lockfile updated Symfony Mime from 7.4.16 to 7.4.22 after Composer audit identified an advisory; both dependency audits now pass.
- Independent code review and final scoped review reported no actionable findings.
- Known scope boundary: no hard delete, export, activity-history workspace, or private evidence was added. The existing operational dashboard sample data is unchanged.
- PR URL, remote check results, merge commit, and Phase 4 prerequisites will be appended after observed delivery. Phase 4 should add private evidence and durable asset history while preserving this phase's stable asset IDs and reserved codes.
