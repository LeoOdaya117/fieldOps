<?php

namespace Tests\Feature\Access;

use App\Actions\Rbac\ChangeUserStatus;
use App\Actions\Rbac\InviteUser;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\AccessAuditEvent;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\Fluent\AssertableJson as Assert;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_without_a_role_cannot_open_the_dashboard(): void
    {
        $user = User::factory()->create();
        $user->roles()->detach();

        $this->actingAs($user)->get(route('dashboard'))->assertForbidden();
    }

    public function test_owner_can_open_access_management_without_two_factor_confirmation(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);

        $this->assertTrue($owner->isActive());
        $this->assertTrue($owner->isOwner());
        $this->assertNull($owner->two_factor_confirmed_at);

        $this->actingAs($owner)->get(route('access.users.index'))->assertOk();
    }

    public function test_owner_can_view_audit_history(): void
    {
        $owner = User::factory()->withTwoFactor()->create();
        $owner->syncRoles(RoleName::Owner->value);

        $this->actingAs($owner)->get(route('access.audit.index'))->assertOk();
    }

    public function test_admin_cannot_grant_owner_or_permissions_they_do_not_have(): void
    {
        $admin = User::factory()->withTwoFactor()->create();
        $admin->syncRoles(RoleName::Administrator->value);
        $target = User::factory()->create();
        $owner = Role::query()->where('name', RoleName::Owner->value)->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.users.role', $target), ['role_id' => $owner->id])
            ->assertForbidden();

        $this->assertSame(RoleName::Technician->value, $target->fresh()->roles->first()->name);
    }

    public function test_admin_can_create_a_custom_role_with_permissions_they_have(): void
    {
        $admin = User::factory()->withTwoFactor()->create();
        $admin->syncRoles(RoleName::Administrator->value);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.roles.store'), [
                'name' => 'quality_reviewer',
                'display_name' => 'Quality reviewer',
                'description' => 'Reviews completed work.',
                'permissions' => ['dashboard.view', 'audit.view'],
            ])
            ->assertRedirect(route('access.roles.index'));

        $this->assertDatabaseHas('roles', ['name' => 'quality_reviewer', 'is_system' => 0]);
        $this->assertDatabaseHas('roles', [
            'name' => 'quality_reviewer',
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
            'record_status' => 1,
        ]);
        $role = Role::query()->where('name', 'quality_reviewer')->firstOrFail();
        $this->assertSame(['audit.view', 'dashboard.view'], $role->permissions()->orderBy('name')->pluck('name')->all());
    }

    public function test_admin_can_open_dedicated_role_create_and_edit_pages_but_not_protected_role_edit(): void
    {
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Administrator->value);
        $custom = Role::query()->create([
            'name' => 'quality_reviewer',
            'guard_name' => 'web',
            'display_name' => 'Quality reviewer',
            'description' => 'Reviews completed work.',
            'is_system' => false,
        ]);
        $protected = Role::query()->where('name', RoleName::Administrator->value)->firstOrFail();

        $this->actingAs($admin)
            ->get(route('access.roles.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('access/roles')
                ->has('roles'));

        $this->actingAs($admin)
            ->get(route('access.roles.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('access/role-create')
                ->has('permissions'));

        $this->actingAs($admin)
            ->get(route('access.roles.edit', $custom))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('access/role-edit')
                ->where('role.name', 'quality_reviewer'));

        $this->actingAs($admin)
            ->get(route('access.roles.edit', $protected))
            ->assertForbidden();
    }

    public function test_admin_can_open_direct_user_creation_page_and_optional_invitation_page(): void
    {
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Administrator->value);

        $this->actingAs($admin)
            ->get(route('access.users.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('access/user-create')
                ->has('roles'));

        $this->actingAs($admin)
            ->get(route('access.users.invite.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('access/user-invite')
                ->has('roles'));
    }

    public function test_basic_user_cannot_open_direct_creation_or_invitation_pages(): void
    {
        $user = User::factory()->create();
        $user->syncRoles(RoleName::User->value);

        $this->actingAs($user)
            ->get(route('access.users.create'))
            ->assertForbidden();

        $this->actingAs($user)
            ->get(route('access.users.invite.create'))
            ->assertForbidden();
    }

    public function test_super_admin_can_manage_system_roles_without_read_only_restrictions(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->syncRoles(RoleName::SuperAdmin->value);
        $protected = Role::query()->where('name', RoleName::Administrator->value)->firstOrFail();

        $this->actingAs($superAdmin)
            ->get(route('access.roles.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canManageSystemRoles', true));

        $this->actingAs($superAdmin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.roles.update', $protected), [
                'name' => $protected->name,
                'display_name' => 'Operations administrator',
                'description' => $protected->description,
                'permissions' => config('rbac.permissions'),
            ])
            ->assertRedirect(route('access.roles.index'));

        $this->assertDatabaseHas('roles', [
            'id' => $protected->id,
            'display_name' => 'Operations administrator',
        ]);
    }

    public function test_owner_can_bulk_suspend_users_through_the_access_endpoint(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);
        $targets = User::factory()->count(2)->create();

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('access.users.index'))
            ->patch(route('access.users.bulk.suspend'), [
                'ids' => $targets->pluck('id')->all(),
            ])
            ->assertRedirect(route('access.users.index'));

        $targets->each(fn (User $target) => $this->assertSame(
            UserStatus::Suspended,
            $target->fresh()->status,
        ));
        $this->assertSame(2, AccessAuditEvent::query()->where('event', 'user.suspended')->count());
    }

    public function test_standard_admin_cannot_bulk_delete_a_system_role(): void
    {
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Administrator->value);
        $systemRole = Role::query()->where('name', RoleName::Administrator->value)->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->delete(route('access.roles.bulk.destroy'), ['ids' => [$systemRole->id]])
            ->assertForbidden();

        $this->assertDatabaseHas('roles', ['id' => $systemRole->id]);
    }

    public function test_role_deletion_marks_the_record_deleted_without_removing_it(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);
        $role = Role::query()->create([
            'name' => 'temporary_role',
            'guard_name' => 'web',
            'display_name' => 'Temporary role',
            'description' => 'Used for a soft-delete assertion.',
            'is_system' => false,
        ]);

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->delete(route('access.roles.destroy', $role))
            ->assertRedirect(route('access.roles.index'));

        $this->assertDatabaseHas('roles', [
            'id' => $role->id,
            'record_status' => 0,
        ]);
        $this->assertNull(Role::query()->whereKey($role->id)->first());
        $this->assertTrue(Role::withTrashed()->whereKey($role->id)->firstOrFail()->trashed());

        $bulkRole = Role::query()->create([
            'name' => 'bulk_temporary_role',
            'guard_name' => 'web',
            'display_name' => 'Bulk temporary role',
            'is_system' => false,
        ]);

        $this->assertSame(1, Role::withTrashed()->whereKey($bulkRole->id)->delete());
        $this->assertDatabaseHas('roles', [
            'id' => $bulkRole->id,
            'record_status' => 0,
        ]);
    }

    public function test_bulk_user_status_requires_at_least_one_selected_user(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.users.bulk.suspend'), ['ids' => []])
            ->assertSessionHasErrors('ids');
    }

    public function test_role_index_applies_search_and_type_filters(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);
        Role::query()->create([
            'name' => 'regional_manager',
            'guard_name' => 'web',
            'display_name' => 'Regional manager',
            'description' => 'Coordinates regional work.',
            'is_system' => false,
        ]);

        $this->actingAs($owner)
            ->get(route('access.roles.index', ['search' => 'regional', 'type' => 'custom']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.search', 'regional')
                ->where('filters.type', 'custom')
                ->has('roles.data', 1)
                ->where('roles.data.0.name', 'regional_manager'));
    }

    public function test_role_index_accepts_an_allowlisted_sort(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);

        $this->actingAs($owner)
            ->get(route('access.roles.index', [
                'sort' => 'permissions_count',
                'direction' => 'desc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.sort', 'permissions_count')
                ->where('filters.direction', 'desc'));
    }

    public function test_access_tables_default_to_fifty_rows_and_accept_one_hundred(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);

        $this->actingAs($owner)
            ->get(route('access.roles.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.perPage', 50)
                ->where('roles.per_page', 50));

        $this->actingAs($owner)
            ->get(route('access.users.index', ['per_page' => 100]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.perPage', 100)
                ->where('users.per_page', 100));

        $this->actingAs($owner)
            ->get(route('access.audit.index', ['per_page' => 100]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.perPage', 100)
                ->where('events.per_page', 100));
    }

    public function test_access_table_page_size_falls_back_for_unrecognized_values(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);

        $this->actingAs($owner)
            ->get(route('access.roles.index', ['per_page' => 101]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.perPage', 50)
                ->where('roles.per_page', 50));
    }

    public function test_last_active_owner_cannot_be_suspended_or_reassigned(): void
    {
        $owner = User::factory()->withTwoFactor()->create();
        $owner->syncRoles(RoleName::Owner->value);
        $actor = User::factory()->create();

        $this->expectException(ValidationException::class);
        app(ChangeUserStatus::class)->suspend($owner, $actor);
    }

    public function test_suspended_users_cannot_authenticate(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['status' => UserStatus::Suspended])->save();

        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);

        $this->assertGuest();
    }

    public function test_invitation_can_be_accepted_once_with_a_role(): void
    {
        Notification::fake();
        $owner = User::factory()->withTwoFactor()->create();
        $owner->syncRoles(RoleName::Owner->value);
        $role = Role::query()->where('name', RoleName::Technician->value)->firstOrFail();

        $result = app(InviteUser::class)->execute('invite@example.com', $role, $owner);
        $invitation = $result['invitation'];

        $response = $this->post(route('invitation.store', ['token' => $result['token']]), [
            'name' => 'Invited User',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertRedirect(route('dashboard'));
        $user = User::query()->where('email', 'invite@example.com')->firstOrFail();
        $this->assertTrue($user->hasRole(RoleName::Technician->value));
        $this->assertSame(UserStatus::Active, $user->status);
        $this->assertNotNull($user->email_verified_at);
        $this->assertNotNull($invitation->fresh()->accepted_at);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'invitation.accepted', 'subject_id' => (string) $user->id]);

        $this->post(route('invitation.store', ['token' => $result['token']]), [
            'name' => 'Invited User',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertSessionHasErrors('token');
    }

    public function test_access_audit_events_are_immutable(): void
    {
        $event = AccessAuditEvent::query()->create(['event' => 'test', 'occurred_at' => now()]);

        $this->expectException(\LogicException::class);
        $event->update(['event' => 'changed']);
    }
}
