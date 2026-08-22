<?php

namespace Tests\Feature;

use Tests\TestCase;

class RemovedMarketingRoutesTest extends TestCase
{
    public function test_removed_marketing_pages_return_not_found(): void
    {
        foreach (['features', 'solutions', 'industries', 'pricing', 'resources', 'about'] as $slug) {
            $this->get("/{$slug}")->assertNotFound();
        }
    }
}
