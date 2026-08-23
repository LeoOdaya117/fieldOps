<?php

namespace App\Http\Controllers\Access;

use App\Http\Controllers\Controller;
use App\Models\AccessAuditEvent;
use App\Support\Pagination\PageSize;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', AccessAuditEvent::class);

        $actor = trim((string) $request->input('actor', ''));
        $subject = trim((string) $request->input('subject', ''));
        $fromValue = trim((string) $request->input('from', ''));
        $toValue = trim((string) $request->input('to', ''));
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $sortColumns = [
            'event' => 'event',
            'subject_type' => 'subject_type',
            'occurred_at' => 'occurred_at',
        ];
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

        $events = AccessAuditEvent::query()
            ->with('actor:id,name,email')
            ->when($request->string('event')->isNotEmpty(), fn ($query) => $query->where('event', $request->string('event')->toString()))
            ->when($actor !== '', static fn ($query) => $query->whereHas('actor', static fn ($query) => $query->where('name', 'like', "%{$actor}%")->orWhere('email', 'like', "%{$actor}%")))
            ->when($subject !== '', static fn ($query) => $query->where(static fn ($query) => $query->where('subject_type', 'like', "%{$subject}%")->orWhere('subject_id', $subject)))
            ->when($from !== null, static fn ($query) => $query->where('occurred_at', '>=', $from->startOfDay()))
            ->when($to !== null, static fn ($query) => $query->where('occurred_at', '<=', $to->endOfDay()))
            ->when(
                $sort === 'actor',
                static fn ($query) => $query
                    ->leftJoin('users', 'access_audit_events.actor_user_id', '=', 'users.id')
                    ->select('access_audit_events.*')
                    ->orderBy('users.name', $direction),
                static fn ($query) => $query->when(
                    isset($sortColumns[$sort]),
                    static fn ($query) => $query->orderBy($sortColumns[$sort], $direction),
                    static fn ($query) => $query->latest('occurred_at'),
                ),
            )
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize))
            ->through(static fn (AccessAuditEvent $event): array => [
                'id' => $event->id,
                'event' => $event->event,
                'actor' => $event->actor === null ? null : ['id' => $event->actor->id, 'name' => $event->actor->name, 'email' => $event->actor->email],
                'subjectType' => $event->subject_type,
                'subjectId' => $event->subject_id,
                'before' => $event->before,
                'after' => $event->after,
                'occurredAt' => $event->occurred_at->toIso8601String(),
            ]);

        return Inertia::render('access/audit', [
            'events' => $events,
            'eventTypes' => AccessAuditEvent::query()->distinct()->orderBy('event')->pluck('event')->values(),
            'filters' => [
                'event' => $request->string('event')->toString(),
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
}
