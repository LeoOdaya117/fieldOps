<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('users.view');
    }

    public function view(User $user, User $subject): bool
    {
        return $user->can('users.view');
    }

    public function invite(User $user): bool
    {
        return $user->can('users.invite');
    }

    public function create(User $user): bool
    {
        return $user->can('users.create');
    }

    public function reviewRegistrations(User $user): bool
    {
        return $user->can('users.review_registrations');
    }

    public function update(User $user, User $subject): bool
    {
        return $user->can('users.update') && ! $user->is($subject);
    }

    public function delete(User $user, User $subject): bool
    {
        return $user->can('users.delete')
            && ! $user->is($subject)
            && ($user->isOwner() || ! $subject->isOwner());
    }

    public function suspend(User $user, User $subject): bool
    {
        return $user->can('users.suspend') && ! $user->is($subject);
    }
}
