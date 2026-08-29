<?php

namespace App\Http\Middleware;

use App\Models\BlockedIpAddress;
use App\Support\Security\IpAddress;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class BlockBlockedIpAddress
{
    public function handle(Request $request, Closure $next): Response
    {
        $ipAddress = IpAddress::normalize($request->ip());

        if ($ipAddress === null) {
            return $next($request);
        }

        try {
            $isBlocked = BlockedIpAddress::query()
                ->active()
                ->where('ip_address', $ipAddress)
                ->exists();
        } catch (Throwable $exception) {
            report($exception);

            return response('Service unavailable.', 503);
        }

        if ($isBlocked) {
            $request->attributes->set('visit_log_event_type', 'blocked_request');
            $request->attributes->set('visit_log_outcome', 'blocked_ip');

            return response('Access denied.', 403);
        }

        return $next($request);
    }
}
