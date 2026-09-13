<?php

namespace App\Actions\System;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\Country;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ManageCountry
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    /** @param array{code: string, name: string} $data */
    public function create(array $data, User $actor): Country
    {
        return DB::transaction(function () use ($data, $actor): Country {
            $country = Country::query()->create([
                'code' => $data['code'],
                'name' => $data['name'],
                'record_status' => 1,
                'created_by' => $actor->getKey(),
                'updated_by' => $actor->getKey(),
            ]);

            $this->audit->record(
                'country.created',
                $actor,
                $country,
                null,
                $this->snapshot($country),
            );

            return $country;
        });
    }

    /** @param array{code: string, name: string} $data */
    public function update(Country $country, array $data, User $actor): void
    {
        DB::transaction(function () use ($country, $data, $actor): void {
            $country = Country::query()->lockForUpdate()->whereKey($country->getKey())->firstOrFail();
            $before = $this->snapshot($country);

            $country->forceFill([
                'code' => $data['code'],
                'name' => $data['name'],
                'updated_by' => $actor->getKey(),
            ])->save();

            $after = $this->snapshot($country);

            if ($before !== $after) {
                $this->audit->record('country.updated', $actor, $country, $before, $after);
            }
        });
    }

    public function delete(Country $country, User $actor): void
    {
        DB::transaction(function () use ($country, $actor): void {
            $country = Country::query()->lockForUpdate()->whereKey($country->getKey())->firstOrFail();
            $before = $this->snapshot($country);

            $country->forceFill([
                'updated_by' => $actor->getKey(),
            ]);
            $country->delete();

            $this->audit->record('country.deleted', $actor, $country, $before, null);
        });
    }

    /** @return array{code: string, name: string, record_status: int} */
    private function snapshot(Country $country): array
    {
        return [
            'code' => $country->code,
            'name' => $country->name,
            'record_status' => (int) $country->record_status,
        ];
    }
}
