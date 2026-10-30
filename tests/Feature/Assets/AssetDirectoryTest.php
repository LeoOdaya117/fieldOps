<?php

namespace Tests\Feature\Assets;

use App\Models\Asset;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\Fluent\AssertableJson as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AssetDirectoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_unauthenticated_requests_are_redirected_to_login(): void
    {
        $asset = $this->asset('PUMP-01');

        $this->get(route('assets.index'))->assertRedirect(route('login'));
        $this->get(route('assets.create'))->assertRedirect(route('login'));
        $this->post(route('assets.store'), [])->assertRedirect(route('login'));
        $this->get(route('assets.show', $asset))->assertRedirect(route('login'));
        $this->get(route('assets.edit', $asset))->assertRedirect(route('login'));
        $this->patch(route('assets.update', $asset), [])->assertRedirect(route('login'));
        $this->patch(route('assets.record-status', $asset), ['record_status' => 0])->assertRedirect(route('login'));
    }

    public function test_view_permission_allows_directory_detail_but_not_create_or_update(): void
    {
        $reader = $this->userWith('assets.view');
        $asset = $this->asset('PUMP-01');

        $this->actingAs($reader)->get(route('assets.index'))->assertOk();
        $this->get(route('assets.show', $asset))->assertOk();
        $this->get(route('assets.create'))->assertForbidden();
        $this->post(route('assets.store'), $this->payload())->assertForbidden();
        $this->get(route('assets.edit', $asset))->assertForbidden();
        $this->patch(route('assets.update', $asset), $this->payload())->assertForbidden();
        $this->assertSame('PUMP-01', $asset->fresh()->code);

        $noView = User::factory()->create();
        $this->actingAs($noView)->get(route('assets.index'))->assertForbidden();
        $this->get(route('assets.show', $asset))->assertForbidden();
    }

    public function test_asset_can_be_created_and_updated_with_normalized_code_and_audit_actors(): void
    {
        $manager = $this->userWith('assets.view', 'assets.create', 'assets.update');

        $this->actingAs($manager)->post(route('assets.store'), $this->payload([
            'code' => '  pump-01 ',
            'name' => '  North Pump  ',
            'category' => '  Pump  ',
            'condition' => 'needs_maintenance',
            'latitude' => '14.5995',
            'longitude' => '120.9842',
        ]))->assertRedirect();

        $asset = Asset::query()->where('code', 'PUMP-01')->firstOrFail();
        $this->assertSame('North Pump', $asset->name);
        $this->assertSame('Pump', $asset->category);
        $this->assertSame('needs_maintenance', $asset->condition);
        $this->assertSame((int) $manager->id, $asset->created_by);
        $this->assertSame((int) $manager->id, $asset->updated_by);
        $this->assertDatabaseHas('access_audit_events', [
            'event' => 'asset.created',
            'actor_user_id' => $manager->id,
            'subject_id' => (string) $asset->id,
        ]);

        $this->patch(route('assets.update', $asset), $this->payload([
            'code' => 'PUMP-01',
            'name' => 'North Pump Updated',
        ]))->assertRedirect(route('assets.show', $asset));
        $this->assertSame('North Pump Updated', $asset->fresh()->name);
        $this->assertDatabaseHas('access_audit_events', [
            'event' => 'asset.updated',
            'actor_user_id' => $manager->id,
            'subject_id' => (string) $asset->id,
        ]);
    }

    public function test_code_is_unique_normalized_and_update_allows_its_existing_code(): void
    {
        $manager = $this->userWith('assets.create', 'assets.update');
        $asset = $this->asset('PUMP-01');

        $this->actingAs($manager)->post(route('assets.store'), $this->payload(['code' => ' pump-01 ']))
            ->assertSessionHasErrors('code');
        $this->patch(route('assets.update', $asset), $this->payload(['code' => ' pump-01 ']))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $asset->delete();
        $this->post(route('assets.store'), $this->payload(['code' => 'PUMP-01']))
            ->assertSessionHasErrors('code');
        $this->assertSame(1, Asset::withTrashed()->where('code', 'PUMP-01')->count());
    }

    public function test_code_length_and_name_length_are_bounded(): void
    {
        $manager = $this->userWith('assets.create');
        $this->actingAs($manager)->post(route('assets.store'), $this->payload([
            'code' => str_repeat('A', 33),
            'name' => str_repeat('N', 161),
        ]))->assertSessionHasErrors(['code', 'name']);

        $this->assertSame(0, Asset::query()->count());
    }

    public function test_database_unique_index_rejects_duplicate_asset_code_without_request_validation(): void
    {
        $this->asset('PUMP-01');

        try {
            DB::table('assets')->insert([
                'code' => 'PUMP-01',
                'name' => 'Duplicate pump',
                'category' => 'Equipment',
                'condition' => 'operational',
                'latitude' => null,
                'longitude' => null,
                'record_status' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->fail('The database must reject a duplicate asset code.');
        } catch (QueryException) {
            $this->assertSame(1, Asset::query()->where('code', 'PUMP-01')->count());
        }
    }

    public function test_validation_rejects_invalid_condition_category_and_unpaired_or_out_of_range_coordinates(): void
    {
        $manager = $this->userWith('assets.create');
        $this->actingAs($manager)->post(route('assets.store'), $this->payload([
            'condition' => 'broken',
            'category' => str_repeat('x', 81),
            'latitude' => '91',
            'longitude' => null,
        ]))->assertSessionHasErrors(['category', 'condition', 'latitude', 'longitude', 'coordinates']);

        $this->post(route('assets.store'), $this->payload([
            'latitude' => null,
            'longitude' => '181',
        ]))->assertSessionHasErrors(['latitude', 'longitude', 'coordinates']);

        $this->assertSame(0, Asset::query()->count());
    }

    public function test_listing_search_filter_sort_and_page_size_are_bounded(): void
    {
        $reader = $this->userWith('assets.view');
        $this->asset('PUMP-01', ['name' => 'North Pump', 'category' => 'Pump', 'condition' => 'operational']);
        $this->asset('VALVE-01', ['name' => 'South Valve', 'category' => 'Valve', 'condition' => 'out_of_service']);

        $this->actingAs($reader)->get(route('assets.index', [
            'search' => 'North',
            'category' => 'Pump',
            'condition' => 'operational',
            'sort' => 'code',
            'direction' => 'desc',
            'per_page' => 1000,
        ]))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('filters.search', 'North')
            ->where('filters.category', 'Pump')
            ->where('filters.condition', 'operational')
            ->where('assets.per_page', 50)
            ->has('assets.data', 1, fn (Assert $row) => $row
                ->where('code', 'PUMP-01')
                ->where('recordStatus', 1)
                ->has('recordStatusUrl')
                ->etc())
            ->etc());
    }

    public function test_inactive_assets_require_view_deleted_and_status_permission_and_keep_code_reserved(): void
    {
        $manager = $this->userWith('assets.view', 'assets.create', 'assets.update_deleted');
        $asset = $this->asset('PUMP-01');

        $this->actingAs($manager)->patch(route('assets.record-status', $asset), ['record_status' => 0])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->assertSame(0, Asset::withTrashed()->findOrFail($asset->id)->record_status);
        $this->assertSame((int) $manager->id, Asset::withTrashed()->findOrFail($asset->id)->updated_by);
        $this->assertDatabaseHas('access_audit_events', [
            'event' => 'asset.deactivated',
            'actor_user_id' => $manager->id,
            'subject_id' => (string) $asset->id,
        ]);

        $manager->revokePermissionTo('assets.view_deleted');
        $this->get(route('assets.index', ['record_status' => 'inactive']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('canViewDeleted', false)
            ->where('filters.recordStatus', 'active')
            ->has('assets.data', 0)
            ->etc());
        $this->get(route('assets.index', ['record_status' => ['inactive']]))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('filters.recordStatus', 'active')
            ->has('assets.data', 0)
            ->etc());
        $this->get(route('assets.show', $asset->id))->assertNotFound();

        $manager->givePermissionTo(Permission::findOrCreate('assets.view_deleted', 'web'));
        $this->get(route('assets.index', ['record_status' => 'inactive']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('filters.recordStatus', 'inactive')
            ->has('assets.data', 1)
            ->etc());
        $this->get(route('assets.index', ['record_status' => ['inactive']]))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('filters.recordStatus', 'inactive')
            ->has('assets.data', 1)
            ->etc());
        $this->get(route('assets.show', $asset->id))->assertOk();

        $manager->revokePermissionTo('assets.update_deleted');
        $this->patch(route('assets.record-status', $asset), ['record_status' => 1])->assertForbidden();
        $manager->givePermissionTo(Permission::findOrCreate('assets.update_deleted', 'web'));
        $this->patch(route('assets.record-status', $asset), ['record_status' => 2])->assertSessionHasErrors('record_status');
        $this->assertSame(0, Asset::withTrashed()->findOrFail($asset->id)->record_status);
        $this->post(route('assets.store'), $this->payload(['code' => 'PUMP-01']))->assertSessionHasErrors('code');
    }

    /** @param array<string, mixed> $overrides */
    private function asset(string $code, array $overrides = []): Asset
    {
        return Asset::query()->create([
            'code' => $code,
            'name' => $overrides['name'] ?? 'Asset '.$code,
            'category' => $overrides['category'] ?? 'Equipment',
            'condition' => $overrides['condition'] ?? 'operational',
            'latitude' => null,
            'longitude' => null,
        ]);
    }

    /** @return array{code: string, name: string, category: string, condition: string, latitude: string|null, longitude: string|null} */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'code' => 'PUMP-01',
            'name' => 'North Pump',
            'category' => 'Pump',
            'condition' => 'operational',
            'latitude' => null,
            'longitude' => null,
        ], $overrides);
    }

    private function userWith(string ...$permissions): User
    {
        $user = User::factory()->create();
        foreach ($permissions as $permission) {
            $user->givePermissionTo(Permission::findOrCreate($permission, 'web'));
        }

        return $user;
    }
}
