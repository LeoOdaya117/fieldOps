<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Role;
use App\Models\User;

class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('roles.view');
    }

    public function view(User $user, Role $role): bool
    {
        return $user->can('roles.view');
    }

    public function create(User $user): bool
    {
        return $user->can('roles.create');
    }

    public function update(User $user, Role $role): bool
    {
        return $user->can('roles.update') && ($user->isOwner() || ! $role->is_system);
    }

    public function delete(User $user, Role $role): bool
    {
        return $user->can('roles.delete')
            && ($user->isOwner() || ! $role->is_system);
    }

    public function assign(User $user, Role $role): bool
    {
        return $user->can('roles.assign')
            && (! in_array($role->name, RoleName::ownerRoleNames(), true) || $user->isOwner());
    }
}
