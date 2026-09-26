<?php

namespace App\Actions\Rbac;

use App\Models\Role;
use App\Models\UserInvitation;
use Illuminate\Validation\ValidationException;

class AssertRoleCanBeRemoved
{
    public function execute(Role $role, string $errorField, string $operation): void
    {
        if ($role->users()->withoutGlobalScope('record_status')->exists()) {
            throw ValidationException::withMessages([
                $errorField => "A role cannot be {$operation} while it is assigned to users.",
            ]);
        }

        $hasInvitations = UserInvitation::query()
            ->withoutGlobalScope('record_status')
            ->where('role_id', $role->getKey())
            ->whereNull('accepted_at')
            ->whereNull('revoked_at')
            ->exists();

        if ($hasInvitations) {
            throw ValidationException::withMessages([
                $errorField => "A role cannot be {$operation} while it is assigned to an invitation.",
            ]);
        }
    }
}
