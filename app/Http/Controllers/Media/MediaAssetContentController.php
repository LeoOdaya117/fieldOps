<?php

namespace App\Http\Controllers\Media;

use App\Http\Controllers\Controller;
use App\Models\MediaAsset;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaAssetContentController extends Controller
{
    public function content(MediaAsset $asset): StreamedResponse
    {
        $this->authorize('view', $asset);

        return $this->response($asset, $asset->path, $asset->mime_type);
    }

    public function thumbnail(MediaAsset $asset): StreamedResponse
    {
        $this->authorize('view', $asset);

        return $this->response($asset, $asset->thumbnail_path, 'image/webp');
    }

    private function response(MediaAsset $asset, string $path, string $mimeType): StreamedResponse
    {
        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk($asset->disk);
        abort_unless($disk->exists($path), 404);

        return $disk->response($path, null, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
