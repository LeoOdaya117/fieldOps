<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireBackupAdministrator
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->isActive() && $user->record_status === 1
            && $user->email_verified_at !== null && $user->isSuperAdmin(), 403);

        return $next($request);
    }
}
