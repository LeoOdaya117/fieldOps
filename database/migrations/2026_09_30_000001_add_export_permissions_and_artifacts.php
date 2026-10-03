<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /** @var list<string> */
    private array $namespaces = [
        'users', 'roles', 'audit', 'ip_blocks', 'visit_logs', 'files', 'media_assets', 'countries', 'timezones',
    ];

    /** @return list<string> */
    private function permissions(): array
    {
        $permissions = [];
        foreach ($this->namespaces as $namespace) {
            foreach (['pdf', 'csv', 'xlsx', 'print'] as $format) {
                $permissions[] = $namespace.'.export_'.$format;
            }
        }

        return $permissions;
    }

    public function up(): void
    {
        Schema::create('export_artifacts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('dataset', 32);
            $table->string('format', 12);
            $table->string('status', 20)->index();
            $table->json('filters');
            $table->string('disk', 32)->default('local');
            $table->string('path')->nullable();
            $table->unsignedInteger('row_count')->nullable();
            $table->text('failure_message')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamps();
            $table->index(['owner_id', 'expires_at']);
        });

        $now = now();
        $roleIds = DB::table('roles')
            ->whereIn('name', ['admin', 'super_admin'])
            ->where('guard_name', 'web')
            ->pluck('id');

        foreach ($this->permissions() as $name) {
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

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $permissionIds = DB::table('permissions')
            ->whereIn('name', $this->permissions())
            ->where('guard_name', 'web')
            ->pluck('id');

        DB::table('role_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('model_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
        Schema::dropIfExists('export_artifacts');
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
