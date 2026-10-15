<?php

namespace App\Http\Controllers\System;

use App\Actions\DataTables\BuildListingQuery;
use App\Actions\System\ManageCountry;
use App\Http\Controllers\Controller;
use App\Http\Requests\System\DeleteCountryRequest;
use App\Http\Requests\System\SaveCountryRequest;
use App\Models\Country;
use App\Models\User;
use App\Support\Pagination\PageSize;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CountryController extends Controller
{
    public function index(Request $request, BuildListingQuery $listingQuery): Response
    {
        $this->authorize('viewAny', Country::class);

        $search = trim((string) $request->input('search', ''));
        $canViewDeleted = $request->user()?->can('countries.view_deleted') === true;
        $recordStatuses = $canViewDeleted
            ? $this->filterValues($request->input('record_status', ['active']), ['active', 'inactive'])
            : ['active'];
        $recordStatuses = $recordStatuses === [] ? ['active'] : $recordStatuses;
        $from = $this->parseDate($request->input('from'));
        $to = $this->parseDate($request->input('to'));
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $countries = $listingQuery->query('countries', $request->user(), [
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
            ->through(fn (Country $country): array => $this->serialize($country));

        return Inertia::render('system/countries', [
            'countries' => $countries,
            'canCreate' => $request->user()?->can('countries.create') === true,
            'canUpdate' => $request->user()?->can('countries.update') === true,
            'canDelete' => $request->user()?->can('countries.delete') === true,
            'canViewDeleted' => $canViewDeleted,
            'canUpdateDeleted' => $request->user()?->can('countries.update_deleted') === true,
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
        $this->authorize('create', Country::class);

        return Inertia::render('system/country-create');
    }

    public function show(int $country): Response
    {
        $canViewDeleted = request()->user()?->can('countries.view_deleted') === true;
        $country = ($canViewDeleted ? Country::withTrashed() : Country::query())->findOrFail($country);
        $this->authorize('view', $country);
        $country->load(['createdBy:id,name,email', 'updatedBy:id,name,email']);

        return Inertia::render('system/country-show', [
            'country' => $this->serialize($country),
            'canUpdate' => request()->user()?->can('update', $country) === true,
            'canDelete' => request()->user()?->can('delete', $country) === true,
            'canViewDeleted' => $canViewDeleted,
            'canUpdateDeleted' => request()->user()?->can('countries.update_deleted') === true,
        ]);
    }

    public function edit(Country $country): Response
    {
        $this->authorize('update', $country);
        $country->load(['createdBy:id,name,email', 'updatedBy:id,name,email']);

        return Inertia::render('system/country-edit', [
            'country' => $this->serialize($country),
        ]);
    }

    public function store(SaveCountryRequest $request, ManageCountry $manage): RedirectResponse
    {
        $country = $manage->create($request->validatedCountry(), $request->user());

        return to_route('system.countries.index')->with('success', "Country {$country->name} created.");
    }

    public function update(
        SaveCountryRequest $request,
        Country $country,
        ManageCountry $manage,
    ): RedirectResponse {
        $manage->update($country, $request->validatedCountry(), $request->user());

        return to_route('system.countries.index')->with('success', 'Country updated.');
    }

    public function destroy(DeleteCountryRequest $request, Country $country, ManageCountry $manage): RedirectResponse
    {
        $this->authorize('delete', $country);
        $manage->delete($country, $request->user());

        return to_route('system.countries.index')->with('success', 'Country deleted.');
    }

    /** @return array<string, mixed> */
    private function serialize(Country $country): array
    {
        return [
            'id' => $country->id,
            'code' => $country->code,
            'name' => $country->name,
            'recordStatus' => (int) $country->record_status,
            'recordStatusUrl' => route('system.countries.record-status', $country->getKey()),
            'createdAt' => $country->created_at?->toIso8601String(),
            'updatedAt' => $country->updated_at?->toIso8601String(),
            'createdBy' => $this->actor($country->createdBy),
            'updatedBy' => $this->actor($country->updatedBy),
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
