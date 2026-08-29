<?php

namespace App\Actions\Rbac;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BulkDeleteRoles
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    /**
     * @param  Collection<int, Role>  $roles
     */
    public function execute(Collection $roles, User $actor): int
    {
        $deleted = 0;

        DB::transaction(function () use ($roles, $actor, &$deleted): void {
            foreach ($roles as $role) {
                if ($role->users()->exists()) {
                    throw ValidationException::withMessages([
                        'role' => "The role {$role->display_name} cannot be deleted while it is assigned to users.",
                    ]);
                }

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
