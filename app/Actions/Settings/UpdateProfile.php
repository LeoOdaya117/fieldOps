<?php

namespace App\Actions\Settings;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
}
