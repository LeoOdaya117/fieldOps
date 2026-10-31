<?php

namespace Tests\Feature\WorkOrders;

use App\Models\AccessAuditEvent;
use App\Models\Asset;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\Fluent\AssertableJson as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class WorkOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_work_order_routes_require_authentication_and_permissions(): void
    {
        $workOrder = $this->workOrder();
        $this->get(route('work-orders.index'))->assertRedirect(route('login'));
        $this->get(route('work-orders.create'))->assertRedirect(route('login'));
        $this->post(route('work-orders.store'), [])->assertRedirect(route('login'));
        $this->get(route('work-orders.show', $workOrder))->assertRedirect(route('login'));
        $this->get(route('work-orders.edit', $workOrder))->assertRedirect(route('login'));
        $this->patch(route('work-orders.update', $workOrder), [])->assertRedirect(route('login'));
        $this->patch(route('work-orders.cancel', $workOrder))->assertRedirect(route('login'));
        $this->patch(route('work-orders.record-status', $workOrder), ['record_status' => 0])->assertRedirect(route('login'));

        $noAccess = User::factory()->create();
        $this->actingAs($noAccess)->get(route('work-orders.index'))->assertForbidden();
        $this->get(route('work-orders.show', $workOrder))->assertForbidden();
        $this->get(route('work-orders.create'))->assertForbidden();
        $this->post(route('work-orders.store'), $this->payload())->assertForbidden();
        $this->get(route('work-orders.edit', $workOrder))->assertForbidden();
        $this->patch(route('work-orders.update', $workOrder), $this->payload())->assertForbidden();
        $this->patch(route('work-orders.cancel', $workOrder))->assertForbidden();
        $this->patch(route('work-orders.record-status', $workOrder), ['record_status' => 0])->assertForbidden();
    }

    public function test_asset_work_order_captures_the_asset_and_location_and_keeps_the_snapshot_on_edit(): void
    {
        $manager = $this->userWith('work_orders.view', 'work_orders.create', 'work_orders.update', 'assets.view');
        $asset = $this->asset('PUMP-01', ['latitude' => 12.5, 'longitude' => 123.25]);

        $this->actingAs($manager)->post(route('work-orders.store'), $this->payload([
            'reference' => '  wo-2026-001  ',
            'asset_id' => $asset->id,
            'latitude' => 1,
            'longitude' => 2,
        ]))->assertRedirect();

        $workOrder = WorkOrder::query()->sole();
        $this->assertSame('WO-2026-001', $workOrder->reference);
        $this->assertSame('open', $workOrder->status);
        $this->assertSame($asset->id, $workOrder->asset_id);
        $this->assertSame('PUMP-01', $workOrder->asset_code_snapshot);
        $this->assertSame('Asset PUMP-01', $workOrder->asset_name_snapshot);
        $this->assertSame(12.5, (float) $workOrder->latitude);
        $this->assertSame(123.25, (float) $workOrder->longitude);
        $this->assertSame((int) $manager->id, $workOrder->created_by);
        $this->assertSame(1, (int) $workOrder->version);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'work_order.created', 'actor_user_id' => $manager->id, 'subject_id' => (string) $workOrder->id]);
        $event = AccessAuditEvent::query()->where('event', 'work_order.created')->sole();
        $this->assertSame(['name' => $manager->name, 'email' => $manager->email], $event->after['_actor']);
        $this->assertArrayNotHasKey('instructions', $event->after);
        $this->assertArrayNotHasKey('instructions_sha256', $event->after);
        $this->assertArrayNotHasKey('instructions', $event->after);
        $this->get(route('work-orders.index', ['search' => 'report condition']))->assertOk()->assertInertia(fn (Assert $page) => $page->where('workOrders.total', 1)->etc());
        $this->get(route('work-orders.index', ['search' => 'PUMP-01']))->assertOk()->assertInertia(fn (Assert $page) => $page->where('workOrders.total', 1)->etc());

        $asset->forceFill(['latitude' => 30, 'longitude' => 40])->save();
        $failedReferenceUpdate = $this->payload([
            'asset_id' => $asset->id,
            'title' => 'Updated title',
            'version' => 1,
            'latitude' => 30,
            'longitude' => 40,
            'reference' => 'CHANGED',
        ]);
        $this->patch(route('work-orders.update', $workOrder), $failedReferenceUpdate)->assertSessionHasErrors(['reference']);

        $update = $this->payload([
            'asset_id' => $asset->id,
            'title' => 'Updated title',
            'instructions' => 'Updated instructions',
            'version' => 1,
            'latitude' => 30,
            'longitude' => 40,
        ]);
        unset($update['reference']);
        $this->patch(route('work-orders.update', $workOrder), $update)->assertRedirect(route('work-orders.show', $workOrder));
        $this->assertSame('WO-2026-001', $workOrder->fresh()->reference);
        $this->assertSame('Updated title', $workOrder->fresh()->title);
        $this->assertSame(12.5, (float) $workOrder->fresh()->latitude);
        $this->assertSame(123.25, (float) $workOrder->fresh()->longitude);
        $this->assertSame(2, (int) $workOrder->fresh()->version);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'work_order.updated', 'actor_user_id' => $manager->id, 'subject_id' => (string) $workOrder->id]);
        $updateEvent = AccessAuditEvent::query()->where('event', 'work_order.updated')->sole();
        $this->assertTrue($updateEvent->after['instructions_changed']);
        $this->assertArrayNotHasKey('instructions', $updateEvent->after);
        $this->assertArrayNotHasKey('instructions_sha256', $updateEvent->after);

        $noChange = $this->payload([
            'asset_id' => $asset->id,
            'title' => 'Updated title',
            'instructions' => 'Updated instructions',
            'version' => 2,
        ]);
        unset($noChange['reference']);
        $otherManager = $this->userWith('work_orders.view', 'work_orders.update', 'assets.view');
        $this->actingAs($otherManager)->patch(route('work-orders.update', $workOrder), $noChange)->assertRedirect(route('work-orders.show', $workOrder));
        $this->assertSame(2, (int) $workOrder->fresh()->version);
        $this->assertSame((int) $manager->id, (int) $workOrder->fresh()->updated_by);
        $this->assertSame(1, AccessAuditEvent::query()->where('event', 'work_order.updated')->count());

        $staleUpdate = $this->payload(['asset_id' => $asset->id, 'title' => 'Stale title', 'version' => 1]);
        unset($staleUpdate['reference']);
        $this->patch(route('work-orders.update', $workOrder), $staleUpdate)->assertSessionHasErrors('version');
        $this->assertSame('Updated title', $workOrder->fresh()->title);
    }

    public function test_standalone_work_order_requires_valid_location_and_reference_is_unique_after_normalization(): void
    {
        $manager = $this->userWith('work_orders.create', 'work_orders.update');
        $this->actingAs($manager)->post(route('work-orders.store'), $this->payload([
            'reference' => 'wo-001',
            'location_label' => null,
            'latitude' => 10,
            'longitude' => null,
        ]))->assertSessionHasErrors(['location_label', 'longitude', 'coordinates']);
        $this->post(route('work-orders.store'), $this->payload([
            'reference' => 'wo-invalid',
            'priority' => 'critical',
            'due_date' => 'not-a-date',
            'title' => str_repeat('x', 161),
            'latitude' => 91,
            'longitude' => 181,
        ]))->assertSessionHasErrors(['priority', 'due_date', 'title', 'latitude', 'longitude']);
        $this->post(route('work-orders.store'), $this->payload([
            'reference' => ['WO-ARRAY'],
            'title' => ['Array title'],
            'instructions' => ['Array instructions'],
            'location_label' => ['Array location'],
        ]))->assertSessionHasErrors(['reference', 'title', 'instructions', 'location_label']);

        $this->post(route('work-orders.store'), $this->payload(['reference' => 'wo-001', 'due_date' => '2020-01-01']))->assertRedirect();
        $workOrder = WorkOrder::query()->sole();
        $this->assertNull($workOrder->asset_id);
        $this->assertSame('Depot gate', $workOrder->location_label);
        $this->assertSame('2020-01-01', $workOrder->due_date->toDateString());

        $update = $this->payload([
            'title' => 'Updated standalone task',
            'location_label' => 'North service entrance',
            'latitude' => 15.25,
            'longitude' => 124.75,
            'version' => 1,
        ]);
        unset($update['reference']);
        $this->patch(route('work-orders.update', $workOrder), $update)->assertRedirect(route('work-orders.show', $workOrder));
        $this->assertSame('North service entrance', $workOrder->fresh()->location_label);
        $this->assertSame(15.25, (float) $workOrder->fresh()->latitude);
        $this->assertSame(124.75, (float) $workOrder->fresh()->longitude);

        $this->post(route('work-orders.store'), $this->payload(['reference' => ' WO-001 ']))->assertSessionHasErrors('reference');
        $workOrder->forceFill(['record_status' => 0])->saveQuietly();
        $this->post(route('work-orders.store'), $this->payload(['reference' => 'wo-001']))->assertSessionHasErrors('reference');

        try {
            DB::table('work_orders')->insert([
                'reference' => 'WO-001', 'title' => 'Duplicate', 'priority' => 'normal', 'due_date' => '2026-11-01',
                'latitude' => 10, 'longitude' => 20, 'status' => 'open', 'record_status' => 1,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->fail('The database must enforce unique work-order references.');
        } catch (QueryException) {
            $this->assertSame(1, WorkOrder::withTrashed()->where('reference', 'WO-001')->count());
        }
    }

    public function test_asset_selection_is_active_and_requires_asset_view_but_historical_reference_can_be_retained(): void
    {
        $manager = $this->userWith('work_orders.create', 'work_orders.update', 'assets.view');
        $asset = $this->asset('PUMP-01', ['latitude' => null, 'longitude' => null]);
        $this->actingAs($manager)->post(route('work-orders.store'), $this->payload([
            'asset_id' => $asset->id,
            'latitude' => 11.5,
            'longitude' => 122.5,
        ]))->assertRedirect();
        $workOrder = WorkOrder::query()->sole();
        $asset->forceFill(['record_status' => 0])->saveQuietly();

        $update = $this->payload([
            'asset_id' => $asset->id,
            'title' => 'Historical asset retained',
            'latitude' => 1,
            'longitude' => 2,
            'version' => 1,
        ]);
        unset($update['reference']);
        $this->patch(route('work-orders.update', $workOrder), $update)->assertRedirect();
        $this->assertSame((int) $asset->id, $workOrder->fresh()->asset_id);
        $this->assertSame(11.5, (float) $workOrder->fresh()->latitude);

        $this->post(route('work-orders.store'), $this->payload(['reference' => 'WO-002', 'asset_id' => $asset->id, 'location_label' => null]))
            ->assertSessionHasErrors('asset_id');

        $noAssetAccess = $this->userWith('work_orders.create');
        $this->actingAs($noAssetAccess)->post(route('work-orders.store'), $this->payload(['asset_id' => null]))->assertRedirect();
        $activeAsset = $this->asset('PUMP-02', ['latitude' => 12, 'longitude' => 123]);
        $this->post(route('work-orders.store'), $this->payload(['reference' => 'WO-003', 'asset_id' => $activeAsset->id, 'location_label' => null]))->assertForbidden();
    }

    public function test_switching_assets_captures_new_asset_details_for_work_order_readers(): void
    {
        $manager = $this->userWith('work_orders.view', 'work_orders.create', 'work_orders.update', 'assets.view');
        $firstAsset = $this->asset('PUMP-01', ['latitude' => 10, 'longitude' => 20]);
        $targetAsset = $this->asset('PUMP-02', ['latitude' => 12.5, 'longitude' => 124.5]);
        $this->actingAs($manager)->post(route('work-orders.store'), $this->payload([
            'reference' => 'WO-SWITCH',
            'asset_id' => $firstAsset->id,
        ]))->assertRedirect();
        $workOrder = WorkOrder::query()->sole();

        $update = $this->payload([
            'asset_id' => $targetAsset->id,
            'latitude' => -20,
            'longitude' => -40,
            'version' => 1,
        ]);
        unset($update['reference']);
        $this->patch(route('work-orders.update', $workOrder), $update)->assertRedirect();

        $workOrder->refresh();
        $this->assertSame((int) $targetAsset->id, $workOrder->asset_id);
        $this->assertSame($targetAsset->code, $workOrder->asset_code_snapshot);
        $this->assertSame($targetAsset->name, $workOrder->asset_name_snapshot);
        $this->assertSame(12.5, (float) $workOrder->latitude);
        $this->assertSame(124.5, (float) $workOrder->longitude);

        $targetAsset->forceFill(['record_status' => 0])->saveQuietly();
        $manager->revokePermissionTo('assets.view');
        $this->get(route('work-orders.show', $workOrder))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('workOrder.asset.id', (int) $targetAsset->id)
            ->where('workOrder.asset.code', $targetAsset->code)
            ->where('workOrder.asset.name', $targetAsset->name)
            ->where('workOrder.latitude', 12.5)
            ->where('workOrder.longitude', 124.5)
            ->etc());
    }

    public function test_operational_status_is_only_changed_by_one_open_to_cancelled_transition(): void
    {
        $manager = $this->userWith('work_orders.view', 'work_orders.create', 'work_orders.update');
        $this->actingAs($manager)->post(route('work-orders.store'), $this->payload(['status' => 'completed']))->assertSessionHasErrors('status');
        $this->post(route('work-orders.store'), $this->payload())->assertRedirect();
        $workOrder = WorkOrder::query()->sole();
        $forgedStatusUpdate = $this->payload(['status' => 'completed', 'version' => 1]);
        unset($forgedStatusUpdate['reference']);
        $this->patch(route('work-orders.update', $workOrder), $forgedStatusUpdate)->assertSessionHasErrors('status');
        $this->patchJson(route('work-orders.cancel', $workOrder), ['version' => 1])->assertRedirect();
        $this->assertSame('cancelled', $workOrder->fresh()->status);
        $this->assertSame(2, (int) $workOrder->fresh()->version);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'work_order.cancelled', 'actor_user_id' => $manager->id, 'subject_id' => (string) $workOrder->id]);
        $staleCancel = $this->patchJson(route('work-orders.cancel', $workOrder), ['version' => 1]);
        $staleCancel->assertUnprocessable()->assertJsonValidationErrors('version');
        $this->patchJson(route('work-orders.cancel', $workOrder), ['version' => 2])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
        $update = $this->payload(['version' => 2]);
        unset($update['reference']);
        $this->patch(route('work-orders.update', $workOrder), $update)->assertSessionHasErrors('status');
        $this->get(route('work-orders.edit', $workOrder))->assertNotFound();
        $this->assertSame(1, DB::table('access_audit_events')->where('event', 'work_order.cancelled')->where('subject_id', (string) $workOrder->id)->count());
    }

    public function test_record_inactive_visibility_and_status_change_are_independent_of_cancellation(): void
    {
        $manager = $this->userWith('work_orders.view', 'work_orders.create', 'work_orders.update', 'work_orders.update_deleted');
        $this->actingAs($manager)->post(route('work-orders.store'), $this->payload())->assertRedirect();
        $workOrder = WorkOrder::query()->sole();

        $this->patch(route('work-orders.record-status', $workOrder), ['record_status' => 0])->assertRedirect();
        $this->assertSame(0, WorkOrder::withTrashed()->findOrFail($workOrder->id)->record_status);
        $this->assertSame(2, (int) WorkOrder::withTrashed()->findOrFail($workOrder->id)->version);
        $this->get(route('work-orders.show', $workOrder))->assertNotFound();
        $this->get(route('work-orders.index', ['record_status' => 'inactive']))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('filters.recordStatus', 'active')->has('workOrders.data', 0)->etc());

        $manager->givePermissionTo(Permission::findOrCreate('work_orders.view_deleted', 'web'));
        $this->get(route('work-orders.show', $workOrder))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('workOrder.status', 'open')->where('workOrder.recordStatus', 0)->etc());
        $this->patch(route('work-orders.record-status', $workOrder), ['record_status' => 1])->assertRedirect();
        $this->assertSame('open', $workOrder->fresh()->status);
        $this->assertSame(3, (int) $workOrder->fresh()->version);
    }

    public function test_listing_bounds_filters_and_limits_inactive_rows_to_authorized_users(): void
    {
        $reader = $this->userWith('work_orders.view');
        for ($index = 1; $index <= 55; $index++) {
            $this->workOrder(['reference' => sprintf('WO-%03d', $index), 'title' => 'Pump check '.$index]);
        }
        WorkOrder::query()->where('reference', 'WO-001')->update(['record_status' => 0]);

        $this->actingAs($reader)->get(route('work-orders.index', [
            'search' => 'Pump', 'priority' => 'normal', 'status' => 'open', 'record_status' => 'inactive', 'sort' => 'bad-column', 'per_page' => 999,
        ]))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('filters.recordStatus', 'active')->where('workOrders.per_page', 50)
            ->where('workOrders.total', 54)->has('workOrders.data', 50)->etc());

        $reader->givePermissionTo(Permission::findOrCreate('work_orders.view_deleted', 'web'));
        $this->get(route('work-orders.index', ['record_status' => 'inactive']))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('filters.recordStatus', 'inactive')->where('workOrders.total', 1)->has('workOrders.data', 1)->etc());
    }

    /** @param array<string, mixed> $overrides */
    private function workOrder(array $overrides = []): WorkOrder
    {
        $latitude = $overrides['latitude'] ?? 14.5;
        $longitude = $overrides['longitude'] ?? 121.0;

        return WorkOrder::query()->create([
            'reference' => $overrides['reference'] ?? 'WO-TEST-01',
            'title' => $overrides['title'] ?? 'Pump inspection',
            'instructions' => 'Inspect and report condition.',
            'priority' => 'normal',
            'due_date' => '2026-11-02',
            'location_label' => 'Depot gate',
            'latitude' => $latitude,
            'longitude' => $longitude,
            'status' => $overrides['status'] ?? 'open',
            'record_status' => $overrides['record_status'] ?? 1,
        ]);
    }

    /** @param array<string, mixed> $overrides */
    private function asset(string $code, array $overrides = []): Asset
    {
        return Asset::query()->create([
            'code' => $code,
            'name' => 'Asset '.$code,
            'category' => 'Equipment',
            'condition' => 'operational',
            'latitude' => $overrides['latitude'] ?? null,
            'longitude' => $overrides['longitude'] ?? null,
        ]);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'reference' => 'WO-001',
            'title' => 'Inspect pump',
            'instructions' => 'Inspect and report condition.',
            'priority' => 'normal',
            'due_date' => '2026-11-02',
            'asset_id' => null,
            'location_label' => 'Depot gate',
            'latitude' => 14.5,
            'longitude' => 121,
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
