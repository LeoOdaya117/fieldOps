<?php

namespace Tests\Feature\Backups;

use App\Actions\Backups\BackupPackage;
use App\Actions\Backups\BackupStore;
use App\Actions\Backups\ConsoleWriterLease;
use App\Actions\Backups\DatabaseBackupEngine;
use App\Enums\RoleName;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

/** Opt-in: always creates its own randomly named schema, never uses the application schema. */
class DatabaseBackupIntegrationTest extends TestCase
{
    private ?string $database = null;

    private ?string $directory = null;

    protected function setUp(): void
    {
        parent::setUp();
        if (getenv('BACKUP_INTEGRATION') !== '1') {
            $this->markTestSkipped('Set BACKUP_INTEGRATION=1 with disposable database credentials and native clients.');
        }
        $driver = getenv('BACKUP_TEST_ENGINE') ?: 'mysql';
        $this->assertContains($driver, ['mysql', 'mariadb']);
        $connection = [
            'driver' => $driver,
            'host' => getenv('BACKUP_TEST_HOST') ?: '127.0.0.1',
            'port' => getenv('BACKUP_TEST_PORT') ?: '3306',
            'username' => getenv('BACKUP_TEST_USERNAME') ?: 'root',
            'password' => getenv('BACKUP_TEST_PASSWORD') ?: '',
            'database' => null,
            'charset' => 'utf8mb4', 'collation' => 'utf8mb4_unicode_ci', 'prefix' => '',
        ];
        config(['database.connections.backup-admin' => $connection]);
        $candidate = 'fieldops_backup_test_'.bin2hex(random_bytes(8));
        // Fixed safe prefix + random hex: no external database name is ever dropped.
        DB::connection('backup-admin')->getPdo()->exec('CREATE DATABASE `'.$candidate.'` CHARACTER SET utf8mb4');
        $this->database = $candidate;
        $this->directory = storage_path('framework/testing/'.$candidate);
        File::makeDirectory($this->directory, 0700, true);
        $connection['database'] = $candidate;
        config([
            'database.connections.backup-integration' => $connection,
            'database.default' => 'backup-integration',
            'backups.root' => $this->directory,
            'backups.signing_key' => str_repeat('integration-test-only-key-', 3),
            'cache.default' => 'array', 'session.driver' => 'array', 'queue.default' => 'sync',
            'queue.batching.database' => 'backup-integration', 'queue.failed.database' => 'backup-integration',
        ]);
        foreach (['mysql_dump', 'mysql_client', 'mariadb_dump', 'mariadb_client'] as $key) {
            $value = getenv('BACKUP_TEST_'.strtoupper($key));
            if ($value !== false && $value !== '') {
                config(['backups.'.$key => $value]);
            }
        }
        Artisan::call('migrate', ['--database' => 'backup-integration', '--force' => true]);
        (new RbacSeeder)->run();
        // The fixture's migration runs in this PHPUnit process, not a separate
        // writer process. Release only that fixture lease before exercising CLI restore.
        app(ConsoleWriterLease::class)->release();
    }

    protected function tearDown(): void
    {
        app()->maintenanceMode()->deactivate();
        DB::disconnect('backup-integration');
        if ($this->database !== null) {
            DB::connection('backup-admin')->getPdo()->exec('DROP DATABASE `'.$this->database.'`');
        }
        if ($this->directory !== null) {
            File::deleteDirectory($this->directory);
        }
        parent::tearDown();
    }

    public function test_database_backup_round_trip_removes_extra_objects_and_resets_runtime(): void
    {
        $engine = app(DatabaseBackupEngine::class);
        $info = $engine->info();
        $expectedMajor = getenv('BACKUP_TEST_SERVER_MAJOR');
        if ($expectedMajor !== false) {
            $this->assertSame((int) $expectedMajor, $info['server_major']);
        }
        $superAdmin = User::factory()->create(['name' => 'Original Super Admin']);
        $superAdmin->syncRoles(RoleName::SuperAdmin->value);
        User::factory()->create(['name' => 'Inactive user', 'record_status' => 0]);
        Schema::create('backup_examples', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->text('label');
            $table->binary('raw');
        });
        $text = 'Unicode π 日本語 '.str_repeat('large text ', 400);
        DB::table('backup_examples')->insert(['user_id' => $superAdmin->id, 'label' => $text, 'raw' => "\0\xff\x01"]);
        DB::statement('CREATE VIEW backup_example_view AS SELECT label FROM backup_examples');
        DB::unprepared('CREATE TRIGGER backup_example_trigger BEFORE INSERT ON backup_examples FOR EACH ROW SET NEW.label = CONCAT(NEW.label, "!")');
        DB::unprepared('CREATE PROCEDURE backup_example_procedure() SELECT 1');
        DB::unprepared('CREATE EVENT backup_example_event ON SCHEDULE EVERY 1 DAY DISABLE DO SELECT 1');
        DB::table('jobs')->insert(['queue' => 'default', 'payload' => '{}', 'attempts' => 0, 'available_at' => time(), 'created_at' => time()]);
        DB::table('sessions')->insert(['id' => 'old-session', 'user_id' => $superAdmin->id, 'payload' => '', 'last_activity' => time()]);
        $sql = $this->directory.'/dump.sql';
        $package = $this->directory.'/backup.fieldops';
        $engine->dump($sql);
        app(BackupPackage::class)->create($sql, $info, $package);
        $manifest = app(BackupPackage::class)->extract($package, $this->directory.'/restore.sql');
        $engine->assertCompatible($manifest);
        $store = app(BackupStore::class);
        $source = $store->publish($package, $manifest);
        $epoch = $store->authEpoch();
        User::query()->whereKey($superAdmin->id)->update(['name' => 'Changed']);
        DB::table('backup_examples')->delete();
        Schema::create('extra_current_table', fn (Blueprint $table) => $table->id());
        DB::statement('CREATE VIEW extra_current_view AS SELECT id FROM users');
        DB::unprepared('CREATE PROCEDURE extra_current_procedure() SELECT 2');
        $this->assertSame(0, Artisan::call('backups:restore', [
            'source' => $source['id'], '--database' => $this->database, '--no-interaction' => true,
        ]), Artisan::output());
        $restored = $store->operations()[0];
        $this->assertSame('succeeded', $restored['status']);
        $this->assertFileExists($store->packagePath((string) $restored['safety_backup_id']));
        $this->assertNotSame($epoch, $store->authEpoch());
        $this->assertFalse($store->maintenance());
        $this->assertSame('Original Super Admin', User::findOrFail($superAdmin->id)->name);
        $row = DB::table('backup_examples')->first();
        $this->assertSame($text, $row->label);
        $this->assertSame("\0\xff\x01", $row->raw);
        $this->assertSame(1, User::withTrashed()->where('record_status', 0)->count());
        $this->assertFalse(Schema::hasTable('extra_current_table'));
        $this->assertSame(0, DB::table('jobs')->count());
        $this->assertSame(0, DB::table('sessions')->count());
        $this->assertNotSame($superAdmin->remember_token, User::findOrFail($superAdmin->id)->remember_token);
        $this->assertCount(1, DB::select('SELECT * FROM backup_example_view'));
        $this->assertCount(1, DB::select('SHOW TRIGGERS'));
        $this->assertCount(1, DB::select('SHOW PROCEDURE STATUS WHERE Db = ?', [$this->database]));
        $this->assertCount(1, DB::select('SHOW EVENTS'));

        // Emulate an interrupted replacement with a damaged migration table and
        // recover through the real CLI while maintenance remains active.
        $failed = $store->queue('restore', (string) $source['id']);
        $failed['status'] = 'running';
        $failed['safety_backup_id'] = $restored['safety_backup_id'];
        $store->saveOperation($failed);
        $store->beginMaintenance((string) $failed['id']);
        app()->maintenanceMode()->activate(['time' => time()]);
        Schema::drop('migrations');
        $this->assertSame(0, Artisan::call('backups:restore', [
            'source' => $restored['safety_backup_id'], '--database' => $this->database,
            '--recovery' => true, '--no-interaction' => true,
        ]), Artisan::output());
        $this->assertFalse($store->maintenance());
        $this->assertFalse(app()->maintenanceMode()->active());
        $this->assertCount(3, $store->operations());
        $interrupted = array_values(array_filter($store->operations(), fn (array $operation): bool => $operation['id'] === $failed['id']))[0];
        $this->assertSame('interrupted', $interrupted['status']);
        $this->assertNotNull($interrupted['recovered_by']);
        $engine->info();
        $this->assertSame(0, DB::table('sessions')->count());
        $this->assertSame(0, DB::table('jobs')->count());
    }

    private function selectedFixture(): void
    {
        $admin = User::factory()->create(['name' => 'Unrelated active Super Admin']);
        $admin->syncRoles(RoleName::SuperAdmin->value);
        Schema::create('backup_parents', function (Blueprint $table): void {
            $table->id();
            $table->text('label');
            $table->boolean('record_status');
        });
        Schema::create('backup_children', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('parent_id')->constrained('backup_parents');
            $table->text('label');
            $table->binary('raw');
        });
        Schema::create('backup_unrelated', function (Blueprint $table): void {
            $table->id();
            $table->text('label');
        });
        DB::table('backup_parents')->insert(['id' => 1, 'label' => 'Original π 日本語', 'record_status' => 0]);
        DB::table('backup_children')->insert(['id' => 1, 'parent_id' => 1, 'label' => str_repeat('Text ', 400), 'raw' => "\0\xff\x01"]);
        DB::table('backup_unrelated')->insert(['id' => 1, 'label' => 'Original unrelated']);
    }

    public function test_selected_round_trip_restores_related_tables_and_preserves_unrelated_objects(): void
    {
        $this->selectedFixture();
        $engine = app(DatabaseBackupEngine::class);
        $store = app(BackupStore::class);
        $this->assertSame(0, Artisan::call('backups:create', ['--table' => ['backup_parents'], '--note' => 'Reference import rehearsal']), Artisan::output());
        $source = array_values(array_filter($store->backups(), static fn (array $backup): bool => $backup['kind'] === 'manual'))[0];
        $this->assertSame(['backup_children', 'backup_parents'], $source['tables']);
        $this->assertSame(['backup_parents'], $source['requested_tables']);
        $this->assertSame('CLI operator', $source['created_by']['name']);
        $this->assertSame('Reference import rehearsal', $source['audit_note']);
        DB::table('backup_parents')->where('id', 1)->update(['label' => 'Changed selected']);
        DB::table('backup_children')->delete();
        Schema::table('backup_parents', fn (Blueprint $table) => $table->string('extra_current_column')->nullable());
        DB::table('backup_unrelated')->where('id', 1)->update(['label' => 'Keep this current value']);
        Schema::create('extra_unrelated_table', fn (Blueprint $table) => $table->id());
        // MySQL exposes dependency metadata; MariaDB deliberately fails closed
        // whenever views exist and exercises that guard in the separate test.
        $mysql = $engine->info()['engine'] === 'mysql';
        if ($mysql) {
            DB::statement('CREATE VIEW backup_unrelated_view AS SELECT label FROM backup_unrelated');
        }
        Schema::create('new_inbound_child', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('parent_id')->constrained('backup_parents');
        });
        $this->assertSame(1, Artisan::call('backups:restore', ['source' => $source['id'], '--database' => $this->database, '--no-interaction' => true]));
        $this->assertStringContainsString('New related tables are missing', Artisan::output());
        $this->assertFalse($store->maintenance());
        $this->assertCount(1, $store->operations());
        $this->assertSame('Changed selected', DB::table('backup_parents')->value('label'));
        Schema::drop('new_inbound_child');
        Schema::drop('backup_children');
        DB::statement('CREATE VIEW backup_children AS SELECT id, label FROM backup_unrelated');
        $this->assertSame(1, Artisan::call('backups:restore', ['source' => $source['id'], '--database' => $this->database, '--no-interaction' => true]));
        $this->assertStringContainsString('currently occupied by a view', Artisan::output());
        $this->assertFalse($store->maintenance());
        $this->assertCount(1, $store->operations());
        DB::statement('DROP VIEW backup_children');
        $epoch = $store->authEpoch();
        $this->assertSame(0, Artisan::call('backups:restore', ['source' => $source['id'], '--database' => $this->database, '--no-interaction' => true]), Artisan::output());
        $restore = array_values(array_filter($store->operations(), static fn (array $operation): bool => $operation['type'] === 'restore'))[0];
        $this->assertSame('succeeded', $restore['status']);
        $safety = $store->backup((string) $restore['safety_backup_id']);
        $this->assertSame('database', $safety['scope']);
        $this->assertContains('backup_unrelated', $safety['tables']);
        $this->assertSame('Original π 日本語', DB::table('backup_parents')->value('label'));
        $this->assertSame(0, DB::table('backup_parents')->value('record_status'));
        $this->assertSame("\0\xff\x01", DB::table('backup_children')->value('raw'));
        $this->assertSame(str_repeat('Text ', 400), DB::table('backup_children')->value('label'));
        $this->assertFalse(Schema::hasColumn('backup_parents', 'extra_current_column'));
        $this->assertSame('Keep this current value', DB::table('backup_unrelated')->value('label'));
        $this->assertTrue(Schema::hasTable('extra_unrelated_table'));
        $this->assertSame('Unrelated active Super Admin', User::query()->value('name'));
        if ($mysql) {
            $this->assertSame('Keep this current value', DB::selectOne('SELECT label FROM backup_unrelated_view')->label);
        }
        $this->assertNotSame($epoch, $store->authEpoch());
        $this->assertFalse($store->maintenance());
        $engine->verifyRelationships(['backup_children', 'backup_parents']);
        $this->assertNotEmpty(array_filter($store->auditEvents((string) $source['id']), static fn (array $event): bool => $event['event'] === 'restore.succeeded'));
    }

    public function test_selected_complex_objects_are_rejected_before_creating_a_package(): void
    {
        $this->selectedFixture();
        DB::unprepared('CREATE TRIGGER selected_trigger BEFORE INSERT ON backup_parents FOR EACH ROW SET NEW.label = CONCAT(NEW.label, "!")');
        $this->assertSelectedRejected('triggers');
        DB::statement('DROP TRIGGER selected_trigger');
        DB::statement('CREATE VIEW selected_view AS SELECT label FROM backup_parents');
        $this->assertSelectedRejected('view');
        DB::statement('DROP VIEW selected_view');
        DB::unprepared('CREATE PROCEDURE selected_procedure() SELECT 1');
        $this->assertSelectedRejected('routines or events');
        DB::statement('DROP PROCEDURE selected_procedure');
        DB::unprepared('CREATE EVENT selected_event ON SCHEDULE EVERY 1 DAY DISABLE DO SELECT 1');
        $this->assertSelectedRejected('routines or events');
        DB::statement('DROP EVENT selected_event');
        $this->assertEmpty(app(BackupStore::class)->backups());
    }

    private function assertSelectedRejected(string $reason): void
    {
        try {
            app(DatabaseBackupEngine::class)->backupScope(['backup_parents']);
            $this->fail('Unsafe object dependencies must reject selected-table recovery.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString($reason, $exception->getMessage());
        }
    }

    public function test_invalid_partial_import_retains_maintenance_and_recovers_from_full_safety_backup(): void
    {
        $this->selectedFixture();
        $engine = app(DatabaseBackupEngine::class);
        $store = app(BackupStore::class);
        $scope = $engine->backupScope(['backup_parents']);
        $sql = $this->directory.'/invalid-selected.sql';
        $path = $this->directory.'/invalid-selected.fieldops';
        $engine->dump($sql, $scope['tables']);
        // Emulate a signed but corrupt historical data set. MySQL/MariaDB do
        // not retroactively check rows when FOREIGN_KEY_CHECKS is re-enabled.
        file_put_contents($sql, "\nSET FOREIGN_KEY_CHECKS=0;\nINSERT INTO backup_children (id,parent_id,label,raw) VALUES (99,999,'orphan',0x00ff01);\nSET FOREIGN_KEY_CHECKS=1;\n", FILE_APPEND);
        $manifest = app(BackupPackage::class)->create($sql, [...$engine->info(), ...$scope,
            'created_by' => ['id' => null, 'name' => 'Integration operator', 'source' => 'cli'], 'audit_note' => 'Corrupt historical fixture'], $path);
        $source = $store->publish($path, $manifest);
        DB::table('backup_parents')->where('id', 1)->update(['label' => 'Safety snapshot current value']);
        $this->assertSame(1, Artisan::call('backups:restore', ['source' => $source['id'], '--database' => $this->database, '--no-interaction' => true]));
        $failed = $store->operations()[0];
        $this->assertSame('failed', $failed['status']);
        $this->assertStringContainsString('foreign-key relationships are invalid', $failed['error']);
        $this->assertTrue($store->maintenance());
        $this->assertTrue(app()->maintenanceMode()->active());
        $this->assertFileExists($store->packagePath((string) $source['id']));
        $safety = $store->backup((string) $failed['safety_backup_id']);
        $this->assertSame('database', $safety['scope']);
        $this->assertSame(0, Artisan::call('backups:restore', ['source' => $safety['id'], '--database' => $this->database,
            '--recovery' => true, '--no-interaction' => true]), Artisan::output());
        $this->assertFalse($store->maintenance());
        $this->assertFalse(app()->maintenanceMode()->active());
        $this->assertSame('Safety snapshot current value', DB::table('backup_parents')->value('label'));
        $this->assertSame(1, DB::table('backup_children')->count());
        $engine->verifyRelationships();
        $retained = array_values(array_filter($store->operations(), static fn (array $operation): bool => $operation['id'] === $failed['id']))[0];
        $this->assertNotNull($retained['recovered_by']);
        $this->assertNotEmpty(array_filter($store->auditEvents((string) $source['id']), static fn (array $event): bool => $event['event'] === 'restore.failed'));
        $this->assertNotEmpty(array_filter($store->auditEvents(), static fn (array $event): bool => $event['event'] === 'restore.recovered'));
    }
}
