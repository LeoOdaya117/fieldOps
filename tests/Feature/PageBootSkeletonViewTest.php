<?php

namespace Tests\Feature;

use Tests\TestCase;

class PageBootSkeletonViewTest extends TestCase
{
    public function test_page_components_use_the_matching_boot_skeleton_family(): void
    {
        $components = [
            'welcome' => 'landing',
            'dashboard' => 'dashboard',
            'auth/login' => 'auth',
            'access/users' => 'list',
            'access/user-show' => 'detail',
            'access/user-create' => 'form',
            'settings/profile' => 'settings',
            'future/new-page' => 'generic',
        ];

        foreach ($components as $component => $family) {
            $html = view('components.page-boot-skeleton', [
                'component' => $component,
            ])->render();

            $this->assertStringContainsString(
                "data-page-loading-family=\"{$family}\"",
                $html,
            );
            $contentRegionStart = strpos(
                $html,
                'data-page-loading-content',
            );
            $this->assertNotFalse($contentRegionStart);

            $contentRegionEnd = strpos($html, '>', $contentRegionStart);
            $contentRegionTagStart = strrpos(
                substr($html, 0, $contentRegionStart),
                '<div',
            );
            $contentRegion = substr(
                $html,
                $contentRegionTagStart,
                $contentRegionEnd - $contentRegionTagStart + 1,
            );
            $this->assertStringContainsString(
                'p-4 sm:p-6 lg:p-8',
                $contentRegion,
            );
            $this->assertStringContainsString('aria-busy="true"', $html);

            if (! in_array($family, ['landing', 'auth'], true)) {
                $this->assertTrue(
                    strpos($html, '<header') < strpos($html, 'data-page-loading-content'),
                    "The {$family} content padding must follow the boot shell header.",
                );
            }
        }
    }
}
