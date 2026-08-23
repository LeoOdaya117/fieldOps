<?php

namespace App\Actions\Rbac;

use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class UpdateUser
{
    public function __construct(
        private readonly AssignRoleToUser $assignRole,
        private readonly ChangeUserStatus $changeStatus,
        private readonly RecordAccessAudit $audit,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $target, User $actor, array $data): User
    {
        if ($target->is($actor)) {
            throw ValidationException::withMessages([
                'user' => 'You cannot edit your own account from user management.',
            ]);
        }

        $blocked = filter_var($data['blocked'], FILTER_VALIDATE_BOOLEAN);
        if ($blocked && ! $actor->can('users.suspend')) {
            throw ValidationException::withMessages([
                'blocked' => 'You do not have permission to block users.',
            ]);
        }

        if ((int) $target->roles()->value('roles.id') !== (int) $data['role_id']
            && ! $actor->can('roles.assign')) {
            throw ValidationException::withMessages([
                'role_id' => 'You do not have permission to assign roles.',
            ]);
        }

        return DB::transaction(function () use ($target, $actor, $data, $blocked): User {
            $target = User::query()->lockForUpdate()->whereKey($target->getKey())->firstOrFail();
            $before = [
                'name' => $target->name,
                'email' => $target->email,
                'position' => $target->position,
                'department' => $target->department,
                'has_avatar' => $target->avatar_path !== null,
            ];
            $oldAvatarPath = $target->avatar_path;
            $newAvatarPath = null;
            $passwordChanged = filled($data['password'] ?? null);

            try {
                $desiredStatus = $blocked ? UserStatus::Suspended : UserStatus::Active;
                if ($target->status !== $desiredStatus) {
                    if ($desiredStatus === UserStatus::Suspended) {
                        $this->changeStatus->suspend($target, $actor);
                    } else {
                        $this->changeStatus->reactivate($target, $actor);
                    }

                    $target->refresh();
                }

                if ((int) $target->roles()->value('roles.id') !== (int) $data['role_id']) {
                    $this->assignRole->execute(
                        $target,
                        Role::query()->findOrFail((int) $data['role_id']),
                        $actor,
                    );

                    $target->refresh();
                }

                $target->forceFill([
                    'name' => trim((string) $data['name']),
                    'email' => mb_strtolower(trim((string) $data['email'])),
                    'position' => $this->nullableString($data['position'] ?? null),
                    'department' => $this->nullableString($data['department'] ?? null),
                    'updated_by' => $actor->getKey(),
                ]);

                if ($passwordChanged) {
                    $target->password = (string) $data['password'];
                }

                if (($data['photo'] ?? null) instanceof UploadedFile) {
                    $newAvatarPath = $data['photo']->store("users/{$target->getKey()}", 'public');

                    if (! is_string($newAvatarPath)) {
                        throw ValidationException::withMessages([
                            'photo' => 'The photo could not be stored. Try again.',
                        ]);
                    }

                    $target->avatar_path = $newAvatarPath;
                } elseif (filter_var($data['remove_photo'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                    $target->avatar_path = null;
                }

                $target->save();

                $after = [
                    'name' => $target->name,
                    'email' => $target->email,
                    'position' => $target->position,
                    'department' => $target->department,
                    'has_avatar' => $target->avatar_path !== null,
                ];

                if ($before !== $after) {
                    $this->audit->record('user.updated', $actor, $target, $before, $after);
                }

                if ($passwordChanged) {
                    if (Schema::hasTable('sessions')) {
                        DB::table('sessions')->where('user_id', $target->getKey())->delete();
                    }

                    $this->audit->record(
                        'user.password_changed',
                        $actor,
                        $target,
                        null,
                        ['changed' => true],
                    );
                }

                $avatarChanged = $oldAvatarPath !== $target->avatar_path;
                if ($avatarChanged && $oldAvatarPath !== null) {
                    DB::afterCommit(static function () use ($oldAvatarPath): void {
                        Storage::disk('public')->delete($oldAvatarPath);
                    });
                }

                return $target->fresh('roles');
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
