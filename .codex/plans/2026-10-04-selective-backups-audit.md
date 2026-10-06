# Selected-table backups and backup audit workspace

Status: implemented and locally verified. Exact MySQL 8.4/MariaDB 11.4 and Docker image release verification remain pending; this is not deployment sign-off.

## Goal and approved behavior

Extend the existing database recovery feature with selected-table backup and restore, immutable creator/time/table metadata, an audit note, and dedicated inventory/detail/audit pages using the existing IndexPage/DataTable design. The user explicitly confirmed restoring selected tables including required related tables.

## Safe scope contract

- Full database backup remains the default. Selected mode accepts a bounded nonempty list of existing base tables and expands the entire bidirectional foreign-key connected component, including known repository logical user/polymorphic/session/reset-token dependencies. The create and restore UI shows requested versus automatically included tables.
- A selected-table package restores its entire recorded selection. Arbitrary subsets of full or legacy SQL streams are unsupported; SQL is never parsed to extract tables.
- Version 2 signed manifests contain scope, requested/resolved table names, creator snapshot and audit note. Existing version 1 packages stay valid as full-database backups, with unknown creator/table inventory labeled honestly.
- Selected dumps include table schema/data. Selected mode fails closed for selected-table triggers, views referencing selected tables, and stored routines/events whose dependencies cannot be reliably inferred; use full mode for those databases. Unrelated views are preserved during selected restore. Full backups retain existing global-object behavior. Recheck selection against live relationships before replacement and after writer drain; reject new dependencies absent from the package. Verify foreign-key row integrity after import.
- Partial restore still requires maintenance, password/database-name confirmation, stopped writers, a verified full safety backup, session/job/cache invalidation, and external operation/audit history. Destructive failures retain maintenance and require explicit recovery. Related logical edges are repository-specific; arbitrary unconstrained/custom relationships require deployment review.

## Metadata and audit

- Preserve signed original creator separately from the local uploader/importer; CLI and system/safety identities are explicit snapshots. Never resolve historical actor identity from restored users.
- External append-only audit records cover request, completion/failure/interruption, upload, download, deletion, restoration and recovery. Records retain backup/operation IDs, scope, requested/included tables, timestamps, actor and audit note after backup deletion or database replacement.
- Generated IDs/private paths/signing remain unchanged. Legacy metadata is normalized read-only; never fabricate old creator/table information.

## Interface and implementation ownership

- Named authenticated/Super Admin routes remain under `/settings/system/backups`: inventory, create page, detail, audit, table catalog/status and existing mutations. Preserve confirmation/throttling/CSRF and safe errors.
- Inventory and audit use validated filesystem search/filter/sort/pagination, with standard pagination props. Inventory columns: backup/time/creator/scope/table count/size/actions. Detail displays included tables, creator/uploader, audit note, safety status and filtered audit trail. Create page holds readiness and full/selected-table controls; technical prerequisites do not dominate the inventory.
- Parent owns signed package/storage/runner integration, corresponding package/lifecycle tests, documentation and durable knowledge. Backend specialist owns engine/table scope, controllers/requests/CLI/routes and backend scope/HTTP/command/integration tests. Frontend specialist owns backup page/components/types, navigation and frontend/browser tests. Architecture and QA map/review read-only first.

## Verification and release boundaries

- PHPUnit: graph closure/cycles/composite/self-FKs/unknown identifiers, signed scope tampering/legacy compatibility, scoped dispatch/unrelated data preservation, actor provenance/audit persistence, filters/pagination/authorization and safety/recovery paths.
- Native disposable engine rehearsal includes selected data/schema, unchanged unrelated objects, complex-object selection rejection, new inbound dependency rejection, FK integrity, and full safety recovery after partial failure.
- Vitest/Playwright: selection/dependency preview, inventory/detail/audit navigation, confirmations, search/pagination, busy/error states, keyboard/accessibility and mobile/tablet/desktop light/dark presentation.
- Run required CI/audits/build and record only observed results. Existing exact MySQL 8.4/MariaDB 11.4 and Docker image release checks remain pending locally until those runtimes are available.

## Progress

- 2026-10-04: reviewed existing recovery safeguards, incumbent IndexPage/DataTable/access-audit patterns and screenshot. Architecture/QA reviewed scope contracts before implementation; official native-dump documentation confirms named table dumps and consistent-snapshot requirements.
- 2026-10-04: implemented bidirectional foreign-key and registered logical-table expansion; v2 signed selection/creator/audit metadata; full safety backups; full-package-only CLI recovery; persistent filtered backup/audit pages; and selected-table create/restore confirmations.
- 2026-10-04: `composer ci:check` passed (340 backend tests, 251 frontend tests; 4 opt-in engine tests skipped). PHPStan and Pint passed; Composer audit found no advisories; npm's high-severity threshold passed with 3 existing moderate Vitest advisories. Disposable MySQL 8.0.30 rehearsal passed 4 tests/80 assertions, including selected schema/data restore, unrelated object preservation, changed-dependency preflight and full safety recovery after partial-import verification failure. Browser rehearsal passed 7 tests/2 expected non-desktop runner skips, including Axe and mobile/tablet/desktop light/dark checks. The final heading-level edits passed 15 focused Vitest tests, TypeScript, Prettier and ESLint. Exact MySQL 8.4/MariaDB 11.4 and Docker image release checks remain pending.
