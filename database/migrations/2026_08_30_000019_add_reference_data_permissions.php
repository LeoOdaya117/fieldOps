<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add the catalog permissions for existing installations as well as fresh seeds.
     */
    public function up(): void
    {
        $now = now();
        $permissions = [
            'countries.view',
            'countries.manage',
            'timezones.view',
            'timezones.manage',
        ];
        $roleIds = DB::table('roles')
            ->whereIn('name', ['admin', 'administrator'])
            ->where('guard_name', 'web')
            ->pluck('id');

        foreach ($permissions as $name) {
            $permissionId = DB::table('permissions')
                ->where('name', $name)
                ->where('guard_name', 'web')
                ->value('id');

            if ($permissionId === null) {
                $permissionId = DB::table('permissions')->insertGetId([
                    'name' => $name,
                    'guard_name' => 'web',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ($roleIds as $roleId) {
                DB::table('role_has_permissions')->insertOrIgnore([
                    'permission_id' => $permissionId,
                    'role_id' => $roleId,
                ]);
            }
        }
    }

    public function down(): void
    {
        $permissionIds = DB::table('permissions')
            ->whereIn('name', [
                'countries.view',
                'countries.manage',
                'timezones.view',
                'timezones.manage',
            ])
            ->where('guard_name', 'web')
            ->pluck('id');

        if ($permissionIds->isEmpty()) {
            return;
        }

        DB::table('role_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
    }
};
