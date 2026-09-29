<?php

namespace App\Actions\Settings;

use App\Actions\Media\StoreMediaAsset;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class UpdateProfile
{
    public function __construct(private readonly StoreMediaAsset $storeMediaAsset) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data): User {
            $newAvatarAsset = null;

            try {
                $user->forceFill([
                    'name' => trim((string) $data['name']),
                    'email' => mb_strtolower(trim((string) $data['email'])),
                    'position' => $this->nullableString($data['position'] ?? null),
                    'department' => $this->nullableString($data['department'] ?? null),
                ]);

                if ($user->isDirty('email')) {
                    $user->email_verified_at = null;
                }

                if (($data['photo'] ?? null) instanceof UploadedFile) {
                    $newAvatarAsset = $this->storeMediaAsset->execute($data['photo'], 'upload', $user, 'avatars');
                    $user->avatar_media_asset_id = $newAvatarAsset->getKey();
                    $user->avatar_path = null;
                } elseif (filled($data['avatar_media_asset_token'] ?? null)) {
                    $asset = MediaAsset::query()
                        ->where('token', $data['avatar_media_asset_token'])
                        ->where('uploader_id', $user->getKey())
                        ->where('module', 'gallery')
                        ->first();

                    if (! $asset instanceof MediaAsset) {
                        throw ValidationException::withMessages([
                            'avatar_media_asset_token' => 'Choose an image from your own media library.',
                        ]);
                    }

                    if (! Storage::disk($asset->disk)->exists($asset->path)) {
                        throw ValidationException::withMessages([
                            'avatar_media_asset_token' => 'The selected image is unavailable. Choose another image.',
                        ]);
                    }

                    $user->avatar_media_asset_id = $asset->getKey();
                    $user->avatar_path = null;
                } elseif (filter_var($data['remove_photo'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                    $user->avatar_media_asset_id = null;
                    $user->avatar_path = null;
                }

                $user->save();

                return $user->fresh();
            } catch (Throwable $exception) {
                if ($newAvatarAsset instanceof MediaAsset) {
                    Storage::disk($newAvatarAsset->disk)->delete(array_filter([$newAvatarAsset->path, $newAvatarAsset->thumbnail_path]));
                }

                throw $exception;
            }
        });
    }

    private function nullableString(mixed $value): ?string
    {
        $value = trim((string) ($value ?? ''));

        return $value === '' ? null : $value;
    }
}
