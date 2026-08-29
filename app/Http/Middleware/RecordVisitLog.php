<?php

namespace App\Http\Middleware;

use App\Actions\Security\RecordVisitLog as RecordVisitLogAction;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class RecordVisitLog
{
    public function __construct(private readonly RecordVisitLogAction $recorder) {}

    public function handle(Request $request, Closure $next): Response
    {
        try {
            $response = $next($request);
        } catch (Throwable $exception) {
            if ($request->attributes->get('visit_log_event_type') === 'blocked_request') {
                $this->recordSafely($request, 'blocked_request', 'blocked_ip', 403);
            }

            throw $exception;
        }

        $eventType = $request->attributes->get('visit_log_event_type');
        $outcome = $request->attributes->get('visit_log_outcome');

        if (is_string($eventType) && is_string($outcome)) {
            $this->recordSafely($request, $eventType, $outcome, $response->getStatusCode());
        } elseif ($this->isPageVisit($request)) {
            $this->recordSafely(
                $request,
                'page_visit',
                $response->getStatusCode() < 400 ? 'success' : 'failed',
                $response->getStatusCode(),
            );
        }

        return $response;
    }

    private function isPageVisit(Request $request): bool
    {
        return $request->isMethod('GET')
            && ! $request->expectsJson()
            && $request->route() !== null
            && ! preg_match('/\.(?:css|js|map|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/i', $request->getPathInfo());
    }

    private function recordSafely(Request $request, string $eventType, string $outcome, int $statusCode): void
    {
        try {
            $this->recorder->record($eventType, $outcome, $request, $request->user(), $statusCode);
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
