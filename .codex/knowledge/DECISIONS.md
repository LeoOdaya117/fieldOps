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
