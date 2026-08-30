<?php

namespace App\Listeners;

use App\Actions\Security\RecordVisitLog;
use App\Actions\Security\RememberLoginIpAddress;
use App\Models\User;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Throwable;

class RecordAuthenticationVisit
{
    public function __construct(
        private readonly RecordVisitLog $recorder,
        private readonly RememberLoginIpAddress $ipAddressRecorder,
    ) {}

    public function handleLogin(Login $event): void
    {
        $this->recordSafely('login', 'success', $event->user instanceof User ? $event->user : null);
    }

    public function handleLogout(Logout $event): void
    {
        $this->recordSafely('logout', 'success', $event->user instanceof User ? $event->user : null);
    }

    private function recordSafely(string $eventType, string $outcome, ?User $user = null): void
    {
        if ($eventType === 'login') {
            try {
                $this->ipAddressRecorder->record(user: $user);
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        try {
            $this->recorder->record($eventType, $outcome, user: $user);
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
