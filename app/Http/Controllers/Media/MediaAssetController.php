<?php

namespace App\Http\Controllers\Media;

use App\Actions\Media\DeleteMediaAsset;
use App\Actions\Media\StoreMediaAsset;
use App\Http\Controllers\Controller;
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
        ]);
        $search = trim((string) ($validated['search'] ?? ''));

        $assets = MediaAsset::query()
            ->where('uploader_id', $request->user()->getKey())
            ->withCount('platformAssignments')
            ->when($search !== '', static fn ($query) => $query->where('original_name', 'like', '%'.$search.'%'))
            ->latest('id')
            ->paginate((int) config('media-assets.page_size', 24))
            ->withQueryString();

        return MediaAssetResource::collection($assets)->response();
    }

    public function store(StoreMediaAssetRequest $request, StoreMediaAsset $store): JsonResponse
    {
        $asset = $store->execute(
            $request->file('file'),
            (string) $request->validated('source'),
            $request->user(),
        );
        $asset->loadCount('platformAssignments');

        return (new MediaAssetResource($asset))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, MediaAsset $asset, DeleteMediaAsset $delete): JsonResponse
    {
        $this->authorize('delete', $asset);
        $delete->execute($asset, $request->user());

        return response()->json(null, 204);
    }
}
