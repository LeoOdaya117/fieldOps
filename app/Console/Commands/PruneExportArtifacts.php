<?php

namespace App\Console\Commands;

use App\Models\ExportArtifact;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PruneExportArtifacts extends Command
{
    protected $signature = 'exports:prune';

    protected $description = 'Delete expired export files and artifact records';

    public function handle(): int
    {
        $deleted = 0;
        ExportArtifact::query()->where('expires_at', '<=', now())->orderBy('expires_at')->chunkById(100, function ($artifacts) use (&$deleted): void {
            foreach ($artifacts as $artifact) {
                $path = $artifact->path ?? $this->expectedPath($artifact);
                if ($path !== null && Storage::disk($artifact->disk)->exists($path)) {
                    Storage::disk($artifact->disk)->delete($path);
                }
                $artifact->delete();
                $deleted++;
            }
        });

        $this->info("Pruned {$deleted} expired export artifacts.");

        return self::SUCCESS;
    }

    private function expectedPath(ExportArtifact $artifact): ?string
    {
        $extension = match ($artifact->format) {
            'pdf' => 'pdf', 'csv' => 'csv', 'xlsx' => 'xlsx', 'print' => 'html',
            default => null,
        };

        return $extension === null ? null : 'exports/'.$artifact->owner_id.'/'.$artifact->getKey().'.'.$extension;
    }
}
