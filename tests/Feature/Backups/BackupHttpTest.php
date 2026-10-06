<?php

namespace Tests\Feature\Backups;

use App\Actions\Backups\BackupPackage;
use App\Actions\Backups\BackupStore;
use App\Actions\Backups\DatabaseBackupEngine;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Http\Middleware\BackupWriterLease;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class BackupHttpTest extends TestCase
{
    use RefreshDatabase;

    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->root = storage_path('framework/testing/backups-'.Str::uuid());
        config(['backups.root' => $this->root]);
    }

    protected function tearDown(): void
    {
        app(BackupWriterLease::class)->release();
        File::deleteDirectory($this->root);
        parent::tearDown();
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->syncRoles(RoleName::SuperAdmin->value);

        return $user;
    }

    public function test_only_active_verified_super_administrators_can_access_backups(): void
    {
        $this->get(route('system-settings.backups.index'))->assertRedirect(route('login'));
        foreach ([RoleName::User, RoleName::Admin] as $role) {
            $user = User::factory()->create();
            $user->syncRoles($role->value);
            $this->actingAs($user)->get(route('system-settings.backups.index'))->assertForbidden();
            $this->post(route('system-settings.backups.store'))->assertForbidden();
        }
        $admin = $this->admin();
        $admin->forceFill(['email_verified_at' => null])->save();
        $this->actingAs($admin)->get(route('system-settings.backups.index'))->assertForbidden();
        $admin->forceFill(['email_verified_at' => now(), 'record_status' => 0])->save();
        $this->actingAs($admin)->get(route('system-settings.backups.index'))->assertForbidden();
        $admin->forceFill(['record_status' => 1, 'status' => UserStatus::Suspended])->save();
        $this->actingAs($admin)->get(route('system-settings.backups.index'))->assertForbidden();
    }

    public function test_creation_requires_password_confirmation_and_only_queues_work(): void
    {
        $this->actingAs($this->admin())->post(route('system-settings.backups.store'))->assertRedirect(route('password.confirm'));
        $this->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('system-settings.backups.store'))->assertRedirect(route('system-settings.backups.index'));
        $operations = app(BackupStore::class)->operations();
        $this->assertCount(1, $operations);
        $this->assertSame('queued', $operations[0]['status']);
        $this->assertEmpty(app(BackupStore::class)->backups());
        $this->get(route('system-settings.backups.index'))->assertInertia(fn ($page) => $page
            ->component('backups/index')->where('createdOperationId', $operations[0]['id']));
        $this->post(route('system-settings.backups.store'))->assertSessionHasErrors('operation');
    }

    public function test_page_and_status_publish_only_safe_metadata_and_prerequisites(): void
    {
        $engine = Mockery::mock(DatabaseBackupEngine::class);
        $engine->shouldReceive('prerequisites')->twice()->andReturn([['label' => 'Database', 'ready' => false, 'message' => 'MySQL or MariaDB required.']]);
        $this->app->instance(DatabaseBackupEngine::class, $engine);
        $this->actingAs($this->admin());
        foreach (['index', 'status'] as $route) {
            $this->get(route('system-settings.backups.'.$route))->assertOk()
                ->assertInertia(fn ($page) => $page->component('backups/index')
                    ->where('backups.data', [])->where('backups.total', 0)->where('operations', [])->where('databaseName', DB::connection()->getDatabaseName())
                    ->where('busy', false)->where('prerequisites.0.ready', false)
                    ->missing('root')->missing('signing_key')->missing('password'));
        }
    }

    public function test_signed_upload_is_published_with_a_generated_private_name(): void
    {
        config(['backups.signing_key' => str_repeat('k', 32)]);
        $store = app(BackupStore::class);
        $sql = $store->temporaryPath();
        $path = $store->temporaryPath('fieldops');
        file_put_contents($sql, 'CREATE TABLE example (id int);');
        app(BackupPackage::class)->create($sql, [
            'engine' => 'mysql', 'server_version' => '8.4.0', 'server_major' => 8,
            'migration_fingerprint' => str_repeat('a', 64),
        ], $path);
        $engine = Mockery::mock(DatabaseBackupEngine::class);
        $engine->shouldReceive('assertCompatible')->once();
        $this->app->instance(DatabaseBackupEngine::class, $engine);
        $this->actingAs($this->admin())->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('system-settings.backups.upload'), ['package' => new UploadedFile($path, '../../database.zip', 'application/zip', null, true)])
            ->assertSessionHasNoErrors()->assertRedirect(route('system-settings.backups.index'));
        $backups = $store->backups();
        $this->assertCount(1, $backups);
        $this->assertTrue(Str::isUuid($backups[0]['id']));
        $this->assertSame('uploaded', $backups[0]['kind']);
        $this->assertFileExists($store->packagePath((string) $backups[0]['id']));
    }

    public function test_restore_database_name_and_upload_are_validated(): void
    {
        $this->actingAs($this->admin())->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('system-settings.backups.restore', ['backup' => Str::uuid()]), ['database_name' => 'wrong'])
            ->assertSessionHasErrors('database_name');
        $this->post(route('system-settings.backups.upload'))->assertSessionHasErrors('package');
        $this->post(route('system-settings.backups.upload'), ['package' => UploadedFile::fake()->create('database.sql', 1, 'text/plain')])
            ->assertSessionHasErrors('package');
        $this->assertEmpty(app(BackupStore::class)->operations());
    }

    public function test_download_and_delete_use_private_opaque_ids_and_require_confirmation(): void
    {
        $store = app(BackupStore::class);
        $path = $store->temporaryPath('fieldops');
        file_put_contents($path, 'private data');
        $creator = ['id' => '42', 'name' => 'Original creator', 'source' => 'web'];
        $backup = $store->publish($path, ['created_at' => now()->toIso8601String(), 'engine' => 'mysql', 'server_version' => '8.4.0',
            'created_by' => $creator, 'audit_note' => 'Original signed note']);
        $this->actingAs($this->admin())->get(route('system-settings.backups.download', ['backup' => $backup['id']]))
            ->assertRedirect(route('password.confirm'));
        $this->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->get(route('system-settings.backups.download', ['backup' => $backup['id']]))
            ->assertDownload('fieldops-'.$backup['id'].'.fieldops')->assertStreamedContent('private data');
        $download = array_values(array_filter($store->auditEvents((string) $backup['id']), static fn (array $event): bool => $event['event'] === 'backup.download_requested'))[0];
        $this->assertSame($creator, $download['source_created_by']);
        $this->assertSame($backup['created_at'], $download['source_created_at']);
        $this->assertSame('Original signed note', $download['source_audit_note']);
        $this->assertSame('', $download['audit_note']);
        $this->delete(route('system-settings.backups.destroy', ['backup' => $backup['id']]))->assertRedirect();
        $this->assertFileDoesNotExist($store->packagePath((string) $backup['id']));
        $this->get(route('system-settings.backups.download', ['backup' => Str::uuid()]))->assertNotFound();
    }

    public function test_maintenance_sentinel_is_checked_before_any_database_query(): void
    {
        app(BackupStore::class)->beginMaintenance((string) Str::uuid());
        $queries = [];
        DB::listen(function ($query) use (&$queries): void {
            $queries[] = $query->sql;
        });
        $this->get('/login')->assertStatus(503)->assertSee('Database maintenance');
        $this->assertSame([], $queries);
    }

    public function test_rotating_persistent_epoch_rejects_pre_restore_sessions(): void
    {
        $admin = $this->admin();
        $store = app(BackupStore::class);
        $oldEpoch = $store->authEpoch();
        $store->rotateAuthEpoch();
        $this->actingAs($admin)->withSession([
            Auth::guard()->getName() => $admin->id,
            'auth.session_version' => $admin->session_version,
            'auth.backup_epoch' => $oldEpoch,
        ])->get(route('system-settings.backups.index'))->assertForbidden();
        $this->assertGuest();
    }

    public function test_backup_mutations_are_throttled(): void
    {
        $this->actingAs($this->admin())->withSession(['auth.password_confirmed_at' => now()->timestamp]);
        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->post(route('system-settings.backups.store'));
        }
        $this->post(route('system-settings.backups.store'))->assertStatus(429);
    }

    public function test_selected_creation_records_resolved_scope_and_authenticated_actor_snapshot(): void
    {
        $admin = $this->admin();
        $admin->forceFill(['name' => str_repeat('A', 255)])->save();
        $scope = ['scope' => 'tables', 'requested_tables' => ['parents'], 'tables' => ['children', 'parents'],
            'dependency_edges' => [['table' => 'children', 'related_table' => 'parents']]];
        $engine = Mockery::mock(DatabaseBackupEngine::class);
        $engine->shouldReceive('backupScope')->once()->with(['parents'])->andReturn($scope);
        $this->app->instance(DatabaseBackupEngine::class, $engine);
        $this->actingAs($admin)->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('system-settings.backups.store'), ['scope' => 'tables', 'requested_tables' => ['parents'],
                'audit_note' => 'Before importing reference data', 'actor' => ['id' => 'forged', 'name' => 'Forged creator', 'source' => 'cli']])
            ->assertSessionHasNoErrors()->assertRedirect(route('system-settings.backups.index'));
        $operation = app(BackupStore::class)->operations()[0];
        $this->assertSame(['children', 'parents'], $operation['tables']);
        $this->assertSame(['parents'], $operation['requested_tables']);
        $this->assertSame($scope['dependency_edges'], $operation['dependency_edges']);
        $this->assertSame(['id' => (string) $admin->id, 'name' => $admin->name, 'source' => 'web'], $operation['actor']);
        $this->assertSame('Before importing reference data', $operation['audit_note']);
        $audit = app(BackupStore::class)->auditEvents()[0];
        $this->assertSame('backup.requested', $audit['event']);
        $this->assertSame($operation['actor'], $audit['actor']);
        $this->assertSame($operation['tables'], $audit['tables']);
    }

    public function test_empty_unsafe_duplicate_selections_and_unbounded_notes_are_rejected_before_queueing(): void
    {
        $this->actingAs($this->admin())->withSession(['auth.password_confirmed_at' => now()->timestamp]);
        $this->post(route('system-settings.backups.store'), ['scope' => 'tables', 'requested_tables' => []])
            ->assertSessionHasErrors('requested_tables');
        $this->post(route('system-settings.backups.store'), ['scope' => 'tables', 'requested_tables' => ['users; DROP TABLE roles']])
            ->assertSessionHasErrors('requested_tables.0');
        $this->post(route('system-settings.backups.store'), ['scope' => 'tables', 'requested_tables' => ['users', 'users']])
            ->assertSessionHasErrors('requested_tables.0');
        $this->post(route('system-settings.backups.store'), ['scope' => 'database', 'audit_note' => str_repeat('x', 1001)])
            ->assertSessionHasErrors('audit_note');
        $this->assertEmpty(app(BackupStore::class)->operations());
    }

    public function test_scope_resolution_failure_is_actionable_and_does_not_queue_work(): void
    {
        $engine = Mockery::mock(DatabaseBackupEngine::class);
        $engine->shouldReceive('backupScope')->once()->with(['missing'])->andThrow(new RuntimeException('A selected table does not exist. Refresh the table catalog.'));
        $this->app->instance(DatabaseBackupEngine::class, $engine);
        $this->actingAs($this->admin())->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->post(route('system-settings.backups.store'), ['scope' => 'tables', 'requested_tables' => ['missing']])
            ->assertSessionHasErrors('operation');
        $this->assertEmpty(app(BackupStore::class)->operations());
    }

    public function test_catalog_failure_renders_safe_create_error_and_all_workspace_reads_require_super_admin(): void
    {
        $engine = Mockery::mock(DatabaseBackupEngine::class);
        $engine->shouldReceive('prerequisites')->andReturn([]);
        $engine->shouldReceive('tableCatalog')->once()->andThrow(new RuntimeException('Database backups support MySQL and MariaDB only.'));
        $this->app->instance(DatabaseBackupEngine::class, $engine);
        $this->actingAs($this->admin())->get(route('system-settings.backups.create'))->assertOk()
            ->assertInertia(fn ($page) => $page->component('backups/create')->where('tableCatalog', [])
                ->where('tableCatalogError', 'Database backups support MySQL and MariaDB only.'));
        $ordinaryAdmin = User::factory()->create();
        $ordinaryAdmin->syncRoles(RoleName::Admin->value);
        $this->actingAs($ordinaryAdmin);
        foreach (['index', 'create', 'audit', 'tables', 'status'] as $name) {
            $this->get(route('system-settings.backups.'.$name))->assertForbidden();
        }
        $this->get(route('system-settings.backups.show', Str::uuid()->toString()))->assertForbidden();
    }

    public function test_inventory_search_scope_actor_sort_and_pagination_use_external_metadata(): void
    {
        $store = app(BackupStore::class);
        $engine = Mockery::mock(DatabaseBackupEngine::class);
        $engine->shouldReceive('prerequisites')->andReturn([]);
        $this->app->instance(DatabaseBackupEngine::class, $engine);
        for ($index = 0; $index < 12; $index++) {
            $path = $store->temporaryPath('fieldops');
            file_put_contents($path, 'signed-package-fixture');
            $store->publish($path, ['created_at' => now()->addSeconds($index)->toIso8601String(), 'engine' => 'mysql', 'server_version' => '8.4.0',
                'scope' => 'tables', 'requested_tables' => ['countries'], 'tables' => ['countries'],
                'created_by' => ['id' => 'historical-user', 'name' => 'Original creator', 'source' => 'web'], 'audit_note' => 'Reference import']);
        }
        $this->actingAs($this->admin())->get(route('system-settings.backups.index', [
            'search' => 'Reference import', 'actor' => 'Original creator', 'scope' => 'tables', 'per_page' => 10,
            'page' => 2, 'sort' => 'created_at', 'direction' => 'asc',
        ]))->assertOk()->assertInertia(fn ($page) => $page->component('backups/index')
            ->where('backups.total', 12)->where('backups.current_page', 2)->has('backups.data', 2)
            ->where('backups.data.0.created_by.name', 'Original creator')->where('filters.actor', 'Original creator'));
    }

    public function test_detail_and_audit_history_survive_deletion_with_original_creator_and_local_actor(): void
    {
        $store = app(BackupStore::class);
        $engine = Mockery::mock(DatabaseBackupEngine::class);
        $engine->shouldReceive('prerequisites')->andReturn([]);
        $this->app->instance(DatabaseBackupEngine::class, $engine);
        $path = $store->temporaryPath('fieldops');
        file_put_contents($path, 'signed-package-fixture');
        $creator = ['id' => '42', 'name' => 'Creator from original deployment', 'source' => 'web'];
        $uploader = ['id' => null, 'name' => 'Local CLI operator', 'source' => 'cli'];
        $backup = $store->publish($path, ['created_at' => now()->toIso8601String(), 'engine' => 'mysql', 'server_version' => '8.4.0',
            'scope' => 'tables', 'requested_tables' => ['countries'], 'tables' => ['countries'], 'created_by' => $creator, 'audit_note' => 'Original note'],
            'uploaded', ['actor' => $uploader, 'audit_note' => 'Imported locally']);
        $admin = $this->admin();
        $this->actingAs($admin)->get(route('system-settings.backups.show', $backup['id']))->assertOk()
            ->assertInertia(fn ($page) => $page->component('backups/show')->where('backup.created_by', $creator)
                ->where('backup.stored_by', $uploader)->where('backup.audit_note', 'Original note')->where('events.total', 1));
        $this->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->delete(route('system-settings.backups.destroy', $backup['id']))->assertRedirect();
        $this->get(route('system-settings.backups.show', $backup['id']))->assertNotFound();
        $this->get(route('system-settings.backups.audit', ['backup' => $backup['id'], 'event' => 'backup.deleted', 'actor' => $admin->name]))
            ->assertOk()->assertInertia(fn ($page) => $page->component('backups/audit')->where('events.total', 1)
            ->where('events.data.0.backup_id', $backup['id'])->where('events.data.0.actor.name', $admin->name)
            ->where('events.data.0.tables', ['countries']));
    }

    public function test_history_query_rejects_invalid_filters_but_accepts_a_single_date_bound(): void
    {
        $engine = Mockery::mock(DatabaseBackupEngine::class);
        $engine->shouldReceive('prerequisites')->andReturn([]);
        $this->app->instance(DatabaseBackupEngine::class, $engine);
        $this->actingAs($this->admin())->getJson(route('system-settings.backups.audit', [
            'per_page' => 1000, 'sort' => 'arbitrary_path', 'from' => 'not-a-date', 'backup' => '../../.env',
        ]))->assertUnprocessable()->assertJsonValidationErrors(['per_page', 'sort', 'from', 'backup']);
        $this->get(route('system-settings.backups.audit', ['to' => now()->format('Y-m-d')]))
            ->assertOk()->assertInertia(fn ($page) => $page->component('backups/audit')->where('events.total', 0));
    }
}
