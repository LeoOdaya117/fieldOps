<?php

namespace App\Actions\Rbac;

use App\Enums\RegistrationStatus;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRegistration;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApproveRegistration
{
    public function __construct(
        private readonly RecordAccessAudit $audit,
        private readonly ValidateRoleGrant $validateRoleGrant,
    ) {}

    public function execute(UserRegistration $registration, Role $role, User $actor): User
    {
        if (! $actor->can('roles.assign')) {
            throw ValidationException::withMessages([
                'role_id' => 'You do not have permission to assign roles.',
            ]);
        }

        $this->validateRoleGrant->execute($actor, $role);

        return DB::transaction(function () use ($registration, $role, $actor): User {
            $registration = UserRegistration::query()->lockForUpdate()->whereKey($registration->getKey())->firstOrFail();

            if ($registration->status !== RegistrationStatus::Pending) {
                throw ValidationException::withMessages([
                    'registration' => 'This registration has already been reviewed.',
                ]);
            }

            if (User::query()->where('email', $registration->email)->exists()) {
                throw ValidationException::withMessages([
                    'email' => 'An account with this email already exists.',
                ]);
            }

            $user = User::query()->create([
                'name' => $registration->name,
                'email' => $registration->email,
                'password' => $registration->password,
                'email_verified_at' => now(),
                'status' => UserStatus::Active,
                'created_by' => $actor->getKey(),
                'updated_by' => $actor->getKey(),
            ]);
            $user->syncRoles([$role]);

            $registration->forceFill([
                'status' => RegistrationStatus::Approved,
                'reviewed_by' => $actor->getKey(),
                'reviewed_at' => now(),
            ])->save();

            $this->audit->record(
                'registration.approved',
                $actor,
                $user,
                null,
                ['email' => $user->email, 'role' => $role->name],
            );

            return $user->fresh('roles');
        });
    }
}
