<?php

namespace App\Http\Controllers\System;

use App\Actions\DataTables\BuildListingQuery;
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
use Inertia\Inertia;
use Inertia\Response;

class TimezoneController extends Controller
{
    public function index(Request $request, BuildListingQuery $listingQuery): Response
    {
        $this->authorize('viewAny', Timezone::class);

        $search = trim((string) $request->input('search', ''));
        $canViewDeleted = $request->user()?->can('timezones.view_deleted') === true;
        $recordStatuses = $canViewDeleted
            ? $this->filterValues($request->input('record_status', ['active']), ['active', 'inactive'])
            : ['active'];
        $recordStatuses = $recordStatuses === [] ? ['active'] : $recordStatuses;
        $from = $this->parseDate($request->input('from'));
        $to = $this->parseDate($request->input('to'));
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $timezones = $listingQuery->query('timezones', $request->user(), [
            'search' => $search,
            'record_status' => $recordStatuses,
            'from' => $from?->format('Y-m-d'),
            'to' => $to?->format('Y-m-d'),
            'sort' => $sort,
            'direction' => $direction,
        ])
            ->with(['createdBy:id,name,email', 'updatedBy:id,name,email'])
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize))
            ->through(fn (Timezone $timezone): array => $this->serialize($timezone));

        return Inertia::render('system/timezones', [
            'timezones' => $timezones,
            'canCreate' => $request->user()?->can('timezones.create') === true,
            'canUpdate' => $request->user()?->can('timezones.update') === true,
            'canDelete' => $request->user()?->can('timezones.delete') === true,
            'canViewDeleted' => $canViewDeleted,
            'canUpdateDeleted' => $request->user()?->can('timezones.update_deleted') === true,
            'filters' => [
                'search' => $search,
                'from' => $from?->format('Y-m-d') ?? '',
                'to' => $to?->format('Y-m-d') ?? '',
                'sort' => $sort,
                'direction' => $direction,
                'perPage' => $pageSize,
                'recordStatus' => $this->filterValue($recordStatuses),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Timezone::class);

        return Inertia::render('system/timezone-create');
    }

    public function show(int $timezone): Response
    {
        $canViewDeleted = request()->user()?->can('timezones.view_deleted') === true;
        $timezone = ($canViewDeleted ? Timezone::withTrashed() : Timezone::query())->findOrFail($timezone);
        $this->authorize('view', $timezone);
        $timezone->load(['createdBy:id,name,email', 'updatedBy:id,name,email']);

        return Inertia::render('system/timezone-show', [
            'timezone' => $this->serialize($timezone),
            'canUpdate' => request()->user()?->can('update', $timezone) === true,
            'canDelete' => request()->user()?->can('delete', $timezone) === true,
            'isCurrent' => $timezone->name === SystemSettings::timezone(),
            'canViewDeleted' => $canViewDeleted,
            'canUpdateDeleted' => request()->user()?->can('timezones.update_deleted') === true,
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
            'recordStatusUrl' => route('system.timezones.record-status', $timezone->getKey()),
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

    /** @param list<string>|string|null $value
     * @param  list<string>  $allowed
     * @return list<string>
     */
    private function filterValues(mixed $value, array $allowed): array
    {
        $values = is_array($value) ? $value : [$value];

        return array_values(array_unique(array_filter(
            array_map(static fn (mixed $item): string => (string) $item, $values),
            static fn (string $item): bool => in_array($item, $allowed, true),
        )));
    }

    /** @param list<string> $values
     * @return string|list<string>
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
