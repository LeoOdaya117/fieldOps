<?php

namespace App\Actions\Rbac;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssignRoleToUser
{
    public function __construct(
        private readonly RecordAccessAudit $audit,
        private readonly ValidateRoleGrant $validateRoleGrant,
    ) {}

    public function execute(User $target, Role $role, ?User $actor = null): void
    {
        DB::transaction(function () use ($target, $role, $actor): void {
            $target = User::query()->lockForUpdate()->whereKey($target->getKey())->firstOrFail();
            $role = Role::query()->with('permissions')->whereKey($role->getKey())->firstOrFail();
            $current = $target->roles()->first();

            $this->validateRoleGrant->execute($actor, $role);

            if ($current?->is($role)) {
                return;
            }

            if ($target->is($actor)) {
                throw ValidationException::withMessages(['role' => 'You cannot change your own role.']);
            }

            if (in_array($current?->name, RoleName::ownerRoleNames(), true) && $target->status === UserStatus::Active) {
                $remainingOwners = User::query()
                    ->where('status', UserStatus::Active->value)
                    ->where('users.id', '<>', $target->getKey())
                    ->role(RoleName::ownerRoleNames())
                    ->lockForUpdate()
                    ->count();

                if ($remainingOwners < 1) {
                    throw ValidationException::withMessages(['role' => 'The enterprise must retain at least one active Owner.']);
                }
            }

            $target->syncRoles([$role]);

            $this->audit->record(
                'user.role_changed',
                $actor,
                $target,
                ['role' => $current?->name],
                ['role' => $role->name],
            );
        });
    }
}
