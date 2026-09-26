<?php

namespace App\Http\Controllers\Media;

use App\Http\Controllers\Controller;
use App\Models\MediaAsset;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaAssetContentController extends Controller
{
    public function content(Request $request, int $asset): StreamedResponse
    {
        $mediaAsset = $this->findVisibleAsset($request, $asset);
        $this->assertOwner($mediaAsset, $request);
        $this->authorize('view', $mediaAsset);

        return $this->response($mediaAsset, $mediaAsset->path, $mediaAsset->mime_type);
    }

    public function thumbnail(Request $request, int $asset): StreamedResponse
    {
        $mediaAsset = $this->findVisibleAsset($request, $asset);
        $this->assertOwner($mediaAsset, $request);
        $this->authorize('view', $mediaAsset);

        return $this->response($mediaAsset, $mediaAsset->thumbnail_path, 'image/webp');
    }

    private function findVisibleAsset(Request $request, int $id): MediaAsset
    {
        $canViewDeleted = $request->user()->can('media_assets.view_deleted');
        $query = $canViewDeleted ? MediaAsset::withTrashed() : MediaAsset::query();

        return $query->findOrFail($id);
    }

    private function assertOwner(MediaAsset $asset, Request $request): void
    {
        abort_unless((int) $asset->uploader_id === (int) $request->user()->getKey(), 403);
    }

    private function response(MediaAsset $asset, string $path, string $mimeType): StreamedResponse
    {
        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk($asset->disk);
        abort_unless($disk->exists($path), 404);

        return $disk->response($path, null, [
            'Content-Type' => $mimeType,
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
