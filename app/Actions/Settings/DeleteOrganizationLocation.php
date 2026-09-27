<?php

namespace App\Actions\Settings;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\OrganizationLocation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeleteOrganizationLocation
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function execute(int $id, User $actor): void
    {
        DB::transaction(function () use ($id, $actor): void {
            $location = OrganizationLocation::query()->lockForUpdate()->findOrFail($id);
            $before = [
                'record_status' => (int) $location->record_status,
                'region_code' => $location->region_code,
                'province_code' => $location->province_code,
                'locality_code' => $location->locality_code,
                'latitude' => $location->latitude,
                'longitude' => $location->longitude,
            ];

            $location->forceFill([
                'record_status' => 0,
                'updated_by' => $actor->getKey(),
            ])->saveQuietly();

            $this->audit->record(
                event: 'organization_location.deleted',
                actor: $actor,
                subject: $location,
                before: $before,
                after: ['record_status' => 0],
            );
        });
    }
}
