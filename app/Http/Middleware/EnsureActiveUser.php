<?php

namespace App\Http\Middleware;

use App\Enums\UserStatus;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && $user->status !== UserStatus::Active) {
            abort(403, 'This account is suspended.');
        }

        if ($user !== null && $request->hasSession() && $request->session()->has(Auth::guard()->getName())) {
            $sessionVersion = $request->session()->get('auth.session_version');

            if (! is_int($sessionVersion) || $sessionVersion !== (int) $user->session_version) {
                Auth::guard()->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                abort(403, 'Your session is no longer valid. Please sign in again.');
            }
        }

        return $next($request);
    }
}
