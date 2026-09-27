<?php

namespace Tests\Feature\RecordStatus;

use App\Enums\RoleName;
use App\Models\BlockedIpAddress;
use App\Models\Country;
use App\Models\Role;
use App\Models\Timezone;
use App\Models\User;
use App\Models\UserInvitation;
use Database\Seeders\RbacSeeder;
use Illuminate\Auth\Events\Login;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Testing\Fluent\AssertableJson as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class RecordStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_actor_can_change_status_with_audit_actor_and_event(): void
    {
        $actor = User::factory()->create();
        $actor->syncRoles(RoleName::SuperAdmin->value);
        $country = Country::query()->create(['code' => 'RS', 'name' => 'Record Status']);

        $this->actingAs($actor)->patch(route('system.countries.record-status', $country), ['record_status' => 0])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(0, Country::withTrashed()->findOrFail($country->id)->record_status);
        $this->assertSame($actor->id, Country::withTrashed()->findOrFail($country->id)->updated_by);
        $this->assertDatabaseHas('access_audit_events', [
            'event' => 'country.deactivated',
            'actor_user_id' => $actor->id,
            'subject_id' => (string) $country->id,
        ]);

        $this->patch(route('system.countries.record-status', $country), ['record_status' => 1])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->assertSame(1, Country::query()->findOrFail($country->id)->record_status);
    }

    public function test_deleted_visibility_filter_and_detail_are_permission_gated(): void
    {
        $reader = User::factory()->create();
        $reader->givePermissionTo(Permission::findOrCreate('countries.view', 'web'));
        $country = Country::query()->create(['code' => 'RS', 'name' => 'Inactive country']);
        $country->delete();

        $this->actingAs($reader)->get(route('system.countries.index', ['record_status' => ['inactive']]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canViewDeleted', false)
                ->where('filters.recordStatus', 'active')
                ->has('countries.data', 0));

        $this->get(route('system.countries.show', $country->id))->assertNotFound();

        $reader->givePermissionTo(Permission::findOrCreate('countries.view_deleted', 'web'));
        $this->get(route('system.countries.index', ['record_status' => ['inactive']]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canViewDeleted', true)
                ->where('filters.recordStatus', 'inactive')
                ->has('countries.data', 1, fn (Assert $row) => $row
                    ->where('recordStatus', 0)
                    ->has('recordStatusUrl')
                    ->etc()));

        $this->get(route('system.countries.show', $country->id))->assertOk();
    }

    public function test_status_mutation_requires_resource_update_permission_and_valid_binary_value(): void
    {
        $actor = User::factory()->create();
        $actor->givePermissionTo(Permission::findOrCreate('countries.view', 'web'));
        $country = Country::query()->create(['code' => 'RS', 'name' => 'Protected country']);

        $this->actingAs($actor)->patch(route('system.countries.record-status', $country), ['record_status' => 0])->assertForbidden();
        $this->assertSame(1, $country->fresh()->record_status);

        $actor->givePermissionTo(Permission::findOrCreate('countries.update_deleted', 'web'));
        $this->patch(route('system.countries.record-status', $country), ['record_status' => 2])->assertSessionHasErrors('record_status');
        $this->assertSame(1, $country->fresh()->record_status);
    }

    public function test_non_super_admin_with_update_deleted_permission_cannot_deactivate_a_super_admin_account(): void
    {
        $actor = User::factory()->create();
        $actor->givePermissionTo(Permission::findOrCreate('users.update_deleted', 'web'));

        $target = User::factory()->create();
        $target->syncRoles(RoleName::SuperAdmin->value);

        $otherSuperAdmin = User::factory()->create();
        $otherSuperAdmin->syncRoles(RoleName::SuperAdmin->value);

        $this->actingAs($actor)
            ->patch(route('access.users.record-status', $target), ['record_status' => 0])
            ->assertSessionHasErrors('record_status');

        $this->assertSame(1, $target->fresh()->record_status);
        $this->assertSame(1, $otherSuperAdmin->fresh()->record_status);
    }

    public function test_non_super_admin_cannot_reactivate_a_super_admin_account(): void
    {
        $actor = User::factory()->create();
        $actor->givePermissionTo(Permission::findOrCreate('users.update_deleted', 'web'));

        $target = User::factory()->create();
        $target->syncRoles(RoleName::SuperAdmin->value);
        User::withoutGlobalScope('record_status')->whereKey($target->id)->update(['record_status' => 0]);

        $this->actingAs($actor)
            ->patch(route('access.users.record-status', $target), ['record_status' => 1])
            ->assertSessionHasErrors('record_status');

        $this->assertSame(0, User::withoutGlobalScope('record_status')->findOrFail($target->id)->record_status);
    }

    public function test_role_assigned_to_inactive_user_cannot_be_deactivated(): void
    {
        $actor = User::factory()->create();
        $actor->syncRoles(RoleName::SuperAdmin->value);

        $assignedRole = Role::query()->create([
            'name' => 'inactive-user-assigned-role',
            'guard_name' => 'web',
            'display_name' => 'Inactive User Assigned Role',
        ]);
        $inactiveUser = User::factory()->create();
        $inactiveUser->syncRoles($assignedRole);
        User::withoutGlobalScope('record_status')->whereKey($inactiveUser->id)->update(['record_status' => 0]);

        $this->actingAs($actor)
            ->patch(route('access.roles.record-status', $assignedRole), ['record_status' => 0])
            ->assertSessionHasErrors('record_status');

        $this->assertSame(1, $assignedRole->fresh()->record_status);
    }

    public function test_deactivating_a_user_invalidates_their_sessions(): void
    {
        $actor = User::factory()->create();
        $actor->syncRoles(RoleName::SuperAdmin->value);
        $target = User::factory()->create();

        DB::table('sessions')->insert([
            'id' => 'record-status-user-session',
            'user_id' => $target->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test',
            'payload' => 'payload',
            'last_activity' => now()->timestamp,
        ]);

        $this->actingAs($actor)
            ->patch(route('access.users.record-status', $target), ['record_status' => 0])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('sessions', ['id' => 'record-status-user-session']);
        $deactivated = User::withTrashed()->findOrFail($target->id);
        $this->assertSame(0, $deactivated->record_status);
        $this->assertSame(2, $deactivated->session_version);
        $this->assertNotSame($target->remember_token, $deactivated->remember_token);
    }

    public function test_stale_session_version_is_rejected_even_after_user_is_reactivated(): void
    {
        $actor = User::factory()->create();
        $actor->syncRoles(RoleName::SuperAdmin->value);
        $target = User::factory()->create();
        $originalVersion = $target->session_version;

        $this->actingAs($actor)->patch(route('access.users.record-status', $target), ['record_status' => 0])->assertRedirect();
        $this->patch(route('access.users.record-status', $target), ['record_status' => 1])->assertRedirect();
        $this->assertSame(1, $target->fresh()->record_status);
        $this->assertSame($originalVersion + 1, $target->fresh()->session_version);

        $authKey = Auth::guard()->getName();
        $this->actingAs($target->fresh())
            ->withSession([$authKey => $target->getKey(), 'auth.session_version' => $originalVersion])
            ->postJson(route('session.activity'))
            ->assertForbidden();
    }

    public function test_successful_login_event_snapshots_the_current_user_session_version(): void
    {
        $user = User::factory()->create();
        $session = $this->app['session']->driver();
        $session->start();
        $request = Request::create('/');
        $request->setLaravelSession($session);
        $this->app->instance('request', $request);

        Event::dispatch(new Login('web', $user, false));

        $this->assertSame($user->session_version, $session->get('auth.session_version'));
    }

    public function test_last_or_current_timezone_cannot_be_deactivated(): void
    {
        $actor = User::factory()->create();
        $actor->syncRoles(RoleName::SuperAdmin->value);
        $timezone = Timezone::query()->create(['name' => 'UTC']);

        $this->actingAs($actor)->patch(route('system.timezones.record-status', $timezone), ['record_status' => 0])
            ->assertSessionHasErrors('record_status');
        $this->assertSame(1, $timezone->fresh()->record_status);
    }

    public function test_seeded_roles_and_role_editor_expose_status_permissions_for_every_record_status_resource(): void
    {
        app(RbacSeeder::class)->run();
        $resources = ['users', 'roles', 'countries', 'timezones', 'ip_blocks', 'organization_locations', 'media_assets'];
        $expectedPermissions = collect($resources)
            ->flatMap(static fn (string $resource): array => [
                "{$resource}.view_deleted",
                "{$resource}.update_deleted",
            ])
            ->sort()
            ->values()
            ->all();
        $permissionNames = Permission::query()
            ->whereIn('name', $expectedPermissions)
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->pluck('name')
            ->all();
        $admin = Role::query()->where('name', RoleName::Admin->value)->firstOrFail();
        $superAdmin = Role::query()->where('name', RoleName::SuperAdmin->value)->firstOrFail();
        $user = Role::query()->where('name', RoleName::User->value)->firstOrFail();

        $this->assertSame(['admin', 'super_admin', 'user'], Role::query()->where('is_system', true)->orderBy('name')->pluck('name')->all());
        $this->assertSame($expectedPermissions, $permissionNames);
        $this->assertSame($expectedPermissions, $admin->permissions()->orderBy('name')->whereIn('name', $expectedPermissions)->pluck('name')->all());
        $this->assertSame($expectedPermissions, $superAdmin->permissions()->orderBy('name')->whereIn('name', $expectedPermissions)->pluck('name')->all());
        $this->assertSame([], $user->permissions()->whereIn('name', $expectedPermissions)->pluck('name')->all());

        $actor = User::factory()->create();
        $actor->syncRoles(RoleName::SuperAdmin->value);
        $this->actingAs($actor)
            ->get(route('access.roles.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('permissions', static function (Collection $permissions) use ($expectedPermissions): bool {
                $available = $permissions->pluck('name')->all();

                return array_diff($expectedPermissions, $available) === [];
            }));
    }

    public function test_invitation_and_ip_block_rows_expose_status_urls_and_ip_activation_stays_separate(): void
    {
        $actor = User::factory()->create();
        $actor->syncRoles(RoleName::SuperAdmin->value);
        $role = Role::query()->where('name', RoleName::User->value)->firstOrFail();
        $invitation = UserInvitation::query()->create([
            'email' => 'status-invite@example.com',
            'role_id' => $role->id,
            'invited_by' => $actor->id,
            'token_hash' => UserInvitation::hashToken('status-invite-token'),
            'expires_at' => now()->addDay(),
        ]);
        $rule = BlockedIpAddress::query()->create([
            'ip_address' => '192.0.2.50',
            'is_active' => true,
            'blocked_at' => now(),
            'reason' => 'Record status check',
        ]);

        $this->actingAs($actor)->get(route('access.users.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('invitations.0.recordStatusUrl')
                ->where('invitations.0.recordStatusUrl', route('access.users.invitations.record-status', $invitation)));

        $this->get(route('access.ip-blocks.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('blockedIpAddresses.data.0.recordStatusUrl', route('access.ip-blocks.record-status', $rule)));

        $this->patch(route('access.ip-blocks.record-status', $rule), ['record_status' => 0])->assertRedirect();

        $this->assertSame(0, BlockedIpAddress::withTrashed()->findOrFail($rule->id)->record_status);
        $this->assertTrue(BlockedIpAddress::withTrashed()->findOrFail($rule->id)->is_active);

        $this->patch(route('access.users.invitations.record-status', $invitation), ['record_status' => 0])->assertRedirect();
        $this->assertSame(0, UserInvitation::withTrashed()->findOrFail($invitation->id)->record_status);
    }

    public function test_role_cannot_be_deactivated_while_a_usable_invitation_targets_it(): void
    {
        $actor = User::factory()->create();
        $actor->syncRoles(RoleName::SuperAdmin->value);
        $role = Role::query()->create([
            'name' => 'invited_member',
            'display_name' => 'Invited Member',
            'guard_name' => 'web',
        ]);
        $invitation = UserInvitation::query()->create([
            'email' => 'role-invite@example.com',
            'role_id' => $role->id,
            'invited_by' => $actor->id,
            'token_hash' => UserInvitation::hashToken('role-invite-token'),
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($actor)
            ->patch(route('access.roles.record-status', $role), ['record_status' => 0])
            ->assertSessionHasErrors('record_status');

        $this->assertSame(1, Role::query()->findOrFail($role->id)->record_status);
        $this->assertNull($invitation->fresh()->revoked_at);
    }
}
