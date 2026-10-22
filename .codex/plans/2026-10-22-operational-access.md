# Phase 1 — Operational access

Status: implementation and local verification complete; PR open, remote verification pending. Approved roadmap: `2026-10-22-fieldops-roadmap.md`.
Branch: `codex/operational-access`; base verified by fetch: `65fbc1b337e4360c967cb00426fa8ce7cc84d49a`.

## Goal and acceptance

Extend the existing permission catalog and role editor with optional Supervisor, Dispatcher, Technician and Viewer presets. Preserve protected User/Admin/Super Admin roles and existing user assignments. No automatic preset roles or grants. Existing role authorization, grant ceiling, validation, transactions and audit remain authoritative.

Presets replace only the local permission draft after explicit application; administrators can change individual selections and must save. Role identity and navigation stay intact. Protected role editors do not offer presets. No new routes, navigation destinations or export datasets are registered for future modules.

## Explicit permission matrix

Catalog resource namespaces: `assets`, `work_orders`, `inspection_templates`, `inspections`, `issues`. Each has `view`, `create`, `update`, `delete`, `view_deleted`, `update_deleted`, `export_pdf`, `export_csv`, `export_xlsx`, `export_print`. Additional actions: `work_orders.assign`, `inspections.submit`, `inspections.review`, `issues.resolve`. Read surfaces: `operations_map.view`, `operations_dashboard.view`, `operational_reports.view`; reports also has all four export actions.

| Preset | Exact allowed permissions |
| --- | --- |
| Supervisor | All operational catalog permissions listed above |
| Dispatcher | `assets.view`; `work_orders.view/create/update/assign`; `inspections.view`; `issues.view`; `operations_map.view`; `operations_dashboard.view` |
| Technician | `assets.view`; `work_orders.view`; `inspection_templates.view`; `inspections.view/create/update/submit`; `issues.view/create`; `operations_map.view` |
| Viewer | `view` on all eight operational namespaces |

Each preset additionally includes existing `dashboard.view`: successful login redirects to that current landing page. Slash notation expands to separate resource.action permissions. All unlisted permissions are denied by each preset. No access administration, file, or system-settings permissions are included. Existing Super Admin Gate bypass remains unchanged; its seeded permission list excludes new operational permissions so reseeding does not expand stored grants.

## Scope and security contract

These permissions prepare future modules; they do not activate endpoints. Presets do not enforce row scope. Later resource policies and listing/export/media queries must restrict technicians to their own assignments and prevent cross-assignment reads or writes. Operational status is distinct from record activation. Future status and export endpoints must follow existing shared actions and authorization conventions.

## Implementation and evidence

- Architecture and QA mapped current paths before backend/frontend delegation; independent scopes assigned.
- Catalog migration must add permissions only, clear permission cache, remain idempotent and preserve role/direct permission/user-role pivots.
- Local acceptance verified: exact matrix and denials; migration preservation; create/update authorization, grant ceiling and validation; custom/protected role behavior; frontend explicit application and draft submission; keyboard, both themes, three viewport browser checks. Remote checks and merge remain pending.
- Locked dependencies installed. Initial sandboxed installations hit filesystem/network restrictions; elevated installs resolved them. Workspace-only `PHP_INI_SCAN_DIR` enables the installed PDO SQLite driver, leaving Laragon configuration unchanged. Ignored local SQLite app is served at port 8011 for browser verification.
- `composer audit --locked --no-interaction`: exit 0, no vulnerability advisories. `npm audit --audit-level=high`: exit 0, zero vulnerabilities.
- `npm run test:unit -- --run tests/Frontend/access.test.tsx`: exit 0, 33 tests passed. Changed PHP files formatted with Pint successfully. First backend run failed due to missing SQLite driver; second reached 5 passing tests, two page-test failures from missing build manifest. Full CI builds the manifest before rerunning backend tests.
- Independent read-only review approved after fixes: dashboard landing permission included explicitly; migration insertion/preservation assertions include customized protected grants and direct user grants. Runtime verification remains required.
- Operational backend tests now pass: 7 tests, 370 assertions. Initial full CI reached 299 passing frontend tests, successful build/Pint/PHPStan (zero errors), then Laravel reported 381 passed, 4 skipped and one export test with the obsolete assumption that protected Super Admin receives every catalog key. Updated that test to require existing export permissions and deny implicit operational grants; focused export test passes (5 assertions). Full gate rerun pending.
- First relevant browser run completed all six scenarios but needed one retry because its login overlapped the CI asset rebuild. Repeating with `--retries=0` after builds. Mobile dark and desktop light screenshots visually inspected; controls fit and use the existing theme.
- Final relevant browser run: `E2E_BASE_URL=http://127.0.0.1:8011 npm run test:e2e -- tests/e2e/access.spec.ts -g 'operational preset|role navigation checklist' --retries=0`: exit 0, all 6 passed in 1.3 minutes, mobile/tablet/desktop, light/dark, keyboard and overflow. Entire unrelated browser suite was not run.
- Final `composer ci:check`: exit 0; ESLint, Prettier, TypeScript, 39 Vitest files / 299 tests, production build, Pint, PHPStan (zero errors), Laravel 382 passed / 4 skipped / 3621 assertions. Skips are the opt-in real-engine backup integration tests requiring disposable MySQL/MariaDB credentials and native clients. A temporary screenshot script initially tripped lint during the rerun; removed it before this successful full gate. No application changes followed final validation.

## Delivery handoff

PR: https://github.com/LeoOdaya117/fieldOps/pull/23 — Operational access, `codex/operational-access` into `main`. Implementation commit: `fed0968da3b483be2f7e672c182389a8574b8514`. GitHub connector creation returned 403 (integration permission); authenticated GitHub CLI created the PR and it is attached to this chat. Independent review approved; remote CI and merged commit are pending. Main has no branch protection configured; do not bypass workflow checks.

Do not start Phase 2 or archive this worktree until Phase 1 is merged. Phase 2 starts from the resulting main and must inspect actual shared-hosting constraints. Remaining limitations: own-assignment policies belong to later resource phases; full unrelated browser suite and optional real-engine backup tests were not run. No new application dependencies or generated files are committed.
