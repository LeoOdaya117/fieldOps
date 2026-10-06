<?php

namespace App\Http\Middleware;

use App\Actions\Backups\BackupStore;
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
            $epoch = $request->session()->get('auth.backup_epoch');

            if (! is_int($sessionVersion) || $sessionVersion !== (int) $user->session_version
                || ! is_string($epoch) || ! hash_equals(app(BackupStore::class)->authEpoch(), $epoch)) {
                Auth::guard()->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                abort(403, 'Your session is no longer valid. Please sign in again.');
            }
        }

        return $next($request);
    }
}
