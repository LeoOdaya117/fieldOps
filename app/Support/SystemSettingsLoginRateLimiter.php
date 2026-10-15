<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Fortify\Fortify;
use Laravel\Fortify\LoginRateLimiter;

class SystemSettingsLoginRateLimiter extends LoginRateLimiter
{
    /**
     * Determine whether the configured number of failed attempts was reached.
     *
     * @param  Request  $request
     */
    public function tooManyAttempts($request): bool
    {
        return $this->limiter->tooManyAttempts(
            $this->throttleKey($request),
            SystemSettings::loginMaxAttempts(),
        );
    }

    /**
     * Increment the failed login attempts for the configured decay period.
     *
     * @param  Request  $request
     */
    public function increment($request): void
    {
        $this->limiter->hit(
            $this->throttleKey($request),
            SystemSettings::loginDecayMinutes() * 60,
        );
    }

    /**
     * Get the limiter key for the current credentials and IP address.
     *
     * @param  Request  $request
     */
    protected function throttleKey($request): string
    {
        $attempts = SystemSettings::loginMaxAttempts();
        $decayMinutes = SystemSettings::loginDecayMinutes();
        $identity = Str::transliterate(
            Str::lower($request->input(Fortify::username()).'|'.$request->ip()),
        );

        return "{$attempts}:{$decayMinutes}|{$identity}";
    }
}
