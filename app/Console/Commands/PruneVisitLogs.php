<?php

namespace App\Console\Commands;

use App\Models\VisitLog;
use Illuminate\Console\Command;

class PruneVisitLogs extends Command
{
    protected $signature = 'visits:prune {--days= : Override the configured retention period}';

    protected $description = 'Delete visit logs older than the configured retention period';

    public function handle(): int
    {
        $configuredDays = (int) config('security.visit_log_retention_days', 90);
        $days = $this->option('days') === null ? $configuredDays : (int) $this->option('days');

        if ($days < 1) {
            $this->error('The retention period must be at least one day.');

            return self::INVALID;
        }

        $deleted = VisitLog::query()
            ->where('occurred_at', '<', now()->subDays($days))
            ->delete();

        $this->info("Deleted {$deleted} visit log(s) older than {$days} day(s).");

        return self::SUCCESS;
    }
}
