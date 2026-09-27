<?php

namespace App\Listeners;

use App\Models\User;
use Illuminate\Auth\Events\Login;

class SnapshotUserSessionVersion
{
    public function handle(Login $event): void
    {
        if (! $event->user instanceof User || ! request()->hasSession()) {
            return;
        }

        request()->session()->put('auth.session_version', (int) $event->user->session_version);
    }
}
