<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /** @return list<string> */
    private function permissions(): array
    {
        $permissions = [];

        foreach (['assets', 'work_orders', 'inspection_templates', 'inspections', 'issues'] as $resource) {
            foreach (['view', 'create', 'update', 'delete', 'view_deleted', 'update_deleted', 'export_pdf', 'export_csv', 'export_xlsx', 'export_print'] as $action) {
                $permissions[] = $resource.'.'.$action;
            }
        }

        return [...$permissions,
            'work_orders.assign', 'inspections.submit', 'inspections.review', 'issues.resolve',
            'operations_map.view', 'operations_dashboard.view', 'operational_reports.view',
            'operational_reports.export_pdf', 'operational_reports.export_csv',
            'operational_reports.export_xlsx', 'operational_reports.export_print',
        ];
    }

    public function up(): void
    {
        foreach ($this->permissions() as $permission) {
            DB::table('permissions')->insertOrIgnore([
                'name' => $permission,
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $ids = DB::table('permissions')->where('guard_name', 'web')->whereIn('name', $this->permissions())->pluck('id');
        DB::table('role_has_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('model_has_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('id', $ids)->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
