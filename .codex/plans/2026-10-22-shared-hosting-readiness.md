# Phase 2 — Shared-hosting readiness

Status: repository implementation, independent review and local verification complete; PR delivery underway. Provider deployment verification is deferred by the user (2026-10-28); it does not block repository development/PR delivery. Roadmap: `2026-10-22-fieldops-roadmap.md`. Branch: `codex/hosting-readiness`.

## Goal and acceptance criteria

Keep one Laravel/Inertia deployment on MySQL with database queues; no required Redis/Horizon, VPS or persistent daemon. Verify/document actual runtime/extensions, cron, private storage/serving, upload/image/report limits and independent backup-runner compatibility. Resolve locally reproducible blockers minimally while preserving signatures, writer leases, safety snapshots, failure behavior and authentication epoch. No destructive restore or real-host/database access without target authorization. Phase 3 and operational modules are excluded.

1. Repository-grounded requirements/preflight matrix distinguishes verified code facts from operator/provider verification.
2. Concrete deployment and cron commands include overlap and timeout/resource constraints without assuming shell/process/binary/symlink/host privileges.
3. Private storage/media/report retention and upload/PHP/proxy bound alignment are explicit.
4. Existing runner supports finite cron invocation or receives a minimal tested adaptation; unsupported native backup capabilities remain explicit and safely unavailable.
5. Required checks pass before push/PR; independent review as warranted; one PR titled `Shared-hosting readiness` into main. Merge only after green required checks and review without bypass.
6. Handoff records PR/commit/checks/limitations and Phase 3 prerequisites. Production suitability remains unverified; user requested development first. Do not start Phase 3 here.

## Base and inspected scope

Fetched origin/main and verified HEAD/origin/main both equal Phase 1 merge `5ad3578a821d347a470263423cf862eae86d9e8f` before edits; re-fetched on resume with same result. Selected existing authorized branch in dedicated managed worktree. Read AGENTS, all three knowledge files, roadmap and Phase 1 brief/handoff. Phase 1 pending-merge wording is historical, superseded by observed main ancestry.

Inspected Composer/lock/CI, environment/config, console schedules, backup commands/store/engine/leases/HTTP prerequisites and lifecycle tests, media processing/limits, export dispatch/generator/writer/prune and operator guides. No schema or operational-module changes needed; the audit-required transitive development lock update is recorded below.

## Implementation

- `docs/shared-hosting.md`: conditional cPanel requirements matrix, deployment/cron commands, overlap/runtime budgets, storage/retention, upload alignment and provider checklist; linked from README and backup guide.
- Existing `backups:work --once` processes at most one operation with independent runner flock. Existing tests cover empty/failure, overlap/interruption, signatures, writer drain, safety snapshots and auth epoch. Count-bounded is not wall-clock-bounded; documented complete recovery windows remain required for deployment.
- Optional `BACKUP_RUNNER_HEARTBEAT_TTL` permits cron cadence plus jitter; supervised default stays 15 seconds, minute-cron example uses 120. Missing/stale heartbeat remains unavailable. Test covers absent/fresh/expired/extended and negative setting. Prerequisite copy now names cron and recent availability. No UI layout or interaction change.
- Native capability checks and safe failures remain authoritative; path checks/heartbeat cannot certify dump/restore ability. No native capability bypass, alternate unsigned backup or new runner framework.

## Observed verification

- Initial `composer audit --locked --no-interaction`: exit 0, no vulnerability advisories.
- Initial `npm audit --audit-level=high`: exit 0, zero vulnerabilities.
- Initial CI ran before dependency installation finished and failed because eslint was unavailable; not counted as passing evidence. Dependencies installed; final full CI passed as recorded below.
- Local PHP 8.3.33 has GD/Intl/ZIP/MySQL/XML modules. Workspace-only ignored PHP_INI_SCAN_DIR enables installed PDO SQLite without changing Laragon. Ignored local .env targets SQLite memory, not a real database.
- Earlier independent reviewer could not run due account usage limit; resumed review approved with no actionable findings. Automatic approval review also could not run when saving this brief because of that limit; no safety rejection was issued, and no workaround bypass was used.

## Deployment evidence and deferred work

No provider/plan supplied. Asked for PHP/extensions, cron/runtime, process/native-client, root/symlink and privilege specifications. User replied to focus on development first; provider checklist is deferred to deployment, not a code-delivery blocker. No real host/database touched and no destructive restore executed. Opt-in native integration requires explicitly authorized disposable engine credentials/clients.

## Delivery handoff

PR: https://github.com/LeoOdaya117/fieldOps/pull/25 — Shared-hosting readiness, codex/hosting-readiness into main. Implementation commit: `979f7dc29626b153e8cd8042390621152406bb2b`. Local full gate and independent review passed. Remote workflow checks and merge remain pending. GitHub connector returned 403 for PR creation; authenticated GitHub CLI created the PR and it is attached to this chat. Phase 3 prerequisites: Phase 2 merged/reviewed, reuse documented MySQL/database queue/private storage contracts; settle deferred host capacity and recovery capabilities before production deployment. No Phase 3 implementation here. Archive only after merge and handoff preserved.

### Validation follow-up (2026-10-28)

- Dependency installation completed. Production build generated ignored Wayfinder routes successfully (exit 0); initial full CI then failed on 32 import-order errors caused by absent generated route/action files in the fresh checkout. No frontend source reordering was needed; full gate rerunning after generation.
- `php artisan test --filter=BackupCommandTest`: exit 0, 15 tests / 73 assertions.
- `composer check-platform-reqs --no-dev`: exit 0 under local PHP 8.3.33.
- Refreshed Composer audit: exit 0. Refreshed npm audit initially failed with high-severity GHSA-mrhx-c7xc-m3w5 in transitive dev-only Zod 4.4.3; targeted compatible lock update to 4.6.7, then audit exit 0 / zero vulnerabilities. No new dependency or manifest change.
- Added finite database-queue integration test using real serialized export jobs: successful private report and permission revoked after enqueue. SQLite and fake private storage verify application semantics, not MySQL/provider timing/capacity. Resource limit disabled only inside the PHPUnit worker to avoid confusing test-process memory with deployment capacity.
- Independent read-only review approved implementation/runbook, targeted lock update and queue integration test with no actionable findings; execution and provider verification remain separately reported.

- Finite database-queue integration: `php artisan test --filter=finite_database_worker` exit 0, 1 test / 10 assertions. The worker drains actual database jobs and exits; revoked access becomes a handled failed artifact and notification without output bytes or failed queue rows.

### Final local gate

- `composer ci:check`: exit 0; ESLint, Prettier, TypeScript, 39 Vitest files / 299 tests, production build, Pint, PHPStan (zero errors), Laravel 384 passed / 4 skipped / 3637 assertions. The four skips are the opt-in real-engine backup integration scenarios; no authorized disposable native server was supplied.
- `composer audit --locked --no-interaction` and `npm audit --audit-level=high`: exit 0; no Composer advisories / zero npm vulnerabilities after the targeted Zod patch.
- `git diff --check`: exit 0. No application/config/test/dependency changes after this gate. No new layout or critical browser flow, so Playwright was not run. Provider capacity, PHP/web parity and real-engine recovery rehearsal are deferred deployment checks, not claimed as verified.
