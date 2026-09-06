<?php

namespace Tests\Feature\Settings;

use App\Enums\RoleName;
use App\Models\OrganizationLocation;
use App\Models\User;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OrganizationLocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_bundled_psgc_release_is_idempotent_and_preserves_independent_cities(): void
    {
        $this->seed(PsgcReferenceSeeder::class);
        $this->seed(PsgcReferenceSeeder::class);

        $this->assertDatabaseCount('psgc_regions', 18);
        $this->assertDatabaseCount('psgc_provinces', 82);
        $this->assertDatabaseCount('psgc_localities', 1642);
        $this->assertDatabaseCount('psgc_reference_releases', 1);
        $this->assertDatabaseHas('psgc_localities', [
            'name' => 'City of Manila',
            'province_code' => null,
            'is_independent' => true,
        ]);
    }

    public function test_an_administrator_can_save_a_consistent_address_and_map_independently(): void
    {
        $admin = $this->administrator();
        $this->referenceRows();
        $session = ['auth.password_confirmed_at' => now()->timestamp];

        $this->actingAs($admin)->withSession($session)
            ->patch(route('system-settings.address.update'), [
                'region_code' => '0100000000',
                'province_code' => '0102800000',
                'locality_code' => '0102801000',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('system-settings.address.edit'));

        $this->actingAs($admin)->withSession($session)
            ->patch(route('system-settings.map.update'), [
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ])
            ->assertSessionHasNoErrors();

        $location = OrganizationLocation::query()->sole();
        $this->assertSame('0102801000', $location->locality_code);
        $this->assertSame(14.5995, $location->latitude);
        $this->assertSame(120.9842, $location->longitude);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'settings.address.updated']);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'settings.map.updated']);
    }

    public function test_address_validation_rejects_inconsistent_hierarchies(): void
    {
        $admin = $this->administrator();
        $this->referenceRows();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => now()->timestamp])
            ->patch(route('system-settings.address.update'), [
                'region_code' => '0100000000',
                'province_code' => '0201500000',
                'locality_code' => '0102801000',
            ])
            ->assertSessionHasErrors(['province_code']);

        $this->assertDatabaseCount('organization_locations', 0);
        $this->assertDatabaseCount('access_audit_events', 0);
    }

    public function test_independent_city_and_coordinate_validation_rules_are_enforced(): void
    {
        $admin = $this->administrator();
        $this->referenceRows();
        $session = ['auth.password_confirmed_at' => now()->timestamp];

        $this->actingAs($admin)->withSession($session)
            ->patch(route('system-settings.address.update'), [
                'region_code' => '1300000000',
                'province_code' => null,
                'locality_code' => '1339000000',
            ])
            ->assertSessionHasNoErrors();

        $this->actingAs($admin)->withSession($session)
            ->patch(route('system-settings.map.update'), ['latitude' => 91, 'longitude' => null])
            ->assertSessionHasErrors(['latitude']);

        $this->actingAs($admin)->withSession($session)
            ->patch(route('system-settings.map.update'), ['latitude' => null, 'longitude' => null])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('organization_locations', [
            'province_code' => null,
            'locality_code' => '1339000000',
            'latitude' => null,
            'longitude' => null,
        ]);
    }

    private function administrator(): User
    {
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Administrator->value);

        return $admin;
    }

    private function referenceRows(): void
    {
        DB::table('psgc_regions')->insert([
            ['code' => '0100000000', 'name' => 'Ilocos Region'],
            ['code' => '0200000000', 'name' => 'Cagayan Valley'],
            ['code' => '1300000000', 'name' => 'National Capital Region'],
        ]);
        DB::table('psgc_provinces')->insert([
            ['code' => '0102800000', 'region_code' => '0100000000', 'name' => 'Ilocos Norte'],
            ['code' => '0201500000', 'region_code' => '0200000000', 'name' => 'Cagayan'],
        ]);
        DB::table('psgc_localities')->insert([
            ['code' => '0102801000', 'region_code' => '0100000000', 'province_code' => '0102800000', 'name' => 'Adams', 'type' => 'municipality', 'is_independent' => false],
            ['code' => '1339000000', 'region_code' => '1300000000', 'province_code' => null, 'name' => 'City of Manila', 'type' => 'city', 'is_independent' => true],
        ]);
    }
}
