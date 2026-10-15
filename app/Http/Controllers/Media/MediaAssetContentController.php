<?php

namespace App\Http\Controllers\Media;

use App\Actions\Media\BuildFilePreview;
use App\Actions\Rbac\RecordAccessAudit;
use App\Http\Controllers\Controller;
use App\Models\MediaAsset;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaAssetContentController extends Controller
{
    public function content(Request $request, string $asset): StreamedResponse
    {
        $mediaAsset = $this->findVisibleAsset($request, $asset);
        $this->authorize('view', $mediaAsset);

        $inline = in_array($mediaAsset->mime_type, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], true);

        return $this->response($mediaAsset, $mediaAsset->path, $inline ? $mediaAsset->mime_type : 'application/octet-stream', $inline ? 'inline' : 'attachment');
    }

    public function thumbnail(Request $request, string $asset): StreamedResponse
    {
        $mediaAsset = $this->findVisibleAsset($request, $asset);
        $this->authorize('view', $mediaAsset);
        abort_if($mediaAsset->thumbnail_path === null, 404);

        return $this->response($mediaAsset, $mediaAsset->thumbnail_path, 'image/webp', 'inline');
    }

    public function download(Request $request, string $asset, RecordAccessAudit $audit): StreamedResponse
    {
        $mediaAsset = $this->findVisibleAsset($request, $asset);
        $this->authorize('view', $mediaAsset);
        $response = $this->response($mediaAsset, $mediaAsset->path, 'application/octet-stream', 'attachment');
        $audit->record('media.asset.downloaded', $request->user(), $mediaAsset);

        return $response;
    }

    public function previewData(Request $request, string $asset, BuildFilePreview $preview): JsonResponse
    {
        $mediaAsset = $this->findVisibleAsset($request, $asset);
        $this->authorize('view', $mediaAsset);
        abort_unless(in_array($mediaAsset->extension, ['csv', 'xls', 'xlsx'], true), 404);

        try {
            return response()->json(['rows' => $preview->execute($mediaAsset)]);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    private function findVisibleAsset(Request $request, string $token): MediaAsset
    {
        $asset = MediaAsset::withTrashed()->where('token', $token)->firstOrFail();
        if ($asset->trashed()) {
            $permission = match ($asset->module) {
                'files' => 'files.view_deleted',
                'avatars' => 'users.view_deleted',
                default => 'media_assets.view_deleted',
            };
            abort_unless($request->user()->can($permission), 404);
        }

        return $asset;
    }

    private function response(MediaAsset $asset, string $path, string $mimeType, string $disposition): StreamedResponse
    {
        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk($asset->disk);
        abort_unless($disk->exists($path), 404);

        $name = preg_replace('/[\x00-\x1F\x7F]/', '', basename($asset->original_name)) ?: 'download';

        return $disk->response($path, $name, [
            'Content-Type' => $mimeType,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
        ], $disposition);
    }
}
