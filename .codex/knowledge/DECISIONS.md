# Project Decisions

## 2026-10-22 — Make operational role presets explicit permission drafts

- **Context:** Future operational modules need a permission vocabulary and reusable role starting points without changing existing accounts' grants.
- **Decision:** Register operational permissions without assigning them. Offer server-configured Supervisor, Dispatcher, Technician and Viewer permission lists in custom-role forms, applying only on request and saving through existing validation, grant-ceiling checks, transactions and audit. Include existing dashboard access so login has a working landing page. Exclude operational keys from protected seed defaults; retain the existing Super Admin bypass.
- **Rationale:** This uses the existing role workflow without preset persistence or new endpoints. Later policies remain responsible for technician assignment scope and resource authorization.

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

## 2026-10-04 — Keep database recovery independent of database state

- **Context:** Restore removes and replaces the configured application database, including queues, sessions, users and audit rows.
- **Decision:** Store signed packages, operation history, locks and a login epoch on private durable local storage; execute through a separately supervised filesystem runner. Require operator writer coordination, maintenance and a verified safety backup before replacement. Recover explicitly through the CLI with retained packages; do not retry a failed restore or automatically migrate.
- **Rationale:** Recovery remains available with damaged database state, history survives replacement, and an external login epoch prevents historical session-version collisions. Single-host locking and matching engine major/migration fingerprint bound the first version.

## 2026-10-04 — Preserve mounted content during background status reloads

- **Context:** Inertia async status reloads triggered the page skeleton after its delay, unmounting the polling hook and cancelling the request before backup completion reached the UI.
- **Decision:** Exclude async visits from navigation loading boundaries and explicitly hide progress for backup status reloads. Test slow requests through the actual loading boundary.
- **Rationale:** Background requests can update server state without interrupting their own owner, while normal navigation retains the existing skeleton behavior.

## 2026-10-04 — Restore a signed table scope as one dependency group

- **Context:** Operators requested table-level backups and restores with recorded creator, timestamp, table list, and a searchable audit trail.
- **Decision:** Keep full database backup as the default. Selected backups expand the bidirectional foreign-key graph and registered FieldOps logical links, then sign both requested and included tables with creator and audit metadata in format version 2. Restore the recorded selection as a whole after taking a full safety package. CLI `--recovery` is restricted to full-database packages.
- **Rationale:** Related rows travel together, operators can see why tables were included, and a damaged full restore cannot be reopened through an unrelated partial import. Complex database objects with uncertain scoped dependencies fail closed.

## 2026-10-17 — Scope idle activity coordination to the authenticated session

- **Context:** Origin-wide localStorage and BroadcastChannel names allowed stale browser state from an earlier setup or another session to trigger logout or affect the current login.
- **Decision:** Generate a random idle-activity scope in the authenticated Laravel session, share it in authenticated Inertia props, and namespace client activity storage and tab messages by that scope. Do not expose the Laravel session ID or use the scope for authorization.
- **Rationale:** Browser storage can outlive database resets and logouts. Session-scoped coordination prevents stale state and unrelated tabs from crossing authentication boundaries while preserving same-session tab synchronization.

## 2026-10-18 — Configure role navigation with approved catalog keys

- **Context:** Administrators need a simple way to tailor sidebar destinations by role without storing arbitrary links or coupling menu visibility to authorization.
- **Decision:** Keep approved destinations, labels, route names, permissions, icons, and default order in `config/navigation.php`; store only an ordered list of selected catalog keys in `roles.navigation_items`. Resolve and permission-filter that list server-side, share it to every app navigation layout, and preserve contiguous group segments when a role interleaves categories. Preserve permission-derived menus for legacy null selections, and seed explicit defaults for newly created built-in roles.
- **Rationale:** Role administrators can tailor both visibility and global order with a small allowlisted form, existing roles retain their behavior during rollout, and every route remains protected by its existing server-side permission checks.

## 2026-10-18 — Add role-local custom navigation destinations

- **Context:** Selecting and ordering the built-in destinations did not let each role add links for role-specific workflows or define their own group labels, URLs, and icons.
- **Decision:** Keep `roles.navigation_items` as the ordered list of selected keys and add nullable `roles.custom_navigation_items` JSON for each role's custom metadata. Accept only app-relative paths or credential-free HTTPS URLs and finite Lucide icon keys; custom links remain presentation only and never grant route access. Render HTTPS destinations as same-tab anchors.
- **Rationale:** This extends the existing role editor without rewriting built-in defaults or stored navigation order, while keeping custom metadata validated and icon rendering controlled by the application.

## 2026-10-18 — Allow role-specific sidebar group labels

- **Context:** Sidebar headings were fixed in the built-in navigation catalog, even after roles gained custom destinations and global ordering.
- **Decision:** Store built-in label overrides in nullable `roles.navigation_group_overrides` and keep custom destination labels in `roles.custom_navigation_items`. Let role editors add labels and assign them to destinations. Render a heading only when a selected, accessible destination uses it.
- **Rationale:** This makes sidebar sections customizable per role without a separate group registry or orphaned empty headings, and leaves route permissions independent from presentation labels.

## 2026-10-28 — Reuse finite backup execution for cron

- **Context:** Shared hosting may permit cron rather than a persistent supervised backup worker; the existing 15-second recent-run indicator is shorter than minute cron cadence.
- **Decision:** Keep `backups:work --once` and existing filesystem locking/recovery. Make only the heartbeat TTL configurable, retaining the supervised default, and document provider verification and full-operation runtime requirements separately from liveness.
- **Rationale:** A small compatibility setting supports finite invocations without a new runner, queue dependency, or weakening signatures, leases, safety snapshots or authentication epoch. Host suitability still requires deployment evidence; development/PR delivery proceeds first per user direction.
