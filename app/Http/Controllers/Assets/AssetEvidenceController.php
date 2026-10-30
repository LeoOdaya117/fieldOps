<?php

namespace App\Http\Controllers\Assets;

use App\Actions\Assets\StoreAssetEvidence;
use App\Actions\Media\BuildFilePreview;
use App\Actions\Rbac\RecordAccessAudit;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assets\StoreAssetEvidenceRequest;
use App\Models\Asset;
use App\Models\MediaAsset;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AssetEvidenceController extends Controller
{
    public function store(StoreAssetEvidenceRequest $request, int $asset, StoreAssetEvidence $store): RedirectResponse
    {
        $record = $this->findAsset($request, $asset, true);
        $this->authorize('view', $record);
        $this->authorize('update', $record);
        abort_if($record->trashed(), 404);
        $file = $request->file('file');
        abort_unless($file !== null, 422);
        $store->execute($record, $file, $request->user());

        return to_route('assets.show', $record)->with('success', 'Evidence uploaded.');
    }

    public function destroy(Request $request, int $asset, int $evidence, RecordAccessAudit $audit, StoreAssetEvidence $store): RedirectResponse
    {
        $record = $this->findAsset($request, $asset, true);
        $this->authorize('view', $record);
        $this->authorize('update', $record);
        abort_if($record->trashed(), 404);

        DB::transaction(function () use ($audit, $evidence, $record, $request, $store): void {
            $record = Asset::query()->whereKey($record->getKey())->lockForUpdate()->firstOrFail();
            $this->authorize('view', $record);
            $this->authorize('update', $record);
            $media = MediaAsset::query()
                ->where('module', 'asset_evidence')
                ->where('asset_id', $record->getKey())
                ->lockForUpdate()
                ->findOrFail($evidence);
            $before = $store->snapshot($media);
            $media->forceFill(['record_status' => 0, 'updated_by' => $request->user()->getKey()])->saveQuietly();
            $audit->record(
                'asset.evidence.removed',
                $request->user(),
                $record,
                $before,
                ['removed' => true, '_actor' => $store->actorSnapshot($request->user())],
            );
        });

        return to_route('assets.show', $record)->with('success', 'Evidence removed.');
    }

    public function content(Request $request, int $asset, string $token): StreamedResponse
    {
        $record = $this->findAsset($request, $asset);
        $this->authorize('view', $record);
        $media = $this->findEvidence($record, $token);
        $inline = in_array($media->mime_type, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], true);

        return $this->response($media, $media->path, $inline ? $media->mime_type : 'application/octet-stream', $inline ? 'inline' : 'attachment');
    }

    public function thumbnail(Request $request, int $asset, string $token): StreamedResponse
    {
        $record = $this->findAsset($request, $asset);
        $this->authorize('view', $record);
        $media = $this->findEvidence($record, $token);
        abort_if($media->thumbnail_path === null, 404);

        return $this->response($media, $media->thumbnail_path, 'image/webp', 'inline');
    }

    public function download(Request $request, int $asset, string $token): StreamedResponse
    {
        $record = $this->findAsset($request, $asset);
        $this->authorize('view', $record);
        $media = $this->findEvidence($record, $token);

        return $this->response($media, $media->path, 'application/octet-stream', 'attachment');
    }

    public function previewData(Request $request, int $asset, string $token, BuildFilePreview $preview): JsonResponse
    {
        $record = $this->findAsset($request, $asset);
        $this->authorize('view', $record);
        $media = $this->findEvidence($record, $token);
        abort_unless(in_array($media->extension, ['csv', 'xls', 'xlsx'], true), 404);

        try {
            return response()->json(['rows' => $preview->execute($media)]);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    private function findAsset(Request $request, int $id, bool $forUpdate = false): Asset
    {
        $canViewDeleted = $request->user()->can('assets.view_deleted');
        $asset = ($canViewDeleted ? Asset::withTrashed() : Asset::query())->findOrFail($id);
        abort_if($forUpdate && $asset->trashed(), 404);

        return $asset;
    }

    private function findEvidence(Asset $asset, string $token): MediaAsset
    {
        return MediaAsset::query()
            ->where('module', 'asset_evidence')
            ->where('asset_id', $asset->getKey())
            ->where('token', $token)
            ->firstOrFail();
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
