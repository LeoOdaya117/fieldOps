<?php

namespace Tests\Feature\Notifications;

use App\Actions\Backups\BackupStore;
use App\Actions\Backups\NotifyBackupOperationCreator;
use App\Actions\Rbac\AssignRoleToUser;
use App\Actions\Rbac\SubmitRegistration;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Http\Middleware\EnforceIdleSession;
use App\Models\Role;
use App\Models\User;
use App\Notifications\AccessNotification;
use App\Notifications\BackupNotification;
use App\Support\IdleSessionActivity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Testing\Fluent\AssertableJson;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_private_inbox_pagination_filters_and_curated_summary(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $other->notify(new AccessNotification('test', 'Private', 'Other recipient'));
        for ($i = 0; $i < 23; $i++) {
            $user->notify(new AccessNotification('test', 'Update '.$i, 'Safe body'));
        }
        $user->notifications()->firstOrFail()->markAsRead();
        $this->actingAs($user)->getJson(route('notifications.summary'))
            ->assertOk()->assertJsonPath('total', 23)->assertJsonPath('unread', 22)->assertJsonCount(5, 'items')
            ->assertDontSee('Other recipient')->assertDontSee('notifiable_id')->assertDontSee('password');
        $this->get(route('notifications.index'))->assertInertia(fn (AssertableJson $page) => $page
            ->component('notifications/index')->has('inbox.data', 20)->where('inbox.last_page', 2));
        $this->get(route('notifications.index', ['filter' => 'read']))->assertInertia(fn (AssertableJson $page) => $page->has('inbox.data', 1));
        $this->get(route('notifications.index', ['filter' => 'unread', 'page' => 2]))->assertInertia(fn (AssertableJson $page) => $page->has('inbox.data', 2));
        $this->getJson(route('notifications.index', ['filter' => 'invalid']))->assertUnprocessable();
        $this->getJson(route('notifications.index', ['page' => -1]))->assertUnprocessable();
    }

    public function test_summary_returns_the_five_newest_unread_notifications_even_when_newer_items_are_read(): void
    {
        $user = User::factory()->create();
        for ($i = 0; $i < 8; $i++) {
            $user->notify(new AccessNotification('test', 'Update '.$i, 'Safe body'));
        }

        $readIds = $user->notifications()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(5)
            ->pluck('id');
        $user->notifications()->whereIn('id', $readIds)->update(['read_at' => now()]);

        $response = $this->actingAs($user)->getJson(route('notifications.summary'))
            ->assertOk()
            ->assertJsonPath('total', 8)
            ->assertJsonPath('unread', 3)
            ->assertJsonCount(3, 'items');

        foreach ($response->json('items') as $item) {
            $this->assertNull($item['readAt']);
            $this->assertNotContains($item['id'], $readIds->all());
        }
    }

    public function test_read_mutations_are_idempotent_and_isolated_even_for_owners(): void
    {
        $user = User::factory()->create();
        $user->syncRoles(RoleName::SuperAdmin->value);
        $other = User::factory()->create();
        foreach ([$user, $other] as $recipient) {
            $recipient->notify(new AccessNotification('test', 'Update', 'Body'));
        }
        $own = $user->notifications()->firstOrFail();
        $foreign = $other->notifications()->firstOrFail();
        $this->actingAs($user)->patch(route('notifications.update', $foreign->id), ['read' => true])->assertNotFound();
        $this->patchJson(route('notifications.update', $own->id), ['read' => 'invalid'])->assertUnprocessable();
        $this->patch(route('notifications.update', $own->id), ['read' => true])->assertRedirect();
        $readAt = $own->fresh()->read_at;
        $this->travel(1)->minutes();
        $this->patch(route('notifications.update', $own->id), ['read' => true])->assertRedirect();
        $this->assertEquals($readAt, $own->fresh()->read_at);
        $this->patch(route('notifications.update', $own->id), ['read' => false])->assertRedirect();
        $this->assertNull($own->fresh()->read_at);
        $this->patch(route('notifications.read-all'))->assertRedirect();
        $this->assertNotNull($own->fresh()->read_at);
        $this->assertNull($foreign->fresh()->read_at);
    }

    public function test_endpoints_require_active_verified_authentication(): void
    {
        $this->getJson(route('notifications.summary'))->assertUnauthorized();
        $this->get(route('notifications.index'))->assertRedirect(route('login'));
        $this->actingAs(User::factory()->unverified()->create())->getJson(route('notifications.summary'))->assertForbidden();
        $this->actingAs(User::factory()->create(['status' => UserStatus::Suspended]))->getJson(route('notifications.summary'))->assertForbidden();
    }

    public function test_registration_notifies_only_eligible_reviewers_and_rechecks_links(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::SuperAdmin->value);
        $reviewer = User::factory()->create();
        $reviewer->givePermissionTo('users.review_registrations');
        $ordinary = User::factory()->create();
        $unverified = User::factory()->unverified()->create();
        $unverified->syncRoles(RoleName::SuperAdmin->value);
        $suspended = User::factory()->create(['status' => UserStatus::Suspended]);
        $suspended->syncRoles(RoleName::SuperAdmin->value);
        $registration = app(SubmitRegistration::class)->execute(['name' => 'Applicant', 'email' => 'applicant@example.com', 'password' => 'secret']);
        $this->assertSame(1, $owner->notifications()->count());
        $this->assertSame(1, $reviewer->notifications()->count());
        foreach ([$ordinary, $unverified, $suspended] as $excluded) {
            $this->assertSame(0, $excluded->notifications()->count());
        }
        $this->actingAs($reviewer)->getJson(route('notifications.summary'))
            ->assertJsonPath('items.0.actionUrl', route('access.users.registrations.show', $registration->id, false))->assertDontSee('secret');
        $reviewer->revokePermissionTo('users.review_registrations');
        $this->getJson(route('notifications.summary'))->assertJsonPath('items.0.actionUrl', null);
        $registration->delete();
        $this->actingAs($owner)->getJson(route('notifications.summary'))->assertJsonPath('items.0.actionUrl', null);
    }

    public function test_duplicate_submission_produces_no_extra_notification(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::SuperAdmin->value);
        $data = ['name' => 'Applicant', 'email' => 'applicant@example.com', 'password' => 'secret'];
        app(SubmitRegistration::class)->execute($data);
        try {
            app(SubmitRegistration::class)->execute($data);
            $this->fail('Duplicate registration accepted');
        } catch (ValidationException) {
            $this->assertSame(1, $owner->notifications()->count());
        }
    }

    public function test_backup_completion_notification_links_only_to_an_available_backup_for_its_super_admin_creator(): void
    {
        $root = storage_path('framework/testing/notification-backups-'.Str::uuid());
        config(['backups.root' => $root]);
        $user = User::factory()->create();
        $user->syncRoles(RoleName::SuperAdmin->value);
        $actor = ['id' => (string) $user->getKey(), 'name' => $user->name, 'source' => 'web'];
        $store = app(BackupStore::class);
        $path = $store->temporaryPath('fieldops');
        file_put_contents($path, 'signed-package');
        $backup = $store->publish($path, [
            'created_at' => now()->toIso8601String(), 'engine' => 'mysql', 'server_version' => '8.4.0',
            'created_by' => $actor,
        ]);
        $user->notify(new BackupNotification(
            'backup.ready', 'Database backup ready', 'Your backup is ready.', (string) $backup['id'], (string) Str::uuid(),
        ));

        try {
            $this->actingAs($user)->getJson(route('notifications.summary'))
                ->assertJsonPath('items.0.actionUrl', route('system-settings.backups.show', $backup['id'], false));

            $user->syncRoles(RoleName::User->value);
            $user->refresh();
            $this->getJson(route('notifications.summary'))->assertJsonPath('items.0.actionUrl', null);

            $user->syncRoles(RoleName::SuperAdmin->value);
            $user->refresh();
            $store->delete((string) $backup['id']);
            $this->getJson(route('notifications.summary'))->assertJsonPath('items.0.actionUrl', null);
        } finally {
            File::deleteDirectory($root);
        }
    }

    public function test_notification_inbox_recovers_a_missing_backup_completion_notice_once_for_its_creator(): void
    {
        $root = storage_path('framework/testing/notification-recovery-'.Str::uuid());
        config(['backups.root' => $root]);
        $creator = User::factory()->create();
        $creator->syncRoles(RoleName::SuperAdmin->value);
        $actor = ['id' => (string) $creator->getKey(), 'name' => $creator->name, 'source' => 'web'];
        $store = app(BackupStore::class);
        $package = $store->temporaryPath('fieldops');
        file_put_contents($package, 'signed-package');
        $backup = $store->publish($package, [
            'created_at' => now()->toIso8601String(), 'engine' => 'mysql', 'server_version' => '8.4.0',
            'created_by' => $actor,
        ]);
        $operation = $store->queue('backup', null, false, ['actor' => $actor]);
        $operation['status'] = 'succeeded';
        $operation['backup_id'] = $backup['id'];
        $operation['finished_at'] = now()->toIso8601String();
        $store->saveOperation($operation);

        try {
            $this->actingAs($creator)->getJson(route('notifications.summary'))
                ->assertOk()
                ->assertJsonPath('total', 1)
                ->assertJsonPath('unread', 1)
                ->assertJsonPath('items.0.type', 'backup.ready')
                ->assertJsonPath('items.0.actionUrl', route('system-settings.backups.show', $backup['id'], false));
            app(NotifyBackupOperationCreator::class)->notifyOperation($operation);
            $this->getJson(route('notifications.summary'))->assertJsonPath('total', 1)->assertJsonPath('unread', 1);
            $this->assertSame(1, $creator->notifications()->count());
        } finally {
            File::deleteDirectory($root);
        }
    }

    public function test_empty_inbox_and_out_of_range_filtered_page_are_useful(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->getJson(route('notifications.summary'))->assertExactJson(['total' => 0, 'unread' => 0, 'items' => []]);
        $this->get(route('notifications.index', ['filter' => 'unread', 'page' => 2]))
            ->assertRedirect(route('notifications.index', ['filter' => 'unread', 'page' => 1]));
        $this->patch(route('notifications.read-all'))->assertRedirect();
        $this->get(route('notifications.index'))->assertInertia(fn (AssertableJson $page) => $page->has('inbox.data', 0));
    }

    public function test_user_editing_delivers_the_same_role_notification(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::SuperAdmin->value);
        $user = User::factory()->create();
        $role = Role::query()->where('name', RoleName::Admin->value)->firstOrFail();
        $this->actingAs($owner)->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.users.update', $user), ['name' => $user->name, 'email' => $user->email, 'role_id' => $role->id, 'blocked' => false])
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame(1, $user->notifications()->count());
        $this->assertSame('user.role_changed', $user->notifications()->firstOrFail()->data['event']);
    }

    public function test_background_summary_does_not_renew_idle_activity(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->withSession(['notification-idle-test' => true]);
        $session = $this->app['session']->driver();
        $activity = implode('|', [$user->id, hash('sha256', $session->getId()), now()->getTimestamp() - 60]);
        $request = Request::create('/notifications/summary', 'GET', cookies: [IdleSessionActivity::cookieName() => $activity], server: ['HTTP_ACCEPT' => 'application/json']);
        $request->setLaravelSession($session);
        $request->setUserResolver(static fn () => $user);
        $response = app(EnforceIdleSession::class)->handle($request, static fn () => response()->noContent());
        $this->assertSame(204, $response->getStatusCode());
        $this->assertFalse(cookie()->hasQueued(IdleSessionActivity::cookieName()));
    }

    public function test_role_changes_notify_once_and_rollback_with_the_business_transaction(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::SuperAdmin->value);
        $user = User::factory()->create();
        $role = Role::query()->where('name', RoleName::Admin->value)->firstOrFail();
        app(AssignRoleToUser::class)->execute($user, $role, $owner);
        app(AssignRoleToUser::class)->execute($user, $role, $owner);
        $this->assertSame(1, $user->notifications()->count());
        $this->assertStringContainsString($role->display_name, $user->notifications()->firstOrFail()->data['body']);
        DB::beginTransaction();
        app(SubmitRegistration::class)->execute(['name' => 'Rollback', 'email' => 'rollback@example.com', 'password' => 'secret']);
        app(AssignRoleToUser::class)->execute($user, Role::query()->where('name', RoleName::User->value)->firstOrFail(), $owner);
        DB::rollBack();
        $this->assertSame(1, $user->notifications()->count());
        $this->assertSame(0, $owner->notifications()->count());
        $user->roles()->detach();
        app(AssignRoleToUser::class)->execute($user, $role, $owner);
        $this->assertSame(1, $user->notifications()->count());
    }
}
