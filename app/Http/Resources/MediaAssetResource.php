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
            'id' => $asset->id,
            'name' => $asset->original_name,
            'mimeType' => $asset->mime_type,
            'extension' => $asset->extension,
            'sizeBytes' => $asset->size_bytes,
            'width' => $asset->width,
            'height' => $asset->height,
            'source' => $asset->source,
            'createdAt' => $asset->created_at?->toIso8601String(),
            'contentUrl' => route('media-assets.content', $asset->id, false),
            'thumbnailUrl' => route('media-assets.thumbnail', $asset->id, false),
            'assigned' => $this->whenCounted('platformAssignments', $asset->platform_assignments_count > 0),
        ];
    }
}
