<?php

namespace Tests\Feature\Auth;

use App\Http\Middleware\EnforceIdleSession;
use App\Models\User;
use App\Support\IdleSessionActivity;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class IdleSessionTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_heartbeat_refreshes_an_encrypted_http_only_activity_cookie(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson(route('session.activity'));

        $response->assertNoContent()->assertCookie(IdleSessionActivity::cookieName());
        $cookie = $response->getCookie(IdleSessionActivity::cookieName());
        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', strtolower((string) $cookie->getSameSite()));
    }

    public function test_activity_cookie_is_bound_to_the_authenticated_session(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();
        $cookie = $this->actingAs($first)
            ->postJson(route('session.activity'))
            ->getCookie(IdleSessionActivity::cookieName());

        $this->assertNotNull($cookie);

        $this->actingAs($second)
            ->withCookie(IdleSessionActivity::cookieName(), $cookie->getValue())
            ->getJson(route('media-assets.index'))
            ->assertOk();
    }

    public function test_request_at_the_idle_limit_invalidates_the_session_and_requires_fresh_login(): void
    {
        config()->set('system.idle_timeout_seconds', 900);
        CarbonImmutable::setTestNow('2026-09-05 09:00:00');
        $user = User::factory()->create();
        $this->actingAs($user)->withSession(['idle-test' => true]);
        $session = $this->app['session']->driver();
        $activity = implode('|', [
            $user->id,
            hash('sha256', $session->getId()),
            CarbonImmutable::now()->getTimestamp(),
        ]);

        CarbonImmutable::setTestNow('2026-09-05 09:15:00');
        $request = Request::create('/media-assets', 'GET', cookies: [
            IdleSessionActivity::cookieName() => $activity,
        ], server: ['HTTP_ACCEPT' => 'application/json']);
        $request->setLaravelSession($session);
        $request->setUserResolver(static fn () => $user);
        $response = app(EnforceIdleSession::class)->handle($request, static fn () => response()->noContent());

        $this->assertSame(401, $response->getStatusCode());
        $this->assertStringContainsString('session expired', (string) $response->getContent());

        $this->assertGuest();
    }

    public function test_remembered_login_without_bound_activity_is_forced_to_fresh_credentials(): void
    {
        $user = User::factory()->create();
        $session = $this->app['session']->driver();
        $session->start();
        $request = Request::create('/media-assets', 'GET', server: ['HTTP_ACCEPT' => 'application/json']);
        $request->setLaravelSession($session);
        $request->setUserResolver(static fn () => $user);

        Auth::shouldReceive('check')->once()->andReturnTrue();
        Auth::shouldReceive('viaRemember')->once()->andReturnTrue();
        Auth::shouldReceive('logout')->once();

        $response = app(EnforceIdleSession::class)->handle($request, static fn () => response()->noContent());

        $this->assertSame(401, $response->getStatusCode());
        $this->assertStringContainsString('session expired', (string) $response->getContent());
    }
}
