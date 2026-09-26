<?php

namespace Tests\Feature\Access;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PermissionUpgradeMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_manage_grants_migrate_to_crud_for_custom_roles_and_keep_unrelated_grants(): void
    {
        $customRole = Role::query()->create([
            'name' => 'migration-custom-role',
            'guard_name' => 'web',
            'display_name' => 'Migration Custom Role',
            'description' => 'Migration compatibility test.',
            'is_system' => false,
        ]);
        $customRole->givePermissionTo(
            Permission::findOrCreate('countries.manage', 'web'),
            Permission::findOrCreate('settings.manage_system', 'web'),
            Permission::findOrCreate('visit_logs.view', 'web'),
        );
        $user = User::factory()->create();
        $user->givePermissionTo(
            Permission::findOrCreate('ip_blocks.manage', 'web'),
            Permission::findOrCreate('audit.view', 'web'),
        );

        $migration = require base_path('database/migrations/2026_09_26_000027_replace_manage_permissions_with_resource_actions.php');
        $migration->up();

        $this->assertSame([
            'countries.create',
            'countries.delete',
            'countries.update',
            'organization_locations.create',
            'organization_locations.update',
            'organization_locations.view',
            'settings.update',
            'settings.view',
            'visit_logs.view',
        ], $customRole->permissions()->orderBy('name')->pluck('name')->all());
        $this->assertDatabaseMissing('permissions', ['name' => 'countries.manage', 'guard_name' => 'web']);
        $this->assertDatabaseMissing('permissions', ['name' => 'settings.manage_system', 'guard_name' => 'web']);
        $this->assertSame([
            'audit.view',
            'ip_blocks.create',
            'ip_blocks.delete',
            'ip_blocks.update',
        ], $user->getDirectPermissions()->sortBy('name')->pluck('name')->values()->all());
    }
}
