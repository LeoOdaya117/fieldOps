<?php

namespace App\Policies;

use App\Models\User;
use App\Models\VisitLog;

class VisitLogPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('visit_logs.view');
    }

    public function view(User $user, VisitLog $log): bool
    {
        return $user->can('visit_logs.view');
    }
}
