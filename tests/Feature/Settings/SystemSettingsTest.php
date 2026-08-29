<?php

namespace Tests\Feature\Settings;

use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
                ->where('settings.pagination_size', '50'));

        $this->actingAs($admin)
            ->patch(route('system-settings.update'), [
                'name' => 'Acme FieldOps',
                'timezone' => 'Asia/Manila',
                'pagination_size' => 75,
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
            ])
            ->assertForbidden();
    }
}
