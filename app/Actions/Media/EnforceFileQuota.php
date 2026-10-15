<?php

namespace App\Actions\Media;

use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class EnforceFileQuota
{
    /** Call inside a transaction after locking the uploader's user row. */
    public function execute(User $actor, int $incomingBytes): void
    {
        $query = MediaAsset::withTrashed()->where('uploader_id', $actor->getKey())->where('module', 'files');
        if ((clone $query)->count() >= (int) config('media-assets.per_user_files_max_assets', 200)
            || (int) $query->sum('size_bytes') + $incomingBytes > (int) config('media-assets.per_user_files_max_bytes', 1073741824)) {
            throw ValidationException::withMessages(['file' => 'Your file storage limit has been reached.']);
        }
    }
}
