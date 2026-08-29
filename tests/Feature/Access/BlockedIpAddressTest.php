<?php

namespace Tests\Feature\Access;

use App\Enums\RoleName;
use App\Models\AccessAuditEvent;
use App\Models\BlockedIpAddress;
use App\Models\User;
use App\Models\VisitLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\Fluent\AssertableJson as Assert;
use Tests\TestCase;

class BlockedIpAddressTest extends TestCase
{
    use RefreshDatabase;

    public function test_allowed_ip_can_visit_a_page_and_the_visit_is_logged(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.10'])
            ->get(route('home'))
            ->assertOk();

        $this->assertDatabaseHas('visit_logs', [
            'event_type' => 'page_visit',
            'outcome' => 'success',
            'ip_address' => '198.51.100.10',
            'path' => '/',
        ]);
    }

    public function test_blocked_ip_is_rejected_before_public_and_authentication_routes(): void
    {
        BlockedIpAddress::query()->create([
            'ip_address' => '198.51.100.10',
            'is_active' => true,
            'blocked_at' => now(),
        ]);

        foreach ([
            route('home'),
            route('login'),
            route('register'),
            route('invitation.accept', ['token' => 'test-token']),
            route('dashboard'),
        ] as $url) {
            $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.10'])
                ->get($url)
                ->assertForbidden()
                ->assertSee('Access denied.');
        }

        $this->assertSame(5, VisitLog::query()->where('event_type', 'blocked_request')->count());
        $this->assertSame(5, VisitLog::query()->where('outcome', 'blocked_ip')->count());
    }

    public function test_blocked_ip_login_attempt_is_rejected_and_logged(): void
    {
        BlockedIpAddress::query()->create([
            'ip_address' => '198.51.100.11',
            'is_active' => true,
            'blocked_at' => now(),
        ]);

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.11'])
            ->post(route('login.store'), ['email' => 'user@example.com', 'password' => 'password'])
            ->assertForbidden();

        $this->assertDatabaseHas('visit_logs', [
            'event_type' => 'blocked_request',
            'outcome' => 'blocked_ip',
            'ip_address' => '198.51.100.11',
            'path' => '/login',
            'status_code' => 403,
        ]);
    }

    public function test_ip_addresses_are_normalized_and_neighboring_addresses_are_not_blocked(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->withServerVariables(['REMOTE_ADDR' => '2001:0db8:0:0:0:0:0:1'])
            ->post(route('access.ip-blocks.store'), [
                'ip_address' => '2001:0db8:0:0:0:0:0:1',
                'reason' => 'Test IPv6 rule',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('blocked_ip_addresses', [
            'ip_address' => '2001:db8::1',
            'is_active' => 1,
        ]);

        $this->withServerVariables(['REMOTE_ADDR' => '2001:db8::2'])
            ->get(route('home'))
            ->assertOk();

        $this->withServerVariables(['REMOTE_ADDR' => '2001:db8::1'])
            ->get(route('home'))
            ->assertForbidden();
    }

    public function test_owner_can_create_deactivate_and_reactivate_an_ip_block_with_audit_events(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.ip-blocks.store'), [
                'ip_address' => '203.0.113.20',
                'reason' => 'Repeated abuse',
            ])
            ->assertRedirect();

        $rule = BlockedIpAddress::query()->where('ip_address', '203.0.113.20')->firstOrFail();
        $this->assertTrue($rule->is_active);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'ip_block.created', 'subject_id' => (string) $rule->id]);

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.ip-blocks.update', $rule), ['reason' => 'Updated abuse report'])
            ->assertRedirect(route('access.ip-blocks.edit', $rule));
        $this->assertSame('Updated abuse report', $rule->fresh()->reason);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'ip_block.updated', 'subject_id' => (string) $rule->id]);

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.ip-blocks.deactivate', $rule))
            ->assertRedirect();
        $this->assertFalse($rule->fresh()->is_active);

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.ip-blocks.activate', $rule))
            ->assertRedirect();
        $this->assertTrue($rule->fresh()->is_active);

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->delete(route('access.ip-blocks.destroy', $rule))
            ->assertRedirect(route('access.ip-blocks.index'));
        $this->assertDatabaseHas('blocked_ip_addresses', [
            'id' => $rule->id,
            'record_status' => 0,
        ]);
        $this->assertNull(BlockedIpAddress::query()->whereKey($rule->id)->first());
        $this->assertTrue(BlockedIpAddress::withTrashed()->whereKey($rule->id)->firstOrFail()->trashed());

        $this->assertSame(1, AccessAuditEvent::query()->where('event', 'ip_block.created')->count());
        $this->assertSame(1, AccessAuditEvent::query()->where('event', 'ip_block.deactivated')->count());
        $this->assertSame(1, AccessAuditEvent::query()->where('event', 'ip_block.activated')->count());
        $this->assertSame(1, AccessAuditEvent::query()->where('event', 'ip_block.deleted')->count());
    }

    public function test_authorized_user_can_view_ip_block_details(): void
    {
        $owner = $this->owner();
        $observedUser = User::factory()->create();
        $rule = BlockedIpAddress::query()->create([
            'ip_address' => '203.0.113.25',
            'user_id' => $observedUser->id,
            'is_active' => true,
            'blocked_at' => now(),
            'reason' => 'Repeated abuse',
        ]);

        $this->actingAs($owner)
            ->get(route('access.ip-blocks.show', $rule))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('access/ip-block-show')
                ->where('blockedIpAddress.ipAddress', '203.0.113.25')
                ->where('blockedIpAddress.user.id', $observedUser->id)
                ->where('blockedIpAddress.user.name', $observedUser->name));
    }

    public function test_ip_block_mutations_require_permission_password_confirmation_and_valid_input(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('access.ip-blocks.index'))
            ->assertForbidden();

        $owner = $this->owner();
        $this->actingAs($owner)
            ->post(route('access.ip-blocks.store'), ['ip_address' => 'not-an-ip'])
            ->assertRedirect(route('password.confirm'));

        $this->actingAs($owner)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('access.ip-blocks.index'))
            ->post(route('access.ip-blocks.store'), ['ip_address' => 'not-an-ip'])
            ->assertRedirect(route('access.ip-blocks.index'))
            ->assertSessionHasErrors('ip_address');
    }

    public function test_ip_block_index_filters_active_rules(): void
    {
        $owner = $this->owner();
        $observedUser = User::factory()->create();
        BlockedIpAddress::query()->create(['ip_address' => '192.0.2.10', 'user_id' => $observedUser->id, 'is_active' => true, 'blocked_at' => now(), 'reason' => 'Active']);
        BlockedIpAddress::query()->create(['ip_address' => '192.0.2.11', 'is_active' => false, 'blocked_at' => now(), 'reason' => 'Inactive']);

        $this->actingAs($owner)
            ->get(route('access.ip-blocks.index', ['status' => 'active']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.status', 'active')
                ->has('blockedIpAddresses.data', 1)
                ->where('blockedIpAddresses.data.0.ipAddress', '192.0.2.10')
                ->where('blockedIpAddresses.data.0.user.id', $observedUser->id)
                ->where('blockedIpAddresses.data.0.user.name', $observedUser->name));
    }

    private function owner(): User
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);

        return $owner;
    }
}
