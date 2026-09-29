<?php

namespace App\Actions\Media;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class DeleteMediaAsset
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function execute(MediaAsset $asset, User $actor): void
    {
        DB::transaction(function () use ($asset, $actor): void {
            $asset->refresh();

            if ($asset->module === 'avatars'
                || ($asset->module !== 'files' && (int) $asset->uploader_id !== (int) $actor->getKey())
                || ($asset->module === 'files' && (int) $asset->uploader_id !== (int) $actor->getKey()
                    && ! $actor->hasAnyRole(['admin', 'super_admin']))) {
                throw new AuthorizationException;
            }

            Gate::forUser($actor)->authorize('delete', $asset);

            if ($asset->isReferenced()) {
                throw ValidationException::withMessages([
                    'asset' => 'This file is in use as an avatar or platform image. Remove that assignment first.',
                ]);
            }

            if ($asset->trashed()) {
                return;
            }

            $before = $asset->only(['original_name', 'mime_type', 'size_bytes', 'width', 'height', 'source', 'record_status']);
            $asset->forceFill([
                'record_status' => 0,
                'updated_by' => $actor->getKey(),
            ])->saveQuietly();

            $this->audit->record(
                event: 'media.asset.deleted',
                actor: $actor,
                subject: $asset,
                before: $before,
                after: ['record_status' => 0],
            );
        });
    }
}
