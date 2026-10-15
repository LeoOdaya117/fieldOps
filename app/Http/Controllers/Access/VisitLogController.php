<?php

namespace App\Http\Controllers\Access;

use App\Actions\DataTables\BuildListingQuery;
use App\Http\Controllers\Controller;
use App\Models\VisitLog;
use App\Support\Pagination\PageSize;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VisitLogController extends Controller
{
    public function index(Request $request, BuildListingQuery $listingQuery): Response
    {
        $this->authorize('viewAny', VisitLog::class);

        $keyword = trim((string) $request->input('keyword', ''));
        $events = $this->filterValues($request->input('event'), VisitLog::EVENT_TYPES);
        $outcomes = $this->filterValues($request->input('outcome'), VisitLog::OUTCOMES);
        $statusCode = $request->integer('status_code');
        $fromValue = trim((string) $request->input('from', ''));
        $toValue = trim((string) $request->input('to', ''));
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'asc' ? 'asc' : 'desc';
        $pageSize = PageSize::resolve($request);
        $from = $this->parseDate($fromValue);
        $to = $this->parseDate($toValue);

        $logs = $listingQuery->query('visit-logs', $request->user(), [
            'keyword' => $keyword,
            'event' => $events,
            'outcome' => $outcomes,
            'status_code' => $statusCode >= 100 && $statusCode <= 599 ? $statusCode : null,
            'from' => $from?->format('Y-m-d'),
            'to' => $to?->format('Y-m-d'),
            'sort' => $sort,
            'direction' => $direction,
        ])
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize))
            ->through(fn (VisitLog $log): array => $this->serialize($log));

        return Inertia::render('access/visit-logs', [
            'logs' => $logs,
            'eventTypes' => VisitLog::EVENT_TYPES,
            'outcomes' => VisitLog::OUTCOMES,
            'filters' => [
                'keyword' => $keyword,
                'event' => $this->filterValue($events),
                'outcome' => $this->filterValue($outcomes),
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

    /** @param array<int, string> $allowed
     * @return array<int, string>
     */
    private function filterValues(mixed $value, array $allowed): array
    {
        $values = is_array($value) ? $value : [$value];

        return array_values(array_unique(array_filter(
            array_map(static fn (mixed $item): string => (string) $item, $values),
            static fn (string $item): bool => in_array($item, $allowed, true),
        )));
    }

    /** @param array<int, string> $values
     * @return string|array<int, string>
     */
    private function filterValue(array $values): string|array
    {
        return match (count($values)) {
            0 => '',
            1 => $values[0],
            default => $values,
        };
    }
}
