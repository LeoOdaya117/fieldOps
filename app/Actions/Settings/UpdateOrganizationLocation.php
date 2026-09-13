<?php

namespace App\Actions\Settings;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\OrganizationLocation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UpdateOrganizationLocation
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    /** @param array{region_code:string,province_code:?string,locality_code:string} $data */
    public function address(array $data, User $actor): OrganizationLocation
    {
        return DB::transaction(function () use ($data, $actor): OrganizationLocation {
            $location = $this->primary($actor);
            $before = $location->only(['region_code', 'province_code', 'locality_code']);

            $location->fill($data);
            $location->updated_by = $actor->getKey();
            $location->save();

            $this->audit->record(
                event: 'settings.address.updated',
                actor: $actor,
                subject: $location,
                before: $before,
                after: $location->only(['region_code', 'province_code', 'locality_code']),
            );

            return $location;
        });
    }

    /** @param array{latitude:?float,longitude:?float} $data */
    public function map(array $data, User $actor): OrganizationLocation
    {
        return DB::transaction(function () use ($data, $actor): OrganizationLocation {
            $location = $this->primary($actor);
            $before = $location->only(['latitude', 'longitude']);

            $location->fill($data);
            $location->updated_by = $actor->getKey();
            $location->save();

            $this->audit->record(
                event: 'settings.map.updated',
                actor: $actor,
                subject: $location,
                before: $before,
                after: $location->only(['latitude', 'longitude']),
            );

            return $location;
        });
    }

    private function primary(User $actor): OrganizationLocation
    {
        return OrganizationLocation::query()->firstOrCreate(
            ['scope' => OrganizationLocation::PRIMARY_SCOPE],
            [
                'created_by' => $actor->getKey(),
                'updated_by' => $actor->getKey(),
            ],
        );
    }
}
