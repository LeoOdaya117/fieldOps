<?php

namespace App\Listeners;

use App\Actions\Security\RecordVisitLog;
use App\Actions\Security\RememberLoginIpAddress;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Str;
use Laravel\Fortify\Events\TwoFactorAuthenticationChallenged;
use Laravel\Fortify\Events\TwoFactorAuthenticationFailed;
use Throwable;

class RecordAuthenticationVisit
{
    public function __construct(
        private readonly RecordVisitLog $recorder,
        private readonly RememberLoginIpAddress $ipAddressRecorder,
    ) {}

    public function handleLogin(Login $event): void
    {
        $this->recordSafely('authentication', 'success', $event->user instanceof User ? $event->user : null);
    }

    public function handleFailed(Failed $event): void
    {
        $user = $event->user instanceof User ? $event->user : $this->userFromCredentials($event->credentials);
        $outcome = $user?->status === UserStatus::Suspended ? 'blocked_account' : 'failed';

        $this->recordSafely('authentication', $outcome, $user);
    }

    public function handleLogout(Logout $event): void
    {
        $this->recordSafely('logout', 'success', $event->user instanceof User ? $event->user : null);
    }

    public function handleTwoFactorChallenge(TwoFactorAuthenticationChallenged $event): void
    {
        $this->recordSafely('authentication', 'success', $event->user);
    }

    public function handleTwoFactorFailure(TwoFactorAuthenticationFailed $event): void
    {
        $this->recordSafely('authentication', 'failed', $event->user);
    }

    private function recordSafely(string $eventType, string $outcome, ?User $user = null): void
    {
        if ($eventType === 'authentication') {
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

    /** @param array<string, mixed> $credentials */
    private function userFromCredentials(array $credentials): ?User
    {
        $email = $credentials['email'] ?? null;

        if (! is_string($email) || trim($email) === '') {
            return null;
        }

        return User::query()->where('email', Str::lower(trim($email)))->first();
    }
}
