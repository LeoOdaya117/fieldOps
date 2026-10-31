# Phase 4 — Asset evidence and history

Status: merged as PR #27 at `add1769563002a345946640cf8b6c8cdc8383824`. Approved roadmap: `2026-10-22-fieldops-roadmap.md`.

## Goal and bounded acceptance

Add private photo/file evidence and useful, auditable activity history to the Phase 3 Asset detail experience. Preserve stable asset identity, reserved codes, attached evidence references, and history when an asset is deactivated. Reuse canonical `MediaAsset` private storage/tokens, asset permissions, existing audit events and shared record-status behavior. Do not add work orders, inspections, issues, mobile, exports/imports, or bulk features.

### Evidence

- Store all uploads as canonical `MediaAsset` records in a dedicated `asset_evidence` module and tie each record to its asset on the server. Never trust a client asset path or media token as authorization.
- Provide asset-scoped list, inline preview where supported, download, upload, and recoverable removal. Every evidence request checks both the asset's current visibility and the evidence module/asset association. `assets.view` reads; `assets.update` mutations; inactive asset reads additionally require `assets.view_deleted`. Evidence is not exposed through Files, gallery, avatar, or branding scopes.
- Enforce allowed MIME types, request size, image dimensions/pixels, and per-asset file/byte quotas. Use generated private storage keys, compensating blob cleanup for failed DB writes, and no destructive removal. Do not claim DB/filesystem atomicity.
- Keep token/content endpoints private, avoid storage path disclosure, and paginate/bound evidence reads.

### History

- Show append-only asset events for create, meaningful updates (including condition), activation/deactivation, and evidence attach/remove. Reuse the existing audit record store and shared `ChangeRecordStatus` path.
- Record server actor and event time plus safe changed fields. Retain event actor display attribution and evidence filename/type/size as event-time values; never store paths, credentials, or unsafe raw uploads.
- Paginate/bound history reads and eager-load actors. Do not backfill synthetic edits for Phase 3 assets. Document what the legacy `created_by`/`updated_by` fields can and cannot establish.
- Retain event history when evidence or users are renamed/deactivated; never hard-delete the asset or evidence blob as part of this feature.

## Interfaces and permissions

- Existing asset routes and detail contract remain intact. Add named asset-nested evidence routes for listing/upload/removal and tokenized private content/thumbnail/download.
- Keep existing permission grants unchanged: `assets.view` for evidence/history reads, `assets.update` for upload/removal, and `assets.view_deleted` to view an inactive asset and its evidence/history.
- Inertia props include only display-safe media metadata, event actor snapshots, changed fields, timestamps, capability booleans, and pagination links. Physical disk/key and unrelated MediaAsset fields stay server-only.
- Add a nullable asset foreign key to the media record (scoped to the dedicated module) with deletion restricted; no second media table/system.

## Verification criteria

- Auth, permission, inactive-parent, cross-asset token, and cross-module denial tests for list/upload/remove/content/thumbnail/download.
- Valid image and document upload/preview/download, invalid MIME/size/image dimensions, quota exhaustion, storage failure, database rollback cleanup, and retry-safe behavior.
- Recoverable removal with blob retained; audit attribution and event-time metadata remain visible after user/media rename or deactivation.
- Create/update/no-op/condition/status/evidence event integrity, no unsafe fields, no fabricated legacy history, bounded pagination and eager-loaded actors.
- Browser upload/view/remove/history flow with keyboard support, visible errors, empty/loading states, light/dark, mobile/tablet/desktop, plus existing asset CRUD/status regressions.
- Before PR delivery: `composer ci:check`, `composer audit --locked --no-interaction`, `npm audit --audit-level=high`, relevant Playwright, independent code/security review, diff/status inspection, and observed remote checks. Do not push or open a PR while any required gate is failing or unavailable.

## Progress and delivery evidence

- Verified merged base: Phase 3 PR #26 merged at `ce7a560d0d1e27586262759f07bcba5f2d1b7144`; this branch starts exactly at that commit.
- Read the canonical engineering guide, project context/notes/decisions, roadmap, Phase 3 implementation brief, and feature-build, ponytail, fieldops-pr, security-diff-scan, and Impeccable guidance.
- Architecture and QA read-only maps confirmed that Phase 3 already records create/update through `ManageAsset` and activation/deactivation through `ChangeRecordStatus`; Phase 4 must extend those source paths, not duplicate status or introduce a generic audit framework.
- Implemented private evidence as asset-bound canonical `MediaAsset` rows, asset-scoped read/write/content/preview routes, safe image and bounded tabular previews, independent paginated evidence/history, recoverable removal, and event-time actor/metadata snapshots. Existing asset permission grants are unchanged; generic Files, gallery, avatar, and branding access do not include evidence.
- Review corrections: quota totals include inactive evidence; evidence listings select the stored extension so CSV/XLS/XLSX preview controls are present; tests cover removed-byte quotas, image limits, auth/scope denials, and upload cleanup.
- Local verification on the final implementation: `composer ci:check` passed (41 frontend test files/312 tests; production build; Pint; PHPStan; 412 PHPUnit tests, 408 passed/4 skipped, 4,000 assertions). Focused Playwright passed on mobile, tablet, and desktop (3/3), including upload, tabular preview, download, attach/remove history, dark theme, and accessibility checks. `composer audit --locked --no-interaction` and `npm audit --audit-level=high` passed; dependency lockfiles were unchanged. `git diff --check` passed before the last small test/controller edits and will be rerun before PR.
- Independent final code review and security review reported no actionable findings. QA confirmed earlier findings were addressed; the removed-byte quota assertion was added and passed in the full suite.
- A browser run exposed and resolved the missing extension selection in the evidence listing. The final browser run used a freshly started server and passed all viewports.
- PR URL/checks, merge commit, known limitations, and Phase 5 prerequisites will be appended after delivery. Do not start Phase 5 from this branch.

## Delivery handoff

- PR: https://github.com/LeoOdaya117/fieldOps/pull/27 — Asset evidence and history; merged into `main` at `add1769563002a345946640cf8b6c8cdc8383824`.
- The merged PR records `composer ci:check`, Composer/npm audits, focused Playwright on mobile/tablet/desktop, and independent code/security review as passing with no actionable findings.
- Phase 5 begins from this merged commit. Work orders should retain canonical Asset references and must not reuse `MediaAsset` as an operational asset.
