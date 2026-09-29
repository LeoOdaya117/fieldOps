<?php

namespace App\Http\Controllers\Media;

use App\Actions\Media\DeleteMediaAsset;
use App\Actions\Media\RenameMediaAsset;
use App\Actions\Media\StoreMediaAsset;
use App\Http\Controllers\Controller;
use App\Http\Requests\Media\RenameMediaAssetRequest;
use App\Http\Requests\Media\StoreMediaAssetRequest;
use App\Http\Resources\MediaAssetResource;
use App\Models\MediaAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaAssetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'record_status' => ['nullable', 'string', 'in:active,inactive,all'],
        ]);
        $actor = $request->user();
        $search = trim((string) ($validated['search'] ?? ''));
        $canViewDeleted = $actor->can('media_assets.view_deleted');
        $recordStatus = $canViewDeleted ? (string) ($validated['record_status'] ?? 'active') : 'active';
        $query = $canViewDeleted ? MediaAsset::withTrashed() : MediaAsset::query();
        $assets = $query
            ->where('uploader_id', $actor->getKey())
            ->where('module', 'gallery')
            ->withCount(['platformAssignments', 'usersUsingAsAvatar'])
            ->when($search !== '', static fn ($query) => $query->where('original_name', 'like', '%'.$search.'%'))
            ->when($recordStatus !== 'all', static fn ($query) => $query->where('record_status', $recordStatus === 'active' ? 1 : 0))
            ->latest('id')
            ->paginate((int) config('media-assets.page_size', 24))
            ->withQueryString();

        return MediaAssetResource::collection($assets)
            ->additional([
                'canCreate' => $actor->can('media_assets.create'),
                'canUpdate' => $actor->can('media_assets.update'),
                'canDelete' => $actor->can('media_assets.delete'),
                'canViewDeleted' => $canViewDeleted,
                'canUpdateDeleted' => $actor->can('media_assets.update_deleted'),
                'recordStatusFilter' => $recordStatus,
            ])
            ->response();
    }

    public function store(StoreMediaAssetRequest $request, StoreMediaAsset $store): JsonResponse
    {
        $asset = $store->execute(
            $request->file('file'),
            (string) $request->validated('source'),
            $request->user(),
        );
        $asset->loadCount(['platformAssignments', 'usersUsingAsAvatar']);

        return (new MediaAssetResource($asset))->response()->setStatusCode(201);
    }

    public function update(
        RenameMediaAssetRequest $request,
        string $asset,
        RenameMediaAsset $rename,
    ): JsonResponse {
        $mediaAsset = MediaAsset::query()->where('token', $asset)->where('module', 'gallery')->firstOrFail();
        $this->assertOwner($mediaAsset, $request);
        $this->authorize('update', $mediaAsset);
        $renamed = $rename->execute($mediaAsset, $request->validatedName(), $request->user());
        $renamed->loadCount(['platformAssignments', 'usersUsingAsAvatar']);

        return (new MediaAssetResource($renamed))->response();
    }

    public function destroy(Request $request, string $asset, DeleteMediaAsset $delete): JsonResponse
    {
        $mediaAsset = MediaAsset::query()->where('token', $asset)->where('module', 'gallery')->firstOrFail();
        $this->assertOwner($mediaAsset, $request);
        $this->authorize('delete', $mediaAsset);
        $delete->execute($mediaAsset, $request->user());

        return response()->json(null, 204);
    }

    private function assertOwner(MediaAsset $asset, Request $request): void
    {
        abort_unless((int) $asset->uploader_id === (int) $request->user()->getKey(), 403);
    }
}
