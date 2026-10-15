<?php

namespace App\Jobs;

use App\Actions\Exports\GenerateExportArtifact;
use App\Models\ExportArtifact;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class GenerateExportArtifactJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public readonly string $artifactId) {}

    public function handle(GenerateExportArtifact $generate): void
    {
        $generate->execute($this->artifactId);
    }

    public function failed(?Throwable $exception): void
    {
        $artifact = ExportArtifact::query()->find($this->artifactId);
        if ($artifact !== null) {
            app(GenerateExportArtifact::class)->fail($artifact, 'The export could not be generated. Please try again or narrow the filters.');
        }
    }
}
