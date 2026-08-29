<?php

namespace App\Actions\Security;

use App\Models\User;
use App\Models\VisitLog;
use App\Support\Security\IpAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class RecordVisitLog
{
    public function record(
        string $eventType,
        ?string $outcome,
        ?Request $request = null,
        ?User $user = null,
        ?int $statusCode = null,
    ): ?VisitLog {
        $request ??= app()->bound('request') ? request() : null;
        $ipAddress = IpAddress::normalize($request?->ip());

        if ($request === null || $ipAddress === null) {
            return null;
        }

        return VisitLog::query()->create([
            'user_id' => $user?->getKey() ?? $request->user()?->getKey(),
            'event_type' => $eventType,
            'outcome' => $outcome,
            'ip_address' => $ipAddress,
            'user_agent' => $request->userAgent(),
            'method' => $request->method(),
            'route_name' => $request->route()?->getName(),
            'path' => $request->getPathInfo(),
            'status_code' => $statusCode,
            'occurred_at' => Carbon::now(),
        ]);
    }
}
