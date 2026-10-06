<?php

namespace App\Console\Commands;

use App\Actions\Backups\BackupPackage;
use App\Actions\Backups\BackupStore;
use App\Actions\Backups\DatabaseBackupEngine;
use App\Actions\Backups\ExecuteBackupOperation;
use App\Actions\Backups\ImportBackupPackage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class BackupsRestore extends Command
{
    protected $signature = 'backups:restore {source : Backup ID or local FieldOps package path}
        {--database= : Explicit exact database-name confirmation for unattended restore}
        {--recovery : Recover from an interrupted/failed restore while maintenance is active}
        {--note= : Audit note, up to 1000 characters}';

    protected $description = 'Replace the configured database using a trusted signed package';

    public function handle(BackupStore $store, BackupPackage $package, DatabaseBackupEngine $engine, ImportBackupPackage $import, ExecuteBackupOperation $execute): int
    {
        $database = DB::connection()->getDatabaseName();
        $confirmation = $this->option('database');
        if ($confirmation === null && $this->input->isInteractive()) {
            $this->warn('This replaces the tables recorded in the package. Full packages replace the entire database. Everyone must sign in again. Stop external writers first.');
            $confirmation = $this->ask('Type the configured database name to continue');
        }
        if ($database === '' || ! is_string($confirmation) || ! hash_equals($database, $confirmation)) {
            $this->error('Restore cancelled. Confirm the exact configured database name.');

            return self::FAILURE;
        }
        $recovery = (bool) $this->option('recovery');
        try {
            $note = (string) ($this->option('note') ?? '');
            if (mb_strlen($note) > 1000) {
                throw new RuntimeException('The audit note must not exceed 1000 characters.');
            }
            $context = ['actor' => ['id' => null, 'name' => 'CLI operator', 'source' => 'cli'], 'audit_note' => $note];
            // Recover stale running records only after proving no live runner owns them.
            $runner = $store->lock('runner');
            try {
                $store->interruptAbandoned();
            } finally {
                $store->unlock($runner);
            }
            if ($recovery && ! $store->maintenance()) {
                throw new RuntimeException('Recovery requires an existing failed restore maintenance window.');
            }
            $source = (string) $this->argument('source');
            if (Str::isUuid($source)) {
                $store->backup($source);
                $engine->assertCompatible($package->inspect($store->packagePath($source)), $recovery);
                $backupId = $source;
            } else {
                $backupId = (string) $import->handle($source, $recovery, $context)['id'];
            }
            $operation = $execute->inline('restore', $backupId, $recovery, $context);
            if ($operation === null || $operation['status'] !== 'succeeded') {
                $this->error((string) ($operation['error'] ?? 'Restore did not complete.'));
                $this->warn('If maintenance remains active, keep source/safety backups and use backups:restore --recovery.');

                return self::FAILURE;
            }
            $this->info('Database restored. All users must sign in again.');

            return self::SUCCESS;
        } catch (RuntimeException $exception) {
            $this->error(get_class($exception) === RuntimeException::class ? $exception->getMessage() : 'Restore failed. Check database availability and backup configuration.');

            return self::FAILURE;
        }
    }
}
