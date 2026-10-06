<?php

namespace App\Console\Commands;

use App\Actions\Backups\BackupStore;
use Illuminate\Console\Command;
use RuntimeException;

class BackupsDelete extends Command
{
    protected $signature = 'backups:delete {backup : Opaque backup ID} {--note= : Audit note, up to 1000 characters}';

    protected $description = 'Delete an unprotected private backup';

    public function handle(BackupStore $store): int
    {
        try {
            $note = (string) ($this->option('note') ?? '');
            if (mb_strlen($note) > 1000) {
                throw new RuntimeException('The audit note must not exceed 1000 characters.');
            }
            $store->delete((string) $this->argument('backup'), ['actor' => ['id' => null, 'name' => 'CLI operator', 'source' => 'cli'], 'audit_note' => $note]);
            $this->info('Backup deleted.');

            return self::SUCCESS;
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
