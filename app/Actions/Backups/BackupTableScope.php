<?php

namespace App\Actions\Backups;

use Illuminate\Database\Connection;
use RuntimeException;

/** Resolves the complete undirected dependency component, including inbound FKs. */
class BackupTableScope
{
    public const TABLES_SQL = 'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?';

    public const KEYS_SQL = 'SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name, CONSTRAINT_NAME AS constraint_name, COLUMN_NAME AS column_name, REFERENCED_TABLE_SCHEMA AS related_schema, REFERENCED_TABLE_NAME AS related_table, REFERENCED_COLUMN_NAME AS related_column FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME IS NOT NULL AND (TABLE_SCHEMA = ? OR REFERENCED_TABLE_SCHEMA = ?) ORDER BY TABLE_SCHEMA, TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION';

    /** @return array{tables:list<string>,dependency_edges:list<array{table:string,related_table:string}>,foreign_keys:list<array{table:string,related_table:string,columns:list<array{column:string,related_column:string}>}>} */
    public function graph(Connection $connection): array
    {
        $database = (string) $connection->getDatabaseName();
        $tables = [];
        foreach ($connection->select(self::TABLES_SQL, [$database, 'BASE TABLE']) as $row) {
            $name = (string) $row->name;
            $this->assertName($name);
            $tables[] = $name;
        }
        sort($tables);
        $edges = [];
        $keys = [];
        foreach ($connection->select(self::KEYS_SQL, [$database, $database]) as $row) {
            if ($row->table_schema !== $database || $row->related_schema !== $database) {
                throw new RuntimeException('Backup table selection cannot include cross-database foreign keys. Use a coordinated database recovery procedure.');
            }
            $table = (string) $row->table_name;
            $related = (string) $row->related_table;
            $column = (string) $row->column_name;
            $relatedColumn = (string) $row->related_column;
            foreach ([$table, $related, $column, $relatedColumn] as $name) {
                $this->assertName($name);
            }
            $edges[] = ['table' => $table, 'related_table' => $related];
            $key = $table.'|'.(string) $row->constraint_name;
            $keys[$key] ??= ['table' => $table, 'related_table' => $related, 'columns' => []];
            $keys[$key]['columns'][] = ['column' => $column, 'related_column' => $relatedColumn];
        }
        // These links are meaningful even when their IDs/emails lack database FKs.
        foreach (['model_has_roles', 'model_has_permissions', 'notifications', 'sessions', 'password_reset_tokens', (string) config('session.table', 'sessions')] as $related) {
            if (in_array('users', $tables, true) && in_array($related, $tables, true)) {
                $edges[] = ['table' => 'users', 'related_table' => $related];
            }
        }

        return ['tables' => $tables, 'dependency_edges' => $this->canonicalEdges($edges), 'foreign_keys' => array_values($keys)];
    }

    /** @param list<string> $requested
     * @param  list<string>  $available
     * @param  list<array{table:string,related_table:string}>  $edges
     * @return list<string>
     */
    public function expand(array $requested, array $available, array $edges, bool $allowMissing = false): array
    {
        if ($requested === [] || count($requested) > 1000) {
            throw new RuntimeException('Select at least one table, with no more than 1000 tables per request.');
        }
        $selected = [];
        foreach ($requested as $table) {
            $this->assertName($table);
            if (! $allowMissing && ! in_array($table, $available, true)) {
                throw new RuntimeException('A selected table does not exist or is not a supported base table. Refresh the table catalog.');
            }
            $selected[$table] = true;
        }
        do {
            $changed = false;
            foreach ($edges as $edge) {
                $this->assertName($edge['table']);
                $this->assertName($edge['related_table']);
                if (isset($selected[$edge['table']]) || isset($selected[$edge['related_table']])) {
                    foreach ([$edge['table'], $edge['related_table']] as $table) {
                        if (! isset($selected[$table])) {
                            $selected[$table] = true;
                            $changed = true;
                        }
                    }
                }
            }
        } while ($changed);
        $result = array_keys($selected);
        sort($result);

        return $result;
    }

    /** @param list<array{table:string,related_table:string}> $edges
     * @return list<array{table:string,related_table:string}>
     */
    public function canonicalEdges(array $edges): array
    {
        $canonical = [];
        foreach ($edges as $edge) {
            $names = [$edge['table'], $edge['related_table']];
            sort($names);
            $canonical[$names[0].'|'.$names[1]] = ['table' => $names[0], 'related_table' => $names[1]];
        }
        ksort($canonical);

        return array_values($canonical);
    }

    public function assertName(string $name): void
    {
        if (! preg_match('/\A[a-zA-Z_][a-zA-Z0-9_]{0,63}\z/', $name)) {
            throw new RuntimeException('Backup table and column names must use simple database identifiers.');
        }
    }
}
