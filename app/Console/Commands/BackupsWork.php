<?php

namespace App\Console\Commands;

use App\Actions\Backups\BackupStore;
use App\Actions\Backups\ExecuteBackupOperation;
use Illuminate\Console\Command;
use RuntimeException;

class BackupsWork extends Command
{
    protected $signature = 'backups:work {--once : Process at most one queued operation} {--sleep=1 : Seconds between checks}';

    protected $description = 'Run the independent filesystem backup worker (supervise this process)';

    public function handle(BackupStore $store, ExecuteBackupOperation $execute): int
    {
        do {
            try {
                $store->heartbeat();
                $operation = $execute->next();
                if ($operation !== null) {
                    $this->line($operation['id'].': '.$operation['status']);
                    if ($operation['status'] !== 'succeeded' && $this->option('once')) {
                        $this->error((string) $operation['error']);

                        return self::FAILURE;
                    }
                }
            } catch (RuntimeException $exception) {
                if ($this->option('once')) {
                    $this->error(get_class($exception) === RuntimeException::class ? $exception->getMessage() : 'The backup runner is unavailable.');

                    return self::FAILURE;
                }
                // Another inline command/worker may currently own the runner lock.
            }
            if ($this->option('once')) {
                break;
            }
            sleep(max(1, min(10, (int) $this->option('sleep'))));
        } while (true);

        return self::SUCCESS;
    }
}
