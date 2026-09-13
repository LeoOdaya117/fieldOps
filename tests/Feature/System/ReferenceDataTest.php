<?php

namespace Tests\Feature\System;

use App\Enums\RoleName;
use App\Models\AccessAuditEvent;
use App\Models\Country;
use App\Models\Timezone;
use App\Models\User;
use Database\Seeders\TimezoneSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\Fluent\AssertableJson as Assert;
use Tests\TestCase;

class ReferenceDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_view_reference_data_pages_and_audit_fields_are_serialized(): void
    {
        $admin = $this->administrator();
        $country = Country::query()->create([
            'code' => 'QZ',
            'name' => 'Quality Zone',
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);
        $timezone = Timezone::query()->create([
            'name' => 'Asia/Manila',
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);

        $this->assertFalse(Schema::hasColumn('countries', 'status'));
        $this->assertFalse(Schema::hasColumn('timezones', 'status'));

        $this->actingAs($admin)
            ->get(route('system.countries.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('system/countries')
                ->where('canManage', true)
                ->has('filters')
                ->missing('filters.status')
                ->has('countries.data', 1, fn (Assert $data) => $data
                    ->where('id', $country->id)
                    ->where('code', 'QZ')
                    ->where('name', 'Quality Zone')
                    ->missing('status')
                    ->where('recordStatus', 1)
                    ->where('createdBy.id', $admin->id)
                    ->where('updatedBy.id', $admin->id)
                    ->has('createdAt')
                    ->has('updatedAt')));

        $this->actingAs($admin)
            ->get(route('system.countries.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('system/country-create'));

        $this->actingAs($admin)
            ->get(route('system.countries.show', $country))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('system/country-show')
                ->where('country.code', 'QZ')
                ->missing('country.status')
                ->where('country.recordStatus', 1));

        $this->actingAs($admin)
            ->get(route('system.countries.edit', $country))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('system/country-edit')
                ->where('country.name', 'Quality Zone')
                ->missing('country.status'));

        $this->actingAs($admin)
            ->get(route('system.timezones.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('system/timezones')
                ->where('canManage', true)
                ->has('timezones.data', 1, fn (Assert $data) => $data
                    ->where('id', $timezone->id)
                    ->where('name', 'Asia/Manila')
                    ->missing('status')
                    ->where('recordStatus', 1)
                    ->where('createdBy.id', $admin->id)
                    ->where('updatedBy.id', $admin->id)
                    ->has('createdAt')
                    ->has('updatedAt')));

        $this->actingAs($admin)
            ->get(route('system.timezones.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('system/timezone-create'));

        $this->actingAs($admin)
            ->get(route('system.timezones.show', $timezone))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('system/timezone-show')
                ->where('timezone.name', 'Asia/Manila')
                ->missing('timezone.status'));

        $this->actingAs($admin)
            ->get(route('system.timezones.edit', $timezone))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('system/timezone-edit')
                ->where('timezone.name', 'Asia/Manila')
                ->missing('timezone.status'));
    }

    public function test_administrator_can_create_update_and_soft_delete_country(): void
    {
        $admin = $this->administrator();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('system.countries.store'), [
                'code' => 'qz',
                'name' => 'Quality Zone',
            ])
            ->assertRedirect(route('system.countries.index'))
            ->assertSessionHasNoErrors();

        $country = Country::query()->where('code', 'QZ')->firstOrFail();
        $this->assertSame($admin->id, $country->created_by);
        $this->assertSame($admin->id, $country->updated_by);
        $this->assertDatabaseHas('access_audit_events', [
            'event' => 'country.created',
            'actor_user_id' => $admin->id,
            'subject_id' => (string) $country->id,
        ]);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('system.countries.update', $country), [
                'code' => 'QY',
                'name' => 'Updated Quality Zone',
            ])
            ->assertRedirect(route('system.countries.index'))
            ->assertSessionHasNoErrors();

        $country = $country->fresh();
        $this->assertNotNull($country);
        $this->assertSame('QY', $country->code);
        $this->assertSame('Updated Quality Zone', $country->name);
        $this->assertDatabaseHas('access_audit_events', [
            'event' => 'country.updated',
            'actor_user_id' => $admin->id,
            'subject_id' => (string) $country->id,
        ]);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->delete(route('system.countries.destroy', $country))
            ->assertRedirect(route('system.countries.index'));

        $deletedCountry = Country::withTrashed()->findOrFail($country->id);
        $this->assertSame(0, $deletedCountry->record_status);
        $this->assertSame($admin->id, $deletedCountry->updated_by);
        $this->assertNull(Country::query()->whereKey($country->id)->first());
        $this->assertSame(1, AccessAuditEvent::query()->where('event', 'country.created')->count());
        $this->assertSame(1, AccessAuditEvent::query()->where('event', 'country.updated')->count());
        $this->assertSame(1, AccessAuditEvent::query()->where('event', 'country.deleted')->count());
        $this->assertSame(0, AccessAuditEvent::query()->whereIn('event', ['country.activated', 'country.deactivated'])->count());
    }

    public function test_timezone_management_preserves_the_current_timezone_and_requires_an_available_option(): void
    {
        $admin = $this->administrator();
        app(TimezoneSeeder::class)->run();

        $timezone = Timezone::query()->where('name', 'Asia/Manila')->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->delete(route('system.timezones.destroy', $timezone))
            ->assertRedirect(route('system.timezones.index'));

        $this->assertSame(0, Timezone::withTrashed()->findOrFail($timezone->id)->record_status);
        $this->assertDatabaseHas('access_audit_events', [
            'event' => 'timezone.deleted',
            'actor_user_id' => $admin->id,
            'subject_id' => (string) $timezone->id,
        ]);

        $current = Timezone::query()->where('name', 'UTC')->firstOrFail();
        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->delete(route('system.timezones.destroy', $current))
            ->assertSessionHasErrors('name');
        $this->assertSame(1, $current->fresh()->record_status);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('system.timezones.update', $current), [
                'name' => 'Asia/Tokyo',
            ])
            ->assertSessionHasErrors('name');
        $this->assertSame('UTC', $current->fresh()->name);
    }

    public function test_timezone_catalog_never_removes_the_last_available_option(): void
    {
        $admin = $this->administrator();
        $timezone = Timezone::query()->create([
            'name' => 'Asia/Manila',
        ]);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->delete(route('system.timezones.destroy', $timezone))
            ->assertSessionHasErrors('name');

        $this->assertSame(1, $timezone->fresh()->record_status);
    }

    public function test_system_settings_uses_catalog_timezones_and_excludes_deleted_options(): void
    {
        $admin = $this->administrator();
        app(TimezoneSeeder::class)->run();
        $timezone = Timezone::query()->where('name', 'Asia/Manila')->firstOrFail();
        $timezone->delete();

        $this->actingAs($admin)
            ->get(route('system-settings.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('timezones.0', 'Africa/Abidjan')
                ->where('timezones', fn (Collection $timezones): bool => ! $timezones->contains('Asia/Manila')));

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('system-settings.update'), [
                'name' => 'FieldOps',
                'timezone' => 'Asia/Manila',
                'pagination_size' => 50,
            ])
            ->assertSessionHasErrors('timezone');
    }

    public function test_reference_data_requires_authentication_permission_password_confirmation_and_valid_input(): void
    {
        $this->get(route('system.countries.index'))->assertRedirect(route('login'));
        $this->get(route('system.timezones.index'))->assertRedirect(route('login'));

        $user = User::factory()->create();
        $user->syncRoles(RoleName::User->value);

        $this->actingAs($user)
            ->get(route('system.countries.index'))
            ->assertForbidden();
        $this->actingAs($user)
            ->get(route('system.timezones.index'))
            ->assertForbidden();

        $admin = $this->administrator();
        $this->actingAs($admin)
            ->post(route('system.countries.store'), [
                'code' => 'QZ',
                'name' => 'Quality Zone',
            ])
            ->assertRedirect(route('password.confirm'));

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('system.countries.create'))
            ->post(route('system.countries.store'), [
                'code' => 'bad',
                'name' => '',
            ])
            ->assertRedirect(route('system.countries.create'))
            ->assertSessionHasErrors(['code', 'name']);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('system.timezones.create'))
            ->post(route('system.timezones.store'), [
                'name' => 'Mars/Olympus',
            ])
            ->assertRedirect(route('system.timezones.create'))
            ->assertSessionHasErrors('name');

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('system.countries.store'), [
                'code' => 'QZ',
                'name' => 'Not allowed',
            ])
            ->assertForbidden();
    }

    public function test_duplicate_country_codes_and_timezone_names_are_rejected(): void
    {
        $admin = $this->administrator();
        Country::query()->create([
            'code' => 'QZ',
            'name' => 'Quality Zone',
        ]);
        Timezone::query()->create([
            'name' => 'Asia/Manila',
        ]);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('system.countries.create'))
            ->post(route('system.countries.store'), [
                'code' => 'qz',
                'name' => 'Another Quality Zone',
            ])
            ->assertRedirect(route('system.countries.create'))
            ->assertSessionHasErrors('code');

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('system.timezones.create'))
            ->post(route('system.timezones.store'), [
                'name' => ' Asia/Manila ',
            ])
            ->assertRedirect(route('system.timezones.create'))
            ->assertSessionHasErrors('name');
    }

    public function test_reference_index_search_sort_and_soft_delete_behavior(): void
    {
        $admin = $this->administrator();
        $active = Country::query()->create([
            'code' => 'QZ',
            'name' => 'Quality Zone',
        ]);
        Country::query()->create([
            'code' => 'QY',
            'name' => 'Quiet Yard',
        ]);
        $deleted = Country::query()->create([
            'code' => 'QX',
            'name' => 'Deleted Example',
        ]);
        $deleted->delete();

        $this->actingAs($admin)
            ->get(route('system.countries.index', [
                'search' => 'quality',
                'sort' => 'code',
                'direction' => 'desc',
                'per_page' => 25,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.search', 'quality')
                ->missing('filters.status')
                ->where('filters.sort', 'code')
                ->where('filters.direction', 'desc')
                ->where('filters.perPage', 25)
                ->has('countries.data', 1)
                ->where('countries.data.0.id', $active->id)
                ->where('countries.data.0.code', 'QZ'));

        $this->actingAs($admin)
            ->get(route('system.countries.index', ['search' => 'deleted']))
            ->assertInertia(fn (Assert $page) => $page->has('countries.data', 0));
    }

    private function administrator(): User
    {
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Administrator->value);

        return $admin;
    }
}
