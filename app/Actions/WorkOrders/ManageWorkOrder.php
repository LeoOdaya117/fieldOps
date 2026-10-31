<?php

namespace App\Actions\WorkOrders;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\Asset;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManageWorkOrder
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    /** @param array{reference: string, title: string, instructions: string|null, priority: string, due_date: string, asset_id: int|null, location_label: string|null, latitude: float|null, longitude: float|null} $data */
    public function create(array $data, User $actor): WorkOrder
    {
        try {
            return DB::transaction(function () use ($data, $actor): WorkOrder {
                $location = $this->location($data, null, $actor);
                $workOrder = WorkOrder::query()->create([
                    ...$data,
                    ...$location,
                    'reference' => strtoupper(trim((string) $data['reference'])),
                    'status' => 'open',
                    'record_status' => 1,
                    'created_by' => $actor->getKey(),
                    'updated_by' => $actor->getKey(),
                ]);
                $this->audit->record('work_order.created', $actor, $workOrder, null, [...$this->snapshot($workOrder), '_actor' => $this->actorSnapshot($actor)]);

                return $workOrder;
            });
        } catch (QueryException $exception) {
            if (! $this->isUniqueViolation($exception)) {
                throw $exception;
            }

            throw ValidationException::withMessages(['reference' => 'This work-order reference is already in use.']);
        }
    }

    /** @param array{version: int, title: string, instructions: string|null, priority: string, due_date: string, asset_id: int|null, location_label: string|null, latitude: float|null, longitude: float|null} $data */
    public function update(int $id, array $data, User $actor): WorkOrder
    {
        return DB::transaction(function () use ($id, $data, $actor): WorkOrder {
            $workOrder = WorkOrder::withTrashed()->lockForUpdate()->findOrFail($id);
            $this->assertEditable($workOrder);
            $this->assertVersion($workOrder, $data['version']);
            $before = $this->snapshot($workOrder);
            $location = $this->location($data, $workOrder, $actor);
            $instructionsChanged = $workOrder->instructions !== $data['instructions'];
            if ($workOrder->title === $data['title']
                && ! $instructionsChanged
                && $workOrder->priority === $data['priority']
                && $workOrder->due_date->toDateString() === $data['due_date']
                && $workOrder->asset_id === $location['asset_id']
                && $workOrder->asset_code_snapshot === $location['asset_code_snapshot']
                && $workOrder->asset_name_snapshot === $location['asset_name_snapshot']
                && $workOrder->location_label === $location['location_label']
                && $workOrder->latitude === $location['latitude']
                && $workOrder->longitude === $location['longitude']) {
                return $workOrder;
            }

            $workOrder->forceFill([
                'title' => $data['title'],
                'instructions' => $data['instructions'],
                'priority' => $data['priority'],
                'due_date' => $data['due_date'],
                'asset_id' => $location['asset_id'],
                'asset_code_snapshot' => $location['asset_code_snapshot'],
                'asset_name_snapshot' => $location['asset_name_snapshot'],
                'location_label' => $location['location_label'],
                'latitude' => $location['latitude'],
                'longitude' => $location['longitude'],
                'updated_by' => $actor->getKey(),
                'version' => (int) $workOrder->version + 1,
            ])->save();
            $after = $this->snapshot($workOrder);

            if ($instructionsChanged) {
                $after['instructions_changed'] = true;
            }

            $this->audit->record('work_order.updated', $actor, $workOrder, $before, [...$after, '_actor' => $this->actorSnapshot($actor)]);

            return $workOrder;
        });
    }

    /** @param array{reference?: string, title: string, instructions: string|null, priority: string, due_date: string, asset_id: int|null, location_label: string|null, latitude: float|null, longitude: float|null} $data
     * @return array{asset_id: int|null, asset_code_snapshot: string|null, asset_name_snapshot: string|null, location_label: string|null, latitude: float, longitude: float}
     */
    private function location(array $data, ?WorkOrder $current, User $actor): array
    {
        $assetId = $data['asset_id'];
        if ($assetId === null) {
            if ($data['latitude'] === null || $data['longitude'] === null || $data['location_label'] === null || $data['location_label'] === '') {
                throw ValidationException::withMessages(['location_label' => 'Enter a standalone location label and coordinates.']);
            }

            return [
                'asset_id' => null,
                'asset_code_snapshot' => null,
                'asset_name_snapshot' => null,
                'location_label' => $data['location_label'],
                'latitude' => $data['latitude'],
                'longitude' => $data['longitude'],
            ];
        }

        if ($current !== null && (int) $current->asset_id === $assetId) {
            return [
                'asset_id' => $current->asset_id,
                'asset_code_snapshot' => $current->asset_code_snapshot,
                'asset_name_snapshot' => $current->asset_name_snapshot,
                'location_label' => null,
                'latitude' => (float) $current->latitude,
                'longitude' => (float) $current->longitude,
            ];
        }

        if (! $actor->can('assets.view')) {
            throw new AuthorizationException;
        }

        $asset = Asset::query()->lockForUpdate()->find($assetId);
        if (! $asset instanceof Asset) {
            throw ValidationException::withMessages(['asset_id' => 'Select an active asset.']);
        }

        $latitude = $asset->latitude ?? $data['latitude'];
        $longitude = $asset->longitude ?? $data['longitude'];
        if ($latitude === null || $longitude === null) {
            throw ValidationException::withMessages(['latitude' => 'Enter coordinates because this asset has no saved location.', 'longitude' => 'Enter coordinates because this asset has no saved location.']);
        }

        return [
            'asset_id' => (int) $asset->getKey(),
            'asset_code_snapshot' => $asset->code,
            'asset_name_snapshot' => $asset->name,
            'location_label' => null,
            'latitude' => (float) $latitude,
            'longitude' => (float) $longitude,
        ];
    }

    private function assertEditable(WorkOrder $workOrder): void
    {
        if ((int) $workOrder->record_status !== 1) {
            throw new AuthorizationException;
        }

        if ($workOrder->status !== 'open') {
            throw ValidationException::withMessages(['status' => 'Only open work orders can be edited.']);
        }
    }

    private function assertVersion(WorkOrder $workOrder, int $expectedVersion): void
    {
        if ((int) $workOrder->version !== $expectedVersion) {
            throw ValidationException::withMessages(['version' => 'This work order changed while you were editing it. Reload and try again.']);
        }
    }

    private function isUniqueViolation(QueryException $exception): bool
    {
        return str_contains(strtolower($exception->getMessage()), 'work_orders_reference_unique')
            || str_contains(strtolower($exception->getMessage()), 'unique constraint failed: work_orders.reference');
    }

    /** @return array{name: string, email: string} */
    private function actorSnapshot(User $actor): array
    {
        return ['name' => (string) $actor->name, 'email' => (string) $actor->email];
    }

    /** @return array<string, mixed> */
    private function snapshot(WorkOrder $workOrder): array
    {
        return [
            'reference' => $workOrder->reference,
            'title' => $workOrder->title,
            'priority' => $workOrder->priority,
            'due_date' => $workOrder->due_date->toDateString(),
            'asset_id' => $workOrder->asset_id,
            'asset_code' => $workOrder->asset_code_snapshot,
            'asset_name' => $workOrder->asset_name_snapshot,
            'location_label' => $workOrder->location_label,
            'latitude' => $workOrder->latitude,
            'longitude' => $workOrder->longitude,
            'status' => $workOrder->status,
            'record_status' => (int) $workOrder->record_status,
        ];
    }
}
