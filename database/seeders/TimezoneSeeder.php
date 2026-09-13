<?php

namespace Database\Seeders;

use App\Models\Timezone;
use DateTimeZone;
use Illuminate\Database\Seeder;

class TimezoneSeeder extends Seeder
{
    public function run(): void
    {
        foreach (DateTimeZone::listIdentifiers() as $name) {
            Timezone::withTrashed()->firstOrCreate(
                ['name' => $name],
                [
                    'record_status' => 1,
                ],
            );
        }
    }
}
