<?php

namespace Tests\Feature\Backups;

use App\Actions\Backups\BackupPackage;
use App\Actions\Backups\BackupStore;
use App\Actions\Backups\DatabaseBackupEngine;
use App\Actions\Backups\ExecuteBackupOperation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class BackupLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = storage_path('framework/testing/backups-'.Str::uuid());
        config(['backups.root' => $this->root, 'backups.drain_timeout' => 0]);
    }

    protected function tearDown(): void
    {
        app()->maintenanceMode()->deactivate();
        File::deleteDirectory($this->root);
        parent::tearDown();
    }

    /** @return array<string, mixed> */
    private function manifest(): array
    {
        return ['created_at' => now()->toIso8601String(), 'engine' => 'mysql', 'server_version' => '8.4.0', 'migration_fingerprint' => str_repeat('a', 64)];
    }

    /** @return array<string, mixed> */
    private function backup(BackupStore $store): array
    {
        $path = $store->temporaryPath('fieldops');
        file_put_contents($path, 'signed-package');

        return $store->publish($path, $this->manifest());
    }

    public function test_durable_queue_allows_one_operation_and_protects_restore_source(): void
    {
        $store = app(BackupStore::class);
        $backup = $this->backup($store);
        $operation = $store->queue('restore', (string) $backup['id']);
        $this->assertSame('queued', $operation['status']);
        $this->assertTrue($store->busy());
        $this->assertTrue($store->backups()[0]['protected']);
        try {
            $store->delete((string) $backup['id']);
            $this->fail('The restore source must be protected.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('protected', $exception->getMessage());
        }
        $this->expectException(RuntimeException::class);
        $store->queue('backup');
    }

    public function test_independent_runner_publishes_backup_and_preserves_history(): void
    {
        $store = app(BackupStore::class);
        $engine = $this->engine();
        $engine->shouldReceive('info')->once()->with(false)->andReturn($this->manifest());
        $engine->shouldReceive('dump')->once()->andReturnUsing(static fn (string $path) => file_put_contents($path, 'CREATE TABLE example (id int);'));
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldReceive('create')->once()->andReturnUsing(function (string $sql, array $info, string $path): array {
            file_put_contents($path, 'signed-package');

            return $this->manifest();
        });
        $package->shouldReceive('inspect')->once()->andReturn($this->manifest());
        $queued = $store->queue('backup');
        $operation = (new ExecuteBackupOperation($store, $package, $engine))->next();
        $this->assertNotNull($operation);
        $this->assertSame($queued['id'], $operation['id']);
        $this->assertSame('succeeded', $operation['status']);
        $this->assertFileExists($store->packagePath((string) $operation['backup_id']));
        $this->assertEmpty(glob($store->root().'/tmp/*'));
        $this->assertFalse($store->busy());
    }

    public function test_background_backup_notifies_its_web_creator_once_after_success(): void
    {
        $store = app(BackupStore::class);
        $creator = User::factory()->create();
        $actor = ['id' => (string) $creator->getKey(), 'name' => $creator->name, 'source' => 'web'];
        $engine = $this->engine();
        $engine->shouldReceive('info')->once()->with(false)->andReturn($this->manifest());
        $engine->shouldReceive('dump')->once()->andReturnUsing(static fn (string $path) => file_put_contents($path, 'CREATE TABLE example (id int);'));
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldReceive('create')->once()->andReturnUsing(function (string $sql, array $info, string $path): array {
            file_put_contents($path, 'signed-package');

            return $this->manifest();
        });
        $package->shouldReceive('inspect')->once()->andReturn($this->manifest());
        $queued = $store->queue('backup', null, false, ['actor' => $actor]);
        $this->assertSame(0, $creator->notifications()->count());

        $execute = new ExecuteBackupOperation($store, $package, $engine);
        $operation = $execute->next();
        $this->assertSame('succeeded', $operation['status']);
        $notification = $creator->notifications()->sole();
        $this->assertSame('backup.ready', $notification->data['event']);
        $this->assertSame($operation['backup_id'], $notification->data['backupId']);
        $this->assertSame($queued['id'], $notification->data['operationId']);
        $this->assertNull($execute->next());
        $this->assertSame(1, $creator->notifications()->count());
    }

    public function test_failed_background_backup_notifies_web_creator_without_leaking_client_errors(): void
    {
        $store = app(BackupStore::class);
        $creator = User::factory()->create();
        $engine = $this->engine();
        $engine->shouldReceive('info')->once()->with(false)->andThrow(new \PDOException('client password and SQL details'));
        $queued = $store->queue('backup', null, false, [
            'actor' => ['id' => (string) $creator->getKey(), 'name' => $creator->name, 'source' => 'web'],
        ]);

        $operation = (new ExecuteBackupOperation($store, Mockery::mock(BackupPackage::class), $engine))->next();
        $this->assertSame('failed', $operation['status']);
        $notification = $creator->notifications()->sole();
        $this->assertSame('backup.failed', $notification->data['event']);
        $this->assertNull($notification->data['backupId']);
        $this->assertSame($queued['id'], $notification->data['operationId']);
        $this->assertStringNotContainsString('password', $notification->data['body']);
        $this->assertStringNotContainsString('SQL details', $notification->data['body']);
        $this->assertStringNotContainsString('password', (string) $operation['error']);
    }

    public function test_interrupted_background_backup_notifies_its_web_creator_once_when_the_runner_recovers(): void
    {
        $store = app(BackupStore::class);
        $creator = User::factory()->create();
        $queued = $store->queue('backup', null, false, [
            'actor' => ['id' => (string) $creator->getKey(), 'name' => $creator->name, 'source' => 'web'],
        ]);
        $queued['status'] = 'running';
        $store->saveOperation($queued);
        $execute = new ExecuteBackupOperation($store, Mockery::mock(BackupPackage::class), Mockery::mock(DatabaseBackupEngine::class));

        $this->assertNull($execute->next());
        $this->assertSame('interrupted', $store->operations()[0]['status']);
        $notification = $creator->notifications()->sole();
        $this->assertSame('backup.failed', $notification->data['event']);
        $this->assertSame($queued['id'], $notification->data['operationId']);
        $this->assertNull($execute->next());
        $this->assertSame(1, $creator->notifications()->count());
    }

    public function test_abandoned_running_restore_is_interrupted_and_never_retried(): void
    {
        $store = app(BackupStore::class);
        $backup = $this->backup($store);
        $operation = $store->queue('restore', (string) $backup['id']);
        $operation['status'] = 'running';
        $store->saveOperation($operation);
        $store->beginMaintenance((string) $operation['id']);
        $execute = new ExecuteBackupOperation($store, Mockery::mock(BackupPackage::class), Mockery::mock(DatabaseBackupEngine::class));
        $this->assertNull($execute->next());
        $this->assertSame('interrupted', $store->operations()[0]['status']);
        $this->assertTrue($store->maintenance());
        $this->assertTrue($store->backups()[0]['protected']);
    }

    public function test_selected_creation_passes_resolved_tables_and_creator_to_the_signed_package(): void
    {
        $store = app(BackupStore::class);
        $actor = ['id' => '7', 'name' => 'Snapshot administrator', 'source' => 'web'];
        $scope = ['scope' => 'tables', 'tables' => ['child', 'parent'], 'requested_tables' => ['child'],
            'dependency_edges' => [['table' => 'child', 'related_table' => 'parent']]];
        $engine = $this->engine();
        $engine->shouldReceive('info')->once()->with(false)->andReturn($this->manifest());
        $engine->shouldReceive('backupScope')->once()->with(['child'])->andReturn($scope);
        $engine->shouldReceive('dump')->once()->with(Mockery::type('string'), ['child', 'parent'])
            ->andReturnUsing(static fn (string $path) => file_put_contents($path, 'selected sql'));
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldReceive('create')->once()->andReturnUsing(function (string $sql, array $info, string $path) use ($scope, $actor): array {
            $this->assertSame($scope['tables'], $info['tables']);
            $this->assertSame($actor, $info['created_by']);
            $this->assertSame('Before reference update', $info['audit_note']);
            file_put_contents($path, 'signed selected package');

            return [...$this->manifest(), ...$info];
        });
        $package->shouldReceive('inspect')->once()->andReturn($this->manifest());
        $store->queue('backup', null, false, [...$scope, 'actor' => $actor, 'audit_note' => 'Before reference update']);
        $operation = (new ExecuteBackupOperation($store, $package, $engine))->next();
        $this->assertSame('succeeded', $operation['status']);
        $backup = $store->backup((string) $operation['backup_id']);
        $this->assertSame(['child'], $backup['requested_tables']);
        $this->assertSame($actor, $backup['created_by']);
    }

    public function test_changed_dependencies_abort_selected_creation_before_dumping(): void
    {
        $store = app(BackupStore::class);
        $engine = $this->engine();
        $engine->shouldReceive('info')->once()->with(false)->andReturn($this->manifest());
        $engine->shouldReceive('backupScope')->once()->with(['parent'])->andReturn([
            'scope' => 'tables', 'tables' => ['new_child', 'parent'], 'requested_tables' => ['parent'],
        ]);
        $engine->shouldNotReceive('dump');
        $store->queue('backup', null, false, ['scope' => 'tables', 'tables' => ['parent'], 'requested_tables' => ['parent']]);
        $operation = (new ExecuteBackupOperation($store, Mockery::mock(BackupPackage::class), $engine))->next();
        $this->assertSame('failed', $operation['status']);
        $this->assertStringContainsString('relationships changed', $operation['error']);
        $this->assertEmpty($store->backups());
    }

    public function test_unsafe_exception_contents_are_not_exposed_in_history(): void
    {
        $store = app(BackupStore::class);
        $engine = $this->engine();
        $engine->shouldReceive('info')->andThrow(new \PDOException('password=secret SQL SELECT credentials'));
        $store->queue('backup');
        $operation = (new ExecuteBackupOperation($store, Mockery::mock(BackupPackage::class), $engine))->next();
        $this->assertSame('failed', $operation['status']);
        $this->assertStringNotContainsString('secret', (string) $operation['error']);
        $this->assertEmpty($store->backups());
    }

    public function test_restore_aborts_without_replacement_when_writers_are_running(): void
    {
        $store = app(BackupStore::class);
        $backup = $this->backup($store);
        $store->queue('restore', (string) $backup['id']);
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldReceive('inspect')->once()->andReturn($this->manifest());
        $package->shouldReceive('extract')->once()->andReturnUsing(function (string $source, string $sql): array {
            file_put_contents($sql, 'sql');

            return $this->manifest();
        });
        $engine = $this->engine();
        $engine->shouldReceive('assertCompatible')->once();
        $engine->shouldNotReceive('replace');
        $writer = $store->lock('writers', LOCK_SH);
        try {
            $operation = (new ExecuteBackupOperation($store, $package, $engine))->next();
        } finally {
            $store->unlock($writer);
        }
        $this->assertSame('failed', $operation['status']);
        $this->assertFalse($store->maintenance());
        $this->assertFalse(app()->maintenanceMode()->active());
    }

    public function test_safety_backup_failure_does_not_replace_database_or_rotate_auth_epoch(): void
    {
        $store = app(BackupStore::class);
        $epoch = $store->authEpoch();
        $backup = $this->backup($store);
        $store->queue('restore', (string) $backup['id']);
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldReceive('inspect')->once()->andReturn($this->manifest());
        $package->shouldReceive('extract')->once()->andReturnUsing(function (string $source, string $sql): array {
            file_put_contents($sql, 'sql');

            return $this->manifest();
        });
        $engine = $this->engine();
        $engine->shouldReceive('assertCompatible')->twice();
        $engine->shouldReceive('info')->with(true)->once()->andReturn($this->manifest());
        $engine->shouldReceive('dump')->once()->andThrow(new RuntimeException('Insufficient disk space.'));
        $engine->shouldNotReceive('replace');
        $operation = (new ExecuteBackupOperation($store, $package, $engine))->next();
        $this->assertSame('failed', $operation['status']);
        $this->assertSame($epoch, $store->authEpoch());
        $this->assertFalse($store->maintenance());
        $this->assertEmpty(glob($store->root().'/tmp/*'));
    }

    public function test_destructive_failure_keeps_maintenance_and_verified_safety_package(): void
    {
        $store = app(BackupStore::class);
        $epoch = $store->authEpoch();
        $backup = $this->backup($store);
        $store->queue('restore', (string) $backup['id']);
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldReceive('inspect')->twice()->andReturn($this->manifest());
        $package->shouldReceive('extract')->andReturnUsing(function (string $source, string $sql): array {
            file_put_contents($sql, 'sql');

            return $this->manifest();
        });
        $package->shouldReceive('create')->andReturnUsing(function (string $sql, array $info, string $path): array {
            file_put_contents($path, 'signed-package');

            return $this->manifest();
        });
        $engine = $this->engine();
        $engine->shouldReceive('assertCompatible')->twice();
        $engine->shouldReceive('info')->with(true)->andReturn($this->manifest());
        $engine->shouldReceive('dump')->andReturnUsing(static fn (string $path) => file_put_contents($path, 'safety sql'));
        $engine->shouldReceive('replace')->once()->andThrow(new RuntimeException('The database import failed.'));
        $operation = (new ExecuteBackupOperation($store, $package, $engine))->next();
        $this->assertSame('failed', $operation['status']);
        $this->assertTrue($store->maintenance());
        $this->assertTrue(app()->maintenanceMode()->active());
        $this->assertNotSame($epoch, $store->authEpoch());
        $this->assertFileExists($store->packagePath((string) $operation['safety_backup_id']));
        $this->assertCount(2, array_filter($store->backups(), static fn (array $record): bool => $record['protected']));
    }

    public function test_backup_ids_cannot_address_arbitrary_files(): void
    {
        $this->expectException(RuntimeException::class);
        app(BackupStore::class)->packagePath('../../.env');
    }

    public function test_successful_recovery_keeps_history_and_releases_retained_packages(): void
    {
        $store = app(BackupStore::class);
        $backup = $this->backup($store);
        $failed = $store->queue('restore', (string) $backup['id']);
        $failed['status'] = 'failed';
        $store->saveOperation($failed);
        $store->beginMaintenance((string) $failed['id']);
        app()->maintenanceMode()->activate(['time' => time()]);
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldReceive('inspect')->once()->andReturn($this->manifest());
        $package->shouldReceive('extract')->once()->andReturnUsing(function (string $source, string $sql): array {
            file_put_contents($sql, 'recovery sql');

            return $this->manifest();
        });
        $engine = $this->engine();
        $engine->shouldReceive('assertCompatible')->twice()->with(Mockery::type('array'), true);
        $engine->shouldNotReceive('dump');
        $engine->shouldReceive('replace')->once()->with(Mockery::type('string'));
        $engine->shouldReceive('info')->once()->withNoArgs()->andReturn($this->manifest());
        $engine->shouldReceive('verifyAndResetRuntime')->once();
        $actor = ['id' => '42', 'name' => 'Recovery administrator', 'source' => 'cli'];
        $operation = (new ExecuteBackupOperation($store, $package, $engine))->inline('restore', (string) $backup['id'], true, [
            'actor' => $actor, 'audit_note' => 'Recover after interrupted import',
        ]);
        $this->assertSame('succeeded', $operation['status'], (string) ($operation['error'] ?? ''));
        $this->assertFalse($store->maintenance());
        $this->assertFalse(app()->maintenanceMode()->active());
        $this->assertCount(2, $store->operations());
        $this->assertFalse($store->backups()[0]['protected']);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'backups.database.restored', 'actor_user_id' => null]);
        $recovered = array_values(array_filter($store->auditEvents(), static fn (array $event): bool => $event['event'] === 'restore.recovered'))[0];
        $this->assertSame($actor, $recovered['actor']);
        $this->assertSame('Recover after interrupted import', $recovered['audit_note']);
        $this->assertSame($backup['created_at'], $recovered['source_created_at']);
        $store->delete((string) $backup['id']);
        $this->assertEmpty($store->backups());
    }

    public function test_nondestructive_failure_does_not_permanently_protect_a_package(): void
    {
        $store = app(BackupStore::class);
        $backup = $this->backup($store);
        $operation = $store->queue('restore', (string) $backup['id']);
        $operation['status'] = 'failed';
        $store->saveOperation($operation);
        $store->delete((string) $backup['id']);
        $this->assertEmpty($store->backups());
        $this->assertSame('failed', $store->operations()[0]['status']);
    }

    public function test_selected_restore_uses_signed_scope_and_creates_a_full_safety_backup(): void
    {
        $store = app(BackupStore::class);
        $creator = ['id' => '7', 'name' => 'Original administrator', 'source' => 'web'];
        $actor = ['id' => '19', 'name' => 'Restore administrator', 'source' => 'web'];
        $selected = [...$this->manifest(), 'format_version' => 2, 'scope' => 'tables',
            'tables' => ['child', 'parent'], 'requested_tables' => ['child'],
            'dependency_edges' => [['table' => 'child', 'related_table' => 'parent']],
            'created_by' => $creator, 'audit_note' => 'Before reference import'];
        $path = $store->temporaryPath('fieldops');
        file_put_contents($path, 'signed-selected-package');
        $backup = $store->publish($path, $selected);
        $queued = $store->queue('restore', (string) $backup['id'], false, ['actor' => $actor, 'audit_note' => 'Undo import']);
        // Local metadata is not the authority for destructive scope.
        $queued['scope'] = 'database';
        $queued['tables'] = ['unrelated'];
        $store->saveOperation($queued);
        $package = Mockery::mock(BackupPackage::class);
        $package->shouldReceive('inspect')->once()->with($store->packagePath((string) $backup['id']))->andReturn($selected);
        $package->shouldReceive('extract')->once()->andReturnUsing(function (string $source, string $sql) use ($selected): array {
            file_put_contents($sql, 'selected sql');

            return $selected;
        });
        $package->shouldReceive('create')->once()->andReturnUsing(function (string $sql, array $info, string $path): array {
            $this->assertSame('database', $info['scope']);
            $this->assertSame(['users'], $info['tables']);
            file_put_contents($path, 'full safety package');

            return [...$this->manifest(), ...$info];
        });
        $package->shouldReceive('inspect')->once()->with(Mockery::on(fn (string $path): bool => str_contains($path, '/tmp/')))->andReturn($this->manifest());
        $engine = $this->engine();
        $engine->shouldReceive('assertCompatible')->twice()->with($selected, false);
        $engine->shouldReceive('info')->once()->with(true)->andReturn($this->manifest());
        $engine->shouldReceive('info')->once()->withNoArgs()->andReturn($this->manifest());
        $engine->shouldReceive('dump')->once()->with(Mockery::type('string'))->andReturnUsing(static fn (string $path) => file_put_contents($path, 'full safety sql'));
        $engine->shouldReceive('replace')->once()->with(Mockery::type('string'), ['child', 'parent']);
        $engine->shouldReceive('verifyRelationships')->once()->with(['child', 'parent']);
        $engine->shouldReceive('verifyAndResetRuntime')->once();
        $operation = (new ExecuteBackupOperation($store, $package, $engine))->next();
        $this->assertSame('succeeded', $operation['status'], (string) ($operation['error'] ?? ''));
        $this->assertSame('tables', $operation['scope']);
        $this->assertSame(['child', 'parent'], $operation['tables']);
        $this->assertSame('database', $store->backup((string) $operation['safety_backup_id'])['scope']);
        $restored = array_values(array_filter($store->auditEvents(), static fn (array $event): bool => $event['event'] === 'restore.succeeded'))[0];
        $this->assertSame($actor, $restored['actor']);
        $this->assertSame($creator, $restored['source_created_by']);
        $this->assertSame('Before reference import', $restored['source_audit_note']);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'backups.tables.restored']);
    }

    public function test_cli_inline_does_not_queue_an_operation_when_another_runner_is_active(): void
    {
        $store = app(BackupStore::class);
        $runner = $store->lock('runner');
        try {
            $execute = new ExecuteBackupOperation($store, Mockery::mock(BackupPackage::class), Mockery::mock(DatabaseBackupEngine::class));
            try {
                $execute->inline('backup');
                $this->fail('A second runner must not enqueue inline work.');
            } catch (RuntimeException) {
                $this->assertEmpty($store->operations());
            }
        } finally {
            $store->unlock($runner);
        }
    }

    private function engine(): DatabaseBackupEngine
    {
        $engine = Mockery::mock(DatabaseBackupEngine::class);
        $engine->shouldReceive('backupScope')->with(null)->andReturn([
            'scope' => 'database', 'tables' => ['users'], 'requested_tables' => [], 'dependency_edges' => [],
        ])->byDefault();
        $engine->shouldReceive('verifyRelationships')->withNoArgs()->byDefault();

        return $engine;
    }
}
