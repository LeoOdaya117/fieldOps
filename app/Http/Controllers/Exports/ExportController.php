<?php

namespace App\Http\Controllers\Exports;

use App\Actions\Exports\ExportArtifactAccess;
use App\Actions\Exports\ExportDatasetRegistry;
use App\Actions\Exports\ExportReportWriter;
use App\Actions\Exports\GenerateExportArtifact;
use App\Http\Controllers\Controller;
use App\Http\Requests\Exports\StoreExportRequest;
use App\Jobs\GenerateExportArtifactJob;
use App\Models\ExportArtifact;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ExportController extends Controller
{
    public function store(StoreExportRequest $request, ExportDatasetRegistry $registry, GenerateExportArtifact $generate): RedirectResponse
    {
        $user = $request->user();
        $dataset = (string) $request->route('dataset');
        $format = (string) $request->route('format');
        $filters = $request->validatedFilters();
        $columns = $request->validatedColumns();
        if ($columns !== null) {
            $filters['_report_columns'] = $columns;
        }
        if (in_array($format, ['pdf', 'print'], true)) {
            // A queued worker must render the same instant and locale as the listing request.
            $filters['_source_timezone'] = (string) config('app.timezone', 'UTC');
            $filters['_report_timezone'] = $request->validatedReportTimezone() ?? $filters['_source_timezone'];
            $filters['_report_locale'] = $request->validatedReportLocale() ?? 'en-US';
        }

        if ($dataset === 'files') {
            $status = ($filters['record_status'] ?? 'active') === 'inactive';
            $scopes = $registry->eligibleFileScopes($user, $format, includeDeleted: $status);
            if (is_string($filters['module'] ?? null) && $filters['module'] !== '') {
                $scopes = array_intersect_key($scopes, [$filters['module'] => true]);
            }
            $filters['_file_scopes'] = $scopes;
            $filters['_format'] = $format;
        }

        $count = $registry->query($dataset, $user, $filters)->count();
        if ($count > 10000) {
            return back()->withErrors(['export' => 'This export exceeds the 10,000 row limit. Narrow the filters and try again.']);
        }

        $artifact = ExportArtifact::query()->create([
            'owner_id' => $user->getKey(),
            'dataset' => $dataset,
            'format' => $format,
            'status' => $count > 500 ? 'queued' : 'generating',
            'filters' => $filters,
            'disk' => 'local',
            'row_count' => $count,
            'expires_at' => now()->addHours(24),
        ]);

        if ($count > 500) {
            try {
                GenerateExportArtifactJob::dispatch((string) $artifact->getKey());
                $artifact->refresh();
            } catch (Throwable $exception) {
                report($exception);
                $generate->fail($artifact, 'The export could not be queued. Please try again.');

                return back()->withErrors(['export' => 'The export could not be queued. Please try again.']);
            }
        } else {
            $generate->execute((string) $artifact->getKey());
            $artifact->refresh();
        }

        if ($artifact->status === 'failed') {
            return back()->withErrors(['export' => $artifact->failure_message ?? 'The export could not be generated. Please try again.']);
        }

        $ready = $artifact->status === 'ready';
        $result = [
            'status' => $ready ? 'ready' : 'queued',
            'message' => $ready ? 'Your export is ready.' : 'Your export is being prepared. You will be notified when it is ready.',
            'rowCount' => $artifact->row_count,
            'expiresAt' => $artifact->expires_at->toIso8601String(),
        ];
        if ($ready) {
            if ($format === 'print') {
                $result['printUrl'] = route('exports.artifacts.print', $artifact);
            } else {
                $result['downloadUrl'] = route('exports.artifacts.download', $artifact);
            }
        }

        return back()->with('exportResult', $result);
    }

    public function download(Request $request, ExportArtifact $artifact): StreamedResponse
    {
        app(ExportArtifactAccess::class)->resolveOrFail($artifact, $request->user());
        abort_if($artifact->format === 'print', 404);
        $extension = app(ExportReportWriter::class)->extension($artifact->format);
        $filename = $artifact->dataset.'-export-'.$artifact->created_at->format('Ymd').'.'.$extension;

        return Storage::disk($artifact->disk)->download($artifact->path, $filename, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function print(Request $request, ExportArtifact $artifact): Response
    {
        app(ExportArtifactAccess::class)->resolveOrFail($artifact, $request->user());
        abort_unless($artifact->format === 'print', 404);

        if (str_ends_with($artifact->path, '.pdf')) {
            $filename = $artifact->dataset.'-export-'.$artifact->created_at->format('Ymd').'.pdf';

            return response(Storage::disk($artifact->disk)->get($artifact->path), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="'.$filename.'"',
                'Cache-Control' => 'private, no-store',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        abort_unless(str_ends_with($artifact->path, '.html'), 404);

        return response(Storage::disk($artifact->disk)->get($artifact->path), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'private, no-store',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
