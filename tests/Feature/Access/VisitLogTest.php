<?php

namespace Tests\Feature\Access;

use App\Enums\RoleName;
use App\Models\BlockedIpAddress;
use App\Models\User;
use App\Models\VisitLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Testing\Fluent\AssertableJson as Assert;
use Tests\TestCase;

class VisitLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_user_can_view_visit_logs_and_filter_by_ip_and_outcome(): void
    {
        $owner = $this->owner();
        $user = User::factory()->create();
        VisitLog::query()->create([
            'user_id' => $user->id,
            'event_type' => 'page_visit',
            'outcome' => 'success',
            'ip_address' => '198.51.100.30',
            'method' => 'GET',
            'path' => '/dashboard',
            'status_code' => 200,
            'occurred_at' => now(),
        ]);
        VisitLog::query()->create([
            'event_type' => 'blocked_request',
            'outcome' => 'blocked_ip',
            'ip_address' => '198.51.100.31',
            'method' => 'GET',
            'path' => '/login',
            'status_code' => 403,
            'occurred_at' => now(),
        ]);

        $this->actingAs($owner)
            ->get(route('access.visit-logs.index', ['ip' => '198.51.100.31', 'outcome' => 'blocked_ip']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.ip', '198.51.100.31')
                ->where('filters.outcome', 'blocked_ip')
                ->has('logs.data', 1)
                ->where('logs.data.0.ipAddress', '198.51.100.31')
                ->where('logs.data.0.statusCode', 403));
    }

    public function test_users_without_visit_log_permission_are_denied(): void
    {
        $user = User::factory()->create();
        $user->syncRoles(RoleName::Technician->value);

        $this->actingAs($user)->get(route('access.visit-logs.index'))->assertForbidden();
    }

    public function test_authorized_user_can_view_visit_log_details(): void
    {
        $owner = $this->owner();
        $log = VisitLog::query()->create([
            'event_type' => 'page_visit',
            'outcome' => 'success',
            'ip_address' => '198.51.100.35',
            'method' => 'GET',
            'path' => '/dashboard',
            'status_code' => 200,
            'occurred_at' => now(),
        ]);

        $this->actingAs($owner)
            ->get(route('access.visit-logs.show', $log))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('access/visit-log-show')
                ->where('log.ipAddress', '198.51.100.35')
                ->where('log.path', '/dashboard'));
    }

    public function test_failed_and_successful_authentication_and_logout_are_logged(): void
    {
        $user = User::factory()->create();

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.40'])
            ->post(route('login.store'), ['email' => $user->email, 'password' => 'wrong-password']);
        $this->assertDatabaseHas('visit_logs', [
            'event_type' => 'authentication',
            'outcome' => 'failed',
            'ip_address' => '198.51.100.40',
        ]);

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.40'])
            ->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);
        $this->assertDatabaseHas('visit_logs', [
            'event_type' => 'authentication',
            'outcome' => 'success',
            'user_id' => $user->id,
        ]);

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.40'])
            ->post(route('logout'));
        $this->assertDatabaseHas('visit_logs', [
            'event_type' => 'logout',
            'outcome' => 'success',
            'user_id' => $user->id,
        ]);
    }

    public function test_login_addresses_are_remembered_once_and_last_seen_is_updated(): void
    {
        $user = User::factory()->create();

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.42'])
            ->post(route('login.store'), ['email' => $user->email, 'password' => 'wrong-password']);
        $firstSeenAt = BlockedIpAddress::query()->where('ip_address', '198.51.100.42')->value('first_seen_at');
        $lastSeenAt = BlockedIpAddress::query()->where('ip_address', '198.51.100.42')->value('last_seen_at');

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.42'])
            ->post(route('login.store'), ['email' => $user->email, 'password' => 'wrong-password']);

        $this->assertSame(1, BlockedIpAddress::query()->where('ip_address', '198.51.100.42')->count());
        $this->assertDatabaseHas('blocked_ip_addresses', [
            'ip_address' => '198.51.100.42',
            'user_id' => $user->id,
            'is_active' => 0,
        ]);
        $this->assertNotNull($firstSeenAt);
        $this->assertNotNull($lastSeenAt);
        $this->assertNotNull(BlockedIpAddress::query()->where('ip_address', '198.51.100.42')->value('last_seen_at'));
    }

    public function test_suspended_account_login_is_logged_as_blocked_without_authenticating(): void
    {
        $user = User::factory()->create(['status' => 'suspended']);

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.41'])
            ->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);

        $this->assertGuest();
        $this->assertDatabaseHas('visit_logs', [
            'event_type' => 'authentication',
            'outcome' => 'blocked_account',
            'user_id' => $user->id,
            'ip_address' => '198.51.100.41',
        ]);
    }

    public function test_visit_log_pruning_uses_configured_retention(): void
    {
        VisitLog::query()->create([
            'event_type' => 'page_visit',
            'outcome' => 'success',
            'ip_address' => '192.0.2.30',
            'method' => 'GET',
            'path' => '/',
            'occurred_at' => Carbon::now()->subDays(91),
        ]);
        VisitLog::query()->create([
            'event_type' => 'page_visit',
            'outcome' => 'success',
            'ip_address' => '192.0.2.31',
            'method' => 'GET',
            'path' => '/',
            'occurred_at' => Carbon::now()->subDays(89),
        ]);

        $this->artisan('visits:prune')->assertSuccessful();

        $this->assertDatabaseMissing('visit_logs', ['ip_address' => '192.0.2.30']);
        $this->assertDatabaseHas('visit_logs', ['ip_address' => '192.0.2.31']);
    }

    private function owner(): User
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);

        return $owner;
    }
}
