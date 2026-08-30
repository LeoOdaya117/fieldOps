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
            'event_type' => 'login',
            'outcome' => 'success',
            'ip_address' => '198.51.100.30',
            'method' => 'POST',
            'path' => '/login',
            'status_code' => 302,
            'occurred_at' => now(),
        ]);
        VisitLog::query()->create([
            'event_type' => 'logout',
            'outcome' => 'success',
            'ip_address' => '198.51.100.31',
            'method' => 'POST',
            'path' => '/logout',
            'status_code' => 302,
            'occurred_at' => now(),
        ]);
        VisitLog::query()->create([
            'event_type' => 'page_visit',
            'outcome' => 'success',
            'ip_address' => '198.51.100.31',
            'method' => 'GET',
            'path' => '/dashboard',
            'status_code' => 200,
            'occurred_at' => now(),
        ]);

        $this->actingAs($owner)
            ->get(route('access.visit-logs.index', ['ip' => '198.51.100.31', 'outcome' => 'success']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.ip', '198.51.100.31')
                ->where('filters.outcome', 'success')
                ->has('logs.data', 1)
                ->where('logs.data.0.ipAddress', '198.51.100.31')
                ->where('logs.data.0.statusCode', 302));
    }

    public function test_authorized_user_can_filter_visit_logs_by_location(): void
    {
        $owner = $this->owner();
        VisitLog::query()->create([
            'event_type' => 'login',
            'outcome' => 'success',
            'ip_address' => '8.8.8.8',
            'location_source' => 'browser',
            'location_country_code' => 'US',
            'location_region' => 'California',
            'location_city' => 'Mountain View',
            'method' => 'POST',
            'path' => '/login',
            'status_code' => 302,
            'occurred_at' => now(),
        ]);

        $this->actingAs($owner)
            ->get(route('access.visit-logs.index', ['location' => 'Mountain']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.location', 'Mountain')
                ->has('logs.data', 1)
                ->where('logs.data.0.locationCity', 'Mountain View'));
    }

    public function test_refreshing_or_navigating_pages_does_not_create_visit_logs(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)
            ->withServerVariables(['REMOTE_ADDR' => '198.51.100.50'])
            ->get(route('dashboard'))
            ->assertOk();

        $this->actingAs($owner)
            ->withServerVariables(['REMOTE_ADDR' => '198.51.100.50'])
            ->get(route('dashboard'))
            ->assertOk();

        $this->assertDatabaseCount('visit_logs', 0);
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
            'event_type' => 'login',
            'outcome' => 'success',
            'ip_address' => '198.51.100.35',
            'method' => 'POST',
            'path' => '/login',
            'status_code' => 302,
            'occurred_at' => now(),
        ]);

        $this->actingAs($owner)
            ->get(route('access.visit-logs.show', $log))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('access/visit-log-show')
                ->where('log.ipAddress', '198.51.100.35')
                ->where('log.path', '/login'));
    }

    public function test_successful_login_and_logout_are_logged(): void
    {
        $user = User::factory()->create();

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.40'])
            ->post(route('login.store'), [
                'email' => $user->email,
                'password' => 'password',
                'location_latitude' => 14.5995,
                'location_longitude' => 120.9842,
                'location_accuracy_meters' => 25.4,
                'location_timezone' => 'Asia/Manila',
            ]);
        $this->assertDatabaseHas('visit_logs', [
            'event_type' => 'login',
            'outcome' => 'success',
            'user_id' => $user->id,
            'ip_address' => '198.51.100.40',
            'location_source' => 'browser',
            'location_latitude' => 14.5995,
            'location_longitude' => 120.9842,
            'location_accuracy_meters' => 25.4,
            'location_timezone' => 'Asia/Manila',
            'method' => 'POST',
            'path' => '/login',
        ]);

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.40'])
            ->post(route('logout'), [
                'location_latitude' => 14.5996,
                'location_longitude' => 120.9843,
                'location_accuracy_meters' => 30,
                'location_timezone' => 'Asia/Manila',
            ]);
        $this->assertDatabaseHas('visit_logs', [
            'event_type' => 'logout',
            'outcome' => 'success',
            'user_id' => $user->id,
            'ip_address' => '198.51.100.40',
            'location_source' => 'browser',
            'location_latitude' => 14.5996,
            'location_longitude' => 120.9843,
            'location_accuracy_meters' => 30,
            'location_timezone' => 'Asia/Manila',
            'method' => 'POST',
            'path' => '/logout',
        ]);
        $this->assertDatabaseCount('visit_logs', 2);
    }

    public function test_invalid_browser_location_is_not_stored(): void
    {
        $user = User::factory()->create();

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.44'])
            ->post(route('login.store'), [
                'email' => $user->email,
                'password' => 'password',
                'location_latitude' => 91,
                'location_longitude' => 181,
                'location_accuracy_meters' => -1,
                'location_timezone' => 'not-a-valid-location-value',
            ]);

        $this->assertDatabaseHas('visit_logs', [
            'event_type' => 'login',
            'ip_address' => '198.51.100.44',
        ]);
        $this->assertDatabaseMissing('visit_logs', [
            'location_source' => 'browser',
        ]);
    }

    public function test_failed_login_does_not_create_a_visit_log(): void
    {
        $user = User::factory()->create();

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.43'])
            ->post(route('login.store'), ['email' => $user->email, 'password' => 'wrong-password']);

        $this->assertGuest();
        $this->assertDatabaseCount('visit_logs', 0);
    }

    public function test_login_addresses_are_remembered_once_and_last_seen_is_updated(): void
    {
        $user = User::factory()->create();

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.42'])
            ->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);
        $firstSeenAt = BlockedIpAddress::query()->where('ip_address', '198.51.100.42')->value('first_seen_at');
        $lastSeenAt = BlockedIpAddress::query()->where('ip_address', '198.51.100.42')->value('last_seen_at');

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.42'])
            ->post(route('logout'));

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.42'])
            ->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);

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

    public function test_suspended_account_login_does_not_create_a_visit_log(): void
    {
        $user = User::factory()->create(['status' => 'suspended']);

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.41'])
            ->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);

        $this->assertGuest();
        $this->assertDatabaseCount('visit_logs', 0);
    }

    public function test_visit_log_pruning_uses_configured_retention(): void
    {
        VisitLog::query()->create([
            'event_type' => 'login',
            'outcome' => 'success',
            'ip_address' => '192.0.2.30',
            'method' => 'POST',
            'path' => '/login',
            'occurred_at' => Carbon::now()->subDays(91),
        ]);
        VisitLog::query()->create([
            'event_type' => 'logout',
            'outcome' => 'success',
            'ip_address' => '192.0.2.31',
            'method' => 'POST',
            'path' => '/logout',
            'occurred_at' => Carbon::now()->subDays(89),
        ]);

        $this->artisan('visits:prune')->assertSuccessful();

        $this->assertDatabaseMissing('visit_logs', ['ip_address' => '192.0.2.30']);
        $this->assertDatabaseHas('visit_logs', ['ip_address' => '192.0.2.31']);
    }

    public function test_browser_location_is_not_derived_from_the_ip_address(): void
    {
        $user = User::factory()->create();

        $this->withServerVariables(['REMOTE_ADDR' => '8.8.8.8'])
            ->post(route('login.store'), [
                'email' => $user->email,
                'password' => 'password',
            ]);

        $this->assertDatabaseHas('visit_logs', [
            'event_type' => 'login',
            'ip_address' => '8.8.8.8',
        ]);
        $this->assertDatabaseMissing('visit_logs', [
            'location_source' => 'browser',
        ]);
    }

    private function owner(): User
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);

        return $owner;
    }
}
