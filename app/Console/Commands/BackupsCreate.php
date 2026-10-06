<?php

namespace App\Console\Commands;

use App\Actions\Backups\BackupStore;
use App\Actions\Backups\DatabaseBackupEngine;
use App\Actions\Backups\ExecuteBackupOperation;
use Illuminate\Console\Command;
use RuntimeException;

class BackupsCreate extends Command
{
    protected $signature = 'backups:create {--table=* : Selected table names; related tables are automatically included} {--note= : Audit note, up to 1000 characters}';

    protected $description = 'Create a signed private database backup through the independent runner';

    public function handle(BackupStore $store, ExecuteBackupOperation $execute, DatabaseBackupEngine $engine): int
    {
        try {
            $note = (string) ($this->option('note') ?? '');
            if (mb_strlen($note) > 1000) {
                throw new RuntimeException('The audit note must not exceed 1000 characters.');
            }
            $requested = $this->option('table');
            if (count(array_filter($requested, 'is_string')) !== count($requested)) {
                throw new RuntimeException('Table selections must be simple database identifiers.');
            }
            $scope = $requested === [] ? ['scope' => 'database', 'requested_tables' => [], 'tables' => [], 'dependency_edges' => []]
                : $engine->backupScope(array_values($requested));
            $operation = $execute->inline('backup', null, false, [...$scope,
                'actor' => ['id' => null, 'name' => 'CLI operator', 'source' => 'cli'], 'audit_note' => $note]);
            if ($operation === null || $operation['status'] !== 'succeeded') {
                $this->error((string) ($operation['error'] ?? 'The backup did not complete.'));

                return self::FAILURE;
            }
            $this->info('Backup created: '.$operation['backup_id']);

            return self::SUCCESS;
        } catch (RuntimeException $exception) {
            $this->error(get_class($exception) === RuntimeException::class ? $exception->getMessage() : 'Unable to create the backup. Check database availability and configuration.');

            return self::FAILURE;
        }
    }
}
