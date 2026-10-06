<?php

namespace App\Http\Controllers\Backups;

use App\Actions\Backups\BackupPackage;
use App\Actions\Backups\BackupStore;
use App\Actions\Backups\DatabaseBackupEngine;
use App\Actions\Backups\ImportBackupPackage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Backups\BackupQueryRequest;
use App\Http\Requests\Backups\BackupRequest;
use App\Http\Requests\Backups\RestoreBackupRequest;
use App\Http\Requests\Backups\StoreBackupRequest;
use App\Http\Requests\Backups\UploadBackupRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    public function index(BackupQueryRequest $request, BackupStore $store, DatabaseBackupEngine $engine): Response
    {
        $filters = $request->filters();

        return Inertia::render('backups/index', [...$this->common($store, $engine),
            'backups' => $store->paginate($store->backups(), $filters, route('system-settings.backups.index')),
            'filters' => $filters,
            'createdOperationId' => $request->session()->get('backupOperationId'),
        ]);
    }

    public function create(BackupRequest $request, BackupStore $store, DatabaseBackupEngine $engine): Response
    {
        $error = null;
        try {
            $catalog = $engine->tableCatalog();
        } catch (RuntimeException $exception) {
            $catalog = [];
            $error = $this->safeError($exception);
        }

        return Inertia::render('backups/create', [...$this->common($store, $engine), 'tableCatalog' => $catalog, 'tableCatalogError' => $error]);
    }

    public function tables(BackupRequest $request, DatabaseBackupEngine $engine): JsonResponse
    {
        try {
            return response()->json(['tableCatalog' => $engine->tableCatalog()]);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['tables' => $this->safeError($exception)]);
        }
    }

    public function show(BackupQueryRequest $request, string $backup, BackupStore $store, DatabaseBackupEngine $engine): Response
    {
        try {
            $record = $store->backup($backup);
        } catch (RuntimeException) {
            abort(404);
        }
        $filters = $request->filters();

        return Inertia::render('backups/show', [...$this->common($store, $engine), 'backup' => $record,
            'events' => $store->paginate($store->auditEvents($backup), $filters, route('system-settings.backups.show', $backup)),
            'filters' => $filters, 'eventTypes' => array_values(array_unique(array_column($store->auditEvents($backup), 'event'))),
        ]);
    }

    public function audit(BackupQueryRequest $request, BackupStore $store, DatabaseBackupEngine $engine): Response
    {
        $filters = $request->filters();
        $events = $store->auditEvents();

        return Inertia::render('backups/audit', [...$this->common($store, $engine),
            'events' => $store->paginate($events, $filters, route('system-settings.backups.audit')),
            'filters' => $filters, 'eventTypes' => array_values(array_unique(array_column($events, 'event'))),
        ]);
    }

    /** @return array<string,mixed> */
    private function common(BackupStore $store, DatabaseBackupEngine $engine): array
    {
        return [
            'operations' => array_slice($store->operations(), 0, 100),
            'prerequisites' => [...$engine->prerequisites(), [
                'label' => 'Independent backup runner',
                'ready' => $store->runnerAvailable() || $store->busy(),
                'message' => $store->runnerAvailable() || $store->busy() ? 'Available or processing an operation.' : 'Start the supervised backups:work process before queuing work.',
            ]], 'busy' => $store->busy(),
            'databaseName' => DB::connection()->getDatabaseName(),
            'maxUploadBytes' => (int) config('backups.upload_max_bytes'),
        ];
    }

    public function store(StoreBackupRequest $request, BackupStore $store, DatabaseBackupEngine $engine): RedirectResponse
    {
        try {
            $scope = $request->validated('scope') === 'tables'
                ? $engine->backupScope($request->validated('requested_tables'))
                : ['scope' => 'database', 'requested_tables' => [], 'tables' => [], 'dependency_edges' => []];
            $operation = $store->queue('backup', null, false, [...$scope, ...$request->auditContext()]);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['operation' => $this->safeError($exception)]);
        }

        return to_route('system-settings.backups.index')->with('backupOperationId', $operation['id']);
    }

    public function upload(UploadBackupRequest $request, ImportBackupPackage $import): RedirectResponse
    {
        /** @var UploadedFile $file */
        $file = $request->validated('package');
        try {
            $import->handle($file->getPathname(), false, $request->auditContext());
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['package' => $this->safeError($exception)]);
        }

        return to_route('system-settings.backups.index');
    }

    public function restore(RestoreBackupRequest $request, string $backup, BackupStore $store, BackupPackage $package, DatabaseBackupEngine $engine): RedirectResponse
    {
        $request->validated();
        try {
            // This lightweight integrity/compatibility check does no destructive work.
            $store->backup($backup);
            $engine->assertCompatible($package->inspect($store->packagePath($backup)));
            $store->queue('restore', $backup, false, $request->auditContext());
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['backup' => $this->safeError($exception)]);
        }

        return to_route('system-settings.backups.index');
    }

    public function destroy(BackupRequest $request, string $backup, BackupStore $store): RedirectResponse
    {
        try {
            $store->delete($backup, $request->auditContext());
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['backup' => $this->safeError($exception)]);
        }

        return to_route('system-settings.backups.index');
    }

    public function download(BackupRequest $request, string $backup, BackupStore $store): StreamedResponse
    {
        try {
            $store->backup($backup);
        } catch (RuntimeException) {
            abort(404);
        }

        $context = $request->auditContext();

        return response()->streamDownload(function () use ($store, $backup, $context): void {
            $stream = $store->synchronized(function () use ($store, $backup, $context) {
                $record = $store->backup($backup);
                $stream = fopen($store->packagePath($backup), 'rb');
                if ($stream === false) {
                    throw new RuntimeException('The requested backup is unavailable.');
                }
                $store->recordAudit('backup.download_requested', [...$record, ...$context,
                    'source_created_by' => $record['created_by'], 'source_created_at' => $record['created_at'],
                    'source_audit_note' => $record['audit_note'],
                ], $backup);

                return $stream;
            });
            try {
                fpassthru($stream);
            } finally {
                fclose($stream);
            }
        }, 'fieldops-'.$backup.'.fieldops', ['Content-Type' => 'application/octet-stream', 'Cache-Control' => 'private, no-store']);
    }

    private function safeError(RuntimeException $exception): string
    {
        return get_class($exception) === RuntimeException::class
            ? $exception->getMessage()
            : 'The operation could not be completed. Check database availability and backup configuration.';
    }
}
