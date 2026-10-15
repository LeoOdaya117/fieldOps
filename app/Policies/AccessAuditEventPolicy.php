<?php

namespace App\Policies;

use App\Models\AccessAuditEvent;
use App\Models\User;

class AccessAuditEventPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('audit.view');
    }

    public function view(User $user, AccessAuditEvent $event): bool
    {
        return $user->can('audit.view');
    }
}
