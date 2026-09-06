<?php

namespace Tests\Feature\Settings;

use App\Enums\RoleName;
use App\Models\AccessAuditEvent;
use App\Models\SystemSetting;
use App\Models\User;
use App\Support\SystemSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class SystemSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_administrator_can_view_and_update_system_settings(): void
    {
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Administrator->value);

        $this->actingAs($admin)
            ->get(route('system-settings.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('settings/system')
                ->where('settings.name', 'FieldOps')
                ->where('settings.timezone', 'UTC')
                ->where('settings.pagination_size', '50')
                ->where('settings.theme', 'canvas')
                ->where('settings.idle_timeout_seconds', '900')
                ->where('settings.login_max_attempts', '5')
                ->where('settings.login_decay_minutes', '30'));

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->patch(route('system-settings.update'), [
                'name' => 'Acme FieldOps',
                'timezone' => 'Asia/Manila',
                'pagination_size' => 75,
                'idle_timeout_seconds' => 1200,
                'login_max_attempts' => 7,
                'login_decay_minutes' => 45,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('system-settings.edit'));

        $this->assertDatabaseHas('system_settings', [
            'key' => 'name',
            'value' => 'Acme FieldOps',
            'updated_by' => $admin->id,
        ]);
        $this->assertDatabaseHas('system_settings', [
            'key' => 'timezone',
            'value' => 'Asia/Manila',
        ]);
        $this->assertDatabaseHas('system_settings', [
            'key' => 'pagination_size',
            'value' => '75',
        ]);
        $this->assertDatabaseHas('system_settings', ['key' => 'idle_timeout_seconds', 'value' => '1200']);
        $this->assertDatabaseHas('system_settings', ['key' => 'login_max_attempts', 'value' => '7']);
        $this->assertDatabaseHas('system_settings', ['key' => 'login_decay_minutes', 'value' => '45']);

        $audit = AccessAuditEvent::query()->where('event', 'settings.system.updated')->sole();
        $this->assertArrayNotHasKey('theme', $audit->after);

        $loginLimiter = RateLimiter::limiter('login');
        $limit = $loginLimiter(Request::create('/login', 'POST', [
            'email' => 'ADMIN@EXAMPLE.COM',
        ], server: ['REMOTE_ADDR' => '127.0.0.1']));
        $this->assertSame(7, $limit->maxAttempts);
        $this->assertSame(45 * 60, $limit->decaySeconds);
        $this->assertStringStartsWith('7:45|', (string) $limit->key);

        $this->actingAs($admin)
            ->get(route('access.users.index'))
            ->assertInertia(fn ($page) => $page->where('filters.perPage', 75));

        $this->actingAs($admin)
            ->get(route('profile.edit'))
            ->assertInertia(fn ($page) => $page->where('name', 'Acme FieldOps'));
    }

    public function test_users_without_system_settings_permission_are_denied(): void
    {
        $user = User::factory()->create();
        $user->syncRoles(RoleName::User->value);

        $this->actingAs($user)
            ->get(route('system-settings.edit'))
            ->assertForbidden();

        $this->actingAs($user)
            ->patch(route('system-settings.update'), [
                'name' => 'Not allowed',
                'timezone' => 'UTC',
                'pagination_size' => 50,
                'idle_timeout_seconds' => 900,
                'login_max_attempts' => 5,
                'login_decay_minutes' => 30,
            ])
            ->assertForbidden();
    }

    public function test_system_settings_require_recent_password_confirmation_and_validate_policy_bounds(): void
    {
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Administrator->value);
        $payload = [
            'name' => 'FieldOps',
            'timezone' => 'UTC',
            'pagination_size' => 50,
            'idle_timeout_seconds' => 900,
            'login_max_attempts' => 5,
            'login_decay_minutes' => 30,
        ];

        $this->actingAs($admin)
            ->patch(route('system-settings.update'), $payload)
            ->assertRedirect(route('password.confirm'));

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->patch(route('system-settings.update'), [
                ...$payload,
                'idle_timeout_seconds' => 59,
                'login_max_attempts' => 21,
                'login_decay_minutes' => 1441,
            ])
            ->assertSessionHasErrors([
                'idle_timeout_seconds',
                'login_max_attempts',
                'login_decay_minutes',
            ]);

        $this->assertDatabaseCount('access_audit_events', 0);
    }

    public function test_an_administrator_can_compare_and_apply_a_layout_theme(): void
    {
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Administrator->value);

        $this->actingAs($admin)
            ->get(route('system-settings.layout.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('settings/system/layout')
                ->where('currentTheme', 'canvas')
                ->has('themes', 5)
                ->where('themes.4.value', 'horizon'));

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->patch(route('system-settings.layout.update'), ['theme' => 'navigator'])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('system-settings.layout.edit'));

        $this->assertDatabaseHas('system_settings', [
            'key' => 'theme',
            'value' => 'navigator',
            'updated_by' => $admin->id,
        ]);

        $audit = AccessAuditEvent::query()
            ->where('event', 'settings.layout.updated')
            ->sole();
        $this->assertSame(['theme' => 'canvas'], $audit->before);
        $this->assertSame(['theme' => 'navigator'], $audit->after);
    }

    public function test_layout_theme_requires_confirmation_permission_and_a_known_value(): void
    {
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Administrator->value);

        $this->actingAs($admin)
            ->patch(route('system-settings.layout.update'), ['theme' => 'atlas'])
            ->assertRedirect(route('password.confirm'));

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->patch(route('system-settings.layout.update'), ['theme' => 'neon'])
            ->assertSessionHasErrors('theme');

        $user = User::factory()->create();
        $user->syncRoles(RoleName::User->value);
        $this->actingAs($user)
            ->get(route('system-settings.layout.edit'))
            ->assertForbidden();
    }

    public function test_legacy_and_unknown_theme_values_are_normalized(): void
    {
        SystemSetting::query()->create(['key' => 'theme', 'value' => 'sidebar']);
        SystemSettings::forgetCache();
        $this->assertSame('canvas', SystemSettings::theme());

        SystemSetting::query()->where('key', 'theme')->update(['value' => 'header']);
        SystemSettings::forgetCache();
        $this->assertSame('horizon', SystemSettings::theme());

        SystemSetting::query()->where('key', 'theme')->update(['value' => 'unknown']);
        SystemSettings::forgetCache();
        $this->assertSame('canvas', SystemSettings::theme());
    }

    public function test_unverified_administrators_cannot_read_or_change_system_settings(): void
    {
        $admin = User::factory()->unverified()->create();
        $admin->syncRoles(RoleName::Administrator->value);

        $read = $this->actingAs($admin)->get(route('system-settings.edit'));
        $write = $this->actingAs($admin)->patch(route('system-settings.update'));

        $this->assertContains($read->getStatusCode(), [302, 403]);
        $this->assertContains($write->getStatusCode(), [302, 403]);
    }
}
