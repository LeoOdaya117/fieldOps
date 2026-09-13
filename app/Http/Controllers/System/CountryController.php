<?php

namespace App\Http\Controllers\System;

use App\Actions\System\ManageCountry;
use App\Http\Controllers\Controller;
use App\Http\Requests\System\DeleteCountryRequest;
use App\Http\Requests\System\SaveCountryRequest;
use App\Models\Country;
use App\Models\User;
use App\Support\Pagination\PageSize;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CountryController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Country::class);

        $search = trim((string) $request->input('search', ''));
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $sortColumns = [
            'code' => 'code',
            'name' => 'name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $countries = Country::query()
            ->with(['createdBy:id,name,email', 'updatedBy:id,name,email'])
            ->when($search !== '', static fn ($query) => $query->where(static function ($query) use ($search): void {
                $query->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            }))
            ->when(
                isset($sortColumns[$sort]),
                static fn ($query) => $query->orderBy($sortColumns[$sort], $direction),
                static fn ($query) => $query->orderBy('name'),
            )
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize))
            ->through(fn (Country $country): array => $this->serialize($country));

        return Inertia::render('system/countries', [
            'countries' => $countries,
            'canManage' => $request->user()?->can('countries.manage') === true,
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
}
