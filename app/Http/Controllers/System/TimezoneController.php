<?php

namespace App\Http\Controllers\System;

use App\Actions\System\ManageTimezone;
use App\Http\Controllers\Controller;
use App\Http\Requests\System\DeleteTimezoneRequest;
use App\Http\Requests\System\SaveTimezoneRequest;
use App\Models\Timezone;
use App\Models\User;
use App\Support\Pagination\PageSize;
use App\Support\SystemSettings;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TimezoneController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Timezone::class);

        $search = trim((string) $request->input('search', ''));
        $from = $this->parseDate($request->input('from'));
        $to = $this->parseDate($request->input('to'));
        $updatedFrom = $this->parseDate($request->input('updated_from'));
        $updatedTo = $this->parseDate($request->input('updated_to'));
        $createdBy = trim((string) $request->input('created_by', ''));
        $updatedBy = trim((string) $request->input('updated_by', ''));
        $recordStatuses = $this->filterValues($request->input('record_status'), ['active', 'inactive']);
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $sortColumns = [
            'name' => 'name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
            'record_status' => 'record_status',
        ];

        $timezones = Timezone::query()
            ->with(['createdBy:id,name,email', 'updatedBy:id,name,email'])
            ->when($search !== '', static fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->when($from !== null, static fn ($query) => $query->where('created_at', '>=', $from->startOfDay()))
            ->when($to !== null, static fn ($query) => $query->where('created_at', '<=', $to->endOfDay()))
            ->when(in_array('inactive', $recordStatuses, true), static fn ($query) => $query->withTrashed())
            ->when($recordStatuses !== [], static fn ($query) => $query->whereIn(
                'record_status',
                array_map(static fn (string $status): int => $status === 'active' ? 1 : 0, $recordStatuses),
            ))
            ->when($updatedFrom !== null, static fn ($query) => $query->where('updated_at', '>=', $updatedFrom->startOfDay()))
            ->when($updatedTo !== null, static fn ($query) => $query->where('updated_at', '<=', $updatedTo->endOfDay()))
            ->when($createdBy !== '', static fn ($query) => $query->whereHas('createdBy', static fn ($actorQuery) => $actorQuery
                ->where('name', 'like', "%{$createdBy}%")
                ->orWhere('email', 'like', "%{$createdBy}%")))
            ->when($updatedBy !== '', static fn ($query) => $query->whereHas('updatedBy', static fn ($actorQuery) => $actorQuery
                ->where('name', 'like', "%{$updatedBy}%")
                ->orWhere('email', 'like', "%{$updatedBy}%")))
            ->when(
                $sort === 'created_by',
                static fn ($query) => $query->orderBy(
                    DB::table('users as created_actors')
                        ->select('created_actors.name')
                        ->whereColumn('created_actors.id', 'timezones.created_by'),
                    $direction,
                ),
            )
            ->when(
                $sort === 'updated_by',
                static fn ($query) => $query->orderBy(
                    DB::table('users as updated_actors')
                        ->select('updated_actors.name')
                        ->whereColumn('updated_actors.id', 'timezones.updated_by'),
                    $direction,
                ),
            )
            ->when(
                $sort !== 'created_by' && $sort !== 'updated_by',
                static fn ($query) => $query->when(
                    isset($sortColumns[$sort]),
                    static fn ($query) => $query->orderBy($sortColumns[$sort], $direction),
                    static fn ($query) => $query->orderBy('name'),
                ),
            )
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize))
            ->through(fn (Timezone $timezone): array => $this->serialize($timezone));

        return Inertia::render('system/timezones', [
            'timezones' => $timezones,
            'canManage' => $request->user()?->can('timezones.manage') === true,
            'canCreate' => $request->user()?->can('timezones.manage') === true,
            'filters' => [
                'search' => $search,
                'from' => $from?->format('Y-m-d') ?? '',
                'to' => $to?->format('Y-m-d') ?? '',
                'updatedFrom' => $updatedFrom?->format('Y-m-d') ?? '',
                'updatedTo' => $updatedTo?->format('Y-m-d') ?? '',
                'createdBy' => $createdBy,
                'updatedBy' => $updatedBy,
                'recordStatus' => $this->filterValue($recordStatuses),
                'sort' => $sort,
                'direction' => $direction,
                'perPage' => $pageSize,
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Timezone::class);

        return Inertia::render('system/timezone-create');
    }

    public function show(Timezone $timezone): Response
    {
        $this->authorize('view', $timezone);
        $timezone->load(['createdBy:id,name,email', 'updatedBy:id,name,email']);

        return Inertia::render('system/timezone-show', [
            'timezone' => $this->serialize($timezone),
            'canEdit' => request()->user()?->can('update', $timezone) === true,
            'canDelete' => request()->user()?->can('delete', $timezone) === true,
            'isCurrent' => $timezone->name === SystemSettings::timezone(),
        ]);
    }

    public function edit(Timezone $timezone): Response
    {
        $this->authorize('update', $timezone);
        $timezone->load(['createdBy:id,name,email', 'updatedBy:id,name,email']);

        return Inertia::render('system/timezone-edit', [
            'timezone' => $this->serialize($timezone),
        ]);
    }

    public function store(SaveTimezoneRequest $request, ManageTimezone $manage): RedirectResponse
    {
        $timezone = $manage->create($request->validatedTimezone(), $request->user());

        return to_route('system.timezones.index')->with('success', "Timezone {$timezone->name} created.");
    }

    public function update(
        SaveTimezoneRequest $request,
        Timezone $timezone,
        ManageTimezone $manage,
    ): RedirectResponse {
        $manage->update($timezone, $request->validatedTimezone(), $request->user());

        return to_route('system.timezones.index')->with('success', 'Timezone updated.');
    }

    public function destroy(DeleteTimezoneRequest $request, Timezone $timezone, ManageTimezone $manage): RedirectResponse
    {
        $this->authorize('delete', $timezone);
        $manage->delete($timezone, $request->user());

        return to_route('system.timezones.index')->with('success', 'Timezone deleted.');
    }

    /** @return array<string, mixed> */
    private function serialize(Timezone $timezone): array
    {
        return [
            'id' => $timezone->id,
            'name' => $timezone->name,
            'recordStatus' => (int) $timezone->record_status,
            'createdAt' => $timezone->created_at?->toIso8601String(),
            'updatedAt' => $timezone->updated_at?->toIso8601String(),
            'createdBy' => $this->actor($timezone->createdBy),
            'updatedBy' => $this->actor($timezone->updatedBy),
        ];
    }

    /** @return array{id: int, name: string, email: string}|null */
    private function actor(?User $actor): ?array
    {
        return $actor === null ? null : [
            'id' => (int) $actor->getKey(),
            'name' => (string) $actor->name,
            'email' => (string) $actor->email,
        ];
    }

    private function parseDate(mixed $value): ?CarbonImmutable
    {
        $value = trim((string) $value);

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
