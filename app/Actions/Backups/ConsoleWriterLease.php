<?php

namespace App\Actions\Backups;

use Illuminate\Console\Events\CommandFinished;
use Illuminate\Console\Events\CommandStarting;
use RuntimeException;

/** Tracks nested Artisan calls so queue/scheduler processes retain their writer lease. */
class ConsoleWriterLease
{
    /** @var list<bool> */
    private array $frames = [];

    /** @var resource|null */
    private $lease = null;

    private int $depth = 0;

    public function __construct(private BackupStore $store)
    {
        // Retain the bound object until PHP's final resource cleanup, including
        // callbacks/destructors registered after this callback.
        register_shutdown_function(function (): void {});
    }

    public function starting(CommandStarting $event): void
    {
        if (str_starts_with((string) $event->command, 'backups:')) {
            $this->frames[] = false;

            return;
        }
        if ($this->depth === 0 && ! is_resource($this->lease)) {
            if ($this->store->maintenance()) {
                throw new RuntimeException('Database restore maintenance is active. Stop writers and use backups:restore for recovery.');
            }
            $this->lease = $this->store->lock('writers', LOCK_SH);
            if ($this->store->maintenance()) {
                $this->release();
                throw new RuntimeException('Database restore maintenance is active.');
            }
        }
        $this->frames[] = true;
        $this->depth++;
    }

    public function finished(CommandFinished $event): void
    {
        if (array_pop($this->frames) === true) {
            $this->depth--;
        }
        // CommandFinished precedes console Kernel::terminate and deferred jobs.
        // The process keeps its lease until shutdown, just like an HTTP request.
    }

    public function release(): void
    {
        if (is_resource($this->lease)) {
            $this->store->unlock($this->lease);
            $this->lease = null;
        }
    }
}
