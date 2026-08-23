<?php

namespace App\Actions\Rbac;

use App\Enums\RoleName;
use App\Models\Role;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class ValidateRoleGrant
{
    public function execute(?User $actor, Role $role): void
    {
        if ($actor === null) {
            return;
        }

        if (in_array($role->name, RoleName::ownerRoleNames(), true) && ! $actor->isOwner()) {
            throw ValidationException::withMessages(['role_id' => 'Only an owner-level administrator can grant this role.']);
        }

        if ($actor->isOwner()) {
            return;
        }

        $allowed = $actor->getAllPermissions()->pluck('name')->all();
        $requested = $role->permissions()->pluck('name')->all();

        if (array_diff($requested, $allowed) !== []) {
            throw ValidationException::withMessages(['role_id' => 'You cannot grant permissions that you do not possess.']);
        }
    }
}
