# Consistent Print and PDF reports

**Status:** Complete

## Goal and success criteria

Generate Print and PDF through one Dompdf layout. Show the full branded header and metadata on page one, and a confidentiality footer with correct page numbering on every page. Print opens an inline PDF viewer; PDF export downloads an attachment. Both retain separate format permissions and private 24-hour artifacts.

## Implementation

- New `print` artifacts use the PDF renderer and `.pdf` storage suffix. The Print route serves these inline with private/no-store and nosniff headers. Existing `.html` Print artifacts retain the legacy HTML response and CSP until expiry. No schema change.
- Keep the title, generation time, and record count in first-page flow. Reserve A4 footer space and draw the divider, confidentiality text, and `Page X of Y` through the Dompdf canvas. Repeat table column headings after page breaks.
- Keep the immediate Print popup and blocked-popup fallback, updating text for the PDF viewer. Queued export notification actions use ordinary browser navigation after marking read so binary responses bypass Inertia.
- Preserve current ownership, active-user, permission, Files-scope, readiness, and expiry checks.

## Agent ownership

- Architecture and QA specialists mapped the existing contract and acceptance scenarios read-only before implementation.
- Backend engineer owns `ExportReportWriter`, export Blade/CSS, `ExportController`, and export PHPUnit tests.
- Frontend engineer owns Print action and notification UI, plus their Vitest tests.
- Main agent owns the saved plan, integration, Playwright changes, rendered output inspection, relevant checks, and independent review. Scopes do not overlap.

## Acceptance and verification

- Both formats yield matching A4 PDF report content; Print is inline and PDF is attachment. Empty and multi-page reports have a first-page-only full header, each-page footer and page numbers, repeated table headings, and no clipping.
- Cover separate Print/PDF permissions, owner and expiry checks, legacy HTML artifacts, ready and queued links, and blocked popups.
- Run focused PHPUnit, Vitest, and Playwright checks, inspect one-page and multi-page rendered reports, then applicable formatting, lint, type, static-analysis, build, and audit checks. Record only observed outcomes below.

## Assumptions

- Users print from the browser PDF viewer; the old automatic print dialog is removed.
- Existing HTML Print artifacts remain accessible for their existing 24-hour lifetime.

## Progress and verification

- 2026-10-03: Architecture and QA specialists reviewed the current export flow and tests read-only. The working tree was clean before implementation.
- 2026-10-03: Backend and frontend specialists implemented their separate scopes. The main agent updated Print-ready notification text, the Playwright flow, and integration. Independent code review found no confirmed correctness defects; QA confirmed the combined behavior.
- Focused `ExportTest` passed: 27 tests, 293 assertions. Full PHPUnit passed with the available SQLite extensions: 224 tests, 2,109 assertions. Full Vitest passed: 35 files, 230 tests. ESLint, Prettier, TypeScript, Pint, PHPStan, production Vite build, and `git diff --check` passed. The E2E test file also passed targeted Prettier and ESLint checks.
- Playwright Print flow passed on desktop, mobile, and tablet against a temporary seeded SQLite database and local PHP server. The existing `fieldops.test` credentials did not match, so the isolated environment was used. The test server and database were removed and `public/hot` was restored afterward.
- PDF extraction of one-page and seven-page samples confirmed the first-page-only header, a table heading and the correct confidentiality footer/page number on every page, and all 150 rows on the seven-page report. Pixel-level PDF rendering was unavailable in the local tools; no row or footer content was missing or overlapping in extracted page layout.
- `composer audit --locked --no-interaction` found no advisories. `npm audit --audit-level=high` passed with three existing moderate Vitest-related advisories; resolving them requires a major Vitest upgrade. The aggregate `composer ci:check` was not rerun because its component checks and the full Laravel suite passed individually.

## 2026-10-03 visible-column correction

The Countries table exposed a regression in the shared report flow: Manage Columns changed the on-screen table, but Print/PDF still used the registry's fixed export columns. Print and PDF now send the visible data-column keys in table order. The server validates those keys against a per-dataset allowlist, stores the selection with the artifact before queuing, and maps composite cells to safe report values. CSV and XLSX retain their existing fixed export columns, and older callers that omit a selection retain their prior layout. Empty or invalid selections fail before creating an artifact.

The backend and frontend scopes were implemented separately after architecture and QA mapping. Integrated review found and resolved missing IP Blocks first-seen fallback and Visit Logs composite location/request details. Reports with eight or more columns use A4 landscape so headings remain readable; narrower reports stay portrait. The first-page header and every-page footer continue to share one Dompdf layout.

Final verification: focused `ExportTest` passed 32 tests, 376 assertions; full PHPUnit passed 229 tests, 2,192 assertions. Full Vitest passed 35 files, 233 tests. ESLint, Prettier, TypeScript, Pint, PHPStan, production Vite build, and `git diff --check` passed. The Countries Print/PDF browser flow passed on desktop, mobile, and tablet against an isolated seeded SQLite database; after later report changes, desktop passed again. Extracted Print/PDF text showed the same six selected Countries headings in order with Name omitted. Text extraction of maximum-column Files, Visit Logs, Users, IP Blocks, Countries, and Roles samples showed all headings and footer text without clipping; PDF raster rendering was unavailable locally. The isolated browser-test database and probe files were removed, and `public/hot` was restored. No dependency changes were made, so audits were not repeated.

## 2026-10-03 table-value and serial correction

The Countries table formats dates in the viewer's browser locale and timezone, while reports currently emit raw server timestamps. The fixed `#` column is also excluded from the visible data-column selection. For Print/PDF, snapshot validated browser date preferences with each artifact, format report dates from their timestamp in that locale and timezone, and add server-generated serial numbers in the filtered export order. Keep the existing CSV/XLSX values and formats unchanged. Verify immediate and queued artifacts, date-boundary cases, and row numbering across pages before marking this correction complete.

The frontend now sends the browser's IANA timezone and locale for Print/PDF only. The backend validates and snapshots them with the source timezone so queued jobs interpret stored timestamps the same way as web requests, restores worker timezone afterward, and formats dates with PHP Intl to match the table's medium, date-only, and full timestamp styles. New numbered Print/PDF reports include `#` even when an older caller omits a column selection. Role type and zero-permission display values also match the table; CSV/XLSX retain their prior data and column lists. `ext-intl` is declared in Composer and explicitly enabled in CI.

Verification after the correction: focused `ExportTest` passed 37 tests and 422 assertions; full PHPUnit passed 234 tests and 2,238 assertions. Full Vitest passed 35 files and 234 tests. ESLint, Prettier, TypeScript, Pint, PHPStan, the production Vite build, Composer validation and lockfile install dry run, and `git diff --check` passed. The Countries Print/PDF flow passed in Playwright on mobile, tablet, and desktop against an isolated seeded SQLite database; its temporary database and server were removed. Text extraction and raster inspection of an actual one-page Countries Print PDF showed `#`, row 1, localized Created/Updated values, and an intact footer. A separate 150-row A4 PDF probe had five pages, the full header only on page one, repeated table headings on all five, serials 1 through 150, and an intact final-page footer with no visible clipping; probe files were removed. Independent code review and integrated QA found no remaining confirmed issue after fixes.

Dependency audits were attempted but could not reach Packagist or npm from this environment; no dependency package versions changed. `composer ci:check` was not repeated because its individual checks and the full suites passed. A `php artisan test` attempt with command-line SQLite flags failed because its child process lost those flags; the direct PHPUnit command with SQLite extensions passed in isolation.
