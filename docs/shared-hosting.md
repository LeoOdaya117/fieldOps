# Shared-hosting deployment and preflight

This is a conditional cPanel runbook for one Laravel/Inertia installation, MySQL and database queues. Provider verification is deferred until deployment, per the development-first scope. It is not evidence that an unspecified hosting plan can run FieldOps. No provider/account or production target was supplied. Record the provider, plan, PHP CLI path, measured limits, reviewer and date against every provider check below before accepting a host. Redis, Horizon, a VPS and persistent workers are not required. A host that cannot meet a required capability is unsupported for that capability; do not weaken recovery checks to fit it.

## Requirements and evidence matrix

| Area | Repository-verified requirement/source | Operator/provider verification still required |
| --- | --- | --- |
| PHP | PHP `^8.3` in `composer.json`; locked packages declare additional extensions. Run `composer check-platform-reqs --no-dev` against the deployed lock. | Same supported PHP and extensions in web **and** cron CLI; inspect `php -v`, `php --ini`, `php -m`. Composer's platform override is not a runtime check. |
| Extensions | The root manifest and locked runtime dependencies declare ctype, date, DOM, fileinfo, filter, GD, hash, iconv, Intl, JSON, libxml, mbstring, OpenSSL, PCRE, session, SimpleXML, tokenizer, XML/XMLReader/XMLWriter, ZIP and zlib. Laravel also uses PDO; curl is recommended for HTTP integrations. MySQL needs `pdo_mysql`; image processing uses GD JPEG/PNG/WebP; backups use ZIP/zlib; reports use Intl/Dompdf/PhpSpreadsheet. | Confirm web module list without publishing phpinfo; check GD format support with `php -r 'print_r(gd_info());'`. Linux queue timeouts need CLI `pcntl`; this is not a Composer platform requirement. ZIP/package creation and private temporary files must work under the hosting account. |
| Web root | Only `public/` is web-accessible; Vite build is static. Managed media use authenticated token routes; branding is an explicitly public assigned-image exception (`docs/file-management.md`). | Provider permits document root `/home/ACCOUNT/fieldops/public`, front-controller rewrites and HTTPS. If root cannot point there, require a reviewed equivalent that keeps the rest outside public_html; never publish the project root. Probe `.env`, composer files, private files and backup URLs for denial. |
| Database | `config/database.php`, migrations and queue tables support MySQL. CI uses MySQL 8.4. Restore requires same engine family/major and exact migration fingerprint, InnoDB, one host and isolated runtime stores. | Actual server/version, supported collation, account-scoped schema, connection/packet limits and migration privileges. cPanel database name prefixes must match effective configuration, including DB_URL. MariaDB and other MySQL versions need separate testing. |
| Cron/processes | `queue:work` has finite worker options; `backups:work --once` processes at most one filesystem operation; `routes/console.php` prunes visits daily and exports hourly. | Allowed cron cadence (example assumes every minute), PHP CLI, scheduler process spawning, `proc_open` and native process support; Linux `flock` executable or equivalent account-level serialization. Confirm process count, CPU/RAM/I/O, wall-clock kills and logging policy. Do not assume these tools exist. |
| Private durable storage | `local` disk is `storage/app/private`; exports always use local; media default to local. `BACKUP_ROOT` defaults to `storage/app/backups`, with private 0700 directories/0600 files and PHP flock; state must survive restore/deploy (`config/filesystems.php`, `BackupStore`). | Web and CLI share one local filesystem/account and reliable flock/atomic rename, not network storage or multiple hosts. Account can write storage, bootstrap/cache, PHP upload/temp and report font/temp paths. Check owner/ACL, quotas/inodes and free space; never chmod 777. |
| Native backup | `DatabaseBackupEngine` validates executable paths and compatibility, uses native dump/import through Symfony Process, and catches execution failures. Signed packages and writer leases are mandatory. Existing prerequisite UI is not a dump/restore rehearsal and does not prove binaries can execute. | Genuine engine-matched binaries and version output, process execution in CLI and web preflight, privileges for tables/views/triggers/routines/events, event_scheduler OFF for restore. Provider must stop external writers/events and permit required DDL. If unavailable, native backup/restore is unsupported; do not run the runner or treat a green heartbeat as native readiness. Provider backups are separate and not FieldOps signed packages. |
| Capacity | Upload, image, preview and report budgets below are existing code limits, not memory guarantees. Backup SQL cap is 5 GiB by default, checked after dump; disk floor is only 16 MiB. | Measure peak memory, elapsed time, disk and inode use on disposable representative data. Disk floor does not reserve enough capacity or stop a dump growing. Obtain a recovery route independent of the application before deployment. |
| Services | Session/cache can use isolated files; database queues do not require Redis. Mail configuration defaults to logging in `.env.example`. | Working TLS, SMTP delivery, timezone, log access/rotation and cron failure alerts. Mapbox public token/restrictions if map UI is used. No secrets in source, cron command lines or public diagnostics. |

## Prepare and deploy

Commands are templates for a reviewed target, not authorization to migrate or restore a real account. Replace ACCOUNT, PHP and paths with provider-confirmed absolute values. Build/install in CI or a compatible local artifact builder if the provider has no shell/Node/Composer. Include production vendor dependencies, `public/build`, and generated Wayfinder inputs/output needed by the build; do not commit them. Node 22 is used by CI, not required to serve production. Do not use `composer setup` on a host: it is a development bootstrap.

```sh
cd /home/ACCOUNT/fieldops
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
composer check-platform-reqs --no-dev
# In the build environment, with dev dependencies available for Wayfinder generation:
npm ci --no-audit --no-fund
npm run build
```

Create a private environment from `.env.example` and set the real credentials without logging them. Keep a stable APP_KEY and separate BACKUP_SIGNING_KEY, and preserve them offline. Generate APP_KEY only for a new installation; never rotate it as part of a routine release. Example production settings (not credentials):

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.example
APP_MAINTENANCE_DRIVER=file
DB_CONNECTION=mysql
QUEUE_CONNECTION=database
DB_QUEUE_RETRY_AFTER=180
SESSION_DRIVER=file
SESSION_SECURE_COOKIE=true
CACHE_STORE=file
FILESYSTEM_DISK=local
MEDIA_ASSET_DISK=local
LOG_LEVEL=warning
BACKUP_RUNNER_HEARTBEAT_TTL=120
```

120 seconds assumes verified minute backup cron with modest jitter; retain default 15 for a supervised runner. For a different cadence choose a modest window exceeding cadence plus observed jitter, and monitor missed runs independently. This is a recent-run indicator only: it neither enables native clients nor proves the next invocation will succeed. No heartbeat means unavailable even with a larger TTL.

On an explicitly approved deployment, stop cron jobs/writers, preserve database + media + backup state first, remove any development `public/hot`, and execute with the exact provider CLI PHP:

```sh
/ABS/PHP artisan down
/ABS/PHP artisan migrate --force
/ABS/PHP artisan config:cache
/ABS/PHP artisan route:cache
/ABS/PHP artisan view:cache
/ABS/PHP artisan schedule:list
/ABS/PHP artisan up
```

Do not run `up` during a failed backup restore; follow the recovery runbook instead. On an upgrade, preserve storage, .env and bootstrap/cache ownership and deploy atomically or under maintenance; never overwrite BACKUP_ROOT/auth-epoch.json with an old release. Bootstrap accounts using `docs/rbac.md`, with a strong private setup password; never use the example password. Run `files:backfill-avatars` only as part of the documented upgrade/cutover, with separate review before deleting legacy files.

No storage symlink is needed for managed private files or exports. Legacy public avatars can need the existing public disk URL until backfill succeeds. If the provider forbids symlinks, complete and verify backfill before removing that dependency; never map private storage into public_html. Verify denied direct access and successful authorized token/download requests, revoked access, inactive files and assigned public branding on the deployed host.

## Cron, overlap and execution budgets

Use separate external lock files outside public/ and **outside BACKUP_ROOT's internal runner/writer lock names**. Confirm `/usr/bin/flock` and shell support first. Keep lock files on the same private local host. If flock is unavailable, require a verified provider serialization facility; do not substitute a stale PID file or assume cron prevents overlap. Log to private rotated files and alert on nonzero exits and missed executions.

Example cPanel cron entries, only after confirming every-minute cadence and the budget below:

```cron
* * * * * /usr/bin/flock -n /home/ACCOUNT/fieldops/storage/queue-cron.lock /ABS/PHP /home/ACCOUNT/fieldops/artisan queue:work database --queue=default --stop-when-empty --max-time=40 --timeout=60 --memory=128 --sleep=1 >> /home/ACCOUNT/fieldops/storage/logs/queue-cron.log 2>&1
* * * * * /usr/bin/flock -n /home/ACCOUNT/fieldops/storage/schedule-cron.lock /ABS/PHP /home/ACCOUNT/fieldops/artisan schedule:run >> /home/ACCOUNT/fieldops/storage/logs/schedule-cron.log 2>&1
* * * * * /usr/bin/flock -n /home/ACCOUNT/fieldops/storage/backup-cron.lock /ABS/PHP /home/ACCOUNT/fieldops/artisan backups:work --once --no-interaction >> /home/ACCOUNT/fieldops/storage/logs/backup-cron.log 2>&1
```

The backup entry is **conditional on native capability and a measured complete operation fitting the provider window**. It drains a requested operation; it does not schedule automatic backup creation. Internal nonblocking runner flock still protects inline CLI/other workers; collisions return failure for `--once`, so inspect logs. Internal single-operation queue, package signing, safety backup, writer drain, maintenance marker, authentication epoch and no automatic retry are unchanged. The larger heartbeat window permits the UI to request work between cron runs.

Queue `--max-time` and `--memory` are checked between jobs, not hard per-job resource limits. With functioning pcntl, a job started near 40 seconds can run another 60 seconds plus bootstrap/shutdown. The example needs a provider wall limit greater than that total (e.g. a confirmed 120-second allowance with measured overhead below 20 seconds). `DB_QUEUE_RETRY_AFTER=180` must exceed the hard worker/job lifetime with margin so a reserved job is not concurrently retried. PHP CLI memory_limit must fit the host and measured report peaks; `--memory=128` does not cap one job. `--tries` is not set: the export job's existing three attempts remain authoritative. Monitor failed_jobs (`queue:failed`); investigate before targeted retry, never clear the queue blindly. Without pcntl, --timeout cannot enforce this envelope: obtain a verified provider lifetime bound and recalculate retry_after, or reject this worker profile.

Scheduler execution also needs process support and a measured runtime budget. File cache supplies the existing exports prune overlap lock; preserve it between cron runs. Ensure cron actually hits hourly/daily due times; a restricted cadence can miss Laravel schedules. A missed export prune leaves expired bytes behind even though access expires. There is no scheduler job for database backup creation.

`backups:work --once` is bounded by **operation count**, not total wall time. BACKUP_PROCESS_TIMEOUT (default 3600 seconds) applies to each native process; restore includes drain (default 60 seconds), full safety dump, import, validation and compression, with no single end-to-end timeout. Do not advertise it as a 60-second cron job, wrap restore in an arbitrary kill timeout, or lower native timeouts to fake compatibility. Measure full backup/restore on an authorized disposable database, then agree a complete window with the provider. If that window is unavailable, disable backup cron and leave native operations unavailable; arrange a provider-supported recovery procedure explicitly. Do not enqueue a destructive restore to test readiness.

For a restore window, disable queue/scheduler/other writer cron and prevent restarts, drain existing processes and arrange provider/DBA coordination for events and external writers **before** requesting restore. A running queue process retains its writer lease until exit. Never overlap deployment/migrations with backup/restore. On timeout, interruption or failure retain maintenance, source/safety packages, external state and logs. Confirm orphaned clients and database queries have stopped; do not automatically retry or reopen. See [database-backups.md](database-backups.md) for explicit signed full-package recovery and typed database confirmation.

## Upload and processing envelope

| Path | Application bound | Host alignment/measurement |
| --- | --- | --- |
| Files | 100 MiB per upload; UI batches three independent uploads; 200 files/1 GiB per uploader including inactive (`config/media-assets.php`). | PHP upload_max_filesize at least 100M, post_max_size above multipart total **per request**, proxy/WAF body limit at least that envelope. Budget concurrent batch requests and PHP upload temp space. |
| Gallery/images | 5 MiB gallery file; 8192 pixels/side and 12 million pixels before decode; thumbnail 480 pixels; 100 images/250 MiB gallery quota. | JPEG/PNG/WebP GD support, decode memory often many times compressed bytes, HTTP/PHP timeouts and memory tested at allowed dimensions. A small compressed file is not a memory bound. |
| Previews | 1 MiB input and XML budget, 10,000 XML nodes, 50 rows/20 columns; first-sheet parsing; 30 previews/user/minute. | ZIP/XML/PhpSpreadsheet memory and CPU at boundaries; temp file privacy. Unsupported/oversized previews fail safely; downloads still require authorization. |
| Backups | Upload 512 MiB by default; expanded SQL 5 GiB (`config/backups.php`). | If enabled, upload_max_filesize=512M, post_max_size=520M and proxy limit at least 520 MiB are example aligned values. Check provider accepts them, upload/temp timeouts and simultaneous staged package/SQL/full safety dump/compressed output space. Cap can be lowered using BACKUP_UPLOAD_MAX_BYTES and BACKUP_EXPANDED_MAX_BYTES; confirm legitimate packages still fit. |
| Reports | Maximum 10,000 rows; over 500 rows queues; 500 or fewer generated during HTTP; PDF and Print use in-process Dompdf, CSV/XLSX PhpSpreadsheet. | Rows and output are materialized in memory, not streamed end-to-end. Benchmark wide/large rows, 500-row synchronous reports and 10,000-row queued reports in all formats. No browser binary, Node renderer or persistent daemon needed. Narrow filters if measured bounds fail; current row cap does not guarantee a host can process the maximum. |

Check **both** web and CLI effective memory_limit/max_execution_time and web max_input_time/upload_tmp_dir, PHP request body limits, Apache/nginx/LiteSpeed/WAF limits and account wall-clock kills. Set PHP limits through the provider-supported mechanism; .env does not configure PHP/proxy upload limits. Changing web PHP settings does not necessarily change cron CLI. Do not promise full upload/report capacity until measured; a provider cap below the app limits requires explicit operator acceptance and an aligned configuration change, not a claim that the larger upload works.

## Retention and recovery inventory

- Keep private media originals and thumbnails with matching database records; record-status deactivation preserves bytes. No automatic media purge exists. Account quotas do not replace disk monitoring or an operator retention policy. Back up media independently of signed database packages.
- Exports expire after 24 hours, with hourly `exports:prune` removing records/files; actual byte retention is expiry plus time until successful prune. Check cron and disk metrics, including stale temporary/orphan files after hard kills, before any reviewed cleanup.
- Backup packages are signed, not encrypted. Manual and safety packages plus operation/audit records persist until explicit safe deletion; protected restore packages cannot be deleted. Keep BACKUP_ROOT, its auth epoch, APP_KEY, signing key, deployed code/migrations and private media in a restricted off-host recovery inventory. Database packages exclude media, environment and database accounts/grants. Do not expire the auth epoch or indiscriminately delete backup tmp/state during failure recovery.
- Rotate application/cron logs and inspect private upload/system temp directories for capacity and account isolation. Define provider/off-host retention, encryption, restore ownership, recovery point/time objectives and disk alerts; these are outstanding operator decisions, not implemented policy.

## Acceptance checklist (provider evidence pending)

- [ ] Provider/plan, CLI and web versions/modules, process/pcntl/flock support and quotas recorded with dated evidence.
- [ ] Target root/HTTPS/rewrite and private file denials verified; web+cron share writable local private storage without public symlinks.
- [ ] Approved disposable MySQL deployment migrates; accounts/privileges and effective config checked without exposing secrets.
- [ ] Minute cron logs show queued report completion, no overlapping execution, failed-job handling and missed-run alerts; scheduled retention executes at due times.
- [ ] Boundary upload, GD formats/dimensions, previews and sync/queued report formats measured within PHP/proxy/CPU/RAM/disk/time envelopes; authorized and denied delivery checked.
- [ ] Backup native capability either verified with representative disposable signed backup/recovery rehearsal and full timing evidence, or explicitly unavailable with an accepted independent recovery route. No destructive production rehearsal implied.
- [ ] Storage/media/package/key retention and off-host recovery responsibilities recorded; failed/interrupted restore keeps maintenance and retained recovery state.

Local evidence and remaining checks are recorded in the Phase 2 brief. Production suitability remains unverified until this checklist has provider evidence.
