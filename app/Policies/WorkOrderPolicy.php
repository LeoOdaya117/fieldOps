<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrder;

class WorkOrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('work_orders.view');
    }

    public function view(User $user, WorkOrder $workOrder): bool
    {
        return $user->can('work_orders.view');
    }

    public function create(User $user): bool
    {
        return $user->can('work_orders.create');
    }

    public function update(User $user, WorkOrder $workOrder): bool
    {
        return $user->can('work_orders.update');
    }
}
