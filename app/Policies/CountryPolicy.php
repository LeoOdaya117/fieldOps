<?php

namespace App\Policies;

use App\Models\Country;
use App\Models\User;

class CountryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('countries.view');
    }

    public function view(User $user, Country $country): bool
    {
        return $user->can('countries.view');
    }

    public function create(User $user): bool
    {
        return $user->can('countries.create');
    }

    public function update(User $user, Country $country): bool
    {
        return $user->can('countries.update');
    }

    public function delete(User $user, Country $country): bool
    {
        return $user->can('countries.delete');
    }
}
