<?php

namespace App\Actions\Settings;

use App\Models\SystemSetting;
use App\Models\User;
use App\Support\SystemSettings;
use Illuminate\Support\Facades\DB;

class UpdateSystemSettings
{
    /**
     * @param  array{name: string, timezone: string, pagination_size: int}  $data
     */
    public function execute(array $data, User $actor): void
    {
        DB::transaction(function () use ($data, $actor): void {
            foreach ([
                SystemSettings::NAME => $data['name'],
                SystemSettings::TIMEZONE => $data['timezone'],
                SystemSettings::PAGINATION_SIZE => (string) $data['pagination_size'],
            ] as $key => $value) {
                SystemSetting::query()->updateOrCreate(
                    ['key' => $key],
                    [
                        'value' => (string) $value,
                        'updated_by' => $actor->getKey(),
                    ],
                );
            }
        });
    }
}
