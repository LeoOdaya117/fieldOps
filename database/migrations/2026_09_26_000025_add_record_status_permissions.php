<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** @var list<string> */
    private array $permissions = [
        'users.view_deleted', 'users.update_deleted',
        'roles.view_deleted', 'roles.update_deleted',
        'countries.view_deleted', 'countries.update_deleted',
        'timezones.view_deleted', 'timezones.update_deleted',
        'ip_blocks.view_deleted', 'ip_blocks.update_deleted',
        'organization_locations.view_deleted', 'organization_locations.update_deleted',
        'media_assets.view_deleted', 'media_assets.update_deleted',
    ];

    public function up(): void
    {
        $now = now();
        $roleIds = DB::table('roles')->whereIn('name', ['admin', 'super_admin'])->where('guard_name', 'web')->pluck('id');

        foreach ($this->permissions as $name) {
            $permissionId = DB::table('permissions')->where('name', $name)->where('guard_name', 'web')->value('id');

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
        $permissionIds = DB::table('permissions')->whereIn('name', $this->permissions)->where('guard_name', 'web')->pluck('id');

        DB::table('role_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
    }
};
