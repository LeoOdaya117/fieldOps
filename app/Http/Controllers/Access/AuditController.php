<?php

namespace App\Http\Controllers\Access;

use App\Actions\DataTables\BuildListingQuery;
use App\Http\Controllers\Controller;
use App\Models\AccessAuditEvent;
use App\Support\Pagination\PageSize;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    public function index(Request $request, BuildListingQuery $listingQuery): Response
    {
        $this->authorize('viewAny', AccessAuditEvent::class);

        $eventTypes = AccessAuditEvent::query()->distinct()->orderBy('event')->pluck('event')->values()->all();
        $eventFilters = $this->filterValues($request->input('event'), $eventTypes);
        $actor = trim((string) $request->input('actor', ''));
        $subject = trim((string) $request->input('subject', ''));
        $fromValue = trim((string) $request->input('from', ''));
        $toValue = trim((string) $request->input('to', ''));
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $from = null;
        $to = null;

        try {
            $parsedFrom = $fromValue === '' ? false : CarbonImmutable::createFromFormat('Y-m-d', $fromValue);
            $parsedTo = $toValue === '' ? false : CarbonImmutable::createFromFormat('Y-m-d', $toValue);
            $from = $parsedFrom === false ? null : $parsedFrom;
            $to = $parsedTo === false ? null : $parsedTo;
        } catch (\Throwable) {
            // Invalid optional filters are treated as absent filters.
        }

        $events = $listingQuery->query('audit', $request->user(), [
            'event' => $eventFilters,
            'actor' => $actor,
            'subject' => $subject,
            'from' => $from?->format('Y-m-d'),
            'to' => $to?->format('Y-m-d'),
            'sort' => $sort,
            'direction' => $direction,
        ])
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize))
            ->through(static fn (AccessAuditEvent $event): array => [
                'id' => $event->id,
                'event' => $event->event,
                'actor' => $event->actor === null ? null : ['id' => $event->actor->id, 'name' => $event->actor->name, 'email' => $event->actor->email],
                'subjectType' => $event->subject_type,
                'subjectId' => $event->subject_id,
                'ipAddress' => $event->ip_address,
                'userAgent' => $event->user_agent,
                'before' => $event->before,
                'after' => $event->after,
                'occurredAt' => $event->occurred_at->toIso8601String(),
            ]);

        return Inertia::render('access/audit', [
            'events' => $events,
            'eventTypes' => $eventTypes,
            'filters' => [
                'event' => $this->filterValue($eventFilters),
                'actor' => $actor,
                'subject' => $subject,
                'from' => $from?->format('Y-m-d') ?? '',
                'to' => $to?->format('Y-m-d') ?? '',
                'sort' => $sort,
                'direction' => $direction,
                'perPage' => $pageSize,
            ],
        ]);
    }

    public function show(AccessAuditEvent $accessAuditEvent): Response
    {
        $this->authorize('view', $accessAuditEvent);
        $accessAuditEvent->load('actor:id,name,email');

        return Inertia::render('access/audit-show', [
            'event' => [
                'id' => $accessAuditEvent->id,
                'event' => $accessAuditEvent->event,
                'actor' => $accessAuditEvent->actor === null ? null : [
                    'id' => $accessAuditEvent->actor->id,
                    'name' => $accessAuditEvent->actor->name,
                    'email' => $accessAuditEvent->actor->email,
                ],
                'subjectType' => $accessAuditEvent->subject_type,
                'subjectId' => $accessAuditEvent->subject_id,
                'ipAddress' => $accessAuditEvent->ip_address,
                'userAgent' => $accessAuditEvent->user_agent,
                'before' => $accessAuditEvent->before,
                'after' => $accessAuditEvent->after,
                'occurredAt' => $accessAuditEvent->occurred_at->toIso8601String(),
            ],
        ]);
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
