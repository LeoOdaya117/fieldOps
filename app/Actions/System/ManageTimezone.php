<?php

namespace App\Actions\System;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\Timezone;
use App\Models\User;
use App\Support\SystemSettings;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManageTimezone
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    /** @param array{name: string} $data */
    public function create(array $data, User $actor): Timezone
    {
        return DB::transaction(function () use ($data, $actor): Timezone {
            $timezone = Timezone::query()->create([
                'name' => $data['name'],
                'record_status' => 1,
                'created_by' => $actor->getKey(),
                'updated_by' => $actor->getKey(),
            ]);

            $this->audit->record(
                'timezone.created',
                $actor,
                $timezone,
                null,
                $this->snapshot($timezone),
            );

            return $timezone;
        });
    }

    /** @param array{name: string} $data */
    public function update(Timezone $timezone, array $data, User $actor): void
    {
        DB::transaction(function () use ($timezone, $data, $actor): void {
            $timezone = Timezone::query()->lockForUpdate()->whereKey($timezone->getKey())->firstOrFail();

            if ($timezone->name !== $data['name'] && $timezone->name === SystemSettings::timezone()) {
                throw ValidationException::withMessages([
                    'name' => 'The current system timezone cannot be renamed. Choose another system timezone first.',
                ]);
            }

            $before = $this->snapshot($timezone);
            $timezone->forceFill([
                'name' => $data['name'],
                'updated_by' => $actor->getKey(),
            ])->save();

            $after = $this->snapshot($timezone);

            if ($before !== $after) {
                $this->audit->record('timezone.updated', $actor, $timezone, $before, $after);
            }
        });
    }

    public function delete(Timezone $timezone, User $actor): void
    {
        DB::transaction(function () use ($timezone, $actor): void {
            $timezone = Timezone::query()->lockForUpdate()->whereKey($timezone->getKey())->firstOrFail();
            $this->ensureCanDelete($timezone);
            $before = $this->snapshot($timezone);

            $timezone->forceFill([
                'updated_by' => $actor->getKey(),
            ]);
            $timezone->delete();

            $this->audit->record('timezone.deleted', $actor, $timezone, $before, null);
        });
    }

    private function ensureCanDelete(Timezone $timezone): void
    {
        if ($timezone->name === SystemSettings::timezone()) {
            throw ValidationException::withMessages([
                'name' => 'The current system timezone cannot be deleted. Choose another system timezone first.',
            ]);
        }

        if (Timezone::query()->count() <= 1) {
            throw ValidationException::withMessages([
                'name' => 'At least one timezone must remain available.',
            ]);
        }
    }

    /** @return array{name: string, record_status: int} */
    private function snapshot(Timezone $timezone): array
    {
        return [
            'name' => $timezone->name,
            'record_status' => (int) $timezone->record_status,
        ];
    }
}
