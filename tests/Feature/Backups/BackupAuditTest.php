<?php

namespace Tests\Feature\Backups;

use App\Actions\Backups\BackupStore;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

class BackupAuditTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = storage_path('framework/testing/backup-audit-'.Str::uuid());
        config(['backups.root' => $this->root]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->root);
        parent::tearDown();
    }

    public function test_original_creator_and_local_uploader_are_distinct_and_audit_survives_deletion(): void
    {
        $store = app(BackupStore::class);
        $creator = ['id' => '7', 'name' => 'Original creator', 'source' => 'web'];
        $uploader = ['id' => '19', 'name' => 'Recovery operator', 'source' => 'web'];
        $path = $store->temporaryPath('fieldops');
        file_put_contents($path, 'package bytes');
        $backup = $store->publish($path, [
            'format_version' => 2, 'created_at' => '2026-10-01T10:00:00+00:00',
            'engine' => 'mysql', 'server_version' => '8.4.0', 'scope' => 'tables',
            'tables' => ['child', 'parent'], 'requested_tables' => ['child'],
            'created_by' => $creator, 'audit_note' => 'Original purpose',
        ], 'uploaded', ['actor' => $uploader, 'audit_note' => 'Imported for recovery']);
        $this->assertSame($creator, $backup['created_by']);
        $this->assertSame($uploader, $backup['stored_by']);
        $this->assertSame('Original purpose', $backup['audit_note']);
        $upload = $store->auditEvents((string) $backup['id'])[0];
        $this->assertSame($uploader, $upload['actor']);
        $this->assertSame('Imported for recovery', $upload['audit_note']);
        $this->assertSame($creator, $upload['source_created_by']);
        $this->assertSame('2026-10-01T10:00:00+00:00', $upload['source_created_at']);
        $this->assertSame('Original purpose', $upload['source_audit_note']);
        $store->delete((string) $backup['id'], ['actor' => $uploader, 'audit_note' => 'Rehearsal completed']);
        $this->assertEmpty($store->backups());
        $events = $store->auditEvents((string) $backup['id']);
        $this->assertCount(3, $events);
        $deleted = array_values(array_filter($events, fn (array $event): bool => $event['event'] === 'backup.deleted'))[0];
        $this->assertSame(['child', 'parent'], $deleted['tables']);
        $this->assertSame($uploader, $deleted['actor']);
        $this->assertSame('Rehearsal completed', $deleted['audit_note']);
        $this->assertSame($creator, $deleted['source_created_by']);
        $this->assertSame('2026-10-01T10:00:00+00:00', $deleted['source_created_at']);
        $this->assertSame('Original purpose', $deleted['source_audit_note']);
    }

    public function test_legacy_metadata_is_normalized_without_inventing_history(): void
    {
        $store = app(BackupStore::class);
        $id = (string) Str::uuid();
        file_put_contents($store->packagePath($id), 'legacy bytes');
        file_put_contents($store->root().'/packages/'.$id.'.json', json_encode([
            'id' => $id, 'created_at' => '2026-09-01T00:00:00+00:00', 'size_bytes' => 12,
            'engine' => 'mysql', 'server_version' => '8.4.0', 'kind' => 'manual',
        ], JSON_THROW_ON_ERROR));
        $backup = $store->backup($id);
        $this->assertSame('database', $backup['scope']);
        $this->assertNull($backup['tables']);
        $this->assertNull($backup['created_by']);
        $this->assertNull($backup['stored_by']);
        $this->assertEmpty($store->auditEvents());
    }

    public function test_filesystem_search_sort_and_pagination_preserve_query_and_actor_snapshots(): void
    {
        $store = app(BackupStore::class);
        $records = [];
        for ($i = 1; $i <= 4; $i++) {
            $records[] = [
                'id' => (string) Str::uuid(), 'created_at' => '2026-10-0'.$i.'T00:00:00+00:00',
                'scope' => 'tables', 'kind' => 'manual', 'tables' => ['countries', 'users'],
                'created_by' => ['id' => '7', 'name' => $i === 4 ? 'Other operator' : 'Snapshot operator', 'source' => 'web'],
                'audit_note' => 'Reference import', 'size_bytes' => $i * 100,
            ];
        }
        $result = $store->paginate($records, [
            'search' => 'countries', 'actor' => 'Snapshot', 'scope' => 'tables',
            'sort' => 'created_at', 'direction' => 'asc', 'page' => 2, 'perPage' => 2,
        ], '/settings/system/backups');
        $this->assertSame(3, $result['total']);
        $this->assertSame(2, $result['current_page']);
        $this->assertCount(1, $result['data']);
        $this->assertSame($records[2]['id'], $result['data'][0]['id']);
        $this->assertStringContainsString('actor=Snapshot', $result['prev_page_url']);
        $this->assertSame(0, $store->paginate($records, ['search' => 'no matching record'], '/settings/system/backups')['total']);
    }

    public function test_interrupted_operations_keep_the_request_actor_and_table_scope_in_external_audit(): void
    {
        $store = app(BackupStore::class);
        $actor = ['id' => '33', 'name' => 'Former administrator', 'source' => 'web'];
        $operation = $store->queue('backup', null, false, [
            'actor' => $actor, 'scope' => 'tables', 'tables' => ['countries', 'users'],
            'requested_tables' => ['countries'], 'audit_note' => 'Before importing reference data',
        ]);
        $operation['status'] = 'running';
        $store->saveOperation($operation);
        $runner = $store->lock('runner');
        try {
            $store->interruptAbandoned();
        } finally {
            $store->unlock($runner);
        }
        $events = array_values(array_filter($store->auditEvents(), fn (array $event): bool => $event['event'] === 'backup.interrupted'));
        $this->assertCount(1, $events);
        $this->assertSame($actor, $events[0]['actor']);
        $this->assertSame(['countries', 'users'], $events[0]['tables']);
        $this->assertSame($operation['id'], $events[0]['operation_id']);
    }
}
