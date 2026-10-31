# Phase 5 — Work-order management

Status: implementation complete; delivery checks and PR pending on `codex/work-order-management`, based on merged Phase 4 commit `add1769563002a345946640cf8b6c8cdc8383824`. Approved roadmap: `2026-10-22-fieldops-roadmap.md`.

## Goal and bounded acceptance

Deliver permission-controlled work-order list, detail, create, edit, cancellation, and record activation/deactivation. Use the existing `work_orders.*` permission catalog without granting permissions or adding assignment controls. Store a stable, normalized, unique reference; title, instructions, priority, due date; and either a canonical `Asset` reference or standalone location. Preserve existing asset and work-order history.

Included:

- Dedicated `WorkOrder` records with a database-unique reference normalized by trimming and uppercasing on create; the reference is immutable after creation and remains reserved after cancellation or deactivation. Never hard-delete work orders.
- Required title, bounded instructions, priority (`low`, `normal`, `high`, `urgent`), valid due date, and paired bounded coordinates. Past due dates remain valid so overdue work can be recorded accurately.
- A work order may reference a canonical `Asset`, or use a required human-readable standalone location label plus coordinates. New and changed asset selections must be active. If an unchanged historical asset is later inactive, edits may retain that same reference; attempts to switch a work order to an inactive asset fail. Snapshot asset code and name at target time so authorized work-order readers retain the original label without reading newly changed or inactive asset details.
- Coordinates are a target-time snapshot. On create or when the asset target changes, the server copies the selected active asset's coordinates when present; if that asset has no coordinates, manual paired coordinates remain required. Editing other fields while retaining the same asset preserves the existing snapshot, even if the asset has since moved. Manual coordinate entry is always available where needed, regardless of map availability.
- Two independent status concepts: operational `status` starts at `open` and may transition only `open -> cancelled`; record activation remains `record_status` (`active`/`inactive`) through the shared status action.
- Explicit cancellation route/action guarded by `work_orders.update`, row locking, current-state validation and audit. Cancelled is terminal in this phase. Ordinary create/edit payloads cannot set operational status. Do not implement assignment, in-progress/completion, inspection submission, review, or a generic status setter.
- Compare an integer work-order version under the row lock for field edits and cancellation; increment it on successful edits, cancellation, and record-status changes so stale forms fail safely instead of overwriting newer data.
- Inactive work-order list/detail is visible only with `work_orders.view_deleted`; record status changes require `work_orders.update_deleted`. Cancelled active work orders remain readable with `work_orders.view`. Editing/cancellation is limited to active, open work orders.
- Transactional create/update/cancel audit events with actor attribution and safe before/after data. Asset references and coordinate snapshots survive asset deactivation; work-order record status does not alter the operational cancellation state.
- Bounded, allowlisted list search/filter/sort/page size, safe Inertia props, shared IndexPage/DataTable/detail/form/status components, named routes and Wayfinder usage.

## Lifecycle and permission matrix

| Operation | Required permission | Allowed state |
| --- | --- | --- |
| List/detail active or cancelled work orders | `work_orders.view` | Any operational status; active record status by default |
| View inactive work-order records | `work_orders.view` and `work_orders.view_deleted` | Any operational status |
| Create | `work_orders.create` | Server creates as `open`, `record_status=active` |
| Edit fields | `work_orders.update` | Active record and operational status `open` |
| Cancel | `work_orders.update` | Active record and operational status `open` only |
| Activate/deactivate record | `work_orders.update_deleted` | Any operational status; independent of cancellation |

Only `open -> cancelled` is runnable. `cancelled -> open` is rejected. Assignment, execution and review states remain future-phase documentation, not accepted request values or transitions.

## Interfaces

- Named `work-orders.*` routes for index/create/store/show/edit/update/cancel/record-status.
- Add a built-in Work Orders navigation catalog entry gated by `work_orders.view`; do not change permission grants or protected-role selections.
- Create fields: `reference`, `title`, `instructions`, `priority`, `due_date`, nullable `asset_id`, standalone `location_label` when no asset is selected, and latitude/longitude. Edit omits reference and operational status and submits the current integer version.
- Inertia listing includes paginated serialized work orders, normalized filters, create/update/inactive capabilities, status and cancel URLs. Detail includes display-safe asset reference snapshots, coordinate snapshot, creator/updater summaries, version, independent status values, and `canCancel` only when the actor can update an active/open work order.
- Audit event names: `work_order.created`, `work_order.updated`, `work_order.cancelled`, and shared `work_order.activated`/`work_order.deactivated`. Do not log private credentials or expose raw model attributes.

## Verification criteria

- Unauthenticated and denied `view/create/update/update_deleted/view_deleted` requests; no permission grants or `work_orders.assign` routes/UI.
- Successful create/update/cancel and record-status audit attribution; duplicate normalized references including inactive/cancelled rows; database uniqueness under races; immutable reference.
- Required/length/priority/date validation, paired/ranged coordinates, standalone label requirements, asset existence/active-visibility rules, and inactive-asset retention on unrelated edits.
- Asset coordinate updates do not change captured work-order coordinates, including during unrelated work-order edits; changing the target snapshots the new asset's coordinates. Deactivated asset reference remains readable without converting it to `MediaAsset`.
- Forged operational status values rejected; explicit open-to-cancel succeeds once; cancelled/replayed/stale transitions fail without duplicate writes or audit rows; stale edits fail without overwriting newer values; ordinary edits cannot update cancelled/inactive work.
- Bounded pagination, safe search/filter/sort allowlists, inactive list/detail visibility and status capabilities.
- Frontend form/list/detail tests for labels, keyboard use, error/empty states, asset/manual coordinates, map-unavailable fallback, both themes and narrow/medium/wide layouts.
- Playwright create/edit/detail/cancel flow on mobile/tablet/desktop, light/dark, manual-coordinate fallback, overflow and Axe. Existing asset/evidence/history behavior remains covered.
- Before delivery, run `composer ci:check`, both dependency audits, focused relevant PHPUnit/Vitest/E2E, `git diff --check`, independent review, and inspect the complete diff. Do not push or open the PR if a required check is unresolved.

## Progress and decisions

- Verified branch/base: the clean dedicated worktree is `codex/work-order-management` at `origin/main` / Phase 4 merge `add1769563002a345946640cf8b6c8cdc8383824`.
- Verified Phase 4 PR #27 is merged. Its PR records Composer checks/audit, npm audit, three Playwright viewport projects, and independent code/security review as passing.
- Read `AGENTS.md`, the three project knowledge files, the approved roadmap, and Phase 3/4 briefs. Architecture and QA read-only mapping confirmed the existing permission catalog, `Asset` and audit/status patterns, shared UI, and test conventions.
- Decisions: immutable user-entered uppercase/trimmed reference; target-time asset code/name and coordinate snapshots retained beside the canonical asset FK; standalone label plus paired bounded coordinates; lifecycle is open to terminal cancelled only; cancelled and record-inactive are independent.
- Implementation: list/detail/create/edit/cancel and record activation/deactivation; asset or standalone locations; target snapshots; optimistic versions; bounded search/filter/sort; audit events; responsive light/dark React forms and tables. No assignment, inspection, completion workflow, export, or new role grants.
- Focused backend verification: `WorkOrderTest` passed all 8 tests and 216 assertions after the final audit and no-op update changes. Full standalone `php artisan test` passed 420 tests (416 passed, 4 skipped; 4,216 assertions).
- Frontend/static verification: `composer ci:check` passed ESLint, Prettier, TypeScript, 315 Vitest tests, production build, Pint, and PHPStan on the final implementation; the separate final ESLint/Prettier/TypeScript rerun also passed after the E2E selector adjustment. The most recent composite run failed only `BackupLifecycleTest::test_successful_recovery_keeps_history_and_releases_retained_packages` with its atomic metadata rename error. The full standalone PHPUnit rerun passed all 420 tests (416 passed, 4 skipped). Earlier composite runs showed different one-off backup/asset filesystem failures, each passing when isolated. Keep this native Windows filesystem flake visible until remote CI is observed.
- Browser verification: the work-order Playwright flow passed mobile, tablet, and desktop (3/3) against a fresh SQLite database seeded only with RBAC and E2E accounts. The initial run exposed test-only menu locator issues; keyboard selection and an explicit textbox role fixed them. The temporary server and database were removed after the successful run.
- Dependency audits: Composer audit found no advisories. `npm audit --audit-level=high` exited successfully with no high-severity findings; npm reported 15 moderate transitive `minimatch` advisories in the lint toolchain, with its suggested forced fix requiring a breaking downgrade. Lockfiles were not changed.
- Independent code review found and helped close the unchanged-edit audit gap: no-op submissions now preserve version, updater, and timestamps and emit no audit event. Security review found and helped close a guessable instruction-hash exposure: audit snapshots contain neither instruction text nor a hash, and mark only `instructions_changed` on changed text. Final read-only reviews confirmed these fixes and found no other actionable issues.
- Record the final composite CI result, remote checks, PR URL, merge commit, limitations, and Phase 6 prerequisites here after observed delivery. Do not start Phase 6.

## Delivery handoff

Pending. Do not start Phase 6 from this phase.
