<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /** @var list<string> */
    private array $newPermissions = [
        'ip_blocks.create', 'ip_blocks.update', 'ip_blocks.delete',
        'settings.view', 'settings.update',
        'countries.create', 'countries.update', 'countries.delete',
        'timezones.create', 'timezones.update', 'timezones.delete',
        'organization_locations.view', 'organization_locations.create', 'organization_locations.update', 'organization_locations.delete',
        'media_assets.view', 'media_assets.create', 'media_assets.update', 'media_assets.delete',
    ];

    /** @var array<string, list<string>> */
    private array $replacements = [
        'ip_blocks.manage' => ['ip_blocks.create', 'ip_blocks.update', 'ip_blocks.delete'],
        'countries.manage' => ['countries.create', 'countries.update', 'countries.delete'],
        'timezones.manage' => ['timezones.create', 'timezones.update', 'timezones.delete'],
        'settings.manage_system' => [
            'settings.view', 'settings.update',
            'organization_locations.view', 'organization_locations.create', 'organization_locations.update',
        ],
    ];

    public function up(): void
    {
        foreach ($this->newPermissions as $permission) {
            $this->permissionId($permission, create: true);
        }

        foreach ($this->replacements as $oldName => $newNames) {
            $oldId = $this->permissionId($oldName);

            if ($oldId === null) {
                continue;
            }

            foreach ($newNames as $newName) {
                $newId = $this->permissionId($newName, create: true);

                if ($newId === null) {
                    continue;
                }

                $this->copyRoleGrants($oldId, $newId);
                $this->copyModelGrants($oldId, $newId);
            }

            $this->removePermission($oldId);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $reverse = [
            'ip_blocks.manage' => ['ip_blocks.create', 'ip_blocks.update', 'ip_blocks.delete'],
            'countries.manage' => ['countries.create', 'countries.update', 'countries.delete'],
            'timezones.manage' => ['timezones.create', 'timezones.update', 'timezones.delete'],
            'settings.manage_system' => ['settings.view', 'settings.update'],
        ];

        foreach ($reverse as $oldName => $newNames) {
            $oldId = $this->permissionId($oldName, create: true);

            if ($oldId === null) {
                continue;
            }

            foreach ($newNames as $newName) {
                $newId = $this->permissionId($newName);

                if ($newId !== null) {
                    $this->copyRoleGrants($newId, $oldId);
                    $this->copyModelGrants($newId, $oldId);
                }
            }
        }

        foreach ($this->newPermissions as $name) {
            // These resource groups did not exist before this migration; granular permissions
            // that were assigned after deployment are kept and are not removed on rollback.
            if (str_starts_with($name, 'organization_locations.') || str_starts_with($name, 'media_assets.')) {
                continue;
            }

            $id = $this->permissionId($name);

            if ($id !== null) {
                DB::table('role_has_permissions')->where('permission_id', $id)->delete();
                DB::table('model_has_permissions')->where('permission_id', $id)->delete();
                DB::table('permissions')->where('id', $id)->delete();
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function permissionId(string $name, bool $create = false): ?int
    {
        $id = DB::table('permissions')->where('name', $name)->where('guard_name', 'web')->value('id');

        if ($id !== null || ! $create) {
            return $id === null ? null : (int) $id;
        }

        $now = now();

        return (int) DB::table('permissions')->insertGetId([
            'name' => $name,
            'guard_name' => 'web',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function copyRoleGrants(int $fromId, int $toId): void
    {
        $grants = DB::table('role_has_permissions')->where('permission_id', $fromId)->pluck('role_id');

        foreach ($grants as $roleId) {
            DB::table('role_has_permissions')->insertOrIgnore([
                'permission_id' => $toId,
                'role_id' => $roleId,
            ]);
        }
    }

    private function copyModelGrants(int $fromId, int $toId): void
    {
        $grants = DB::table('model_has_permissions')->where('permission_id', $fromId)->get();

        foreach ($grants as $grant) {
            DB::table('model_has_permissions')->insertOrIgnore([
                'permission_id' => $toId,
                'model_type' => $grant->model_type,
                'model_id' => $grant->model_id,
            ]);
        }
    }

    private function removePermission(int $id): void
    {
        DB::table('role_has_permissions')->where('permission_id', $id)->delete();
        DB::table('model_has_permissions')->where('permission_id', $id)->delete();
        DB::table('permissions')->where('id', $id)->delete();
    }
};
