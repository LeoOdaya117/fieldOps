<?php

namespace Tests\Feature\Access;

use App\Enums\RegistrationStatus;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRegistration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\Fluent\AssertableJson as Assert;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_a_user_with_profile_access_and_a_photo(): void
    {
        Storage::fake('public');
        $admin = $this->admin();
        $role = Role::query()->where('name', RoleName::Supervisor->value)->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.users.store'), [
                'name' => 'Field Supervisor',
                'email' => 'supervisor@example.com',
                'position' => 'Field supervisor',
                'department' => 'Operations',
                'photo' => UploadedFile::fake()->image('supervisor.png'),
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
                'role_id' => $role->id,
                'blocked' => '0',
            ])
            ->assertRedirect(route('access.users.index'));

        $user = User::query()->where('email', 'supervisor@example.com')->firstOrFail();

        $this->assertSame('Field supervisor', $user->position);
        $this->assertSame('Operations', $user->department);
        $this->assertSame(UserStatus::Active, $user->status);
        $this->assertTrue($user->hasRole(RoleName::Supervisor->value));
        $this->assertTrue(Hash::check('new-password', $user->password));
        $this->assertNotNull($user->email_verified_at);
        $this->assertNotNull($user->avatar_path);
        Storage::disk('public')->assertExists($user->avatar_path);
        $this->assertDatabaseHas('access_audit_events', [
            'event' => 'user.created',
            'subject_id' => (string) $user->id,
        ]);
    }

    public function test_admin_cannot_create_a_user_with_a_role_beyond_their_authority(): void
    {
        $admin = $this->admin();
        $ownerRole = Role::query()->where('name', RoleName::Owner->value)->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('access.users.create'))
            ->post(route('access.users.store'), [
                'name' => 'Unauthorized Owner',
                'email' => 'unauthorized-owner@example.com',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
                'role_id' => $ownerRole->id,
                'blocked' => '0',
            ])
            ->assertRedirect(route('access.users.create'))
            ->assertSessionHasErrors('role_id');

        $this->assertDatabaseMissing('users', [
            'email' => 'unauthorized-owner@example.com',
        ]);
    }

    public function test_admin_can_edit_profile_role_blocked_status_and_password(): void
    {
        $admin = $this->admin();
        $target = User::factory()->create();
        $role = Role::query()->where('name', RoleName::Supervisor->value)->firstOrFail();

        DB::table('sessions')->insert([
            'id' => 'target-session',
            'user_id' => $target->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test',
            'payload' => 'payload',
            'last_activity' => now()->timestamp,
        ]);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.users.update', $target), [
                'name' => 'Updated User',
                'email' => $target->email,
                'position' => 'Supervisor',
                'department' => 'Operations',
                'password' => 'changed-password',
                'password_confirmation' => 'changed-password',
                'role_id' => $role->id,
                'blocked' => '1',
            ])
            ->assertRedirect(route('access.users.index'));

        $target = $target->fresh();

        $this->assertSame('Updated User', $target->name);
        $this->assertSame('Supervisor', $target->position);
        $this->assertSame('Operations', $target->department);
        $this->assertSame(UserStatus::Suspended, $target->status);
        $this->assertTrue($target->hasRole(RoleName::Supervisor->value));
        $this->assertTrue(Hash::check('changed-password', $target->password));
        $this->assertDatabaseMissing('sessions', ['id' => 'target-session']);
        $this->assertDatabaseHas('access_audit_events', [
            'event' => 'user.password_changed',
            'subject_id' => (string) $target->id,
        ]);
    }

    public function test_admin_can_soft_delete_a_user_and_invalidate_their_sessions(): void
    {
        $admin = $this->admin();
        $target = User::factory()->create();

        DB::table('sessions')->insert([
            'id' => 'deleted-user-session',
            'user_id' => $target->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test',
            'payload' => 'payload',
            'last_activity' => now()->timestamp,
        ]);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->delete(route('access.users.destroy', $target))
            ->assertRedirect(route('access.users.index'));

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'record_status' => 0,
        ]);
        $this->assertNull(User::query()->whereKey($target->id)->first());
        $this->assertTrue(User::withTrashed()->whereKey($target->id)->firstOrFail()->trashed());
        $this->assertDatabaseMissing('sessions', ['id' => 'deleted-user-session']);
        $this->assertDatabaseHas('access_audit_events', [
            'event' => 'user.deleted',
            'subject_id' => (string) $target->id,
        ]);
    }

    public function test_admin_can_replace_and_remove_a_user_photo(): void
    {
        Storage::fake('public');
        $admin = $this->admin();
        $target = User::factory()->create();
        $role = Role::query()->where('name', RoleName::Technician->value)->firstOrFail();
        $oldPath = UploadedFile::fake()->image('old.png')->store("users/{$target->id}", 'public');
        $target->forceFill(['avatar_path' => $oldPath])->save();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.users.update', $target), [
                'name' => $target->name,
                'email' => $target->email,
                'role_id' => $role->id,
                'blocked' => '0',
                'photo' => UploadedFile::fake()->image('new.webp'),
                'remove_photo' => '0',
            ])
            ->assertRedirect(route('access.users.index'));

        $target = $target->fresh();
        $newPath = $target->avatar_path;

        $this->assertNotNull($newPath);
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($newPath);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.users.update', $target), [
                'name' => $target->name,
                'email' => $target->email,
                'role_id' => $role->id,
                'blocked' => '0',
                'remove_photo' => '1',
            ])
            ->assertRedirect(route('access.users.index'));

        $this->assertNull($target->fresh()->avatar_path);
        Storage::disk('public')->assertMissing($newPath);
    }

    public function test_basic_users_cannot_open_or_submit_admin_user_edit_flows(): void
    {
        $basic = User::factory()->create();
        $basic->syncRoles(RoleName::User->value);
        $target = User::factory()->create();

        $this->actingAs($basic)
            ->get(route('access.users.edit', $target))
            ->assertForbidden();

        $this->actingAs($basic)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.users.store'), [])
            ->assertForbidden();
    }

    public function test_admin_cannot_edit_their_own_account_from_user_management(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->get(route('access.users.edit', $admin))
            ->assertForbidden();
    }

    public function test_registration_is_queued_and_admin_can_approve_it_with_a_role(): void
    {
        $this->post(route('register.store'), [
            'name' => 'Pending Applicant',
            'email' => 'pending@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect(route('register'));

        $this->assertGuest();
        $registration = UserRegistration::query()->where('email', 'pending@example.com')->firstOrFail();
        $admin = $this->admin();
        $role = Role::query()->where('name', RoleName::Technician->value)->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.users.registrations.approve', $registration), [
                'role_id' => $role->id,
            ])
            ->assertRedirect(route('access.users.index'));

        $user = User::query()->where('email', 'pending@example.com')->firstOrFail();

        $this->assertSame(UserStatus::Active, $user->status);
        $this->assertTrue($user->hasRole(RoleName::Technician->value));
        $this->assertSame(RegistrationStatus::Approved, $registration->fresh()->status);
        $this->assertTrue(Hash::check('password', $user->password));
    }

    public function test_admin_can_reject_a_pending_registration_without_creating_a_user(): void
    {
        $registration = UserRegistration::query()->create([
            'name' => 'Rejected Applicant',
            'email' => 'rejected@example.com',
            'password' => Hash::make('password'),
        ]);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.users.registrations.reject', $registration))
            ->assertRedirect(route('access.users.index'));

        $this->assertSame(RegistrationStatus::Rejected, $registration->fresh()->status);
        $this->assertDatabaseMissing('users', ['email' => 'rejected@example.com']);
        $this->assertDatabaseHas('access_audit_events', [
            'event' => 'registration.rejected',
            'subject_id' => (string) $registration->id,
        ]);

        auth()->logout();
        $this->post(route('login.store'), [
            'email' => 'rejected@example.com',
            'password' => 'password',
        ]);

        $this->assertGuest();
    }

    public function test_user_photo_upload_is_validated(): void
    {
        $admin = $this->admin();
        $role = Role::query()->where('name', RoleName::Technician->value)->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('access.users.create'))
            ->post(route('access.users.store'), [
                'name' => 'Invalid Photo',
                'email' => 'invalid-photo@example.com',
                'password' => 'password',
                'password_confirmation' => 'password',
                'role_id' => $role->id,
                'photo' => UploadedFile::fake()->create('document.pdf', 10, 'application/pdf'),
            ])
            ->assertRedirect(route('access.users.create'))
            ->assertSessionHasErrors('photo');
    }

    public function test_admin_can_open_the_edit_page_with_existing_profile_data(): void
    {
        $admin = $this->admin();
        $target = User::factory()->create([
            'position' => 'Technician',
            'department' => 'Field services',
        ]);

        $this->actingAs($admin)
            ->get(route('access.users.edit', $target))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('access/user-edit')
                ->where('user.name', $target->name)
                ->where('user.position', 'Technician')
                ->where('user.department', 'Field services')
                ->has('roles'));
    }

    private function admin(): User
    {
        $admin = User::factory()->withTwoFactor()->create();
        $admin->syncRoles(RoleName::Administrator->value);

        return $admin;
    }
}
