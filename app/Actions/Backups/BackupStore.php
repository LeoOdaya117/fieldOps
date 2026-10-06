<?php

namespace App\Actions\Backups;

use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;
use RuntimeException;

/** Durable single-host state. Nothing here depends on the restored database. */
class BackupStore
{
    public function root(): string
    {
        $root = rtrim((string) config('backups.root'), '/\\');
        if ($root === '' || is_link($root)) {
            throw new RuntimeException('Configure a private local backup directory.');
        }
        foreach ([$root, $root.'/packages', $root.'/operations', $root.'/tmp', $root.'/audit'] as $directory) {
            if (! is_dir($directory) && ! @mkdir($directory, 0700, true) && ! is_dir($directory)) {
                throw new RuntimeException('Backup storage is unavailable. Check private storage permissions.');
            }
            if (is_link($directory)) {
                throw new RuntimeException('Backup storage must use private local directories.');
            }
            @chmod($directory, 0700);
        }

        return $root;
    }

    /** @param LOCK_EX|LOCK_SH $mode
     * @return resource
     */
    public function lock(string $name, int $mode = LOCK_EX, int $timeout = 0)
    {
        if (! in_array($name, ['operations', 'runner', 'writers'], true)) {
            throw new RuntimeException('Invalid backup lock.');
        }
        $path = $this->root().'/'.$name.'.lock';
        $handle = @fopen($path, 'c+b');
        if ($handle === false) {
            throw new RuntimeException('Unable to lock backup storage. Check storage permissions.');
        }
        @chmod($path, 0600);
        $deadline = microtime(true) + $timeout;
        do {
            if (flock($handle, $mode | LOCK_NB)) {
                return $handle;
            }
            if ($timeout > 0) {
                usleep(50000);
            }
        } while (microtime(true) < $deadline);
        fclose($handle);
        throw new RuntimeException('Another operation is active. Wait for application writers to stop and try again.');
    }

    /** @param resource $handle */
    public function unlock($handle): void
    {
        flock($handle, LOCK_UN);
        fclose($handle);
    }

    /** @template T
     * @param  callable(): T  $callback
     * @return T
     */
    public function synchronized(callable $callback): mixed
    {
        $lock = $this->lock('operations', LOCK_EX, 5);
        try {
            return $callback();
        } finally {
            $this->unlock($lock);
        }
    }

    public function packagePath(string $id): string
    {
        $this->assertId($id);

        return $this->root().'/packages/'.$id.'.fieldops';
    }

    public function temporaryPath(string $extension = 'sql'): string
    {
        if (! in_array($extension, ['sql', 'fieldops'], true)) {
            throw new RuntimeException('Invalid staging type.');
        }

        return $this->root().'/tmp/'.Str::uuid().'.'.$extension;
    }

    /** @param array<string, mixed> $manifest
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    public function publish(string $path, array $manifest, string $kind = 'manual', array $context = []): array
    {
        return $this->synchronized(function () use ($path, $manifest, $kind, $context): array {
            $id = (string) Str::uuid();
            $target = $this->packagePath($id);
            if (! @rename($path, $target)) {
                throw new RuntimeException('Unable to publish the backup. Check disk space and permissions.');
            }
            @chmod($target, 0600);
            $metadata = [
                'id' => $id, 'created_at' => $manifest['created_at'],
                'size_bytes' => filesize($target), 'engine' => $manifest['engine'],
                'server_version' => $manifest['server_version'], 'kind' => $kind,
                'format_version' => $manifest['format_version'] ?? 1,
                'scope' => $manifest['scope'] ?? 'database',
                'tables' => $manifest['tables'] ?? null,
                'requested_tables' => $manifest['requested_tables'] ?? null,
                'created_by' => $manifest['created_by'] ?? null,
                'stored_by' => $context['actor'] ?? $manifest['created_by'] ?? null,
                'stored_at' => now()->toIso8601String(),
                'audit_note' => $manifest['audit_note'] ?? '',
            ];
            try {
                $this->write($this->root().'/packages/'.$id.'.json', $metadata);
                $this->recordAudit($kind === 'uploaded' ? 'backup.uploaded' : 'backup.created', [
                    ...$metadata, ...$context, 'actor' => $context['actor'] ?? $metadata['created_by'], 'status' => 'succeeded',
                    'source_created_by' => $metadata['created_by'], 'source_created_at' => $metadata['created_at'],
                    'source_audit_note' => $metadata['audit_note'],
                ], $id, $context['operation_id'] ?? null);
            } catch (\Throwable $exception) {
                @unlink($target);
                @unlink($this->root().'/packages/'.$id.'.json');
                throw $exception;
            }

            return $metadata;
        });
    }

    /** @return list<array<string, mixed>> */
    public function backups(): array
    {
        $backups = $this->records('packages');
        $protected = $this->protectedIds();
        foreach ($backups as &$backup) {
            $backup = $this->normalizeBackup($backup);
            $backup['protected'] = in_array($backup['id'], $protected, true);
        }
        unset($backup);

        return $backups;
    }

    /** @return array<string, mixed> */
    public function backup(string $id): array
    {
        $this->assertId($id);
        $path = $this->root().'/packages/'.$id.'.json';
        if (! is_file($path) || ! is_file($this->packagePath($id))) {
            throw new RuntimeException('The requested backup is unavailable.');
        }

        $backup = $this->normalizeBackup($this->read($path));
        $backup['protected'] = in_array($id, $this->protectedIds(), true);

        return $backup;
    }

    /** @param array<string, mixed> $context */
    public function delete(string $id, array $context = []): void
    {
        $this->synchronized(function () use ($id, $context): void {
            $backup = $this->backup($id);
            if (in_array($id, $this->protectedIds(), true)) {
                throw new RuntimeException('This backup is protected by an active or failed restore. Recover the database before deleting it.');
            }
            $audit = [...$backup, ...$context,
                'source_created_by' => $backup['created_by'], 'source_created_at' => $backup['created_at'],
                'source_audit_note' => $backup['audit_note'],
            ];
            $this->recordAudit('backup.delete_requested', [...$audit, 'status' => 'requested'], $id);
            if (! @unlink($this->packagePath($id))) {
                throw new RuntimeException('Unable to delete the backup. Check private storage permissions.');
            }
            @unlink($this->root().'/packages/'.$id.'.json');
            $this->recordAudit('backup.deleted', [...$audit, 'status' => 'succeeded'], $id);
        });
    }

    /** @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function queue(string $type, ?string $backupId = null, bool $recovery = false, array $context = []): array
    {
        return $this->synchronized(function () use ($type, $backupId, $recovery, $context): array {
            if (! in_array($type, ['backup', 'restore'], true)) {
                throw new RuntimeException('Invalid backup operation.');
            }
            if ($this->busy()) {
                throw new RuntimeException('A backup or restore is already queued or running.');
            }
            if ($this->maintenance() && ! $recovery) {
                throw new RuntimeException('Restore recovery is required. Use the CLI recovery command.');
            }
            if ($type === 'restore') {
                $backup = $this->backup((string) $backupId);
                $context = [...$context, 'scope' => $backup['scope'], 'tables' => $backup['tables'], 'requested_tables' => $backup['requested_tables']];
            }
            $operation = [
                'id' => (string) Str::uuid(), 'type' => $type, 'status' => 'queued',
                'created_at' => now()->toIso8601String(), 'started_at' => null, 'finished_at' => null,
                'error' => null, 'backup_id' => $backupId, 'safety_backup_id' => null,
                'recovery' => $recovery,
                'actor' => $context['actor'] ?? self::systemActor(),
                'scope' => $context['scope'] ?? 'database',
                'tables' => $context['tables'] ?? null,
                'requested_tables' => $context['requested_tables'] ?? null,
                'dependency_edges' => $context['dependency_edges'] ?? [],
                'audit_note' => $context['audit_note'] ?? '',
                'source_created_by' => $context['source_created_by'] ?? $backup['created_by'] ?? null,
                'source_created_at' => $context['source_created_at'] ?? $backup['created_at'] ?? null,
                'source_audit_note' => $context['source_audit_note'] ?? $backup['audit_note'] ?? null,
            ];
            $this->recordAudit($recovery ? 'restore.recovery_requested' : $type.'.requested', $operation, $backupId, (string) $operation['id']);
            $this->saveOperation($operation);

            return $operation;
        });
    }

    /** @return list<array<string, mixed>> */
    public function operations(): array
    {
        return $this->records('operations');
    }

    public function busy(): bool
    {
        foreach ($this->operations() as $operation) {
            if (in_array($operation['status'], ['queued', 'running'], true)) {
                return true;
            }
        }

        return false;
    }

    /** @param array<string, mixed> $operation */
    public function saveOperation(array $operation): void
    {
        $id = (string) $operation['id'];
        $this->assertId($id);
        $this->write($this->root().'/operations/'.$id.'.json', $operation);
    }

    /** Call only while holding the independent runner lock. */
    public function interruptAbandoned(): void
    {
        $this->synchronized(function (): void {
            foreach ($this->operations() as $operation) {
                if ($operation['status'] === 'running') {
                    $operation['status'] = 'interrupted';
                    $operation['finished_at'] = now()->toIso8601String();
                    $operation['error'] = 'The runner stopped before completion. Inspect the database and use CLI recovery if maintenance is active.';
                    $this->recordAudit($operation['type'].'.interrupted', $operation, $operation['backup_id'], (string) $operation['id']);
                    $this->saveOperation($operation);
                }
            }
        });
    }

    /** @return list<string> */
    private function protectedIds(): array
    {
        $ids = [];
        foreach ($this->operations() as $operation) {
            if ($operation['type'] === 'restore' && ! isset($operation['recovered_by'])
                && (in_array($operation['status'], ['queued', 'running'], true)
                    || ($this->maintenance() && in_array($operation['status'], ['failed', 'interrupted'], true)))) {
                foreach (['backup_id', 'safety_backup_id'] as $key) {
                    if (is_string($operation[$key])) {
                        $ids[] = $operation[$key];
                    }
                }
            }
        }

        return $ids;
    }

    /** Release retained recovery packages only after a verified successful restore. */
    public function recovered(string $operationId): void
    {
        $this->synchronized(function () use ($operationId): void {
            foreach ($this->operations() as $operation) {
                if ($operation['type'] === 'restore' && in_array($operation['status'], ['failed', 'interrupted'], true)) {
                    $operation['recovered_by'] = $operationId;
                    $this->saveOperation($operation);
                }
            }
        });
    }

    /** @phpstan-impure */
    public function maintenance(): bool
    {
        return is_file($this->root().'/maintenance.json');
    }

    public function beginMaintenance(string $operationId): void
    {
        $this->write($this->root().'/maintenance.json', ['operation_id' => $operationId]);
    }

    public function endMaintenance(): void
    {
        $path = $this->root().'/maintenance.json';
        if (is_file($path) && ! @unlink($path)) {
            throw new RuntimeException('Unable to exit maintenance. Check private storage permissions.');
        }
    }

    public function authEpoch(): string
    {
        $path = $this->root().'/auth-epoch.json';
        if (! is_file($path)) {
            $this->synchronized(function () use ($path): void {
                if (! is_file($path)) {
                    $this->write($path, ['epoch' => bin2hex(random_bytes(32))]);
                }
            });
        }
        $epoch = $this->read($path)['epoch'] ?? null;
        if (! is_string($epoch) || ! preg_match('/\A[a-f0-9]{64}\z/', $epoch)) {
            throw new RuntimeException('The persistent authentication epoch is unavailable.');
        }

        return $epoch;
    }

    public function rotateAuthEpoch(): void
    {
        $this->write($this->root().'/auth-epoch.json', ['epoch' => bin2hex(random_bytes(32))]);
    }

    public function heartbeat(): void
    {
        $this->write($this->root().'/runner-heartbeat.json', ['time' => time()]);
    }

    public function runnerAvailable(): bool
    {
        $path = $this->root().'/runner-heartbeat.json';

        return is_file($path) && (int) ($this->read($path)['time'] ?? 0) >= time() - 15;
    }

    /** @return array{id: null, name: string, source: string} */
    public static function systemActor(): array
    {
        return ['id' => null, 'name' => 'Backup runner', 'source' => 'system'];
    }

    /** Append-only application audit. No update/delete route exists for these files.
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    public function recordAudit(string $event, array $context = [], ?string $backupId = null, ?string $operationId = null): array
    {
        $id = (string) Str::uuid();
        $record = [
            'id' => $id, 'event' => $event, 'created_at' => now()->toIso8601String(),
            'actor' => $context['actor'] ?? self::systemActor(),
            'backup_id' => $backupId, 'operation_id' => $operationId,
            'scope' => $context['scope'] ?? 'database', 'tables' => $context['tables'] ?? null,
            'requested_tables' => $context['requested_tables'] ?? null,
            'audit_note' => $context['audit_note'] ?? '',
            'status' => $context['status'] ?? null, 'error' => $context['error'] ?? null,
            'source_created_by' => $context['source_created_by'] ?? $context['created_by'] ?? null,
            'source_created_at' => $context['source_created_at'] ?? (array_key_exists('created_by', $context) ? ($context['created_at'] ?? null) : null),
            'source_audit_note' => $context['source_audit_note'] ?? (array_key_exists('created_by', $context) ? ($context['audit_note'] ?? null) : null),
            'stored_by' => $context['stored_by'] ?? null,
        ];
        $this->write($this->root().'/audit/'.$id.'.json', $record);

        return $record;
    }

    /** @return list<array<string, mixed>> */
    public function auditEvents(?string $backupId = null): array
    {
        $events = $this->records('audit');

        return $backupId === null ? $events : array_values(array_filter($events, static fn (array $event): bool => $event['backup_id'] === $backupId));
    }

    /** @param list<array<string, mixed>> $records
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function paginate(array $records, array $filters, string $path): array
    {
        $records = array_values(array_filter($records, static function (array $record) use ($filters): bool {
            foreach (['scope', 'kind', 'event', 'status'] as $key) {
                if (! empty($filters[$key]) && ($record[$key] ?? '') !== $filters[$key]) {
                    return false;
                }
            }
            if (! empty($filters['backup']) && ($record['backup_id'] ?? $record['id']) !== $filters['backup']) {
                return false;
            }
            $actor = (string) ($record['created_by']['name'] ?? $record['actor']['name'] ?? '');
            if (! empty($filters['actor']) && mb_stripos($actor, (string) $filters['actor']) === false) {
                return false;
            }
            $searchable = implode(' ', [
                (string) $record['id'], $actor, (string) ($record['event'] ?? ''), (string) ($record['audit_note'] ?? ''),
                implode(' ', $record['tables'] ?? []),
            ]);
            if (! empty($filters['search']) && mb_stripos($searchable, (string) $filters['search']) === false) {
                return false;
            }
            $date = substr((string) $record['created_at'], 0, 10);

            return (empty($filters['from']) || $date >= $filters['from']) && (empty($filters['to']) || $date <= $filters['to']);
        }));
        $sort = in_array($filters['sort'] ?? '', ['created_at', 'size_bytes', 'scope', 'kind', 'event', 'actor', 'table_count'], true) ? $filters['sort'] : 'created_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 1 : -1;
        $value = static fn (array $record): mixed => match ($sort) {
            'actor' => $record['created_by']['name'] ?? $record['actor']['name'] ?? '',
            'table_count' => count($record['tables'] ?? []),
            default => $record[$sort] ?? '',
        };
        usort($records, static fn (array $a, array $b): int => ($value($a) <=> $value($b) ?: strcmp((string) $a['id'], (string) $b['id'])) * $direction);
        $perPage = max(1, min(100, (int) ($filters['perPage'] ?? $filters['per_page'] ?? 15)));
        $page = max(1, (int) ($filters['page'] ?? 1));
        $query = array_filter($filters, static fn ($value, $key): bool => $key !== 'page' && $value !== null && $value !== '', ARRAY_FILTER_USE_BOTH);
        unset($query['perPage']);
        $query['per_page'] = $perPage;

        return (new LengthAwarePaginator(array_slice($records, ($page - 1) * $perPage, $perPage), count($records), $perPage, $page, ['path' => $path, 'query' => $query]))->toArray();
    }

    /** @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    private function normalizeBackup(array $record): array
    {
        return [...[
            'format_version' => 1, 'scope' => 'database', 'tables' => null, 'requested_tables' => null,
            'created_by' => null, 'stored_by' => null, 'stored_at' => null, 'audit_note' => '',
        ], ...$record];
    }

    public function assertId(string $id): void
    {
        if (! Str::isUuid($id)) {
            throw new RuntimeException('The requested backup is unavailable.');
        }
    }

    /** @return list<array<string, mixed>> */
    private function records(string $directory): array
    {
        $records = [];
        foreach (glob($this->root().'/'.$directory.'/*.json') ?: [] as $path) {
            $records[] = $this->read($path);
        }
        usort($records, static fn (array $a, array $b): int => strcmp((string) $b['created_at'], (string) $a['created_at']));

        return $records;
    }

    /** @return array<string, mixed> */
    private function read(string $path): array
    {
        $contents = @file_get_contents($path);
        $value = $contents === false ? null : json_decode($contents, true);
        if (! is_array($value)) {
            throw new RuntimeException('Backup metadata is unreadable. Check private storage integrity.');
        }

        return $value;
    }

    /** @param array<string, mixed> $value */
    private function write(string $path, array $value): void
    {
        $temporary = $path.'.'.Str::uuid().'.tmp';
        try {
            if (@file_put_contents($temporary, json_encode($value, JSON_THROW_ON_ERROR), LOCK_EX) === false) {
                throw new RuntimeException('Unable to persist backup state. Check disk space and permissions.');
            }
            @chmod($temporary, 0600);
            if (! @rename($temporary, $path)) {
                throw new RuntimeException('Unable to publish backup state. Check private storage permissions.');
            }
        } finally {
            if (is_file($temporary)) {
                @unlink($temporary);
            }
        }
    }
}
