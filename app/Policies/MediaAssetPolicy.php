<?php

namespace App\Policies;

use App\Models\MediaAsset;
use App\Models\User;

class MediaAssetPolicy
{
    public function view(User $user, MediaAsset $asset): bool
    {
        return $user->isActive() && (int) $asset->uploader_id === (int) $user->getKey();
    }

    public function delete(User $user, MediaAsset $asset): bool
    {
        return $this->view($user, $asset);
    }
}
