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
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TimezoneController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Timezone::class);

        $search = trim((string) $request->input('search', ''));
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $sortColumns = [
            'name' => 'name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $timezones = Timezone::query()
            ->with(['createdBy:id,name,email', 'updatedBy:id,name,email'])
            ->when($search !== '', static fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->when(
                isset($sortColumns[$sort]),
                static fn ($query) => $query->orderBy($sortColumns[$sort], $direction),
                static fn ($query) => $query->orderBy('name'),
            )
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize))
            ->through(fn (Timezone $timezone): array => $this->serialize($timezone));

        return Inertia::render('system/timezones', [
            'timezones' => $timezones,
            'canManage' => $request->user()?->can('timezones.manage') === true,
            'filters' => [
                'search' => $search,
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
}
