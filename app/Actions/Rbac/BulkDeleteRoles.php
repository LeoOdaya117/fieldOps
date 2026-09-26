<?php

namespace App\Actions\Rbac;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class BulkDeleteRoles
{
    public function __construct(
        private readonly RecordAccessAudit $audit,
        private readonly AssertRoleCanBeRemoved $assertRoleCanBeRemoved,
    ) {}

    /**
     * @param  Collection<int, Role>  $roles
     */
    public function execute(Collection $roles, User $actor): int
    {
        $deleted = 0;

        DB::transaction(function () use ($roles, $actor, &$deleted): void {
            foreach ($roles as $role) {
                $this->assertRoleCanBeRemoved->execute($role, 'role', 'deleted');

                $before = [
                    'name' => $role->name,
                    'display_name' => $role->display_name,
                ];
                $role->delete();
                $this->audit->record('role.deleted', $actor, null, $before, null);
                $deleted++;
            }
        });

        return $deleted;
    }
}
