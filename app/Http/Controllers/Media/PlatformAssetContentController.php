<?php

namespace App\Http\Controllers\Media;

use App\Http\Controllers\Controller;
use App\Models\PlatformImageAssignment;
use App\Support\PlatformImageRegistry;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PlatformAssetContentController extends Controller
{
    public function __invoke(string $slot): StreamedResponse
    {
        abort_unless(PlatformImageRegistry::has($slot), 404);

        $assignment = PlatformImageAssignment::query()->with('asset')->find($slot);
        $asset = $assignment?->asset;
        abort_if($asset === null, 404);

        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk($asset->disk);
        abort_unless($disk->exists($asset->path), 404);

        return $disk->response($asset->path, null, [
            'Content-Type' => $asset->mime_type,
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
