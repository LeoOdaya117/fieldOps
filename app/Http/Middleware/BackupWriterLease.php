<?php

namespace App\Http\Middleware;

use App\Actions\Backups\BackupStore;
use Closure;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/** Globally precedes session/auth/settings middleware, which may read/write the DB. */
class BackupWriterLease
{
    /** @var list<resource> */
    private array $leases = [];

    public function __construct(private BackupStore $store)
    {
        // Kernel terminable middleware precedes deferred application callbacks.
        // Hold the lease through all PHP request shutdown work, including those writers.
        // A bound shutdown callback retains this object. Let PHP close its streams
        // at final request cleanup, after all shutdown callbacks/destructors; an
        // explicit unlock here would run before later-registered shutdown writers.
        register_shutdown_function(function (): void {});
    }

    public function handle(Request $request, Closure $next): Response
    {
        try {
            if ($this->store->maintenance()) {
                return $this->unavailable();
            }
            $lease = $this->store->lock('writers', LOCK_SH);
            // Closes the race between checking the sentinel and acquiring the lease.
            if ($this->store->maintenance()) {
                $this->store->unlock($lease);

                return $this->unavailable();
            }
            $this->leases[] = $lease;
        } catch (RuntimeException) {
            return $this->unavailable();
        }

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        // Deliberately retained until PHP shutdown. See constructor.
    }

    public function release(): void
    {
        foreach ($this->leases as $lease) {
            if (is_resource($lease)) {
                $this->store->unlock($lease);
            }
        }
        $this->leases = [];
    }

    private function unavailable(): Response
    {
        return response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Database maintenance</title><body><main><h1>Database maintenance</h1><p>A database restore is in progress. Please try again shortly and sign in when maintenance finishes.</p></main></body></html>', 503, ['Retry-After' => '30', 'Cache-Control' => 'no-store']);
    }
}
