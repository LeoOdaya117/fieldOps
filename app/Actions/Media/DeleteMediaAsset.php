<?php

namespace App\Actions\Media;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class DeleteMediaAsset
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function execute(MediaAsset $asset, User $actor): void
    {
        DB::transaction(function () use ($asset, $actor): void {
            $asset->refresh();

            if ($asset->isAssigned()) {
                throw ValidationException::withMessages([
                    'asset' => 'This image is currently assigned to a platform slot. Reset or replace that slot first.',
                ]);
            }

            $before = $asset->only(['original_name', 'mime_type', 'size_bytes', 'width', 'height', 'source']);
            $asset->delete();
            Storage::disk($asset->disk)->delete([$asset->path, $asset->thumbnail_path]);

            $this->audit->record(
                event: 'media.asset.deleted',
                actor: $actor,
                subject: $asset,
                before: $before,
            );
        });
    }
}
