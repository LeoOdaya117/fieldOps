<?php

namespace App\Http\Resources;

use App\Models\MediaAsset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use LogicException;

class MediaAssetResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $asset = $this->resource;

        if (! $asset instanceof MediaAsset) {
            throw new LogicException('MediaAssetResource requires a MediaAsset resource.');
        }

        return [
            'token' => $asset->token,
            'name' => $asset->original_name,
            'module' => $asset->module,
            'tag' => $asset->tag,
            'recordStatus' => (int) $asset->record_status,
            'recordStatusUrl' => route('files.record-status', $asset->token, false),
            'mimeType' => $asset->mime_type,
            'extension' => $asset->extension,
            'sizeBytes' => $asset->size_bytes,
            'width' => $asset->width,
            'height' => $asset->height,
            'source' => $asset->source,
            'createdAt' => $asset->created_at?->toIso8601String(),
            'updatedAt' => $asset->updated_at?->toIso8601String(),
            'contentUrl' => route('files.content', $asset->token, false),
            'thumbnailUrl' => $asset->thumbnail_path === null ? null : route('files.thumbnail', $asset->token, false),
            'downloadUrl' => route('files.download', $asset->token, false),
            'previewDataUrl' => route('files.preview-data', $asset->token, false),
            'detailUrl' => route('files.show', $asset->token, false),
            'updateUrl' => route($asset->module === 'gallery' ? 'media-assets.update' : 'files.update', $asset->token, false),
            'canUpdate' => $asset->module !== 'avatars' && $request->user()?->can('update', $asset) === true,
            'canDelete' => $asset->module !== 'avatars' && $request->user()?->can('delete', $asset) === true,
            'assigned' => isset($asset->platform_assignments_count, $asset->users_using_as_avatar_count)
                ? $asset->platform_assignments_count > 0 || $asset->users_using_as_avatar_count > 0
                : $asset->isReferenced(),
        ];
    }
}
