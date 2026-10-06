<?php

namespace App\Console\Commands;

use App\Actions\Backups\BackupStore;
use Illuminate\Console\Command;

class BackupsList extends Command
{
    protected $signature = 'backups:list';

    protected $description = 'List private backups and durable operation history without querying the database';

    public function handle(BackupStore $store): int
    {
        $this->table(['ID', 'Created', 'Creator', 'Scope', 'Tables', 'Bytes', 'Engine', 'Kind', 'Protected'], array_map(static fn (array $backup): array => [
            $backup['id'], $backup['created_at'], $backup['created_by']['name'] ?? 'Unknown (legacy)', $backup['scope'],
            is_array($backup['tables']) ? count($backup['tables']) : 'Unknown (legacy)',
            $backup['size_bytes'], $backup['engine'], $backup['kind'], $backup['protected'] ? 'yes' : 'no',
        ], $store->backups()));
        $this->table(['Operation', 'Type', 'Status', 'Backup', 'Safety backup', 'Error'], array_map(static fn (array $operation): array => [
            $operation['id'], $operation['type'], $operation['status'], $operation['backup_id'], $operation['safety_backup_id'], $operation['error'],
        ], $store->operations()));

        return self::SUCCESS;
    }
}
