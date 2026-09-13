<?php

namespace App\Http\Middleware;

use App\Support\IdleSessionActivity;
use App\Support\SystemSettings;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnforceIdleSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $wasAuthenticated = Auth::check();

        if ($wasAuthenticated) {
            $user = $request->user();
            $activity = IdleSessionActivity::read($request);

            if ($user !== null && $activity !== null && IdleSessionActivity::matches($request, $user, $activity)) {
                $elapsed = CarbonImmutable::now()->getTimestamp() - $activity['timestamp'];

                if ($elapsed >= SystemSettings::idleTimeoutSeconds() || $elapsed < -60) {
                    return $this->expire($request);
                }
            } elseif (Auth::viaRemember()) {
                return $this->expire($request);
            } elseif ($user !== null) {
                IdleSessionActivity::queue($request, $user);
            }
        }

        $response = $next($request);

        if (! $wasAuthenticated && Auth::check() && ! Auth::viaRemember() && $request->user() !== null) {
            IdleSessionActivity::queue($request, $request->user());
        }

        return $response;
    }

    private function expire(Request $request): JsonResponse|RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        cookie()->queue(IdleSessionActivity::forget());

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Your session expired after a period of inactivity. Please sign in again.',
            ], 401);
        }

        return redirect()->guest(route('login'))
            ->with('error', 'Your session expired after a period of inactivity. Please sign in again.');
    }
}
