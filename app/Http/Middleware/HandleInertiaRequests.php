<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $authorization = [
            'role' => null,
            'permissions' => [],
            'isOwner' => false,
        ];

        if ($user !== null) {
            $user->loadMissing('roles');
            $role = $user->roles->first();
            $authorization = [
                'role' => $role === null ? null : [
                    'id' => $role->getKey(),
                    'name' => $role->name,
                    'displayName' => $role->display_name,
                    'isSystem' => (bool) $role->is_system,
                ],
                'permissions' => $user->isActive() && $user->isOwner()
                    ? config('rbac.permissions', [])
                    : $user->getAllPermissions()->pluck('name')->values()->all(),
                'isOwner' => $user->isActive() && $user->isOwner(),
            ];
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user?->makeHidden(['roles', 'permissions']),
                'authorization' => $authorization,
            ],
            'flash' => [
                'success' => fn (): mixed => $request->session()->get('success'),
                'error' => fn (): mixed => $request->session()->get('error'),
                'warning' => fn (): mixed => $request->session()->get('warning'),
                'info' => fn (): mixed => $request->session()->get('info'),
                'message' => fn (): mixed => $request->session()->get('message'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
