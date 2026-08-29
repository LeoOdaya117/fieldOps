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
        return $user->can('ip_blocks.manage');
    }

    public function activate(User $user, BlockedIpAddress $rule): bool
    {
        return $user->can('ip_blocks.manage');
    }

    public function deactivate(User $user, BlockedIpAddress $rule): bool
    {
        return $user->can('ip_blocks.manage');
    }

    public function update(User $user, BlockedIpAddress $rule): bool
    {
        return $user->can('ip_blocks.manage');
    }

    public function delete(User $user, BlockedIpAddress $rule): bool
    {
        return $user->can('ip_blocks.manage');
    }
}
