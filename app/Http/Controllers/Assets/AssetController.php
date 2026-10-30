<?php

namespace App\Http\Controllers\Assets;

use App\Actions\Assets\ManageAsset;
use App\Actions\DataTables\BuildListingQuery;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assets\SaveAssetRequest;
use App\Models\Asset;
use App\Models\User;
use App\Support\Pagination\PageSize;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AssetController extends Controller
{
    public function index(Request $request, BuildListingQuery $listingQuery): Response
    {
        $this->authorize('viewAny', Asset::class);
        $user = $request->user();
        $search = trim((string) $request->input('search', ''));
        $category = trim((string) $request->input('category', ''));
        $condition = (string) $request->input('condition', '');
        $canViewDeleted = $user?->can('assets.view_deleted') === true;
        $recordStatus = $this->recordStatusFilter($request->input('record_status'), $canViewDeleted);
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $filters = [
            'search' => mb_substr($search, 0, 100),
            'category' => mb_substr($category, 0, 80),
            'condition' => in_array($condition, Asset::CONDITIONS, true) ? $condition : '',
            'record_status' => $recordStatus,
            'sort' => $sort,
            'direction' => $direction,
        ];
        $assets = $listingQuery->query('assets', $user, $filters)
            ->with(['createdBy:id,name,email', 'updatedBy:id,name,email'])
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize))
            ->through(fn (Asset $asset): array => $this->serialize($asset));

        return Inertia::render('assets/index', [
            'assets' => $assets,
            'canCreate' => $user?->can('assets.create') === true,
            'canUpdate' => $user?->can('assets.update') === true,
            'canViewDeleted' => $canViewDeleted,
            'canUpdateDeleted' => $user?->can('assets.update_deleted') === true,
            'filters' => [
                'search' => $filters['search'],
                'category' => $filters['category'],
                'condition' => $filters['condition'],
                'recordStatus' => $recordStatus,
                'sort' => $sort,
                'direction' => $direction,
                'perPage' => $pageSize,
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Asset::class);

        return Inertia::render('assets/create');
    }

    public function store(SaveAssetRequest $request, ManageAsset $manage): RedirectResponse
    {
        $asset = $manage->create($request->validatedAsset(), $request->user());

        return to_route('assets.show', $asset)->with('success', "Asset {$asset->code} created.");
    }

    public function show(int $asset): Response
    {
        $canViewDeleted = request()->user()?->can('assets.view_deleted') === true;
        $asset = ($canViewDeleted ? Asset::withTrashed() : Asset::query())->findOrFail($asset);
        $this->authorize('view', $asset);
        $asset->load(['createdBy:id,name,email', 'updatedBy:id,name,email']);

        return Inertia::render('assets/show', [
            'asset' => $this->serialize($asset),
            'canUpdate' => ! $asset->trashed() && request()->user()?->can('update', $asset) === true,
            'canViewDeleted' => $canViewDeleted,
            'canUpdateDeleted' => request()->user()?->can('assets.update_deleted') === true,
        ]);
    }

    public function edit(Asset $asset): Response
    {
        $this->authorize('update', $asset);
        $asset->load(['createdBy:id,name,email', 'updatedBy:id,name,email']);

        return Inertia::render('assets/edit', [
            'asset' => $this->serialize($asset),
        ]);
    }

    public function update(SaveAssetRequest $request, Asset $asset, ManageAsset $manage): RedirectResponse
    {
        $manage->update($asset, $request->validatedAsset(), $request->user());

        return to_route('assets.show', $asset)->with('success', 'Asset updated.');
    }

    /** @return array<string, mixed> */
    private function serialize(Asset $asset): array
    {
        return [
            'id' => $asset->id,
            'code' => $asset->code,
            'name' => $asset->name,
            'category' => $asset->category,
            'condition' => $asset->condition,
            'latitude' => $asset->latitude,
            'longitude' => $asset->longitude,
            'recordStatus' => (int) $asset->record_status,
            'recordStatusUrl' => route('assets.record-status', $asset->getKey()),
            'createdAt' => $asset->created_at?->toIso8601String(),
            'updatedAt' => $asset->updated_at?->toIso8601String(),
            'createdBy' => $this->actor($asset->createdBy),
            'updatedBy' => $this->actor($asset->updatedBy),
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

    private function recordStatusFilter(mixed $value, bool $canViewDeleted): string
    {
        if (! $canViewDeleted) {
            return 'active';
        }

        if (is_array($value)) {
            $value = count($value) === 1 ? reset($value) : null;
        }

        return $value === 'inactive' ? 'inactive' : 'active';
    }
}
