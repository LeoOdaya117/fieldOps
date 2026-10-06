# Database Backup and Restore

Status: implemented and locally verified. Exact-version MySQL 8.4/MariaDB 11.4 and Docker release verification remain pending; the complete release acceptance criteria are not yet signed off.

## Approved goal and success criteria

Add a Backup & Restore page under System Settings for active, verified Super Admins, and CLI recovery commands. Support manual MySQL/MariaDB backup creation, private downloads, deletion, and restoration of saved or uploaded FieldOps packages. Restore replaces the configured database during maintenance. No scheduled backups, automatic retention, SQLite, arbitrary SQL uploads, cross-engine migration, cloud storage, or uploaded-file backup.

## Approved implementation

- Store signed packages, atomic metadata, operation history, and single-host locks on private local storage outside the restored database. Use opaque generated IDs and restrictive permissions.
- Use a supervised independent `backups:work` filesystem runner rather than the application database queue or HTTP execution. Persist queued, running, succeeded, failed, and interrupted operations; never retry restore automatically.
- Use native engine-matched dump/import clients through argument-array processes and temporary protected credential files, configured for Laragon and Docker. Stream consistent InnoDB schema/data dumps including views, triggers, routines, events, and migrations; reject other table engines and pause schema changes.
- Packages contain compressed SQL and a versioned signed manifest with engine/server version, exact migration fingerprint, timestamp, payload size, and checksum. Use a dedicated preserved deployment signing key; signing provides integrity, not encryption. Publish only verified successful packages and clean temporary files on failures.
- Only accept authenticated FieldOps packages. Default upload cap 512 MiB and expanded SQL cap 5 GiB, configurable. Reject traversal, extra entries, corruption, incompatible engine/server major versions and migration fingerprints.
- Restore requires password confirmation and typed database name. Quiesce requests, workers and scheduled writers; create a verified safety backup before replacement. Abort before destructive work if quiescence or safety backup fails.
- Remove all current database objects and import without automatically migrating. Validate required tables, migration fingerprint, connection and active Super Admin; clear runtime jobs/cache/sessions and rotate session versions and remember tokens. Persist audit outside the database and append safe audit after success.
- Keep maintenance enabled on destructive failure, retain source/safety packages, and expose explicit CLI safety-backup recovery rather than promising DDL rollback.
- Named `/settings/system/backups` routes cover list/create/upload/download/delete/restore/status with explicit role checks, authentication, verification, CSRF, password confirmation and throttling. Props contain only safe IDs/metadata/status/errors.
- Use Wayfinder/Inertia, shared semantic UI, polling, prerequisites, history, accessible confirmations and mobile/tablet/desktop light/dark states. Commands: `backups:create`, `backups:list`, `backups:restore <id-or-package>`, `backups:delete <id>`, `backups:work`; CLI restore confirms database name.

## Required verification

- PHPUnit authorization, confirmation, throttling, validation, integrity/compatibility, locking, private downloads and failure paths.
- Real MySQL 8.4/MariaDB 11.4 round-trip rehearsal including changed schema/data, relationships, binary/text and inactive records; additional objects removed.
- Interrupted runner, disk failure, safety failure, partial import, DB unavailable, drain failure and CLI recovery. Verify persistent history, invalid sessions, no queued-job replay.
- Vitest/Playwright critical flows, error/status states, themes, accessibility and responsive layouts.
- Required formatting, lint/types/static analysis, tests, build and dependency audits. Document supervision, signing-key/APP_KEY preservation, permissions, credentials, upload limits, maintenance coordination and recovery.

## Boundaries

Single application host, durable private storage, same engine family/major version and exact migration fingerprint. Preserve original APP_KEY, code, environment and uploaded files separately. Preserve source and safety package during active restore.

## Implementation progress and evidence

- 2026-10-04: inspected canonical guide, knowledge, current MySQL configuration, file sessions/cache, sync queue and Docker MySQL 8.4. Architecture mapping and QA scenario review delegated before implementation.
- Implemented private signed ZIP/gzip packages, atomic external metadata/history, exclusive filesystem operation runner, native engine clients, temporary credential files, HTTP/console writer leases, maintenance coordination, verified safety snapshots, explicit CLI recovery, and persistent session invalidation. Added authorized settings routes, Form Requests, typed React workspace, password/database-name confirmations, private downloads, polling and accessible failure/history states.
- Added Laragon/deployment/recovery documentation, Docker engine clients and independent runner service, configurable upload/expanded limits, and a disposable real-engine CI matrix for MySQL 8.4 and MariaDB 11.4.
- Backend and frontend specialists added engine and CLI failure coverage and browser upload/download/delete coverage. Independent architecture review identified and resolved effective database configuration, deferred writer drain, event scheduler coordination, configured runtime cleanup, login-file override, and package recovery protection issues. The final review found no additional material issue in the addressed paths.
- The real browser runner rehearsal exposed background Inertia polling triggering navigation skeletons and cancelling itself. Page loading now excludes async visits; slow-poll and busy-state regressions cover this fix.
- Focused PHPUnit backup suite: 68 passed, 1 opt-in integration skipped, 304 assertions (69 cases). Real isolated MySQL 8.0.30 CLI rehearsal: 1 passed, 27 assertions, including safety backup, schema/data/Unicode/binary/relationship/inactive-record restoration, additional object removal, runtime clearing, persistent history and damaged-migration-table recovery during maintenance.
- Playwright: read-only authorization, accessibility, both themes and mobile/tablet/desktop checks passed on an isolated application (6 passed, 3 intentional mutation skips); supervised MySQL desktop create/download/upload/equal-byte download/delete and restore-confirmation flow passed (3 passed). No live application database was restored.
- Final `composer ci:check` passed after correcting a redundant array_values call reported by PHPStan: frontend lint, Prettier, TypeScript, all 247 Vitest tests, production build, Pint, PHPStan (zero errors), and the full PHPUnit suite (302 passed, 1 opt-in integration skipped, 2545 assertions). The independently executed native timeout regression also passed with credential cleanup assertions. Existing Mapbox jsdom/build warnings remain unrelated to the feature.
- Composer audit reported no advisories. npm audit passed its required high threshold but reports 3 existing moderate Vitest-related advisories requiring a breaking major upgrade. Compose config, YAML parsing and git whitespace checks passed.

## Implementation refinements and release limits

- Explicit recovery requires an existing backup maintenance marker and database-name confirmation. It skips a new safety dump when the current database is partially imported, preserves existing safety/source packages, and releases retained protection only after successful verified recovery.
- Restore accepts isolated supported file/database runtime stores; external/shared cache/session/queue stores and split database hosts fail closed. Runtime cleanup rejects business table names and verifies expected columns before deletion.
- A filesystem authentication epoch supplements per-user session versions to prevent old versions colliding after historical restore. Deploying this change requires existing users to sign in once.
- Server database events and external writers require operator coordination. After a forced runner termination, recovery operators must also stop orphaned native clients and confirm active import queries have ended; PHP locks cannot prove those processes finished.
- Exact MySQL 8.4 and MariaDB 11.4 rehearsals and the Docker image build could not run locally because those native servers are unavailable and the Docker daemon is not running. The CI workflow and documented opt-in test provide those required release checks; their results must be observed before release.
