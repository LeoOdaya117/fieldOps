<?php

namespace Tests\Feature\Access;

use App\Enums\PermissionKey;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\Fluent\AssertableJson as Assert;
use Tests\TestCase;

class OperationalAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_and_presets_have_the_exact_operational_matrix(): void
    {
        $expected = [];
        foreach (['assets', 'work_orders', 'inspection_templates', 'inspections', 'issues'] as $resource) {
            foreach (['view', 'create', 'update', 'delete', 'view_deleted', 'update_deleted', 'export_pdf', 'export_csv', 'export_xlsx', 'export_print'] as $action) {
                $expected[] = $resource.'.'.$action;
            }
        }
        $expected = [...$expected, 'work_orders.assign', 'inspections.submit', 'inspections.review', 'issues.resolve',
            'operations_map.view', 'operations_dashboard.view', 'operational_reports.view',
            'operational_reports.export_pdf', 'operational_reports.export_csv',
            'operational_reports.export_xlsx', 'operational_reports.export_print'];
        $this->assertEqualsCanonicalizing($expected, PermissionKey::operationalValues());
        $this->assertSame(count($expected), count(array_unique($expected)));
        $presets = array_column(config('operational-role-presets'), 'permissions', 'key');
        $this->assertEqualsCanonicalizing(['dashboard.view', ...$expected], $presets['supervisor']);
        $this->assertSame([
            'dashboard.view',
            'assets.view', 'work_orders.view', 'work_orders.create', 'work_orders.update',
            'work_orders.assign', 'inspections.view', 'issues.view', 'operations_map.view', 'operations_dashboard.view',
        ], $presets['dispatcher']);
        $this->assertSame([
            'dashboard.view',
            'assets.view', 'work_orders.view', 'inspection_templates.view', 'inspections.view',
            'inspections.create', 'inspections.update', 'inspections.submit', 'issues.view', 'issues.create', 'operations_map.view',
        ], $presets['technician']);
        $this->assertSame([
            'dashboard.view',
            'assets.view', 'work_orders.view', 'inspection_templates.view', 'inspections.view', 'issues.view',
            'operations_map.view', 'operations_dashboard.view', 'operational_reports.view',
        ], $presets['viewer']);
    }

    public function test_catalog_upgrade_and_seeding_do_not_grant_permissions_or_reassign_users(): void
    {
        $user = User::factory()->create();
        app(RbacSeeder::class)->run();
        foreach (Role::query()->where('is_system', true)->get() as $role) {
            $this->assertSame([], $role->permissions()->whereIn('name', PermissionKey::operationalValues())->pluck('name')->all());
        }
        Role::query()->where('name', 'admin')->firstOrFail()->syncPermissions(['dashboard.view']);
        $user->givePermissionTo('countries.view');
        $custom = $this->customRole();
        $custom->givePermissionTo('dashboard.view');
        $user->syncRoles($custom);
        DB::table('permissions')->where('guard_name', 'web')->whereIn('name', PermissionKey::operationalValues())->delete();
        $rolesBefore = DB::table('roles')->orderBy('id')->get()->toArray();
        $grantsBefore = DB::table('role_has_permissions')->orderBy('role_id')->orderBy('permission_id')->get()->toArray();
        $assignmentsBefore = DB::table('model_has_roles')->get()->toArray();
        $directBefore = DB::table('model_has_permissions')->get()->toArray();
        $migration = require base_path('database/migrations/2026_10_22_000001_add_operational_permissions.php');
        $migration->up();
        $migration->up();
        $this->assertEquals($rolesBefore, DB::table('roles')->orderBy('id')->get()->toArray());
        $this->assertEquals($grantsBefore, DB::table('role_has_permissions')->orderBy('role_id')->orderBy('permission_id')->get()->toArray());
        $this->assertEquals($assignmentsBefore, DB::table('model_has_roles')->get()->toArray());
        $this->assertEquals($directBefore, DB::table('model_has_permissions')->get()->toArray());
        $this->assertEqualsCanonicalizing(PermissionKey::operationalValues(), DB::table('permissions')->where('guard_name', 'web')->whereIn('name', PermissionKey::operationalValues())->pluck('name')->all());
        foreach (Role::query()->where('is_system', true)->get() as $role) {
            $this->assertSame([], $role->permissions()->whereIn('name', PermissionKey::operationalValues())->pluck('name')->all());
        }
        $this->assertSame(['dashboard.view'], $custom->permissions()->pluck('name')->all());
        $this->assertSame($custom->id, $user->fresh()->roles->sole()->id);
        $this->assertSame(['admin', 'super_admin', 'user'], Role::query()->where('is_system', true)->orderBy('name')->pluck('name')->all());
    }

    public function test_presets_are_only_offered_for_explicit_custom_role_edits(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles('super_admin');
        $this->actingAs($owner)->get(route('access.roles.create'))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('rolePresets', 4)->where('rolePresets.2.key', 'technician'));
        $this->get(route('access.roles.edit', $this->customRole()))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('rolePresets', 4));
        foreach (Role::query()->where('is_system', true)->get() as $role) {
            $this->get(route('access.roles.edit', $role))->assertOk()
                ->assertInertia(fn (Assert $page) => $page->where('rolePresets', []));
        }
    }

    public function test_each_preset_creates_an_ordinary_custom_role_with_only_its_explicit_grants(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles('super_admin');
        $this->actingAs($owner)->withSession(['auth.password_confirmed_at' => time()]);
        foreach (config('operational-role-presets') as $preset) {
            $this->post(route('access.roles.store'), [
                'name' => $preset['key'], 'display_name' => $preset['label'], 'permissions' => $preset['permissions'],
            ])->assertRedirect(route('access.roles.index'));
            $role = Role::query()->where('name', $preset['key'])->firstOrFail();
            $this->assertFalse($role->is_system);
            $this->assertEqualsCanonicalizing($preset['permissions'], $role->permissions()->pluck('name')->all());
            $subject = User::factory()->create();
            $subject->syncRoles($role);
            foreach (PermissionKey::operationalValues() as $permission) {
                $this->assertSame(in_array($permission, $preset['permissions'], true), $subject->can($permission), $preset['key'].': '.$permission);
            }
            $this->assertFalse($subject->can('roles.create'));
            $this->assertFalse($subject->can('settings.update'));
            $this->actingAs($subject)->get(route('dashboard'))->assertOk();
            $this->actingAs($owner);
        }
        $role = Role::query()->where('name', 'technician')->firstOrFail();
        $this->patch(route('access.roles.update', $role), [
            'name' => 'technician', 'display_name' => 'Custom technician', 'permissions' => ['assets.view'],
        ])->assertRedirect(route('access.roles.index'));
        $this->assertSame(['assets.view'], $role->permissions()->pluck('name')->all());
    }

    public function test_role_authorization_and_grant_ceiling_reject_operational_privilege_expansion(): void
    {
        $this->get(route('access.roles.create'))->assertRedirect(route('login'));
        $basic = User::factory()->create();
        $custom = $this->customRole();
        $custom->givePermissionTo('dashboard.view');
        $payload = ['name' => 'unauthorized_role', 'display_name' => 'Unauthorized role', 'permissions' => ['assets.view']];
        $this->actingAs($basic)->get(route('access.roles.create'))->assertForbidden();
        $this->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.roles.store'), $payload)->assertForbidden();
        $this->patch(route('access.roles.update', $custom), $payload)->assertForbidden();
        $admin = User::factory()->create();
        $admin->syncRoles('admin');
        $this->actingAs($admin)->post(route('access.roles.store'), $payload)->assertSessionHasErrors('role_id');
        $this->assertDatabaseMissing('roles', ['name' => 'unauthorized_role']);
        $this->patch(route('access.roles.update', $custom), $payload)->assertSessionHasErrors('role_id');
        $this->assertSame('custom_operations', $custom->fresh()->name);
        $this->assertSame(['dashboard.view'], $custom->permissions()->pluck('name')->all());
        foreach (Role::query()->where('is_system', true)->get() as $role) {
            $this->patch(route('access.roles.update', $role), $payload)->assertForbidden();
        }
        $this->assertDatabaseMissing('access_audit_events', ['event' => 'role.created']);
    }

    public function test_unknown_permissions_are_rejected_and_empty_custom_roles_remain_supported(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles('super_admin');
        $this->actingAs($owner)->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.roles.store'), [
                'name' => 'invalid_role', 'display_name' => 'Invalid', 'permissions' => ['assets.manage'],
            ])->assertSessionHasErrors('permissions.0');
        $this->assertDatabaseMissing('roles', ['name' => 'invalid_role']);
        $this->post(route('access.roles.store'), ['name' => 'blank_role', 'display_name' => 'Blank'])
            ->assertRedirect(route('access.roles.index'));
        $this->assertSame(0, Role::query()->where('name', 'blank_role')->firstOrFail()->permissions()->count());
    }

    public function test_custom_role_administrator_can_explicitly_grant_operational_permissions_they_hold(): void
    {
        $actor = User::factory()->create();
        $administrator = $this->customRole();
        $administrator->syncPermissions(['roles.create', 'roles.update', 'assets.view']);
        $actor->syncRoles($administrator);
        $this->actingAs($actor)->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.roles.store'), [
                'name' => 'asset_reader', 'display_name' => 'Asset reader', 'permissions' => ['assets.view'],
            ])->assertRedirect(route('access.roles.index'));
        $role = Role::query()->where('name', 'asset_reader')->firstOrFail();
        $this->assertSame(['assets.view'], $role->permissions()->pluck('name')->all());
        $this->patch(route('access.roles.update', $role), [
            'name' => 'asset_reader', 'display_name' => 'No asset access', 'permissions' => [],
        ])->assertRedirect(route('access.roles.index'));
        $this->assertSame(0, $role->permissions()->count());
    }

    private function customRole(): Role
    {
        return Role::query()->create([
            'name' => 'custom_operations', 'guard_name' => 'web', 'display_name' => 'Custom operations', 'is_system' => false,
        ]);
    }
}
