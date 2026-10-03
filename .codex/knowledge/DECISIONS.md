# Project Decisions

Append meaningful architectural or workflow decisions with their date, context, chosen approach, and rationale. Do not use this file as a general activity log. Preserve earlier entries; if a decision is superseded, add a new entry that links to it.

## 2026-09-26 — Keep the Codex specialist setup project-local

- **Context:** FieldOps needs reusable specialist roles and durable feature workflows for the project team.
- **Decision:** Store skills under `.agents/skills/`, agents under `.codex/agents/`, and project knowledge and plans under `.codex/` in Git.
- **Rationale:** The setup and verified project guidance should travel with the repository and remain reviewable across sessions.

## 2026-09-26 — Centralize record status access and mutation

- **Context:** Soft-deleted records needed a reusable Active/Inactive control across their table and detail surfaces, while inactive rows remain hidden unless explicitly permitted.
- **Decision:** Use per-resource `view_deleted` and `update_deleted` permissions, a shared UI control and `ChangeRecordStatus` action, and explicit resource routes. Controllers gate inactive filters and detail lookup with `view_deleted`; the mutation request authorizes with `update_deleted`.
- **Rationale:** This keeps policy enforcement server-side and resource-scoped while presenting a consistent control. IP block `is_active` remains independent from its audit `record_status`.

## 2026-09-26 — Version user sessions when invalidating them

- **Context:** Deleting rows from the database sessions table does not invalidate file-backed sessions, and an old cookie could otherwise resume after an account is reactivated.
- **Decision:** Centralize user-session invalidation by deleting DB sessions where applicable, incrementing `session_version`, and rotating `remember_token`. Snapshot the version at login and reject missing or stale snapshots on authenticated requests.
- **Rationale:** A per-user version invalidates sessions across supported session drivers and remains effective after reactivation. Existing signed-in sessions will be required to sign in again once after rollout.

## 2026-09-26 — Seed three protected built-in roles

- **Context:** Record-status actions must be assignable in the role editor, and the current role set needed to be reduced to the three requested default roles.
- **Decision:** Seed only User, Admin, and Super Admin as protected built-in roles. Super Admin is the sole elevated role; custom roles remain supported. Register `view_deleted` and `update_deleted` for every record-status resource namespace, grant both to Admin and Super Admin by default, and grant neither to User.
- **Rationale:** Resource-scoped actions remain visible and configurable through the existing permission editor while elevated account and system-role safeguards have one consistent authority.

## 2026-09-27 — Use route-family skeletons for page loading

- **Context:** The global Inertia progress bar did not show page structure while visits were pending, and client navigation continued to display the previous page.
- **Decision:** Use an app-level visit provider for non-prefetch GET requests, render a destination-family skeleton after 200 ms inside the innermost active layout, and retain a Blade boot fallback while the Inertia mount root is empty. Unmapped future pages use a generic skeleton; local operation indicators remain local.
- **Rationale:** This makes page navigation consistent across existing and future routes, keeps app/auth/settings navigation in place, and avoids replacing useful form, upload, or widget progress states.

## 2026-09-28 — Keep uploaded-file identity and storage separate

- **Context:** Files, personal images, avatars, and platform branding need one management model without exposing storage paths or treating a token as authorization.
- **Decision:** Extend `MediaAsset` with immutable opaque tokens and a module, keep physical disk/key server-only, and resolve authenticated preview/download through token routes and module-aware policy. The public branding endpoint serves only an active assigned image by token. Keep the gallery picker uploader-scoped while the central Files list may include cross-uploader assets in administrable modules.
- **Rationale:** One canonical record and private disk contract simplify lifecycle, auditing, and future S3-compatible storage while preserving per-module access boundaries. Legacy public avatar files stay in place until an independently verified deployment cutover.

## 2026-10-01 — Share listing filters with global exports

- **Context:** Export actions must include every row matching the active listing filters and sort while enforcing the same Files module scope and safe output columns.
- **Decision:** Build reusable filtered queries in `BuildListingQuery`, define export datasets and safe columns in `ExportDatasetRegistry`, and store generated outputs as private expiring artifacts guarded by the owner’s current resource permission and file scope.
- **Rationale:** Sharing query construction keeps table and export results aligned, while private artifacts preserve access checks for immediate and queued reports.

## 2026-10-03 — Render Print and PDF from one report layout

- **Context:** Browser HTML printing added its own page chrome while PDF output placed a footer and page count inconsistently.
- **Decision:** Generate both formats through Dompdf, draw the footer and page number on every page, and serve Print PDFs inline while preserving the distinct `export_print` permission and guarded route. Serve existing HTML Print artifacts until their current expiry.
- **Rationale:** One renderer gives Print and PDF the same pagination and report content without changing format permissions or interrupting short-lived artifacts.

## 2026-10-03 — Use visible table columns for Print and PDF

- **Context:** Manage Columns hid or showed fields in the listing, but Print/PDF still used fixed export columns, so the report did not match the table selection.
- **Decision:** Send ordered visible data-column keys for Print/PDF, validate them against dataset-specific server mappings, and snapshot them on the artifact before queuing. Keep CSV/XLSX on their existing fixed export columns and preserve the default layout for callers without a column selection.
- **Rationale:** The report now reflects the user's chosen table view while server allowlists and artifact snapshots preserve safe, deterministic output.

## 2026-10-03 — Match report dates and serials to the table

- **Context:** Countries Print/PDF showed raw server timestamps and omitted the table's fixed `#` column despite matching the chosen data columns.
- **Decision:** Snapshot validated browser locale and timezone alongside the source application timezone for Print/PDF, format report dates with PHP Intl using the table's display styles, and generate serials on the server in full filtered row order. Add `#` even for new Print/PDF requests without a selected-column payload. Keep CSV/XLSX values unchanged and require `ext-intl` in the PHP runtime.
- **Rationale:** The report and browser table now show the same dates and numbering for immediate and queued exports, without trusting client-provided row numbers or changing spreadsheet contracts.

## 2026-10-03 — Keep Print and PDF reports in portrait

- **Context:** The report renderer switched reports with eight or more columns to landscape, while users expect a consistent portrait page format.
- **Decision:** Render every PDF and Print report on A4 portrait pages. Use compact table typography when a report has eight or more columns.
- **Rationale:** Every report now opens and prints with the same page orientation, while wide tables use less space per cell to fit the portrait page.
