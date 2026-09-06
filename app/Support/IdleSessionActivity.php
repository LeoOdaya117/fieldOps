<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Cookie\CookieJar;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

final class IdleSessionActivity
{
    /** @return array{user_id:int,session_hash:string,timestamp:int}|null */
    public static function read(Request $request): ?array
    {
        $value = $request->cookie(self::cookieName());

        if (! is_string($value)) {
            return null;
        }

        $parts = explode('|', $value);

        if (count($parts) !== 3 || ! ctype_digit($parts[0]) || ! ctype_digit($parts[2])) {
            return null;
        }

        return [
            'user_id' => (int) $parts[0],
            'session_hash' => $parts[1],
            'timestamp' => (int) $parts[2],
        ];
    }

    /** @param array{user_id:int,session_hash:string,timestamp:int} $activity */
    public static function matches(Request $request, User $user, array $activity): bool
    {
        return $activity['user_id'] === (int) $user->getKey()
            && hash_equals(self::sessionHash($request), $activity['session_hash']);
    }

    public static function queue(Request $request, User $user, ?int $timestamp = null): void
    {
        $value = implode('|', [
            $user->getKey(),
            self::sessionHash($request),
            $timestamp ?? now()->timestamp,
        ]);

        app(CookieJar::class)->queue(cookie(
            name: self::cookieName(),
            value: $value,
            minutes: (int) ceil(SystemSettings::maximumIdleTimeoutSeconds() / 60) + 5,
            path: (string) config('session.path', '/'),
            domain: config('session.domain'),
            secure: (bool) config('session.secure', false),
            httpOnly: true,
            raw: false,
            sameSite: (string) config('session.same_site', 'lax'),
        ));
    }

    public static function forget(): Cookie
    {
        return app(CookieJar::class)->forget(
            self::cookieName(),
            (string) config('session.path', '/'),
            config('session.domain'),
        );
    }

    /** @return non-empty-string */
    public static function cookieName(): string
    {
        $name = trim((string) config('system.idle_activity_cookie', 'fieldops_idle_activity'));

        return $name !== '' ? $name : 'fieldops_idle_activity';
    }

    private static function sessionHash(Request $request): string
    {
        return hash('sha256', $request->session()->getId());
    }
}
