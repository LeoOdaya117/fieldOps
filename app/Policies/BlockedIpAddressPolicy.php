<?php

namespace App\Policies;

use App\Models\BlockedIpAddress;
use App\Models\User;

class BlockedIpAddressPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('ip_blocks.view');
    }

    public function view(User $user, BlockedIpAddress $rule): bool
    {
        return $user->can('ip_blocks.view');
    }

    public function create(User $user): bool
    {
        return $user->can('ip_blocks.create');
    }

    public function activate(User $user, BlockedIpAddress $rule): bool
    {
        return $user->can('ip_blocks.update');
    }

    public function deactivate(User $user, BlockedIpAddress $rule): bool
    {
        return $user->can('ip_blocks.update');
    }

    public function update(User $user, BlockedIpAddress $rule): bool
    {
        return $user->can('ip_blocks.update');
    }

    public function delete(User $user, BlockedIpAddress $rule): bool
    {
        return $user->can('ip_blocks.delete');
    }
}
