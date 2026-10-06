# Database backup and restore

Active, verified Super Admins can use **System Settings → Backup & Restore**. Backups contain the configured database schema and data, including users, roles, settings, migrations, views, triggers, routines and events. They do not contain uploaded files, `.env`, application code, database accounts/grants or encryption keys.

The dedicated **Backup & Restore** inventory follows the same searchable, sortable and paginated table layout as other system directories. It shows creation time, immutable creator name, full/selected scope, included tables, package size and source. Each package has a details page with the requested and automatically included tables, its audit note, original creator and local uploader, and its audit history. The separate **Backup audit** page retains timestamped request, completion, failure, interruption, upload, download and deletion records even after a package is deleted or the database is restored. Historical actors are snapshots; a restored or renamed user cannot change past attribution. CLI operations are explicitly attributed to a CLI operator and safety snapshots to the backup runner.

Full database backup remains the default for recovery. **Selected tables** mode backs up the complete selected dependency group and restores that entire recorded group; it does not extract arbitrary tables from an existing full-database SQL stream. The form and restore confirmation show the requested tables separately from required related tables. Dependencies include both parent and child foreign keys plus FieldOps' known logical links between users, polymorphic RBAC/notifications, sessions and password reset records. For example, Countries' creator/updater links can expand its selection to most user-related business tables.

Selected scope fails closed when a selected table has triggers, a view references it, or the database has stored routines/events whose dependencies cannot be safely inferred. MariaDB does not expose the same view dependency catalog, so selected scope requires a database without views there. Use a full database package for these cases. Unrelated MySQL views remain intact during selected restore. Custom relationships without foreign keys or the registered FieldOps logical links require deployment review; the feature does not parse arbitrary SQL/program bodies to infer dependencies. All restores still clear runtime sessions/jobs/cache and rotate remember tokens, including selected-table restores.

## Configure before use

1. Set `BACKUP_SIGNING_KEY` to a dedicated random secret of at least 32 characters. Generate one locally with `php -r "echo bin2hex(random_bytes(32));"`, then store it securely in the environment. Preserve it separately together with the original `APP_KEY`, deployment code and file storage. A downloaded package is signed, **not encrypted**, and contains sensitive database data. Only packages signed with the configured key can be imported.
2. Use a private local directory for `BACKUP_ROOT` (default `storage/app/backups`). Never place it under `public`, expose it through `storage:link`, share it with other applications, or put it on a network filesystem. Keep it separate from the configured file-session directory and file-cache data/lock directories because restore clears those runtime locations. Restore preflight rejects equal or nested paths before replacing the database. Backups, operation metadata, locks and the authentication generation must survive database replacement and deployments. Windows deployments must restrict the directory ACL to the application/runner account and recovery operators; Unix files use owner-only permissions. Back up this directory separately.
3. Set `BACKUP_MYSQL_DUMP` and `BACKUP_MYSQL_CLIENT` to the absolute Laragon `mysqldump.exe` and `mysql.exe` paths. For MariaDB use `BACKUP_MARIADB_DUMP` and `BACKUP_MARIADB_CLIENT`. Use genuine engine-matched clients, not MySQL aliases that execute MariaDB tools. Docker provides the official MySQL 8.4 clients and MariaDB clients separately; build-time version checks verify they execute.
4. Give the application database account privileges only on its configured schema. Backup requires SELECT, SHOW VIEW, TRIGGER and privileges to inspect/dump routines and events; restore additionally needs CREATE, ALTER, DROP, INSERT and privileges to recreate those objects. MySQL routine visibility can require deployment-specific privileges; have a DBA validate the dump against the target server. Do not use an account with unrelated schema access, FILE or server administration privileges. Consult the [MySQL dump privilege requirements](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html).
5. All base tables must use InnoDB. Do not deploy migrations or change schema while a backup or restore is running. Restore requires matching database engine family, server major version and exact migration file contents; migrations must be fully applied. Cross-version/cross-engine conversion and migration of historical schemas are unsupported.
6. Restore supports isolated file/database/array cache, file/database/array/cookie sessions and sync/database/null queues. Queue batch/failure storage must use the application database; separate connections and external/shared runtime stores are rejected. Runtime table names must be simple identifiers for dedicated session/queue/cache tables.
7. Match HTTP limits to `BACKUP_UPLOAD_MAX_BYTES` (default 512 MiB). Docker sets `upload_max_filesize=512M` and `post_max_size=520M`; configure Laragon PHP and any reverse proxy equivalently. The expanded SQL cap defaults to 5 GiB. Allow sufficient free disk for source, staged SQL, safety dump and package compression. Adjust process timeout and drain timeout through the documented `BACKUP_*` variables in `.env.example`.

## Supervise the independent runner

Run `php artisan backups:work` as a supervised background process under the same OS account/storage permissions as the web application. On Windows, use a service wrapper or Task Scheduler with working directory set to the repository, restart on failure, and hidden/background execution. Restart it after deployments. Docker Compose includes a `backups` service sharing the application storage volume and database configuration; use `docker compose up -d --build` after setting the signing key.

The filesystem queue does not depend on `QUEUE_CONNECTION`. `backups:work --once` processes at most one operation and returns failure if that operation fails. Only one operation can be queued/running; interrupted operations are recorded and never automatically retried. Operation history persists separately from the database. For web-created backups, the runner sends the creator one durable notification when the operation succeeds, fails, or is later marked interrupted. Opening or refreshing that creator's notification inbox reconciles any missing terminal-operation notices, so a missed worker delivery does not leave the inbox stale. While a backup page is open, status polling also shows a one-time completion toast and refreshes the notification badge. CLI-created backups have no web recipient.

Manual backups are retained until deleted. Downloaded `.fieldops` files are ZIP containers with exactly `manifest.json` and `payload.sql.gz`; arbitrary SQL, modified packages, extra entries and incompatible packages are rejected. Version 2 signs the scope, requested/included tables, dependency graph, original creator and audit note along with the payload hashes. Existing version 1 packages remain full-database packages and display unknown creator/table inventory rather than invented historical details. Uploads accept `.fieldops` or `.zip` packages produced by FieldOps and retain the original signed creator separately from the local uploader.

```powershell
php artisan backups:create
php artisan backups:create --table=countries --note="Before updating reference data"
php artisan backups:list
php artisan backups:delete <backup-id>
php artisan backups:restore <backup-id-or-package-path>
```

The restore command asks for the effective configured database name, including `DB_URL` overrides. For unattended restore use `--database=<exact-database-name>`. The browser also requires recent password confirmation and the same typed database name. A restore replaces current users/roles/settings, takes the site offline, and requires everyone to sign in again.

## Maintenance coordination

Before requesting restore, stop long-running queue workers, scheduler services, deployment/migration processes, external database clients and any other writers. Prevent supervisors from restarting them during the window. A filesystem writer lease covers HTTP requests including deferred termination work and ordinary Artisan commands; restore waits for existing leases and rejects new requests before database-dependent middleware. Long-running `queue:work`/`schedule:work` processes must be stopped, or the drain times out before replacement. Multi-host and long-lived web runtimes such as Octane are unsupported.

A DBA must stop the MySQL/MariaDB event scheduler (`event_scheduler=OFF`) and allow already-running events to finish before restore. Restore checks the scheduler setting and fails closed if it is ON. The Docker database starts with the scheduler OFF. Replication, external writers and already-running database event executions cannot be drained by Laravel's filesystem locks: stop them and verify they have finished. Do not re-enable database events until the restored application has been reviewed.

After drain, the runner creates and verifies a **full** safety backup, then replaces all database objects for a full package or only the recorded tables for a selected package. A changed dependency that requires tables absent from the package aborts before replacement. It validates migrations/required tables/Super Admin access and foreign-key row integrity, discards restored runtime jobs/sessions/cache, rotates the persistent login generation and remember tokens, records restore audit, and then reopens the application. It never runs migrations automatically. Introducing the persistent generation also requires existing users to sign in once after deploying this feature.

## Failed or interrupted restore

If replacement or verification fails, maintenance stays active. Do **not** run `artisan up`, delete the maintenance marker, delete source/safety packages, or restart application writers. MySQL DDL is not transactionally rolled back.

Stop the backup runner before inline recovery so it cannot claim the operation concurrently. Use `backups:list` to identify the safety backup; external operation JSON records under `BACKUP_ROOT/operations` include `safety_backup_id`, status and safe errors. Restore it explicitly:

If the runner was forcibly killed or the host crashed, confirm that its old native dump/import client has stopped and that no database import query remains active before recovery. PHP filesystem locks cannot prove that an orphaned child process or server query has finished. Stop the orphaned process and have a DBA verify the disposable/application schema is idle; do not start a second import concurrently.

```powershell
php artisan backups:restore <safety-backup-id> --recovery --database=<exact-database-name>
```

Recovery requires a **full database package**, an existing backup maintenance marker and the same trusted signing key, engine/version and deployed migration files. Selected-table packages cannot be used with `--recovery`; use the retained full safety package to restore the entire pre-operation database. Recovery allows a damaged/missing current migration table and skips taking another safety dump of a potentially partial database; the original source and safety packages stay available. Success releases retained recovery protection, restores access, and requires fresh login. A failed recovery leaves maintenance active. Restart the independent runner and other writers only after verification succeeds.

If database authentication/server availability is broken, repair that prerequisite before using recovery commands. If local backup storage is unavailable, restore it (including the authentication generation) first. Keep original `APP_KEY` when restoring encrypted application values.

## Disposable verification

The regular PHPUnit tests use SQLite and fake native operations. Real-engine integration is explicit opt-in, creates a randomly named `fieldops_backup_test_*` schema and removes only that schema. Use a disposable server with the event scheduler OFF; credentials must allow creating/dropping its test schema. Never point it at a shared production server.

```powershell
$env:BACKUP_INTEGRATION = '1'
$env:BACKUP_TEST_ENGINE = 'mysql' # or mariadb
$env:BACKUP_TEST_HOST = '127.0.0.1'
$env:BACKUP_TEST_PORT = '3306'
$env:BACKUP_TEST_USERNAME = '<disposable-server-user>'
$env:BACKUP_TEST_PASSWORD = '<disposable-server-password>'
$env:BACKUP_TEST_SERVER_MAJOR = '8' # 11 for MariaDB 11.4
$env:BACKUP_TEST_MYSQL_DUMP = '<absolute-mysqldump-path>'
$env:BACKUP_TEST_MYSQL_CLIENT = '<absolute-mysql-path>'
# MariaDB equivalents: BACKUP_TEST_MARIADB_DUMP / BACKUP_TEST_MARIADB_CLIENT.
php vendor/bin/phpunit --filter=DatabaseBackupIntegrationTest
```

Run this against MySQL 8.4 and MariaDB 11.4 before release. Browser tests default to read-only UI/access checks. `E2E_BACKUPS_RUNNER=1` enables backup creation/download/delete on an isolated configured application with a running backup worker; it tests restore confirmation without submitting destructive replacement. CLI/lifecycle tests cover actual recovery semantics.

`.github/workflows/database-backups.yml` runs the disposable round trip against both engines, builds the application image/native clients, and exercises CLI recovery from a missing migration table while maintenance remains active. It also verifies retained safety packages, external operation history, runtime cleanup, and removal of additional current objects.

### Original full-database rehearsal — 2026-10-04

An isolated MySQL 8.0.30 server passed the native CLI restore/recovery rehearsal (27 assertions), including the safety package, schema objects, Unicode/binary data, inactive records, extra-table removal, session/job cleanup, persistent operation history and recovery with the migration table missing. A supervised-runner browser rehearsal passed creation, download, signed reupload, identical downloaded bytes, deletion and guarded restore confirmation. Read-only browser checks also passed on mobile, tablet and desktop in both themes with no accessibility violations.

The original implementation's repository CI passed with 302 backend tests and 247 frontend tests; the real-engine test is intentionally skipped in the default suite. MySQL 8.4/MariaDB 11.4 matrix executions and the Docker image build remain required before release because those servers and a running Docker daemon were unavailable locally. The npm high-severity audit threshold passed, with three existing moderate Vitest-related advisories still reported.

### Selected-table extension rehearsal — 2026-10-04

The completed local `composer ci:check` passed with 340 backend tests and 251 frontend tests; four opt-in engine tests were skipped by the default suite. PHPStan, Pint, ESLint, Prettier, TypeScript and the production build passed. Composer audit found no advisories; npm's high-severity threshold passed with the same three existing moderate Vitest-related advisories.

A disposable MySQL 8.0.30 rehearsal passed all four real-engine tests (80 assertions): selected schema/data restoration preserved unrelated tables/views, a new inbound foreign-key dependency was rejected before replacement, complex scoped objects were rejected, and an invalid partial import retained maintenance and recovered through the full safety package. Playwright passed seven browser cases with two expected runner skips on non-desktop projects, covering authorization, selected-table create/upload/download, restore confirmation, audit retention, Axe checks, and mobile, tablet and desktop light/dark screenshots. The final heading-level fix passed all 15 focused backup UI tests and final lint, formatting and type checks.

MySQL 8.4/MariaDB 11.4 matrix execution and the Docker image build remain required before release because those exact runtimes and a Docker daemon were unavailable locally.
