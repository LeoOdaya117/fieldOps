<?php

namespace Tests\Feature\Backups;

use App\Actions\Backups\BackupTableScope;
use App\Actions\Backups\DatabaseBackupEngine;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Mockery;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class BackupTableScopeTest extends TestCase
{
    /** @param list<string> $tables
     * @param  list<object>  $keys
     */
    private function connection(array $tables, array $keys = []): Connection
    {
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('getDriverName')->andReturn('mysql');
        $connection->shouldReceive('getConfig')->andReturn([]);
        $connection->shouldReceive('getDatabaseName')->andReturn('scope_test');
        $connection->shouldReceive('select')->with(BackupTableScope::TABLES_SQL, ['scope_test', 'BASE TABLE'])
            ->andReturn(array_map(static fn (string $name): object => (object) ['name' => $name], $tables));
        $connection->shouldReceive('select')->with(BackupTableScope::TABLES_SQL, ['scope_test', 'VIEW'])->andReturn([])->byDefault();
        $connection->shouldReceive('select')->with(BackupTableScope::KEYS_SQL, ['scope_test', 'scope_test'])->andReturn($keys);
        foreach ([
            'SELECT EVENT_OBJECT_TABLE AS table_name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?',
            'SELECT TABLE_NAME AS table_name FROM information_schema.VIEW_TABLE_USAGE WHERE TABLE_SCHEMA = ?',
            'SELECT ROUTINE_NAME AS name FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?',
            'SELECT EVENT_NAME AS name FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ?',
        ] as $sql) {
            $connection->shouldReceive('select')->with($sql, ['scope_test'])->andReturn([])->byDefault();
        }
        $connection->shouldReceive('selectOne')->with('SELECT @@GLOBAL.event_scheduler AS scheduler')->andReturn((object) ['scheduler' => 'OFF']);
        $connection->shouldReceive('selectOne')->with('SELECT VERSION() AS version')->andReturn((object) ['version' => '8.4.0'])->byDefault();
        DB::shouldReceive('connection')->andReturn($connection);

        return $connection;
    }

    private function key(string $table, string $related, string $constraint = 'fk', string $column = 'parent_id', string $relatedColumn = 'id'): object
    {
        return (object) ['table_schema' => 'scope_test', 'table_name' => $table, 'constraint_name' => $constraint,
            'column_name' => $column, 'related_schema' => 'scope_test', 'related_table' => $related, 'related_column' => $relatedColumn];
    }

    public function test_selection_expands_incoming_and_outgoing_relationships_and_excludes_unrelated_tables(): void
    {
        $this->connection(['parents', 'children', 'grandchildren', 'unrelated'], [
            $this->key('children', 'parents'), $this->key('grandchildren', 'children'),
        ]);
        $scope = app(DatabaseBackupEngine::class)->backupScope(['children']);
        $this->assertSame('tables', $scope['scope']);
        $this->assertSame(['children'], $scope['requested_tables']);
        $this->assertSame(['children', 'grandchildren', 'parents'], $scope['tables']);
        $this->assertCount(2, $scope['dependency_edges']);
        $catalog = app(DatabaseBackupEngine::class)->tableCatalog();
        $children = array_values(array_filter($catalog, static fn (array $entry): bool => $entry['name'] === 'children'))[0];
        $this->assertSame(['grandchildren', 'parents'], $children['related_tables']);
    }

    public function test_cycles_self_references_and_composite_keys_have_stable_deduplicated_scope(): void
    {
        $connection = $this->connection(['nodes', 'links'], [
            $this->key('nodes', 'nodes', 'self'), $this->key('nodes', 'links', 'composite', 'link_a', 'a'),
            $this->key('nodes', 'links', 'composite', 'link_b', 'b'), $this->key('links', 'nodes', 'cycle'),
        ]);
        $graph = app(BackupTableScope::class)->graph($connection);
        $this->assertCount(2, $graph['dependency_edges']);
        $this->assertCount(3, $graph['foreign_keys']);
        $composite = array_values(array_filter($graph['foreign_keys'], static fn (array $key): bool => count($key['columns']) === 2))[0];
        $this->assertSame([['column' => 'link_a', 'related_column' => 'a'], ['column' => 'link_b', 'related_column' => 'b']], $composite['columns']);
        $this->assertSame(['links', 'nodes'], app(BackupTableScope::class)->expand(['nodes'], $graph['tables'], $graph['dependency_edges']));
    }

    public function test_users_include_known_unconstrained_polymorphic_session_and_email_dependencies(): void
    {
        $this->connection(['users', 'notifications', 'model_has_roles', 'model_has_permissions', 'sessions', 'password_reset_tokens', 'unrelated']);
        $scope = app(DatabaseBackupEngine::class)->backupScope(['notifications']);
        $this->assertSame(['model_has_permissions', 'model_has_roles', 'notifications', 'password_reset_tokens', 'sessions', 'users'], $scope['tables']);
        $this->assertNotContains('unrelated', $scope['tables']);
    }

    public function test_unknown_table_is_rejected(): void
    {
        $this->connection(['parents']);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('does not exist');
        app(DatabaseBackupEngine::class)->backupScope(['missing']);
    }

    public function test_unsafe_identifier_is_rejected(): void
    {
        $this->expectException(RuntimeException::class);
        app(BackupTableScope::class)->expand(['users; DROP TABLE roles'], ['users'], []);
    }

    public function test_incoming_cross_database_foreign_key_is_rejected(): void
    {
        $key = $this->key('external_child', 'parents');
        $key->table_schema = 'another_database';
        $connection = $this->connection(['parents'], [$key]);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('cross-database');
        app(BackupTableScope::class)->graph($connection);
    }

    public function test_selected_triggers_require_full_backup(): void
    {
        $connection = $this->connection(['parents', 'unrelated']);
        $connection->shouldReceive('select')->with('SELECT EVENT_OBJECT_TABLE AS table_name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?', ['scope_test'])
            ->andReturn([(object) ['table_name' => 'parents']]);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('triggers');
        app(DatabaseBackupEngine::class)->backupScope(['parents']);
    }

    public function test_referencing_view_requires_full_backup_but_unrelated_views_are_safe(): void
    {
        $connection = $this->connection(['parents', 'unrelated']);
        $connection->shouldReceive('select')->with('SELECT TABLE_NAME AS table_name FROM information_schema.VIEW_TABLE_USAGE WHERE TABLE_SCHEMA = ?', ['scope_test'])
            ->andReturn([(object) ['table_name' => 'unrelated']]);
        $this->assertSame(['parents'], app(DatabaseBackupEngine::class)->backupScope(['parents'])['tables']);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('view references');
        app(DatabaseBackupEngine::class)->backupScope(['unrelated']);
    }

    public function test_stored_routines_require_full_backup(): void
    {
        $connection = $this->connection(['parents']);
        $connection->shouldReceive('select')->with('SELECT ROUTINE_NAME AS name FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?', ['scope_test'])
            ->andReturn([(object) ['name' => 'unknown_dependencies']]);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Stored routines or events');
        app(DatabaseBackupEngine::class)->backupScope(['parents']);
    }

    public function test_mariadb_without_views_supports_selected_backups_without_mysql_metadata(): void
    {
        $connection = $this->connection(['parents']);
        $connection->shouldReceive('selectOne')->with('SELECT VERSION() AS version')->andReturn((object) ['version' => '11.4.5-MariaDB']);
        $connection->shouldReceive('select')->with(BackupTableScope::TABLES_SQL, ['scope_test', 'VIEW'])->once()->andReturn([]);
        $this->assertSame(['parents'], app(DatabaseBackupEngine::class)->backupScope(['parents'])['tables']);
    }

    public function test_mariadb_views_require_full_backup_when_dependencies_cannot_be_verified(): void
    {
        $connection = $this->connection(['parents']);
        $connection->shouldReceive('selectOne')->with('SELECT VERSION() AS version')->andReturn((object) ['version' => '11.4.5-MariaDB']);
        $connection->shouldReceive('select')->with(BackupTableScope::TABLES_SQL, ['scope_test', 'VIEW'])->once()->andReturn([(object) ['name' => 'unrelated_view']]);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('MariaDB view dependencies cannot be verified');
        app(DatabaseBackupEngine::class)->backupScope(['parents']);
    }

    /** @return DatabaseBackupEngine&MockInterface */
    private function compatibleEngine(): DatabaseBackupEngine
    {
        config([
            'database.default' => 'mysql', 'cache.default' => 'array', 'session.driver' => 'array', 'session.connection' => null,
            'queue.default' => 'sync', 'queue.batching.database' => 'mysql', 'queue.failed.database' => 'mysql',
            'queue.failed.driver' => 'database-uuids', 'permission.cache.store' => 'default',
            'backups.mysql_dump' => PHP_BINARY, 'backups.mysql_client' => PHP_BINARY,
        ]);
        $engine = Mockery::mock(DatabaseBackupEngine::class)->makePartial();
        $engine->shouldReceive('info')->andReturn(['engine' => 'mysql', 'server_major' => 8, 'migration_fingerprint' => 'test-fingerprint']);

        return $engine;
    }

    public function test_new_inbound_relationship_absent_from_package_is_rejected_before_restore(): void
    {
        $this->connection(['parents', 'children', 'new_child'], [$this->key('children', 'parents'), $this->key('new_child', 'parents')]);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('New related tables are missing');
        $this->compatibleEngine()->assertCompatible([
            'engine' => 'mysql', 'server_major' => 8, 'migration_fingerprint' => 'test-fingerprint',
            'scope' => 'tables', 'tables' => ['children', 'parents'], 'dependency_edges' => [['table' => 'children', 'related_table' => 'parents']],
        ]);
    }

    public function test_recorded_dependency_scope_can_restore_a_table_missing_from_current_database(): void
    {
        $this->connection(['parents', 'unrelated']);
        $engine = $this->compatibleEngine();
        $engine->assertCompatible([
            'engine' => 'mysql', 'server_major' => 8, 'migration_fingerprint' => 'test-fingerprint',
            'scope' => 'tables', 'tables' => ['children', 'parents'], 'dependency_edges' => [['table' => 'children', 'related_table' => 'parents']],
        ]);
        $this->assertSame(['parents', 'unrelated'], array_column($engine->tableCatalog(), 'name'));
    }

    public function test_historical_table_replaced_by_current_view_is_rejected_before_replacement(): void
    {
        $connection = $this->connection(['parents', 'unrelated']);
        $connection->shouldReceive('select')->with(BackupTableScope::TABLES_SQL, ['scope_test', 'VIEW'])
            ->andReturn([(object) ['name' => 'children']]);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('currently occupied by a view');
        $this->compatibleEngine()->assertCompatible([
            'engine' => 'mysql', 'server_major' => 8, 'migration_fingerprint' => 'test-fingerprint',
            'scope' => 'tables', 'tables' => ['children', 'parents'], 'dependency_edges' => [['table' => 'children', 'related_table' => 'parents']],
        ]);
    }

    public function test_composite_foreign_key_integrity_is_checked_explicitly_after_import(): void
    {
        $connection = $this->connection(['children', 'parents'], [
            $this->key('children', 'parents', 'composite', 'parent_a', 'a'), $this->key('children', 'parents', 'composite', 'parent_b', 'b'),
        ]);
        $pdo = Mockery::mock(\PDO::class);
        $statement = Mockery::mock(\PDOStatement::class);
        $pdo->shouldReceive('query')->once()->with('SELECT 1 FROM `children` c LEFT JOIN `parents` p ON c.`parent_a` = p.`a` AND c.`parent_b` = p.`b` WHERE c.`parent_a` IS NOT NULL AND c.`parent_b` IS NOT NULL AND p.`a` IS NULL LIMIT 1')
            ->andReturn($statement);
        $statement->shouldReceive('fetchColumn')->once()->andReturn(1);
        $connection->shouldReceive('getPdo')->andReturn($pdo);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('foreign-key relationships are invalid');
        app(DatabaseBackupEngine::class)->verifyRelationships(['children', 'parents']);
    }
}
