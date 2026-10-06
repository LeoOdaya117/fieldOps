<?php

namespace App\Actions\Backups;

use App\Models\AccessAuditEvent;
use RuntimeException;
use Throwable;

class ExecuteBackupOperation
{
    public function __construct(private BackupStore $store, private BackupPackage $package, private DatabaseBackupEngine $engine) {}

    /** Processes one queued operation, exclusively. Never retries interrupted operations.
     * @return array<string, mixed>|null
     */
    public function next(): ?array
    {
        $runner = $this->store->lock('runner');
        try {
            return $this->processNext();
        } finally {
            $this->store->unlock($runner);
        }
    }

    /** CLI enqueue and execution share the runner lock, preventing a background
     * worker from stealing the CLI operation between those steps.
     *
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>|null
     */
    public function inline(string $type, ?string $backupId = null, bool $recovery = false, array $context = []): ?array
    {
        $runner = $this->store->lock('runner');
        try {
            $this->store->interruptAbandoned();
            $this->store->queue($type, $backupId, $recovery, $context);

            return $this->processNext();
        } finally {
            $this->store->unlock($runner);
        }
    }

    /** @return array<string, mixed>|null */
    private function processNext(): ?array
    {
        $this->store->interruptAbandoned();
        $operation = $this->store->synchronized(function (): ?array {
            $queued = array_values(array_filter($this->store->operations(), static fn (array $record): bool => $record['status'] === 'queued'));
            $operation = array_pop($queued);
            if ($operation !== null) {
                $operation['status'] = 'running';
                $operation['started_at'] = now()->toIso8601String();
                $this->store->saveOperation($operation);
            }

            return $operation;
        });
        if ($operation === null) {
            return null;
        }
        try {
            $this->store->recordAudit($operation['type'].'.started', $operation, $operation['backup_id'], (string) $operation['id']);
            if ($operation['type'] === 'restore') {
                $this->restore($operation);
            } else {
                $backup = $this->create('manual', [...$operation, 'operation_id' => $operation['id']]);
                $operation['backup_id'] = $backup['id'];
                foreach (['scope', 'tables', 'requested_tables'] as $field) {
                    $operation[$field] = $backup[$field];
                }
                $operation['source_created_by'] = $backup['created_by'];
                $operation['source_created_at'] = $backup['created_at'];
                $operation['source_audit_note'] = $backup['audit_note'];
                $this->store->recordAudit('backup.succeeded', [...$operation, 'status' => 'succeeded'], (string) $backup['id'], (string) $operation['id']);
            }
            $operation['status'] = 'succeeded';
            if ($operation['type'] === 'restore') {
                $this->store->recordAudit($operation['recovery'] ? 'restore.recovered' : 'restore.succeeded', $operation, (string) $operation['backup_id'], (string) $operation['id']);
            }
        } catch (Throwable $exception) {
            $operation['status'] = 'failed';
            // Database/process exception subclasses can contain SQL or credentials.
            $operation['error'] = get_class($exception) === RuntimeException::class
                ? $exception->getMessage()
                : 'The operation failed. Check database availability, backup client configuration, disk space, and protected server logs.';
            $this->store->recordAudit($operation['type'].'.failed', $operation, $operation['backup_id'], (string) $operation['id']);
        }
        $operation['finished_at'] = now()->toIso8601String();
        $this->store->saveOperation($operation);

        return $operation;
    }

    /** @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function create(string $kind, array $context = []): array
    {
        $sql = $this->store->temporaryPath();
        $path = $this->store->temporaryPath('fieldops');
        try {
            $info = $this->engine->info($kind === 'safety');
            $requested = ($context['scope'] ?? 'database') === 'tables' ? ($context['requested_tables'] ?? []) : null;
            $scope = $this->engine->backupScope($requested);
            if ($requested !== null && $scope['tables'] !== ($context['tables'] ?? [])) {
                throw new RuntimeException('Table relationships changed after this backup was requested. Review the table selection and create a new request.');
            }
            if ($requested === null) {
                $this->engine->dump($sql);
            } else {
                $this->engine->dump($sql, $scope['tables']);
            }
            $manifest = $this->package->create($sql, [
                ...$info, ...$scope, 'created_by' => $context['actor'] ?? BackupStore::systemActor(),
                'audit_note' => $context['audit_note'] ?? '',
            ], $path);
            $this->package->inspect($path);

            return $this->store->publish($path, $manifest, $kind, $context);
        } finally {
            foreach ([$sql, $path, $path.'.gz'] as $temporary) {
                if (is_file($temporary)) {
                    @unlink($temporary);
                }
            }
        }
    }

    /** @param array<string, mixed> $operation */
    private function restore(array &$operation): void
    {
        $source = $this->store->packagePath((string) $operation['backup_id']);
        $manifest = $this->package->inspect($source);
        $recovery = (bool) $operation['recovery'];
        $this->engine->assertCompatible($manifest, $recovery);
        foreach (['scope', 'tables', 'requested_tables'] as $field) {
            $operation[$field] = $manifest[$field] ?? ($field === 'scope' ? 'database' : null);
        }
        $operation['source_created_by'] = $manifest['created_by'] ?? null;
        $operation['source_created_at'] = $manifest['created_at'];
        $operation['source_audit_note'] = $manifest['audit_note'] ?? null;
        $this->store->saveOperation($operation);
        $sql = $this->store->temporaryPath();
        $writer = null;
        $destructive = false;
        $wasMaintenance = $this->store->maintenance();
        $application = app()->maintenanceMode();
        if ($application->active() && ! $wasMaintenance) {
            throw new RuntimeException('The application already has an unrelated maintenance window. Finish it before restoring.');
        }
        try {
            // Validate and fully stage the bounded payload before taking down the site.
            $this->package->extract($source, $sql);
            $this->store->beginMaintenance((string) $operation['id']);
            $application->activate(['time' => time(), 'retry' => 30]);
            $writer = $this->store->lock('writers', LOCK_EX, (int) config('backups.drain_timeout', 60));
            // Existing HTTP requests/console writers have now completed. Deployments must
            // also stop writers outside Laravel before submitting restore.
            $this->engine->assertCompatible($manifest, $recovery);
            if (! $recovery) {
                $safety = $this->create('safety', [
                    'actor' => BackupStore::systemActor(), 'operation_id' => $operation['id'],
                    'audit_note' => 'Automatic full safety backup before database restore.',
                ]);
                $operation['safety_backup_id'] = $safety['id'];
                $this->store->saveOperation($operation);
            }
            // Recovery is only permitted with an explicitly confirmed CLI operation.
            // It skips safety creation: a partially imported DB cannot make a valid dump.
            $this->store->rotateAuthEpoch();
            $destructive = true;
            $tables = $operation['scope'] === 'tables' ? $operation['tables'] : null;
            if ($tables === null) {
                $this->engine->replace($sql);
                $this->engine->verifyRelationships();
            } else {
                $this->engine->replace($sql, $tables);
                $this->engine->verifyRelationships($tables);
            }
            $restored = $this->engine->info();
            if (! hash_equals((string) $manifest['migration_fingerprint'], (string) $restored['migration_fingerprint'])) {
                throw new RuntimeException('Restored migrations do not match the backup. Keep maintenance active and use CLI recovery.');
            }
            $this->engine->verifyAndResetRuntime();
            AccessAuditEvent::query()->create([
                'event' => $tables === null ? 'backups.database.restored' : 'backups.tables.restored', 'actor_user_id' => null,
                'after' => [
                    'operation_id' => $operation['id'], 'backup_id' => $operation['backup_id'],
                    'actor' => $operation['actor'] ?? BackupStore::systemActor(),
                    'scope' => $operation['scope'], 'tables' => $tables, 'audit_note' => $operation['audit_note'] ?? '',
                ],
                'occurred_at' => now(),
            ]);
            $this->store->recovered((string) $operation['id']);
            $this->store->recordAudit('restore.verified', [...$operation, 'status' => 'verified'], (string) $operation['backup_id'], (string) $operation['id']);
            $application->deactivate();
            $this->store->endMaintenance();
        } catch (Throwable $exception) {
            if (! $destructive && ! $wasMaintenance) {
                $application->deactivate();
                $this->store->endMaintenance();
            }
            throw $exception;
        } finally {
            if (is_resource($writer)) {
                $this->store->unlock($writer);
            }
            if (is_file($sql)) {
                @unlink($sql);
            }
        }
    }
}
