<?php

namespace App\Actions\Rbac;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use App\Notifications\AccessNotification;
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

            if (in_array($current?->name, RoleName::elevatedRoleNames(), true) && ! $actor?->isSuperAdmin()) {
                throw ValidationException::withMessages(['role_id' => 'Only a Super Admin can change the role of a Super Admin.']);
            }

            if (in_array($current?->name, RoleName::elevatedRoleNames(), true) && $target->status === UserStatus::Active) {
                $remainingSuperAdmins = User::query()
                    ->where('status', UserStatus::Active->value)
                    ->where('users.id', '<>', $target->getKey())
                    ->role(RoleName::elevatedRoleNames())
                    ->lockForUpdate()
                    ->count();

                if ($remainingSuperAdmins < 1) {
                    throw ValidationException::withMessages(['role' => 'The enterprise must retain at least one active Super Admin.']);
                }
            }

            $target->syncRoles([$role]);
            if ($current !== null) {
                $target->notify(new AccessNotification('user.role_changed', 'Your role has changed', 'Your role changed from '.$current->display_name.' to '.$role->display_name.'.'));
            }

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
