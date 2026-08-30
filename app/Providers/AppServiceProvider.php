<?php

namespace App\Providers;

use App\Listeners\RecordAuthenticationVisit;
use App\Models\AccessAuditEvent;
use App\Models\BlockedIpAddress;
use App\Models\Role;
use App\Models\User;
use App\Models\VisitLog;
use App\Policies\AccessAuditEventPolicy;
use App\Policies\BlockedIpAddressPolicy;
use App\Policies\RolePolicy;
use App\Policies\UserPolicy;
use App\Policies\VisitLogPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Role::class, RolePolicy::class);
        Gate::policy(AccessAuditEvent::class, AccessAuditEventPolicy::class);
        Gate::policy(BlockedIpAddress::class, BlockedIpAddressPolicy::class);
        Gate::policy(VisitLog::class, VisitLogPolicy::class);

        Event::listen(Login::class, [RecordAuthenticationVisit::class, 'handleLogin']);
        Event::listen(Logout::class, [RecordAuthenticationVisit::class, 'handleLogout']);

        Gate::before(static function ($user): ?bool {
            return $user->isActive() && $user->isOwner() ? true : null;
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
