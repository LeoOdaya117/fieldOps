<?php

namespace Database\Seeders;

use App\Enums\PermissionKey;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        $permissionModels = [];

        foreach (PermissionKey::cases() as $permission) {
            $permissionModels[$permission->value] = Permission::findOrCreate($permission->value, 'web');
        }

        foreach (config('rbac.roles', []) as $name => $definition) {
            $role = Role::withTrashed()->firstOrNew([
                'name' => $name,
                'guard_name' => 'web',
            ]);
            $role->record_status = 1;
            $role->display_name = $definition['display_name'];
            $role->description = $definition['description'];
            $role->is_system = $definition['is_system'];
            $role->save();

            $role->syncPermissions(array_map(
                static fn (string $permission): object => $permissionModels[$permission],
                $definition['permissions'],
            ));
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
