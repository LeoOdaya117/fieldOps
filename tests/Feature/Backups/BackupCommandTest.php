<?php

namespace Tests\Feature\Backups;

use App\Actions\Backups\BackupPackage;
use App\Actions\Backups\BackupStore;
use App\Actions\Backups\DatabaseBackupEngine;
use App\Actions\Backups\ExecuteBackupOperation;
use App\Actions\Backups\ImportBackupPackage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class BackupCommandTest extends TestCase
{
    use RefreshDatabase;

    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = storage_path('framework/testing/backup-command-'.Str::uuid());
        config(['backups.root' => $this->root, 'backups.signing_key' => 'test-only-signing-key-never-show-in-output']);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->root);
        parent::tearDown();
    }

    /** @return array<string, mixed> */
    private function backup(): array
    {
        $store = app(BackupStore::class);
        $path = $store->temporaryPath('fieldops');
        file_put_contents($path, 'private-sql-payload-never-show-in-output');

        return $store->publish($path, [
            'created_at' => now()->toIso8601String(), 'engine' => 'mysql', 'server_version' => '8.4.0',
        ]);
    }

    /** @return array<string,mixed> */
    private function cliContext(): array
    {
        return ['actor' => ['id' => null, 'name' => 'CLI operator', 'source' => 'cli'], 'audit_note' => ''];
    }

    /** @return array<string, array{string|null}> */
    public static function invalidConfirmation(): array
    {
        return ['missing' => [null], 'wrong' => ['other_database']];
    }

    #[DataProvider('invalidConfirmation')]
    public function test_noninteractive_restore_requires_exact_database_confirmation_before_execution(?string $confirmation): void
    {
        $execute = Mockery::mock(ExecuteBackupOperation::class);
        $execute->shouldNotReceive('inline');
        $this->app->instance(ExecuteBackupOperation::class, $execute);
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldNotReceive('inspect');
        $this->app->instance(BackupPackage::class, $package);
        $arguments = ['source' => (string) Str::uuid(), '--no-interaction' => true];
        if ($confirmation !== null) {
            $arguments['--database'] = $confirmation;
        }
        $this->artisan('backups:restore', $arguments)
            ->expectsOutput('Restore cancelled. Confirm the exact configured database name.')
            ->assertFailed();
        $this->assertEmpty(app(BackupStore::class)->operations());
    }

    public function test_recovery_requires_an_existing_maintenance_marker(): void
    {
        $execute = Mockery::mock(ExecuteBackupOperation::class);
        $execute->shouldNotReceive('inline');
        $this->app->instance(ExecuteBackupOperation::class, $execute);
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldNotReceive('inspect');
        $this->app->instance(BackupPackage::class, $package);
        $this->artisan('backups:restore', [
            'source' => (string) Str::uuid(), '--database' => DB::connection()->getDatabaseName(),
            '--recovery' => true, '--no-interaction' => true,
        ])->expectsOutput('Recovery requires an existing failed restore maintenance window.')->assertFailed();
        $this->assertEmpty(app(BackupStore::class)->operations());
    }

    public function test_cli_recovery_rejects_selected_package_and_keeps_maintenance_active(): void
    {
        $backup = $this->backup();
        $store = app(BackupStore::class);
        $store->beginMaintenance(Str::uuid()->toString());
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldReceive('inspect')->once()->with($store->packagePath((string) $backup['id']))
            ->andReturn(['scope' => 'tables']);
        $this->app->instance(BackupPackage::class, $package);
        $execute = Mockery::mock(ExecuteBackupOperation::class);
        $execute->shouldNotReceive('inline');
        $this->app->instance(ExecuteBackupOperation::class, $execute);
        $this->artisan('backups:restore', ['source' => $backup['id'], '--database' => DB::connection()->getDatabaseName(),
            '--recovery' => true, '--no-interaction' => true])
            ->expectsOutput('CLI recovery requires a full database backup or the full safety backup. Selected-table packages cannot recover a damaged database.')
            ->assertFailed();
        $this->assertTrue($store->maintenance());
        $this->assertEmpty($store->operations());
    }

    public function test_create_uses_the_independent_inline_runner_and_reports_only_the_id(): void
    {
        $id = (string) Str::uuid();
        $execute = Mockery::mock(ExecuteBackupOperation::class);
        $execute->shouldReceive('inline')->once()->with('backup', null, false, [
            'scope' => 'database', 'requested_tables' => [], 'tables' => [], 'dependency_edges' => [], ...$this->cliContext(),
        ])->andReturn(['status' => 'succeeded', 'backup_id' => $id]);
        $this->app->instance(ExecuteBackupOperation::class, $execute);
        $this->artisan('backups:create')->expectsOutput('Backup created: '.$id)->assertSuccessful();
    }

    public function test_list_remains_available_without_database_queries_and_omits_private_values(): void
    {
        $backup = $this->backup();
        $store = app(BackupStore::class);
        $operation = $store->queue('backup');
        $operation['status'] = 'failed';
        $operation['error'] = 'Check database availability.';
        $store->saveOperation($operation);
        $queries = [];
        DB::listen(function ($query) use (&$queries): void {
            $queries[] = $query->sql;
        });
        $this->assertSame(0, Artisan::call('backups:list'));
        $output = Artisan::output();
        $this->assertStringContainsString((string) $backup['id'], $output);
        $this->assertStringContainsString((string) $operation['id'], $output);
        $this->assertStringContainsString('failed', $output);
        $this->assertStringNotContainsString($this->root, $output);
        $this->assertStringNotContainsString('test-only-signing-key', $output);
        $this->assertStringNotContainsString('private-sql-payload', $output);
        $this->assertSame([], $queries);
    }

    public function test_delete_removes_unprotected_package_and_handles_unknown_id_safely(): void
    {
        $backup = $this->backup();
        $store = app(BackupStore::class);
        $this->artisan('backups:delete', ['backup' => $backup['id']])
            ->expectsOutput('Backup deleted.')->assertSuccessful();
        $this->assertFileDoesNotExist($store->packagePath((string) $backup['id']));
        $this->artisan('backups:delete', ['backup' => Str::uuid()->toString()])
            ->expectsOutput('The requested backup is unavailable.')->assertFailed();
    }

    public function test_delete_cannot_remove_a_queued_restore_source(): void
    {
        $backup = $this->backup();
        $store = app(BackupStore::class);
        $store->queue('restore', (string) $backup['id']);
        $this->artisan('backups:delete', ['backup' => $backup['id']])
            ->expectsOutput('This backup is protected by an active or failed restore. Recover the database before deleting it.')
            ->assertFailed();
        $this->assertFileExists($store->packagePath((string) $backup['id']));
    }

    public function test_worker_once_returns_failure_for_a_failed_operation(): void
    {
        $id = (string) Str::uuid();
        $execute = Mockery::mock(ExecuteBackupOperation::class);
        $execute->shouldReceive('next')->once()->andReturn(['id' => $id, 'status' => 'failed', 'error' => 'The database import failed.']);
        $this->app->instance(ExecuteBackupOperation::class, $execute);
        $this->artisan('backups:work', ['--once' => true])
            ->expectsOutput($id.': failed')->expectsOutput('The database import failed.')->assertFailed();
        $this->assertTrue(app(BackupStore::class)->runnerAvailable());
    }

    public function test_worker_once_without_work_exits_successfully(): void
    {
        $execute = Mockery::mock(ExecuteBackupOperation::class);
        $execute->shouldReceive('next')->once()->andReturnNull();
        $this->app->instance(ExecuteBackupOperation::class, $execute);
        $this->artisan('backups:work', ['--once' => true])->assertSuccessful();
    }

    public function test_confirmed_restore_checks_saved_package_and_invokes_the_runner(): void
    {
        $backup = $this->backup();
        $manifest = ['engine' => 'mysql', 'server_major' => 8, 'migration_fingerprint' => str_repeat('a', 64)];
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldReceive('inspect')->once()->with(app(BackupStore::class)->packagePath((string) $backup['id']))->andReturn($manifest);
        $this->app->instance(BackupPackage::class, $package);
        $engine = Mockery::mock(DatabaseBackupEngine::class);
        $engine->shouldReceive('assertCompatible')->once()->with($manifest, false);
        $this->app->instance(DatabaseBackupEngine::class, $engine);
        $execute = Mockery::mock(ExecuteBackupOperation::class);
        $execute->shouldReceive('inline')->once()->with('restore', $backup['id'], false, $this->cliContext())->andReturn(['status' => 'succeeded']);
        $this->app->instance(ExecuteBackupOperation::class, $execute);
        $this->artisan('backups:restore', [
            'source' => $backup['id'], '--database' => DB::connection()->getDatabaseName(), '--no-interaction' => true,
        ])->expectsOutput('Database restored. All users must sign in again.')->assertSuccessful();
    }

    public function test_confirmed_local_package_restore_imports_the_package_before_execution(): void
    {
        $source = $this->root.'/operator-backup.fieldops';
        $id = (string) Str::uuid();
        $import = Mockery::mock(ImportBackupPackage::class);
        $import->shouldReceive('handle')->once()->with($source, false, $this->cliContext())->andReturn(['id' => $id]);
        $this->app->instance(ImportBackupPackage::class, $import);
        $execute = Mockery::mock(ExecuteBackupOperation::class);
        $execute->shouldReceive('inline')->once()->with('restore', $id, false, $this->cliContext())->andReturn(['status' => 'succeeded']);
        $this->app->instance(ExecuteBackupOperation::class, $execute);
        $this->artisan('backups:restore', [
            'source' => $source, '--database' => DB::connection()->getDatabaseName(), '--no-interaction' => true,
        ])->expectsOutput('Database restored. All users must sign in again.')->assertSuccessful();
    }

    public function test_cli_selection_and_note_are_resolved_and_recorded_with_cli_provenance(): void
    {
        $scope = ['scope' => 'tables', 'requested_tables' => ['parents'], 'tables' => ['children', 'parents'],
            'dependency_edges' => [['table' => 'children', 'related_table' => 'parents']]];
        $engine = Mockery::mock(DatabaseBackupEngine::class);
        $engine->shouldReceive('backupScope')->once()->with(['parents'])->andReturn($scope);
        $this->app->instance(DatabaseBackupEngine::class, $engine);
        $execute = Mockery::mock(ExecuteBackupOperation::class);
        $execute->shouldReceive('inline')->once()->with('backup', null, false, [...$scope,
            'actor' => ['id' => null, 'name' => 'CLI operator', 'source' => 'cli'], 'audit_note' => 'Before import'])
            ->andReturn(['status' => 'succeeded', 'backup_id' => 'selected-id']);
        $this->app->instance(ExecuteBackupOperation::class, $execute);
        $this->artisan('backups:create', ['--table' => ['parents'], '--note' => 'Before import'])
            ->expectsOutput('Backup created: selected-id')->assertSuccessful();
    }

    public function test_cli_audit_note_is_bounded_before_execution(): void
    {
        $execute = Mockery::mock(ExecuteBackupOperation::class);
        $execute->shouldNotReceive('inline');
        $this->app->instance(ExecuteBackupOperation::class, $execute);
        $this->artisan('backups:create', ['--note' => str_repeat('x', 1001)])
            ->expectsOutput('The audit note must not exceed 1000 characters.')->assertFailed();
    }
}
