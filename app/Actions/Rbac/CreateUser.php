<?php

namespace App\Actions\Rbac;

use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class CreateUser
{
    public function __construct(
        private readonly RecordAccessAudit $audit,
        private readonly ValidateRoleGrant $validateRoleGrant,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data, User $actor): User
    {
        if (! $actor->can('roles.assign')) {
            throw ValidationException::withMessages([
                'role_id' => 'You do not have permission to assign roles.',
            ]);
        }

        $role = Role::query()->with('permissions')->findOrFail((int) $data['role_id']);
        $this->validateRoleGrant->execute($actor, $role);

        $blocked = filter_var($data['blocked'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($blocked && ! $actor->can('users.suspend')) {
            throw ValidationException::withMessages([
                'blocked' => 'You do not have permission to block users.',
            ]);
        }

        return DB::transaction(function () use ($data, $actor, $role, $blocked): User {
            $avatarPath = null;
            $user = null;

            try {
                $user = User::query()->create([
                    'name' => trim((string) $data['name']),
                    'email' => mb_strtolower(trim((string) $data['email'])),
                    'position' => $this->nullableString($data['position'] ?? null),
                    'department' => $this->nullableString($data['department'] ?? null),
                    'password' => $data['password'],
                    'email_verified_at' => now(),
                    'status' => $blocked ? UserStatus::Suspended : UserStatus::Active,
                    'suspended_at' => $blocked ? now() : null,
                    'suspended_by' => $blocked ? $actor->getKey() : null,
                    'created_by' => $actor->getKey(),
                    'updated_by' => $actor->getKey(),
                ]);

                if (($data['photo'] ?? null) instanceof UploadedFile) {
                    $avatarPath = $data['photo']->store("users/{$user->getKey()}", 'public');

                    if (! is_string($avatarPath)) {
                        throw ValidationException::withMessages([
                            'photo' => 'The photo could not be stored. Try again.',
                        ]);
                    }

                    $user->forceFill(['avatar_path' => $avatarPath])->save();
                }

                $user->syncRoles([$role]);

                $this->audit->record(
                    'user.created',
                    $actor,
                    $user,
                    null,
                    [
                        'name' => $user->name,
                        'email' => $user->email,
                        'position' => $user->position,
                        'department' => $user->department,
                        'status' => $user->status->value,
                        'role' => $role->name,
                        'has_avatar' => $user->avatar_path !== null,
                    ],
                );

                return $user->fresh('roles');
            } catch (Throwable $exception) {
                if (is_string($avatarPath)) {
                    Storage::disk('public')->delete($avatarPath);
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
