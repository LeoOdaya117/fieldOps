<?php

namespace Tests\Feature\Access;

use App\Enums\RoleName;
use App\Models\BlockedIpAddress;
use App\Models\Country;
use App\Models\Role;
use App\Models\Timezone;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class GranularPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_role_defaults_include_resource_crud_and_keep_audit_logs_view_only(): void
    {
        app(RbacSeeder::class)->run();
        $admin = Role::query()->where('name', RoleName::Admin->value)->firstOrFail();
        $user = Role::query()->where('name', RoleName::User->value)->firstOrFail();
        $this->assertSame(['admin', 'super_admin', 'user'], Role::query()->where('is_system', true)->orderBy('name')->pluck('name')->all());

        foreach (['countries', 'timezones', 'ip_blocks', 'organization_locations', 'media_assets'] as $resource) {
            foreach (['view', 'create', 'update', 'delete'] as $action) {
                $this->assertTrue($admin->hasPermissionTo("{$resource}.{$action}"));
            }
        }

        $this->assertTrue($admin->hasPermissionTo('settings.view'));
        $this->assertTrue($admin->hasPermissionTo('settings.update'));
        $this->assertTrue($admin->hasPermissionTo('media_assets.create'));
        foreach (['view', 'create', 'update', 'delete'] as $action) {
            $this->assertTrue($user->hasPermissionTo("media_assets.{$action}"));
        }
        $this->assertFalse($user->hasPermissionTo('media_assets.view_deleted'));
        $this->assertFalse($user->hasPermissionTo('media_assets.update_deleted'));
        $this->assertSame(['audit.view'], $admin->permissions()->where('name', 'like', 'audit.%')->orderBy('name')->pluck('name')->all());
        $this->assertSame(['visit_logs.view'], $admin->permissions()->where('name', 'like', 'visit_logs.%')->orderBy('name')->pluck('name')->all());
        $this->assertSame(['dashboard.view'], $admin->permissions()->where('name', 'like', 'dashboard.%')->orderBy('name')->pluck('name')->all());
    }

    public function test_reference_data_create_permission_does_not_imply_update_or_delete(): void
    {
        $actor = User::factory()->create();
        $actor->givePermissionTo(
            Permission::findOrCreate('countries.view', 'web'),
            Permission::findOrCreate('countries.create', 'web'),
            Permission::findOrCreate('timezones.view', 'web'),
            Permission::findOrCreate('timezones.create', 'web'),
        );
        $country = Country::query()->create(['code' => 'US', 'name' => 'United States']);
        $timezone = Timezone::query()->create(['name' => 'UTC']);
        $confirmed = ['auth.password_confirmed_at' => now()->timestamp];

        $this->actingAs($actor)->withSession($confirmed)
            ->post(route('system.countries.store'), ['code' => 'CA', 'name' => 'Canada'])
            ->assertRedirect(route('system.countries.index'));
        $this->assertDatabaseHas('countries', ['code' => 'CA']);

        $this->patch(route('system.countries.update', $country), ['code' => 'US', 'name' => 'Edited'])
            ->assertForbidden();
        $this->delete(route('system.countries.destroy', $country))->assertForbidden();

        $this->post(route('system.timezones.store'), ['name' => 'Europe/Paris'])
            ->assertRedirect(route('system.timezones.index'));
        $this->patch(route('system.timezones.update', $timezone), ['name' => 'Europe/Paris'])
            ->assertForbidden();
        $this->delete(route('system.timezones.destroy', $timezone))->assertForbidden();
    }

    public function test_ip_update_and_record_status_are_separate_from_delete_and_activation_state(): void
    {
        $actor = User::factory()->create();
        $actor->givePermissionTo(
            Permission::findOrCreate('ip_blocks.view', 'web'),
            Permission::findOrCreate('ip_blocks.update', 'web'),
        );
        $rule = BlockedIpAddress::query()->create([
            'ip_address' => '192.0.2.180',
            'is_active' => true,
            'blocked_at' => now(),
            'reason' => 'Separate permissions',
        ]);
        $confirmed = ['auth.password_confirmed_at' => now()->timestamp];

        $this->actingAs($actor)->withSession($confirmed)
            ->patch(route('access.ip-blocks.deactivate', $rule))
            ->assertRedirect();
        $this->assertDatabaseHas('blocked_ip_addresses', ['id' => $rule->id, 'is_active' => false, 'record_status' => 1]);

        $this->delete(route('access.ip-blocks.destroy', $rule))->assertForbidden();
        $this->patch(route('access.ip-blocks.record-status', $rule), ['record_status' => 0])->assertForbidden();

        $actor->givePermissionTo(Permission::findOrCreate('ip_blocks.update_deleted', 'web'));
        $this->patch(route('access.ip-blocks.record-status', $rule), ['record_status' => 0])
            ->assertRedirect();
        $this->assertDatabaseHas('blocked_ip_addresses', ['id' => $rule->id, 'is_active' => false, 'record_status' => 0]);
    }

    public function test_settings_view_is_separate_from_update_and_log_resources_are_read_only(): void
    {
        $actor = User::factory()->create();
        $actor->givePermissionTo(Permission::findOrCreate('settings.view', 'web'));

        $this->actingAs($actor)->get(route('system-settings.edit'))->assertOk();
        $this->patch(route('system-settings.update'), [])->assertForbidden();

        $this->assertNotContains('audit.create', config('rbac.permissions'));
        $this->assertNotContains('audit.update', config('rbac.permissions'));
        $this->assertNotContains('audit.delete', config('rbac.permissions'));
        $this->assertNotContains('visit_logs.create', config('rbac.permissions'));
        $this->assertNotContains('visit_logs.update', config('rbac.permissions'));
        $this->assertNotContains('visit_logs.delete', config('rbac.permissions'));
        $this->assertSame(['dashboard.view'], array_values(array_filter(
            config('rbac.permissions'),
            static fn (string $permission): bool => str_starts_with($permission, 'dashboard.'),
        )));
    }
}
