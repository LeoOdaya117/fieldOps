<?php

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;

class CountrySeeder extends Seeder
{
    public function run(): void
    {
        /** @var array<string, string> $countries */
        $countries = require database_path('data/countries.php');

        foreach ($countries as $code => $name) {
            Country::withTrashed()->firstOrCreate(
                ['code' => $code],
                [
                    'name' => $name,
                    'record_status' => 1,
                ],
            );
        }
    }
}
