<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;

class DatabaseNotificationPolicy
{
    public function update(User $user, DatabaseNotification $notification): bool
    {
        return $user->isActive() && $notification->notifiable_type === $user->getMorphClass()
            && (int) $notification->notifiable_id === $user->id;
    }
}
