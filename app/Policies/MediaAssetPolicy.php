<?php

namespace App\Policies;

use App\Models\MediaAsset;
use App\Models\User;

class MediaAssetPolicy
{
    public function view(User $user, MediaAsset $asset): bool
    {
        return $user->can('media_assets.view')
            && $user->isActive()
            && (int) $asset->uploader_id === (int) $user->getKey()
            && (! $asset->trashed() || $user->can('media_assets.view_deleted'));
    }

    public function update(User $user, MediaAsset $asset): bool
    {
        return $user->can('media_assets.update')
            && $user->isActive()
            && (int) $asset->uploader_id === (int) $user->getKey()
            && ! $asset->trashed();
    }

    public function delete(User $user, MediaAsset $asset): bool
    {
        return $user->can('media_assets.delete')
            && $user->isActive()
            && (int) $asset->uploader_id === (int) $user->getKey()
            && ! $asset->trashed();
    }
}
