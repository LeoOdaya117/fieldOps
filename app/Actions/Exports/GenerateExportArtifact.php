<?php

namespace App\Actions\Exports;

use App\Models\ExportArtifact;
use App\Models\User;
use App\Notifications\ExportNotification;
use Illuminate\Support\Facades\Storage;
use Throwable;

class GenerateExportArtifact
{
    public function __construct(
        private readonly ExportDatasetRegistry $registry,
        private readonly ExportArtifactAccess $access,
        private readonly ExportReportWriter $writer,
    ) {}

    public function execute(string $artifactId): void
    {
        $artifact = ExportArtifact::query()->find($artifactId);
        if ($artifact === null || in_array($artifact->status, ['ready', 'failed'], true)) {
            return;
        }

        $owner = User::query()->find($artifact->owner_id);
        if ($owner === null || ! $this->access->canGenerate($artifact, $owner)) {
            $this->fail($artifact, 'Your access to this export changed before it could be generated.');

            return;
        }

        $artifact->forceFill(['status' => 'generating', 'failure_message' => null])->save();
        $filters = $artifact->filters;
        $originalTimezone = date_default_timezone_get();
        $originalConfigTimezone = config('app.timezone');
        try {
            $sourceTimezone = $filters['_source_timezone'] ?? null;
            if (is_string($sourceTimezone) && in_array($sourceTimezone, \DateTimeZone::listIdentifiers(\DateTimeZone::ALL_WITH_BC), true)) {
                config()->set('app.timezone', $sourceTimezone);
                date_default_timezone_set($sourceTimezone);
            }
            $count = $this->registry->query($artifact->dataset, $owner, $filters)->count();
            if ($count > 10000) {
                $this->fail($artifact, 'This export exceeds the 10,000 row limit. Narrow the filters and try again.');

                return;
            }

            $rows = $this->registry->rows($artifact->dataset, $owner, $filters);
            if (count($rows) > 10000) {
                $this->fail($artifact, 'This export exceeds the 10,000 row limit. Narrow the filters and try again.');

                return;
            }

            $title = $this->title($artifact->dataset);
            $selected = $filters['_report_columns'] ?? null;
            $columns = $this->registry->columns($artifact->dataset);
            if (in_array($artifact->format, ['pdf', 'print'], true) && $this->registry->hasSerialColumn($artifact->dataset)) {
                $columns = ['serial' => '#', ...$columns];
            }
            if (in_array($artifact->format, ['pdf', 'print'], true) && is_array($selected)) {
                if (! array_is_list($selected)) {
                    throw new \InvalidArgumentException('Invalid report columns.');
                }
                $keys = [];
                foreach ($selected as $key) {
                    if (! is_string($key)) {
                        throw new \InvalidArgumentException('Invalid report column.');
                    }
                    $keys[] = $key;
                }
                $columns = $this->registry->reportColumns($artifact->dataset, $keys);
            }
            $this->writer->write($artifact, $title, $columns, $rows);
            $changed = ExportArtifact::query()->whereKey($artifact->getKey())->where('status', 'generating')->update([
                'status' => 'ready',
                'row_count' => count($rows),
                'failure_message' => null,
                'updated_at' => now(),
            ]);
            if ($changed > 0) {
                $owner->notify(new ExportNotification(
                    'export.ready',
                    'Your export is ready',
                    $artifact->format === 'print'
                        ? $title.' report is ready to open for printing.'
                        : $title.' export is ready to download.',
                    (string) $artifact->getKey(),
                ));
            }
        } catch (Throwable $exception) {
            report($exception);
            $this->fail($artifact, 'The export could not be generated. Please try again or narrow the filters.');
        } finally {
            config()->set('app.timezone', $originalConfigTimezone);
            date_default_timezone_set($originalTimezone);
        }
    }

    public function fail(ExportArtifact $artifact, string $message): void
    {
        $changed = ExportArtifact::query()->whereKey($artifact->getKey())
            ->whereNotIn('status', ['ready', 'failed'])
            ->update(['status' => 'failed', 'failure_message' => $message, 'updated_at' => now()]);
        if ($changed === 0) {
            return;
        }

        $owner = User::query()->find($artifact->owner_id);
        $owner?->notify(new ExportNotification(
            'export.failed',
            'Your export could not be completed',
            $message,
            (string) $artifact->getKey(),
        ));

        $path = $artifact->path;
        if ($path !== null) {
            Storage::disk($artifact->disk)->delete($path);
        }
    }

    public function title(string $dataset): string
    {
        return match ($dataset) {
            'ip-blocks' => 'IP Blocks',
            'visit-logs' => 'Visit Logs',
            default => str($dataset)->replace('-', ' ')->title()->toString(),
        };
    }
}
