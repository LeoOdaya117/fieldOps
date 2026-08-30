<?php

namespace App\Http\Controllers\Access;

use App\Http\Controllers\Controller;
use App\Models\VisitLog;
use App\Support\Pagination\PageSize;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VisitLogController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', VisitLog::class);

        $ip = trim((string) $request->input('ip', ''));
        $user = trim((string) $request->input('user', ''));
        $location = trim((string) $request->input('location', ''));
        $event = (string) $request->input('event', '');
        $outcome = (string) $request->input('outcome', '');
        $statusCode = $request->integer('status_code');
        $fromValue = trim((string) $request->input('from', ''));
        $toValue = trim((string) $request->input('to', ''));
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'asc' ? 'asc' : 'desc';
        $pageSize = PageSize::resolve($request);
        $sortColumns = [
            'occurred_at' => 'occurred_at',
            'ip_address' => 'ip_address',
            'location_city' => 'location_city',
            'event_type' => 'event_type',
            'status_code' => 'status_code',
        ];
        $from = $this->parseDate($fromValue);
        $to = $this->parseDate($toValue);

        $logs = VisitLog::query()
            ->whereIn('event_type', VisitLog::EVENT_TYPES)
            ->with('user:id,name,email')
            ->when($ip !== '', static fn ($query) => $query->where('ip_address', 'like', "%{$ip}%"))
            ->when($user !== '', static fn ($query) => $query->whereHas('user', static fn ($query) => $query
                ->where('name', 'like', "%{$user}%")
                ->orWhere('email', 'like', "%{$user}%")))
            ->when($location !== '', static fn ($query) => $query->where(static function ($query) use ($location): void {
                $query->where('location_city', 'like', "%{$location}%")
                    ->orWhere('location_region', 'like', "%{$location}%")
                    ->orWhere('location_country_code', 'like', "%{$location}%");
            }))
            ->when(in_array($event, VisitLog::EVENT_TYPES, true), static fn ($query) => $query->where('event_type', $event))
            ->when(in_array($outcome, VisitLog::OUTCOMES, true), static fn ($query) => $query->where('outcome', $outcome))
            ->when($statusCode >= 100 && $statusCode <= 599, static fn ($query) => $query->where('status_code', $statusCode))
            ->when($from !== null, static fn ($query) => $query->where('occurred_at', '>=', $from->startOfDay()))
            ->when($to !== null, static fn ($query) => $query->where('occurred_at', '<=', $to->endOfDay()))
            ->when(
                isset($sortColumns[$sort]),
                static fn ($query) => $query->orderBy($sortColumns[$sort], $direction),
                static fn ($query) => $query->latest('occurred_at'),
            )
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize))
            ->through(fn (VisitLog $log): array => $this->serialize($log));

        return Inertia::render('access/visit-logs', [
            'logs' => $logs,
            'eventTypes' => VisitLog::EVENT_TYPES,
            'outcomes' => VisitLog::OUTCOMES,
            'filters' => [
                'ip' => $ip,
                'user' => $user,
                'location' => $location,
                'event' => $event,
                'outcome' => $outcome,
                'statusCode' => $statusCode > 0 ? (string) $statusCode : '',
                'from' => $from?->format('Y-m-d') ?? '',
                'to' => $to?->format('Y-m-d') ?? '',
                'sort' => $sort,
                'direction' => $direction,
                'perPage' => $pageSize,
            ],
        ]);
    }

    public function show(VisitLog $visitLog): Response
    {
        $this->authorize('view', $visitLog);
        $visitLog->load('user:id,name,email');

        return Inertia::render('access/visit-log-show', [
            'log' => $this->serialize($visitLog),
        ]);
    }

    /** @return array<string, mixed> */
    private function serialize(VisitLog $log): array
    {
        return [
            'id' => $log->id,
            'user' => $log->user === null ? null : [
                'id' => $log->user->id,
                'name' => $log->user->name,
                'email' => $log->user->email,
            ],
            'eventType' => $log->event_type,
            'outcome' => $log->outcome,
            'ipAddress' => $log->ip_address,
            'locationSource' => $log->location_source,
            'locationCountryCode' => $log->location_country_code,
            'locationRegion' => $log->location_region,
            'locationCity' => $log->location_city,
            'locationLatitude' => $log->location_latitude,
            'locationLongitude' => $log->location_longitude,
            'locationAccuracyMeters' => $log->location_accuracy_meters,
            'locationTimezone' => $log->location_timezone,
            'userAgent' => $log->user_agent,
            'method' => $log->method,
            'routeName' => $log->route_name,
            'path' => $log->path,
            'statusCode' => $log->status_code,
            'occurredAt' => $log->occurred_at->toIso8601String(),
        ];
    }

    private function parseDate(string $value): ?CarbonImmutable
    {
        if ($value === '') {
            return null;
        }

        try {
            return CarbonImmutable::createFromFormat('Y-m-d', $value);
        } catch (\Throwable) {
            return null;
        }
    }
}
