<?php

namespace App\Policies;

use App\Models\Timezone;
use App\Models\User;

class TimezonePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('timezones.view');
    }

    public function view(User $user, Timezone $timezone): bool
    {
        return $user->can('timezones.view');
    }

    public function create(User $user): bool
    {
        return $user->can('timezones.manage');
    }

    public function update(User $user, Timezone $timezone): bool
    {
        return $user->can('timezones.manage');
    }

    public function delete(User $user, Timezone $timezone): bool
    {
        return $user->can('timezones.manage');
    }
}
