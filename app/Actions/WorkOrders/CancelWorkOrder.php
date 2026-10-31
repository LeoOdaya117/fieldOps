<?php

namespace App\Actions\WorkOrders;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelWorkOrder
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function execute(int $id, int $expectedVersion, User $actor): void
    {
        DB::transaction(function () use ($id, $expectedVersion, $actor): void {
            $workOrder = WorkOrder::withTrashed()->lockForUpdate()->findOrFail($id);
            if ((int) $workOrder->record_status !== 1) {
                throw new AuthorizationException;
            }
            if ((int) $workOrder->version !== $expectedVersion) {
                throw ValidationException::withMessages(['version' => 'This work order changed before it could be cancelled. Reload and try again.']);
            }
            if ($workOrder->status !== 'open') {
                throw ValidationException::withMessages(['status' => 'Only open work orders can be cancelled.']);
            }

            $before = ['status' => $workOrder->status, 'version' => (int) $workOrder->version];
            $workOrder->forceFill([
                'status' => 'cancelled',
                'updated_by' => $actor->getKey(),
                'version' => (int) $workOrder->version + 1,
            ])->save();
            $this->audit->record('work_order.cancelled', $actor, $workOrder, $before, [
                'status' => 'cancelled',
                'version' => (int) $workOrder->version,
                '_actor' => ['name' => (string) $actor->name, 'email' => (string) $actor->email],
            ]);
        });
    }
}
