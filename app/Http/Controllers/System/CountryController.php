<?php

namespace App\Http\Controllers\System;

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
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CountryController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Country::class);

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
            'code' => 'code',
            'name' => 'name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
            'record_status' => 'record_status',
        ];

        $countries = Country::query()
            ->with(['createdBy:id,name,email', 'updatedBy:id,name,email'])
            ->when($search !== '', static fn ($query) => $query->where(static function ($query) use ($search): void {
                $query->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            }))
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
                        ->whereColumn('created_actors.id', 'countries.created_by'),
                    $direction,
                ),
            )
            ->when(
                $sort === 'updated_by',
                static fn ($query) => $query->orderBy(
                    DB::table('users as updated_actors')
                        ->select('updated_actors.name')
                        ->whereColumn('updated_actors.id', 'countries.updated_by'),
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
            ->through(fn (Country $country): array => $this->serialize($country));

        return Inertia::render('system/countries', [
            'countries' => $countries,
            'canManage' => $request->user()?->can('countries.manage') === true,
            'canCreate' => $request->user()?->can('countries.manage') === true,
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
        $this->authorize('create', Country::class);

        return Inertia::render('system/country-create');
    }

    public function show(Country $country): Response
    {
        $this->authorize('view', $country);
        $country->load(['createdBy:id,name,email', 'updatedBy:id,name,email']);

        return Inertia::render('system/country-show', [
            'country' => $this->serialize($country),
            'canEdit' => request()->user()?->can('update', $country) === true,
            'canDelete' => request()->user()?->can('delete', $country) === true,
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
