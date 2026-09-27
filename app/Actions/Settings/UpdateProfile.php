<?php

namespace App\Actions\Settings;

use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class UpdateProfile
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data): User {
            $oldAvatarPath = $user->avatar_path;
            $newAvatarPath = null;

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
                    $newAvatarPath = $data['photo']->store("users/{$user->getKey()}", 'public');

                    if (! is_string($newAvatarPath)) {
                        throw ValidationException::withMessages([
                            'photo' => 'The photo could not be stored. Try again.',
                        ]);
                    }

                    $user->avatar_path = $newAvatarPath;
                } elseif (filled($data['avatar_media_asset_id'] ?? null)) {
                    $asset = MediaAsset::query()
                        ->whereKey($data['avatar_media_asset_id'])
                        ->where('uploader_id', $user->getKey())
                        ->first();

                    if (! $asset instanceof MediaAsset) {
                        throw ValidationException::withMessages([
                            'avatar_media_asset_id' => 'Choose an image from your own media library.',
                        ]);
                    }

                    $newAvatarPath = $this->storeAvatarFromMediaAsset($asset, $user);
                    $user->avatar_path = $newAvatarPath;
                } elseif (filter_var($data['remove_photo'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                    $user->avatar_path = null;
                }

                $user->save();

                if ($oldAvatarPath !== $user->avatar_path && $oldAvatarPath !== null) {
                    DB::afterCommit(static function () use ($oldAvatarPath): void {
                        Storage::disk('public')->delete($oldAvatarPath);
                    });
                }

                return $user->fresh();
            } catch (Throwable $exception) {
                if (is_string($newAvatarPath)) {
                    Storage::disk('public')->delete($newAvatarPath);
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

    private function storeAvatarFromMediaAsset(MediaAsset $asset, User $user): string
    {
        $sourceDisk = Storage::disk($asset->disk);

        if (! $sourceDisk->exists($asset->path)) {
            throw ValidationException::withMessages([
                'avatar_media_asset_id' => 'The selected image could not be found. Choose another image.',
            ]);
        }

        $contents = $sourceDisk->get($asset->path);

        if (! is_string($contents)) {
            throw ValidationException::withMessages([
                'avatar_media_asset_id' => 'The selected image could not be used. Choose another image.',
            ]);
        }

        $path = sprintf(
            'users/%d/avatar-%d-%s.%s',
            $user->getKey(),
            $asset->getKey(),
            Str::random(12),
            $asset->extension,
        );

        if (! Storage::disk('public')->put($path, $contents)) {
            throw ValidationException::withMessages([
                'avatar_media_asset_id' => 'The selected image could not be saved. Try again.',
            ]);
        }

        return $path;
    }
}
