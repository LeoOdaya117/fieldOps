<?php

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MarketingPagesTest extends TestCase
{
    public function test_public_marketing_pages_render_their_inertia_components(): void
    {
        $pages = [
            'features' => 'marketing/features',
            'solutions' => 'marketing/solutions',
            'industries' => 'marketing/industries',
            'pricing' => 'marketing/pricing',
            'resources' => 'marketing/resources',
            'about' => 'marketing/about',
        ];

        foreach ($pages as $slug => $component) {
            $this->get(route("marketing.{$slug}"))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component($component)
                    ->has('auth'));
        }
    }
}
