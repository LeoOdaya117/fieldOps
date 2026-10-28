# FieldOps Roadmap — One Phase, One Worktree, One Chat, One PR

Approved 2026-10-22. Status: Phase 1 merged; Phase 2 development and verification underway (updated 2026-10-28).

## Delivery contract

Each phase has a dedicated `codex/<slug>` branch, managed worktree, Codex chat, and PR. Start from latest merged main. Finish, verify, review and merge a phase before starting its successor. Keep backend, frontend, migrations, tests and documentation together. No parallel implementation. After merge preserve the handoff, archive the managed worktree and phase chat. Never archive unfinished work.

The phase chat must record its PR URL, merged commit when available, observed checks, changed contracts, known limitations and next-phase prerequisites. Phase-specific briefs belong in new dated files under `.codex/plans/`. Do not claim completion without observed acceptance evidence. Do not modify existing protected roles for operational presets.

## Sequence

| Phase | Chat/PR title | Branch slug | Deliverables and acceptance |
| --- | --- | --- | --- |
| 1 | Operational access | operational-access | Permission catalog and custom-role presets for Supervisor, Dispatcher, Technician and Viewer; allowed/denied authorization tests; preserve protected roles. |
| 2 | Shared-hosting readiness | hosting-readiness | PHP, cron/database queues, private storage, upload limits and backup-runner compatibility; resolve hosting blockers. |
| 3 | Asset directory | asset-directory | Unique codes, categories, condition, coordinates, search/filter/detail and authorized maintenance. |
| 4 | Asset evidence and history | asset-evidence-history | Private media, activity history, record status and preserved historical references. |
| 5 | Work-order management | work-order-management | Asset or standalone location, priority, due date, instructions and server-validated lifecycle. |
| 6 | Assignment and dispatch | assignment-dispatch | Assignment/reassignment, notifications, own assignments and restricted technician scope. |
| 7 | Inspection templates | inspection-templates | Reusable checklist/measurement templates with historical version preservation. |
| 8 | Inspection execution | inspection-execution | Drafts, answers, measurements, notes, photos, signatures and validated submission. |
| 9 | Inspection review | inspection-review | Approval, return for correction, history and approved completion without losing evidence. |
| 10 | Issue reporting | issue-reporting | Type, severity, location, photos and optional asset/work-order links; standalone or inspection reporting. |
| 11 | Corrective work | corrective-work | Triage, linked corrective orders and evidence-backed resolution/history. |
| 12 | Operations map | operations-map | Reuse web map for assets/orders/issues, filters/search and permission-scoped links. |
| 13 | Operational dashboard | operational-dashboard | Replace sample metrics with real workload, completion, overdue and issue data; polling and empty states. |
| 14 | Operational reports | operational-reports | Existing export infrastructure extended with matching filters/authorization. |
| 15 | Mobile API | mobile-api | Versioned /api/v1, authentication, shared actions, identifiers, versions, retry-safe mutations and private evidence. |
| 16 | Mobile assignments | mobile-assignments | Ionic/Capacitor login, assignments, asset details/history; physical Android verification. |
| 17 | Mobile job execution | mobile-job-execution | Online inspections, camera, signatures, GPS evidence and submission reaching web review. |
| 18 | Mobile map and issues | mobile-map-issues | Job map, GPS, external navigation, issue reporting, GPS failures/overrides and offline-map feasibility. |
| 19 | Server synchronization | server-synchronization | Incremental sync, idempotency, conflicts and retryable evidence; offline reassignment/cancellation tests. |
| 20 | Mobile offline workflow | mobile-offline-workflow | SQLite, outbox/retries, conflicts, sync UI and account isolation; airplane-mode/restart survival. |
| 21 | Offline maps | offline-maps | Download/update/remove one operational area; offline jobs/GPS and clear missing-package fallback. |
| 22 | Pilot and release | pilot-release | Full workflow, interrupted uploads/sync, hosting/recovery rehearsal, demo data and operating docs. |

Phases 16–18 and 20–21 belong exclusively to a separate mobile repository; all other phases belong to this Laravel repository. Identify the actual mobile repository before phase 16; do not assume one exists. Each PR modifies one repository only.

## Release gates and architecture

- Web operations release: phases 1–14 merged.
- Online Android pilot: phases 15–18 merged.
- Offline MVP: phases 19–22 merged.
- One Laravel/Inertia deployment, MySQL/database queues, shared private media/notifications/exports and a separate Android-first Ionic app. Existing web Mapbox component is reused. Operational state remains distinct from record activation state.
- Freeze initial API contract in phase 15. Merge server sync contracts in phase 19 before mobile consumes them. Server cancellation/reassignment must surface as conflicts, never silently overwrite offline work.
- Planning estimate: 365–565 development hours plus 20–25% contingency; refine after hosting/mobile feasibility. No calendar commitments.

## Verification and exclusions

Each PR includes success, authorization, validation, persistence and failure coverage. UI requires keyboard, light/dark and mobile/tablet/desktop checks. Run the repository-required CI and dependency audits before pushing/submitting; report observed results and blockers. Include negative authorization tests. Critical acceptance covers repeated submissions, interrupted photos, missing/inaccurate GPS with reasoned overrides, rejected-inspection corrections, revoked sync/media access and account-isolated durable offline records.

Defer AI summaries, route optimization, billing, advanced analytics, push notifications and continuous background tracking.

## Progress

- Phase 1 merged as PR #23 at `5ad3578a821d347a470263423cf862eae86d9e8f`; Phase 2 starts from that fetched main in its dedicated branch/worktree.
- Actual shared-hosting constraints and mobile repository remain unverified; synchronization, offline map compatibility and hosting process limits are primary risks. User deferred provider verification until deployment on 2026-10-28; Phase 2 development/PR delivery proceeds first. See `2026-10-22-shared-hosting-readiness.md` and `docs/shared-hosting.md` for observed checks and deferred deployment checklist.
