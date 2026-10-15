<?php

namespace App\Policies;

use App\Models\MediaAsset;
use App\Models\User;

class MediaAssetPolicy
{
    public function viewGallery(User $user, MediaAsset $asset): bool
    {
        return $asset->module === 'gallery'
            && $user->isActive()
            && (int) $asset->uploader_id === (int) $user->getKey()
            && $user->can('media_assets.view')
            && (! $asset->trashed() || $user->can('media_assets.view_deleted'));
    }

    public function view(User $user, MediaAsset $asset): bool
    {
        if (! $user->isActive()) {
            return false;
        }

        $permission = match ($asset->module) {
            'gallery' => 'media_assets',
            'files' => 'files',
            'avatars' => 'users',
            default => null,
        };

        if ($permission === null) {
            return false;
        }

        $owner = (int) $asset->uploader_id === (int) $user->getKey();
        $assignedToUser = $asset->module === 'avatars'
            && $asset->usersUsingAsAvatar()->whereKey($user->getKey())->exists();
        $canView = $assignedToUser
            || ($asset->module === 'avatars'
                && ($user->can('users.view') || ($owner && $user->can('files.view'))))
            || ($asset->module !== 'avatars' && $user->can("{$permission}.view")
            && ($owner || $user->hasAnyRole(['admin', 'super_admin'])));

        return $canView && (! $asset->trashed() || $user->can("{$permission}.view_deleted"));
    }

    public function update(User $user, MediaAsset $asset): bool
    {
        $permission = $asset->module === 'files' ? 'files.update' : 'media_assets.update';

        return $asset->module !== 'avatars'
            && $user->can($permission)
            && $user->isActive()
            && $this->ownsOrManages($user, $asset)
            && ! $asset->trashed();
    }

    public function delete(User $user, MediaAsset $asset): bool
    {
        return $asset->module !== 'avatars'
            && $user->can($asset->module === 'files' ? 'files.delete' : 'media_assets.delete')
            && $user->isActive()
            && $this->ownsOrManages($user, $asset)
            && ! $asset->trashed();
    }

    public function updateDeleted(User $user, MediaAsset $asset): bool
    {
        return $asset->module !== 'avatars'
            && $user->isActive()
            && $this->ownsOrManages($user, $asset)
            && $user->can($asset->module === 'files' ? 'files.update_deleted' : 'media_assets.update_deleted');
    }

    private function ownsOrManages(User $user, MediaAsset $asset): bool
    {
        return (int) $asset->uploader_id === (int) $user->getKey()
            || ($asset->module === 'files' && $user->hasAnyRole(['admin', 'super_admin']));
    }
}
