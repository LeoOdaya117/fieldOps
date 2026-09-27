<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageBootSkeletonTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_home_page_includes_an_accessible_landing_boot_skeleton(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertSee('data-page-loading-family="landing"', false)
            ->assertSee('role="status"', false)
            ->assertSee('aria-busy="true"', false)
            ->assertSeeInOrder([
                '<div id="app"></div>',
                '<div id="page-loading-fallback"',
            ], false);
    }

    public function test_dashboard_page_includes_the_dashboard_boot_skeleton(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertOk()
            ->assertSee('data-page-loading-family="dashboard"', false);
    }
}
