<?php

namespace App\Actions\Media;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UpdateFileMetadata
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function execute(MediaAsset $asset, string $name, ?string $tag, User $actor): MediaAsset
    {
        return DB::transaction(function () use ($asset, $name, $tag, $actor): MediaAsset {
            $asset = MediaAsset::query()->whereKey($asset->getKey())->lockForUpdate()->firstOrFail();
            $before = $asset->only(['original_name', 'tag']);
            $asset->forceFill([
                'original_name' => trim($name),
                'tag' => filled($tag) ? trim($tag) : null,
                'updated_by' => $actor->getKey(),
            ])->saveQuietly();
            $this->audit->record('media.asset.updated', $actor, $asset, $before, $asset->only(['original_name', 'tag']));

            return $asset;
        });
    }
}
