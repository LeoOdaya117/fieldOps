<?php

namespace Tests\Feature\Backups;

use App\Actions\Backups\DatabaseBackupEngine;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class DatabaseBackupEngineTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = storage_path('framework/testing/backup-engine-'.Str::uuid());
        File::makeDirectory($this->root, 0700, true);
        config([
            'backups.root' => $this->root,
            'backups.mysql_dump' => PHP_BINARY,
            'backups.mysql_client' => PHP_BINARY,
            'backups.mariadb_dump' => PHP_BINARY,
            'backups.mariadb_client' => PHP_BINARY,
            'database.default' => 'mysql',
            'session.driver' => 'file', 'session.connection' => null, 'session.table' => 'sessions',
            'cache.default' => 'array', 'cache.stores.array.driver' => 'array',
            'queue.default' => 'sync', 'queue.batching.database' => 'mysql',
            'queue.failed.database' => 'mysql', 'queue.failed.driver' => 'database-uuids',
            'permission.cache.store' => 'default',
        ]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->root);
        parent::tearDown();
    }

    private function connection(string $version = '8.4.0', string $scheduler = 'OFF'): Connection
    {
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('getDriverName')->andReturn('mysql');
        $connection->shouldReceive('getConfig')->andReturn([])->byDefault();
        $connection->shouldReceive('getDatabaseName')->andReturn('fieldops_test');
        $connection->shouldReceive('selectOne')->with('SELECT VERSION() AS version')->andReturn((object) ['version' => $version]);
        $connection->shouldReceive('selectOne')->with('SELECT @@GLOBAL.event_scheduler AS scheduler')->andReturn((object) ['scheduler' => $scheduler]);
        DB::shouldReceive('connection')->andReturn($connection);

        return $connection;
    }

    /** @return array<string, mixed> */
    private function manifest(string $engine = 'mysql', int $major = 8): array
    {
        return [
            'engine' => $engine, 'server_major' => $major,
            'migration_fingerprint' => app(DatabaseBackupEngine::class)->migrationFingerprint(),
        ];
    }

    public function test_recovery_rejects_selected_packages_before_database_access(): void
    {
        DB::shouldReceive('connection')->never();
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('CLI recovery requires a full database backup');
        app(DatabaseBackupEngine::class)->assertCompatible(['scope' => 'tables'], true);
    }

    /** @return array<string, array{string, string, int}> */
    public static function supportedServers(): array
    {
        return [
            'MySQL' => ['8.4.0', 'mysql', 8],
            'MariaDB' => ['11.4.5-MariaDB', 'mariadb', 11],
            'MariaDB legacy prefix' => ['5.5.5-11.4.5-MariaDB', 'mariadb', 11],
        ];
    }

    #[DataProvider('supportedServers')]
    public function test_matching_engine_major_and_migrations_are_accepted(string $version, string $engine, int $major): void
    {
        $this->connection($version);
        $backupEngine = app(DatabaseBackupEngine::class);
        $backupEngine->assertCompatible($this->manifest($engine, $major), true);
        $info = $backupEngine->info(true);
        $this->assertSame($engine, $info['engine']);
        $this->assertSame($major, $info['server_major']);
        $this->assertSame('fieldops_test', $info['database']);
        $this->assertFalse(str_starts_with($info['server_version'], '5.5.5-'));
    }

    /** @return array<string, array{string, string|int}> */
    public static function incompatibleFields(): array
    {
        return [
            'different engine' => ['engine', 'mariadb'],
            'different server major' => ['server_major', 9],
            'different migrations' => ['migration_fingerprint', 'historical-schema'],
        ];
    }

    #[DataProvider('incompatibleFields')]
    public function test_restore_rejects_incompatible_packages_even_during_recovery(string $field, string|int $value): void
    {
        $this->connection();
        $manifest = $this->manifest();
        $manifest[$field] = $value;
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('same database engine, server major version, and application migrations');
        app(DatabaseBackupEngine::class)->assertCompatible($manifest, true);
    }

    /** @return array<string, array{array<string, mixed>, string}> */
    public static function unsupportedRuntime(): array
    {
        return [
            'Redis cache' => [['cache.default' => 'redis'], 'Shared external runtime stores'],
            'Redis sessions' => [['session.driver' => 'redis'], 'Shared external runtime stores'],
            'Redis queue' => [['queue.default' => 'redis'], 'Shared external runtime stores'],
            'separate cache DB' => [['cache.default' => 'database', 'cache.stores.database.connection' => 'other'], 'separate cache database'],
            'separate cache lock DB' => [['cache.default' => 'database', 'cache.stores.database.connection' => null, 'cache.stores.database.lock_connection' => 'other'], 'separate cache lock database'],
            'separate queue DB' => [['queue.default' => 'database', 'queue.connections.database.connection' => 'other'], 'separate queue database'],
            'separate session DB' => [['session.connection' => 'other'], 'separate session database'],
            'separate batches DB' => [['queue.batching.database' => 'other'], 'queue batches and failures'],
            'separate failed jobs DB' => [['queue.failed.database' => 'other'], 'queue batches and failures'],
            'external failed jobs' => [['queue.failed.driver' => 'dynamodb'], 'external failed-job store'],
            'external permission cache' => [['permission.cache.store' => 'redis'], 'permission caching'],
            'business table as sessions' => [['session.table' => 'users'], 'dedicated application tables'],
            'dormant sessions target countries' => [['session.driver' => 'file', 'session.table' => 'countries'], 'dedicated application tables'],
            'dormant queue targets timezones' => [['queue.default' => 'sync', 'queue.connections.database.table' => 'timezones'], 'dedicated application tables'],
            'business table as jobs' => [['queue.connections.database.table' => 'system_settings'], 'dedicated application tables'],
            'business table as cache' => [['cache.stores.array.table' => 'media_assets'], 'dedicated application tables'],
            'unsafe runtime identifier' => [['queue.failed.table' => 'failed_jobs; DROP TABLE users'], 'simple identifiers'],
        ];
    }

    #[DataProvider('unsupportedRuntime')]
    public function test_restore_rejects_external_or_unsafe_runtime_configuration_before_accessing_database(array $settings, string $message): void
    {
        config($settings);
        DB::shouldReceive('connection')->never();
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage($message);
        app(DatabaseBackupEngine::class)->assertCompatible($this->manifest(), true);
    }

    public function test_restore_rejects_backup_storage_overlapping_file_sessions_before_database_access(): void
    {
        config([
            'backups.root' => $this->root.'/backup-child',
            'session.files' => $this->root,
        ]);
        DB::shouldReceive('connection')->never();
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('must be separate from file-session and file-cache runtime directories');
        app(DatabaseBackupEngine::class)->assertCompatible($this->manifest(), true);
    }

    public function test_restore_rejects_backup_storage_overlapping_active_file_cache_paths_before_database_access(): void
    {
        config([
            'backups.root' => $this->root.'/backup-child',
            'session.driver' => 'database',
            'cache.default' => 'file',
            'cache.stores.file.driver' => 'file',
            'cache.stores.file.path' => $this->root,
            'cache.stores.file.lock_path' => $this->root.'/locks',
        ]);
        DB::shouldReceive('connection')->never();
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('must be separate from file-session and file-cache runtime directories');
        app(DatabaseBackupEngine::class)->assertCompatible($this->manifest(), true);
    }

    public function test_restore_rejects_backup_storage_overlapping_separate_file_cache_lock_path_before_database_access(): void
    {
        config([
            'backups.root' => $this->root.'/backup-child',
            'session.driver' => 'database',
            'cache.default' => 'file',
            'cache.stores.file.driver' => 'file',
            'cache.stores.file.path' => $this->root.'/cache',
            'cache.stores.file.lock_path' => $this->root,
        ]);
        DB::shouldReceive('connection')->never();
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('must be separate from file-session and file-cache runtime directories');
        app(DatabaseBackupEngine::class)->assertCompatible($this->manifest(), true);
    }

    public function test_supported_custom_runtime_table_names_pass_preflight(): void
    {
        config([
            'session.table' => 'app_sessions', 'queue.connections.database.table' => 'app_jobs',
            'queue.batching.table' => 'app_batches', 'queue.failed.table' => 'app_failures',
            'cache.stores.array.table' => 'app_cache', 'cache.stores.array.lock_table' => 'app_cache_locks',
        ]);
        $this->connection();
        $engine = app(DatabaseBackupEngine::class);
        $engine->assertCompatible($this->manifest(), true);
        $this->assertSame('fieldops_test', $engine->info(true)['database']);
    }

    public function test_restore_requires_database_event_scheduler_to_be_stopped(): void
    {
        $this->connection(scheduler: 'ON');
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('event_scheduler=OFF');
        app(DatabaseBackupEngine::class)->assertCompatible($this->manifest(), true);
    }

    public function test_nontransactional_table_is_rejected_before_dump_process_starts(): void
    {
        $connection = $this->connection();
        $connection->shouldReceive('select')
            ->with('SELECT ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?', ['fieldops_test', 'BASE TABLE'])
            ->once()->andReturn([(object) ['engine' => 'InnoDB'], (object) ['engine' => 'MyISAM']]);
        $path = $this->root.'/dump.sql';
        try {
            app(DatabaseBackupEngine::class)->dump($path);
            $this->fail('A nontransactional table must prevent the dump.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('InnoDB', $exception->getMessage());
            $this->assertFileDoesNotExist($path);
            $this->assertEmpty(glob($this->root.'/client-*'));
        }
    }

    public function test_process_failure_is_safe_and_removes_temporary_credentials(): void
    {
        $connection = $this->connection();
        $connection->shouldReceive('getConfig')->andReturn([
            'username' => 'backup-user', 'password' => 'test-only-sensitive-password', 'host' => '127.0.0.1', 'port' => 3306,
        ]);
        // PHP rejects the MySQL-only --defaults-file option, providing a real,
        // deterministic failed process without accessing any database server.
        $engine = new class extends DatabaseBackupEngine
        {
            public function invokeClient(): void
            {
                $this->run('mysql_client', ['-r', 'exit(1);']);
            }
        };
        try {
            $engine->invokeClient();
            $this->fail('The client process must fail.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Database client failed', $exception->getMessage());
            $this->assertStringNotContainsString('test-only-sensitive-password', $exception->getMessage());
            $this->assertEmpty(glob($this->root.'/client-*'));
        }
    }

    public function test_split_database_hosts_fail_and_remove_credentials_before_process_execution(): void
    {
        $connection = $this->connection();
        $connection->shouldReceive('getConfig')->andReturn([
            'username' => 'backup-user', 'password' => 'test-only-sensitive-password', 'host' => ['primary', 'replica'],
        ]);
        $engine = new class extends DatabaseBackupEngine
        {
            public function invokeClient(): void
            {
                $this->run('mysql_client', []);
            }
        };
        try {
            $engine->invokeClient();
            $this->fail('Read/write splitting must prevent native execution.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('single database host', $exception->getMessage());
            $this->assertEmpty(glob($this->root.'/client-*'));
        }
    }

    public function test_native_client_timeout_is_safe_and_removes_temporary_credentials(): void
    {
        $connection = $this->connection();
        $connection->shouldReceive('getConfig')->andReturn([
            'username' => 'backup-user', 'password' => 'test-only-sensitive-password', 'host' => '127.0.0.1', 'port' => 3306,
        ]);
        // The wrapper ignores client arguments and keeps a real child process
        // running beyond the deadline without contacting a database server.
        if (DIRECTORY_SEPARATOR === '\\') {
            $executable = $this->root.'/slow-client.cmd';
            $php = str_replace('%', '%%', PHP_BINARY);
            file_put_contents($executable, '@echo off'."\r\n".'"'.$php.'" -r "sleep(2);"'."\r\n");
        } else {
            $executable = $this->root.'/slow-client.sh';
            file_put_contents($executable, "#!/bin/sh\nexec ".escapeshellarg(PHP_BINARY)." -r 'sleep(2);'\n");
            chmod($executable, 0700);
        }
        config(['backups.mysql_client' => $executable, 'backups.process_timeout' => 0.05]);
        $engine = new class extends DatabaseBackupEngine
        {
            public function invokeClient(): void
            {
                $this->run('mysql_client', []);
            }
        };
        try {
            $engine->invokeClient();
            $this->fail('The native client must exceed its deadline.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Database operation timed out', $exception->getMessage());
            $this->assertStringNotContainsString('test-only-sensitive-password', $exception->getMessage());
            $this->assertEmpty(glob($this->root.'/client-*'));
        }
    }

    public function test_missing_native_clients_are_reported_without_running_processes(): void
    {
        $this->connection();
        config(['backups.mysql_client' => $this->root.'/missing-client']);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('dump/import client is unavailable');
        app(DatabaseBackupEngine::class)->assertCompatible($this->manifest(), true);
    }
}
