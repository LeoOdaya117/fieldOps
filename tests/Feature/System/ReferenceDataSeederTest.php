<?php

namespace Tests\Feature\System;

use App\Models\Country;
use App\Models\Timezone;
use Database\Seeders\CountrySeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\TimezoneSeeder;
use DateTimeZone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ReferenceDataSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_loads_the_complete_country_and_timezone_catalogs(): void
    {
        $this->seed(DatabaseSeeder::class);

        /** @var array<string, string> $countryData */
        $countryData = require database_path('data/countries.php');

        $this->assertFalse(Schema::hasColumn('countries', 'status'));
        $this->assertFalse(Schema::hasColumn('timezones', 'status'));
        $this->assertDatabaseCount('countries', count($countryData));
        $this->assertDatabaseHas('countries', [
            'code' => 'PH',
            'name' => 'Philippines',
            'record_status' => 1,
            'created_by' => null,
            'updated_by' => null,
        ]);

        $this->assertDatabaseCount('timezones', count(DateTimeZone::listIdentifiers()));
        $this->assertDatabaseHas('timezones', [
            'name' => 'Asia/Manila',
            'record_status' => 1,
            'created_by' => null,
            'updated_by' => null,
        ]);
    }

    public function test_reference_seeders_are_idempotent_and_preserve_existing_values(): void
    {
        $this->seed([
            CountrySeeder::class,
            TimezoneSeeder::class,
        ]);

        $country = Country::query()->where('code', 'PH')->firstOrFail();
        $country->forceFill([
            'name' => 'Custom Philippines',
        ])->save();
        $country->delete();

        $timezone = Timezone::query()->where('name', 'UTC')->firstOrFail();
        $timezone->delete();

        $this->seed([
            CountrySeeder::class,
            TimezoneSeeder::class,
        ]);

        /** @var array<string, string> $countryData */
        $countryData = require database_path('data/countries.php');

        $this->assertDatabaseCount('countries', count($countryData));
        $this->assertDatabaseCount('timezones', count(DateTimeZone::listIdentifiers()));
        $this->assertDatabaseHas('countries', [
            'id' => $country->id,
            'code' => 'PH',
            'name' => 'Custom Philippines',
            'record_status' => 0,
        ]);
        $this->assertDatabaseHas('timezones', [
            'id' => $timezone->id,
            'name' => 'UTC',
            'record_status' => 0,
        ]);
    }
}
