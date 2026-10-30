<?php

namespace App\Http\Controllers\Assets;

use App\Actions\Assets\ManageAsset;
use App\Actions\DataTables\BuildListingQuery;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assets\SaveAssetRequest;
use App\Models\AccessAuditEvent;
use App\Models\Asset;
use App\Models\MediaAsset;
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
        $evidence = $asset->evidence()
            ->with('uploader:id,name')
            ->latest('created_at')
            ->orderByDesc('id')
            ->paginate(10, ['id', 'asset_id', 'token', 'original_name', 'mime_type', 'extension', 'size_bytes', 'thumbnail_path', 'uploader_id', 'created_at'], 'evidence_page')
            ->appends(request()->query());
        $evidence->through(fn (MediaAsset $media): array => [
            'id' => $media->id,
            'name' => $media->original_name,
            'mimeType' => $media->mime_type,
            'sizeBytes' => (int) $media->size_bytes,
            'createdAt' => $media->created_at?->toIso8601String(),
            'actorName' => ($uploader = $media->getRelationValue('uploader')) instanceof User ? $uploader->name : 'Former user',
            'contentUrl' => route('assets.evidence.content', [$asset->getKey(), $media->token]),
            'downloadUrl' => route('assets.evidence.download', [$asset->getKey(), $media->token]),
            'thumbnailUrl' => $media->thumbnail_path === null ? null : route('assets.evidence.thumbnail', [$asset->getKey(), $media->token]),
            'previewDataUrl' => in_array($media->extension, ['csv', 'xls', 'xlsx'], true)
                ? route('assets.evidence.preview-data', [$asset->getKey(), $media->token])
                : null,
            'removeUrl' => route('assets.evidence.destroy', [$asset->getKey(), $media->id]),
        ]);
        $history = AccessAuditEvent::query()
            ->forSubject($asset)
            ->with('actor:id,name,email')
            ->latest('occurred_at')
            ->orderByDesc('id')
            ->paginate(20, ['id', 'actor_user_id', 'event', 'before', 'after', 'occurred_at'], 'history_page')
            ->appends(request()->query());
        $history->through(static function (AccessAuditEvent $event): array {
            $before = $event->before ?? [];
            $after = $event->after ?? [];
            $actor = $after['_actor'] ?? [];
            unset($before['_actor'], $before['media_asset_id'], $after['_actor'], $after['media_asset_id']);
            $safeFields = ['code', 'name', 'category', 'condition', 'latitude', 'longitude', 'record_status', 'mime_type', 'size_bytes', 'removed'];
            $before = array_intersect_key($before, array_flip($safeFields));
            $after = array_intersect_key($after, array_flip($safeFields));
            $eventActor = $event->getRelationValue('actor');
            $actorName = $eventActor instanceof User ? $eventActor->name : 'Former user';
            if (is_array($actor) && is_string($actor['name'] ?? null)) {
                $actorName = $actor['name'];
            }

            return [
                'id' => $event->id,
                'event' => $event->event,
                'occurredAt' => $event->occurred_at->toIso8601String(),
                'actorName' => $actorName,
                'changes' => ['before' => $before, 'after' => $after],
            ];
        });

        return Inertia::render('assets/show', [
            'asset' => $this->serialize($asset),
            'evidence' => $evidence,
            'history' => $history,
            'canManageEvidence' => ! $asset->trashed() && request()->user()?->can('assets.update') === true,
            'storeUrl' => route('assets.evidence.store', $asset->getKey()),
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
