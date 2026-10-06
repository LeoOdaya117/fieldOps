<?php

namespace App\Actions\Backups;

use App\Enums\UserStatus;
use App\Models\User;
use App\Support\SystemSettings;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

class DatabaseBackupEngine
{
    /** @return array{engine: string, server_version: string, server_major: int, migration_fingerprint: string, database: string} */
    public function info(bool $recovery = false): array
    {
        $connection = $this->connection();
        $version = (string) $connection->selectOne('SELECT VERSION() AS version')->version;
        $engine = stripos($version, 'mariadb') !== false ? 'mariadb' : 'mysql';
        // Some MariaDB clients prefix 5.5.5 for historical compatibility.
        $version = preg_replace('/^5\.5\.5-(?=\d+\.\d+\.\d+.*MariaDB)/i', '', $version) ?? $version;
        if (! preg_match('/\A(\d+)\./', $version, $match)) {
            throw new RuntimeException('The database server version could not be verified.');
        }
        if (! $recovery) {
            $this->assertMigrations();
        }

        return [
            'engine' => $engine,
            'server_version' => $version,
            'server_major' => (int) $match[1],
            'migration_fingerprint' => $this->migrationFingerprint(),
            'database' => (string) $connection->getDatabaseName(),
        ];
    }

    /** @param array<string, mixed> $manifest */
    public function assertCompatible(array $manifest, bool $recovery = false): void
    {
        if ($recovery && ($manifest['scope'] ?? 'database') !== 'database') {
            throw new RuntimeException('CLI recovery requires a full database backup or the full safety backup. Selected-table packages cannot recover a damaged database.');
        }
        $this->assertRuntimeDrivers();
        $this->assertEventSchedulerStopped();
        $info = $this->info($recovery);
        if (($manifest['engine'] ?? null) !== $info['engine']
            || ($manifest['server_major'] ?? null) !== $info['server_major']
            || ($manifest['migration_fingerprint'] ?? null) !== $info['migration_fingerprint']) {
            throw new RuntimeException('This backup requires the same database engine, server major version, and application migrations.');
        }
        $this->assertClients($info['engine']);
        if (($manifest['scope'] ?? 'database') === 'tables') {
            $this->assertSelectedScope($manifest['tables'], $manifest['dependency_edges'] ?? []);
        }
    }

    /** @return list<array{name:string,related_tables:list<string>}> */
    public function tableCatalog(): array
    {
        $scope = app(BackupTableScope::class);
        $graph = $scope->graph($this->connection());
        $catalog = [];
        foreach ($graph['tables'] as $table) {
            $catalog[] = ['name' => $table, 'related_tables' => array_values(array_diff($scope->expand([$table], $graph['tables'], $graph['dependency_edges']), [$table]))];
        }

        return $catalog;
    }

    /** @param list<string>|null $requested
     * @return array{scope:string,requested_tables:list<string>,tables:list<string>,dependency_edges:list<array{table:string,related_table:string}>}
     */
    public function backupScope(?array $requested = null): array
    {
        $scope = app(BackupTableScope::class);
        $graph = $scope->graph($this->connection());
        $tables = $requested === null ? $graph['tables'] : $scope->expand($requested, $graph['tables'], $graph['dependency_edges']);
        $requested = $requested === null ? [] : array_values(array_unique($requested));
        sort($requested);
        if ($requested !== []) {
            $this->assertSafeSelectedObjects($tables);
        }

        return ['scope' => $requested === [] ? 'database' : 'tables', 'requested_tables' => $requested,
            'tables' => $tables, 'dependency_edges' => array_values(array_filter($graph['dependency_edges'], static fn (array $edge): bool => in_array($edge['table'], $tables, true) && in_array($edge['related_table'], $tables, true)))];
    }

    /** @param list<string>|null $tables */
    public function dump(string $outputPath, ?array $tables = null): void
    {
        $info = $this->info(true);
        $this->assertClients($info['engine']);
        $this->assertTransactionalTables();
        $this->assertDiskSpace(dirname($outputPath));
        if ($tables !== null) {
            $this->assertSelectedScope($tables);
        }
        $flags = [
            '--single-transaction', '--quick', '--skip-lock-tables', '--hex-blob',
            '--triggers', '--no-tablespaces',
            '--default-character-set=utf8mb4', '--result-file='.$outputPath,
        ];
        $flags = [...$flags, ...($tables === null ? ['--routines', '--events'] : ['--skip-routines', '--skip-events'])];
        if ($info['engine'] === 'mysql') {
            $flags[] = '--set-gtid-purged=OFF';
        }
        try {
            $this->run($info['engine'].'_dump', [...$flags, '--', $info['database'], ...($tables ?? [])]);
            clearstatcache(true, $outputPath);
            if (! is_file($outputPath) || filesize($outputPath) === 0) {
                throw new RuntimeException('The database client produced an empty backup.');
            }
            chmod($outputPath, 0600);
            if (filesize($outputPath) > (int) config('backups.expanded_max_bytes')) {
                throw new RuntimeException('The database dump exceeds the configured size limit.');
            }
        } catch (\Throwable $exception) {
            if (is_file($outputPath)) {
                unlink($outputPath);
            }
            throw $exception;
        }
    }

    /** Called only while the independent runner holds the exclusive writer lease.
     * @param  list<string>|null  $tables
     */
    public function replace(string $sqlPath, ?array $tables = null): void
    {
        $info = $this->info(true);
        $this->assertRuntimeDrivers();
        $this->assertEventSchedulerStopped();
        $this->assertClients($info['engine']);
        if ($tables !== null) {
            $this->assertSelectedScope($tables);
        }
        $input = fopen($sqlPath, 'rb');
        if ($input === false) {
            throw new RuntimeException('The staged backup could not be read.');
        }
        try {
            $connection = $this->connection();
            $database = $info['database'];
            if ($tables === null) {
                foreach ($connection->select('SELECT EVENT_NAME AS name FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ?', [$database]) as $event) {
                    $connection->getPdo()->exec('DROP EVENT '.$this->quote($event->name));
                }
                foreach ($connection->select('SELECT ROUTINE_NAME AS name, ROUTINE_TYPE AS type FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?', [$database]) as $routine) {
                    $type = $routine->type === 'PROCEDURE' ? 'PROCEDURE' : 'FUNCTION';
                    $connection->getPdo()->exec('DROP '.$type.' '.$this->quote($routine->name));
                }
            }
            $objects = $connection->select('SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [$database]);
            if ($tables !== null) {
                $objects = array_values(array_filter($objects, static fn ($object): bool => $object->type !== 'VIEW' && in_array($object->name, $tables, true)));
            }
            $connection->statement('SET FOREIGN_KEY_CHECKS = 0');
            try {
                foreach ($objects as $table) {
                    if ($table->type === 'VIEW') {
                        $connection->getPdo()->exec('DROP VIEW '.$this->quote($table->name));
                    }
                }
                foreach ($objects as $table) {
                    if ($table->type !== 'VIEW') {
                        $connection->getPdo()->exec('DROP TABLE '.$this->quote($table->name));
                    }
                }
            } finally {
                $connection->statement('SET FOREIGN_KEY_CHECKS = 1');
            }
            // Binary mode disables client commands in noninteractive input. The package signature is the SQL trust boundary.
            $this->run($info['engine'].'_client', ['--binary-mode', '--default-character-set=utf8mb4', '--database='.$database], $input);
            DB::purge();
            DB::reconnect();
        } finally {
            fclose($input);
        }
    }

    /** @param list<string> $tables
     * @param  list<array{table:string,related_table:string}>  $recordedEdges
     */
    private function assertSelectedScope(array $tables, array $recordedEdges = []): void
    {
        $scope = app(BackupTableScope::class);
        $graph = $scope->graph($this->connection());
        $expanded = $scope->expand($tables, $graph['tables'], [...$graph['dependency_edges'], ...$recordedEdges], true);
        if (array_diff($expanded, $tables) !== []) {
            throw new RuntimeException('New related tables are missing from this selected-table backup. Create a new backup including the complete relationship scope or use full database recovery.');
        }
        $this->assertSafeSelectedObjects($tables);
    }

    /** @param list<string> $tables */
    private function assertSafeSelectedObjects(array $tables): void
    {
        $connection = $this->connection();
        $database = $connection->getDatabaseName();
        $views = $connection->select('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?', [$database, 'VIEW']);
        foreach ($views as $view) {
            if (in_array($view->name, $tables, true)) {
                throw new RuntimeException('A selected table name is currently occupied by a view. Use a full database backup or resolve the object conflict before restoring.');
            }
        }
        foreach ($connection->select('SELECT EVENT_OBJECT_TABLE AS table_name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?', [$database]) as $trigger) {
            if (in_array($trigger->table_name, $tables, true)) {
                throw new RuntimeException('Selected-table backups cannot safely isolate triggers. Use a full database backup for tables with triggers.');
            }
        }
        $version = (string) $connection->selectOne('SELECT VERSION() AS version')->version;
        if (stripos($version, 'mariadb') !== false) {
            // MariaDB has no VIEW_TABLE_USAGE catalog. Parsing SQL definitions
            // cannot prove independence, so fail closed when any view exists.
            if ($views !== []) {
                throw new RuntimeException('MariaDB view dependencies cannot be verified for selected-table recovery. Use a full database backup when views exist.');
            }
        } else {
            foreach ($connection->select('SELECT TABLE_NAME AS table_name FROM information_schema.VIEW_TABLE_USAGE WHERE TABLE_SCHEMA = ?', [$database]) as $view) {
                if (in_array($view->table_name, $tables, true)) {
                    throw new RuntimeException('A view references the selected tables. Use a full database backup to preserve its dependencies.');
                }
            }
        }
        if ($connection->select('SELECT ROUTINE_NAME AS name FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?', [$database]) !== []
            || $connection->select('SELECT EVENT_NAME AS name FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ?', [$database]) !== []) {
            throw new RuntimeException('Stored routines or events may reference selected tables. Use a full database backup when these objects exist.');
        }
    }

    /** Validate composite constraints explicitly: re-enabling FK checks does not validate imported rows.
     * @param  list<string>|null  $tables
     */
    public function verifyRelationships(?array $tables = null): void
    {
        $connection = $this->connection();
        $graph = app(BackupTableScope::class)->graph($connection);
        foreach ($graph['foreign_keys'] as $key) {
            if ($tables !== null && ! in_array($key['table'], $tables, true) && ! in_array($key['related_table'], $tables, true)) {
                continue;
            }
            $join = [];
            $nonNull = [];
            foreach ($key['columns'] as $column) {
                $join[] = 'c.'.$this->quote($column['column']).' = p.'.$this->quote($column['related_column']);
                $nonNull[] = 'c.'.$this->quote($column['column']).' IS NOT NULL';
            }
            $query = 'SELECT 1 FROM '.$this->quote($key['table']).' c LEFT JOIN '.$this->quote($key['related_table'])
                .' p ON '.implode(' AND ', $join).' WHERE '.implode(' AND ', $nonNull)
                .' AND p.'.$this->quote($key['columns'][0]['related_column']).' IS NULL LIMIT 1';
            $statement = $connection->getPdo()->query($query);
            if ($statement === false || $statement->fetchColumn() !== false) {
                throw new RuntimeException('Restored foreign-key relationships are invalid. Keep maintenance active and use the safety backup for recovery.');
            }
        }
    }

    public function verifyAndResetRuntime(): void
    {
        $this->assertRuntimeDrivers();
        $this->assertMigrations();
        foreach (['users', 'roles', 'permissions', 'model_has_roles', 'access_audit_events', 'system_settings'] as $table) {
            if (! Schema::hasTable($table)) {
                throw new RuntimeException('Restored database verification failed: required application tables are missing.');
            }
        }
        if (! User::query()->where('status', UserStatus::Active->value)->where('record_status', 1)
            ->whereNotNull('email_verified_at')->whereHas('roles', fn ($query) => $query->where('name', 'super_admin')->where('record_status', 1))->exists()) {
            throw new RuntimeException('Restored database verification failed: no active, verified Super Admin exists.');
        }
        // Validate every configured cleanup target before deleting any data. Custom
        // names must describe the expected runtime schema, including dormant stores.
        foreach ($this->runtimeTableSchemas() as $table => $columns) {
            if (Schema::hasTable($table) && ! Schema::hasColumns($table, $columns)) {
                throw new RuntimeException('Restored runtime tables do not match their configured purpose. Keep maintenance active and correct the runtime configuration before recovery.');
            }
        }
        // The runner separately rotates the durable auth epoch; versions alone can collide after an old restore.
        User::withTrashed()->chunkById(200, function ($users): void {
            foreach ($users as $user) {
                $user->forceFill(['session_version' => random_int(1, 2147483647), 'remember_token' => Str::random(60)])->saveQuietly();
            }
        });
        foreach ($this->runtimeTables() as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->delete();
            }
        }
        if (config('session.driver') === 'file') {
            File::cleanDirectory((string) config('session.files'));
        }
        // Only isolated application-owned file/database/array stores are accepted.
        if (! Cache::flush()) {
            throw new RuntimeException('Unable to clear the application cache after restore.');
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        SystemSettings::forgetCache();
        DB::purge();
        DB::reconnect();
    }

    /** @return list<array{label: string, ready: bool, message: string}> */
    public function prerequisites(): array
    {
        $checks = [];
        $keyReady = strlen((string) config('backups.signing_key')) >= 32;
        $checks[] = ['label' => 'Backup signing key', 'ready' => $keyReady, 'message' => $keyReady ? 'Configured.' : 'Configure a dedicated BACKUP_SIGNING_KEY of at least 32 characters.'];
        try {
            $info = $this->info();
            $this->assertClients($info['engine']);
            $this->assertTransactionalTables();
            $checks[] = ['label' => 'Database and native clients', 'ready' => true, 'message' => ucfirst($info['engine']).' '.$info['server_version'].' is available.'];
        } catch (\Throwable $exception) {
            $checks[] = ['label' => 'Database and native clients', 'ready' => false, 'message' => $exception instanceof RuntimeException && ! $exception instanceof \PDOException ? $exception->getMessage() : 'Database prerequisites are unavailable. Check connection, migrations and native clients.'];
        }
        try {
            $this->assertRuntimeDrivers();
            $checks[] = ['label' => 'Restore runtime storage', 'ready' => true, 'message' => 'Application-owned runtime drivers are supported.'];
        } catch (RuntimeException $exception) {
            $checks[] = ['label' => 'Restore runtime storage', 'ready' => false, 'message' => $exception->getMessage()];
        }

        return $checks;
    }

    public function migrationFingerprint(): string
    {
        $hash = hash_init('sha256');
        $files = glob(database_path('migrations/*.php')) ?: [];
        sort($files);
        foreach ($files as $file) {
            hash_update($hash, basename($file).':'.hash_file('sha256', $file)."\n");
        }

        return hash_final($hash);
    }

    private function assertMigrations(): void
    {
        if (! Schema::hasTable('migrations')) {
            throw new RuntimeException('Application migrations must be complete before creating or restoring a backup. Use CLI recovery for a damaged database.');
        }
        $expected = array_map(fn (string $path): string => basename($path, '.php'), glob(database_path('migrations/*.php')) ?: []);
        $actual = DB::table('migrations')->pluck('migration')->all();
        sort($expected);
        sort($actual);
        if ($actual !== $expected) {
            throw new RuntimeException('Application migrations must match the deployed code before backup or restore.');
        }
    }

    private function assertRuntimeDrivers(): void
    {
        $cacheDriver = config('cache.stores.'.config('cache.default').'.driver');
        if (! in_array($cacheDriver, ['file', 'database', 'array'], true)
            || ! in_array(config('session.driver'), ['file', 'database', 'array', 'cookie'], true)
            || ! in_array(config('queue.default'), ['sync', 'database', 'null'], true)) {
            throw new RuntimeException('Restore requires application-owned file/database cache and sessions, and a sync/database queue. Shared external runtime stores are unsupported.');
        }
        if ($cacheDriver === 'database' && config('cache.stores.'.config('cache.default').'.connection') !== null) {
            throw new RuntimeException('Restore does not support a separate cache database connection.');
        }
        if ($cacheDriver === 'database' && config('cache.stores.'.config('cache.default').'.lock_connection') !== null) {
            throw new RuntimeException('Restore does not support a separate cache lock database connection.');
        }
        if (config('queue.default') === 'database' && config('queue.connections.database.connection') !== null) {
            throw new RuntimeException('Restore does not support a separate queue database connection.');
        }
        if (config('session.connection') !== null) {
            throw new RuntimeException('Restore does not support a separate session database connection.');
        }
        foreach (['batching', 'failed'] as $key) {
            if (config('queue.'.$key.'.database') !== config('database.default')) {
                throw new RuntimeException('Restore requires queue batches and failures in the application database connection.');
            }
        }
        if (! in_array(config('queue.failed.driver'), ['database-uuids', 'database', 'null'], true)) {
            throw new RuntimeException('Restore does not support an external failed-job store.');
        }
        if (config('permission.cache.store', 'default') !== 'default'
            && config('permission.cache.store') !== config('cache.default')) {
            throw new RuntimeException('Restore requires permission caching in the default application cache store.');
        }
        $this->assertBackupPathSeparation($cacheDriver);
        $this->runtimeTables();
    }

    private function assertBackupPathSeparation(string $cacheDriver): void
    {
        $runtimePaths = [];
        if (config('session.driver') === 'file') {
            $runtimePaths[] = (string) config('session.files');
        }
        if ($cacheDriver === 'file') {
            $store = 'cache.stores.'.config('cache.default');
            $runtimePaths[] = (string) config($store.'.path');
            $runtimePaths[] = (string) config($store.'.lock_path');
        }

        $backupRoot = $this->canonicalFilesystemPath((string) config('backups.root'));
        foreach ($runtimePaths as $runtimePath) {
            if ($this->pathsOverlap($backupRoot, $this->canonicalFilesystemPath($runtimePath))) {
                throw new RuntimeException('The private backup directory must be separate from file-session and file-cache runtime directories.');
            }
        }
    }

    private function canonicalFilesystemPath(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            throw new RuntimeException('Backup and runtime storage paths must be configured before restore.');
        }

        $path = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path);
        $isAbsolute = str_starts_with($path, DIRECTORY_SEPARATOR)
            || preg_match('/\\A[A-Za-z]:'.preg_quote(DIRECTORY_SEPARATOR, '/').'/', $path) === 1;
        if (! $isAbsolute) {
            $path = base_path($path);
        }

        $resolvedPath = realpath($path);
        if ($resolvedPath !== false) {
            if ($resolvedPath === DIRECTORY_SEPARATOR) {
                return DIRECTORY_SEPARATOR;
            }
            if (DIRECTORY_SEPARATOR === '\\' && preg_match('/\\A[A-Za-z]:[\\\\\/]*\\z/', $resolvedPath, $drive) === 1) {
                return substr($resolvedPath, 0, 2).DIRECTORY_SEPARATOR;
            }

            return rtrim($resolvedPath, '/\\');
        }
        if ($path === DIRECTORY_SEPARATOR) {
            return DIRECTORY_SEPARATOR;
        }
        if (DIRECTORY_SEPARATOR === '\\' && preg_match('/\\A[A-Za-z]:[\\\\\/]*\\z/', $path, $drive) === 1) {
            return substr($path, 0, 2).DIRECTORY_SEPARATOR;
        }

        $missingSegments = [];
        $candidate = rtrim($path, '/\\');
        while (($resolved = realpath($candidate)) === false) {
            $parent = dirname($candidate);
            if ($parent === $candidate) {
                throw new RuntimeException('Backup and runtime storage paths could not be resolved safely.');
            }
            array_unshift($missingSegments, basename($candidate));
            $candidate = $parent;
        }

        foreach ($missingSegments as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }
            $resolved = $segment === '..' ? dirname($resolved) : $resolved.DIRECTORY_SEPARATOR.$segment;
        }

        return rtrim($resolved, '/\\');
    }

    private function pathsOverlap(string $first, string $second): bool
    {
        if (DIRECTORY_SEPARATOR === '\\') {
            $first = strtolower($first);
            $second = strtolower($second);
        }

        $firstPrefix = rtrim($first, '/\\').DIRECTORY_SEPARATOR;
        $secondPrefix = rtrim($second, '/\\').DIRECTORY_SEPARATOR;

        return $first === $second
            || str_starts_with($first, $secondPrefix)
            || str_starts_with($second, $firstPrefix);
    }

    /** @return list<string> */
    private function runtimeTables(): array
    {
        $tables = array_keys($this->runtimeTableSchemas());
        foreach ($tables as $table) {
            if (! preg_match('/\A[a-zA-Z_][a-zA-Z0-9_]*\z/', $table)
                || in_array($table, [
                    'users', 'roles', 'permissions', 'migrations', 'model_has_roles', 'model_has_permissions', 'role_has_permissions',
                    'access_audit_events', 'system_settings', 'media_assets', 'password_reset_tokens', 'passkeys',
                    'user_registrations', 'blocked_ip_addresses', 'user_invitations', 'visit_logs', 'countries', 'timezones',
                    'psgc_reference_releases', 'psgc_regions', 'psgc_provinces', 'psgc_localities', 'organization_locations',
                    'notifications', 'platform_image_assignments', 'export_artifacts',
                ], true)) {
                throw new RuntimeException('Runtime storage must use dedicated application tables with simple identifiers.');
            }
        }

        return $tables;
    }

    /** @return array<string, list<string>> */
    private function runtimeTableSchemas(): array
    {
        $store = 'cache.stores.'.config('cache.default');
        $definitions = [
            [(string) config('session.table', 'sessions'), ['id', 'user_id', 'payload', 'last_activity']],
            [(string) config('queue.connections.database.table', 'jobs'), ['id', 'queue', 'payload', 'attempts', 'reserved_at', 'available_at']],
            [(string) config('queue.batching.table', 'job_batches'), ['id', 'name', 'total_jobs', 'pending_jobs', 'failed_jobs', 'failed_job_ids']],
            [(string) config('queue.failed.table', 'failed_jobs'), ['id', 'connection', 'queue', 'payload', 'exception', 'failed_at']],
            [(string) config($store.'.table', 'cache'), ['key', 'value', 'expiration']],
            [(string) (config($store.'.lock_table') ?: 'cache_locks'), ['key', 'owner', 'expiration']],
        ];
        $schemas = [];
        foreach ($definitions as [$table, $columns]) {
            $schemas[$table] = array_values(array_unique([...($schemas[$table] ?? []), ...$columns]));
        }

        return $schemas;
    }

    private function assertTransactionalTables(): void
    {
        $tables = $this->connection()->select('SELECT ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?', [$this->connection()->getDatabaseName(), 'BASE TABLE']);
        foreach ($tables as $table) {
            if (strcasecmp((string) $table->engine, 'InnoDB') !== 0) {
                throw new RuntimeException('Consistent backups require every application table to use InnoDB.');
            }
        }
    }

    private function assertEventSchedulerStopped(): void
    {
        $value = strtoupper((string) $this->connection()->selectOne('SELECT @@GLOBAL.event_scheduler AS scheduler')->scheduler);
        if (! in_array($value, ['OFF', 'DISABLED'], true)) {
            throw new RuntimeException('Stop the database event scheduler before restore (event_scheduler=OFF). Database events are outside the application writer lock.');
        }
    }

    private function connection(): Connection
    {
        $connection = DB::connection();
        if (! in_array($connection->getDriverName(), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Database backups support MySQL and MariaDB only.');
        }
        $configuration = $connection->getConfig();
        if (is_array($configuration['host'] ?? null) || isset($configuration['read']) || isset($configuration['write'])) {
            throw new RuntimeException('Backup requires a single database host without read/write splitting.');
        }

        return $connection;
    }

    private function assertClients(string $engine): void
    {
        foreach (['_dump', '_client'] as $suffix) {
            $this->executable($engine.$suffix);
        }
    }

    private function executable(string $key): string
    {
        $configured = (string) config('backups.'.$key);
        // ExecutableFinder searches PATH; absolute paths require direct validation.
        if (str_contains($configured, '/') || str_contains($configured, '\\')) {
            $resolved = realpath($configured);
            if ($resolved !== false && is_file($resolved) && (DIRECTORY_SEPARATOR === '\\' || is_executable($resolved))) {
                return $resolved;
            }
        } else {
            $resolved = (new ExecutableFinder)->find($configured);
            if ($resolved !== null) {
                return $resolved;
            }
        }
        throw new RuntimeException('The database dump/import client is unavailable. Configure the engine-specific backup executable paths.');
    }

    private function assertDiskSpace(string $directory): void
    {
        $free = disk_free_space($directory);
        if ($free === false || $free < 16 * 1024 * 1024) {
            throw new RuntimeException('Insufficient private storage space for a database backup.');
        }
    }

    /** @param list<string> $arguments
     * @param  resource|null  $input
     */
    protected function run(string $executableKey, array $arguments, mixed $input = null): void
    {
        $configuration = $this->connection()->getConfig();
        $directory = (string) config('backups.root');
        if (! is_dir($directory) && ! mkdir($directory, 0700, true)) {
            throw new RuntimeException('Unable to prepare private backup storage.');
        }
        $credentials = tempnam($directory, 'client-');
        if ($credentials === false) {
            throw new RuntimeException('Unable to prepare protected database credentials.');
        }
        chmod($credentials, 0600);
        try {
            $options = ['user' => $configuration['username'] ?? '', 'password' => $configuration['password'] ?? ''];
            if (! empty($configuration['unix_socket'])) {
                $options['socket'] = $configuration['unix_socket'];
            } else {
                $host = $configuration['host'] ?? '127.0.0.1';
                if (is_array($host) || isset($configuration['read']) || isset($configuration['write'])) {
                    throw new RuntimeException('Backup requires a single database host without read/write splitting.');
                }
                $options['host'] = $host;
                $options['port'] = $configuration['port'] ?? 3306;
            }
            $sslMapping = [\PDO::MYSQL_ATTR_SSL_CA => 'ssl-ca', \PDO::MYSQL_ATTR_SSL_CERT => 'ssl-cert', \PDO::MYSQL_ATTR_SSL_KEY => 'ssl-key', \PDO::MYSQL_ATTR_SSL_CIPHER => 'ssl-cipher'];
            foreach ($sslMapping as $option => $key) {
                if (isset($configuration['options'][$option])) {
                    $options[$key] = $configuration['options'][$option];
                }
            }
            if (isset($options['ssl-ca'])) {
                $options[str_starts_with($executableKey, 'mysql') ? 'ssl-mode' : 'ssl-verify-server-cert'] = str_starts_with($executableKey, 'mysql') ? 'VERIFY_IDENTITY' : 'true';
            }
            $contents = "[client]\n";
            foreach ($options as $key => $value) {
                $value = str_replace(['\\', '"', "\n", "\r", "\t", "\0"], ['\\\\', '\\"', '\\n', '\\r', '\\t', ''], (string) $value);
                $contents .= $key.'="'.$value."\"\n";
            }
            if (file_put_contents($credentials, $contents) !== strlen($contents)) {
                throw new RuntimeException('Unable to prepare protected database credentials.');
            }
            // A defaults file alone does not disable .mylogin.cnf overrides. Point
            // the login-file lookup at an absent random path inside private storage.
            // This also supports older MySQL 8 clients without --no-login-paths.
            $process = new Process([$this->executable($executableKey), '--defaults-file='.$credentials, ...$arguments], base_path(), ['MYSQL_PWD' => false, 'MYSQL_TEST_LOGIN_FILE' => $credentials.'.login'], $input, (float) config('backups.process_timeout'));
            $process->disableOutput();
            try {
                $process->run();
                if (! $process->isSuccessful()) {
                    throw new RuntimeException('Database client failed. Check client compatibility, database privileges, and available disk space.');
                }
            } catch (ProcessTimedOutException) {
                throw new RuntimeException('Database operation timed out. Restore may require CLI recovery before maintenance can end.');
            }
        } finally {
            unlink($credentials);
        }
    }

    private function quote(string $identifier): string
    {
        return '`'.str_replace('`', '``', $identifier).'`';
    }
}
