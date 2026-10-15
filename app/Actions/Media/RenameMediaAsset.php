<?php

namespace App\Actions\Media;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class RenameMediaAsset
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function execute(MediaAsset $asset, string $name, User $actor): MediaAsset
    {
        return DB::transaction(function () use ($asset, $name, $actor): MediaAsset {
            $asset = MediaAsset::query()->whereKey($asset->getKey())->lockForUpdate()->firstOrFail();

            if ((int) $asset->uploader_id !== (int) $actor->getKey()) {
                throw new AuthorizationException;
            }

            $before = ['original_name' => $asset->original_name];
            $asset->forceFill([
                'original_name' => $name,
                'updated_by' => $actor->getKey(),
            ])->saveQuietly();

            $this->audit->record(
                event: 'media.asset.renamed',
                actor: $actor,
                subject: $asset,
                before: $before,
                after: ['original_name' => $asset->original_name],
            );

            return $asset;
        });
    }
}
