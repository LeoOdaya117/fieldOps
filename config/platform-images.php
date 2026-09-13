<?php

return [
    'slots' => [
        'brand_mark' => [
            'label' => 'Compact brand mark',
            'purpose' => 'Used in compact navigation, app icons, and small brand surfaces.',
            'recommended_aspect' => '1:1',
            'fallback_url' => '/favicon.svg',
        ],
        'brand_wordmark' => [
            'label' => 'Full wordmark',
            'purpose' => 'Used on light app, authentication, and landing surfaces.',
            'recommended_aspect' => '4:1',
            'fallback_url' => '/images/platform/brand-wordmark.svg',
        ],
        'brand_wordmark_on_dark' => [
            'label' => 'Wordmark for dark backgrounds',
            'purpose' => 'Used wherever the brand appears on a dark or saturated background.',
            'recommended_aspect' => '4:1',
            'fallback_url' => '/images/platform/brand-wordmark-dark.svg',
        ],
        'favicon' => [
            'label' => 'Favicon',
            'purpose' => 'Shown in browser tabs and saved shortcuts.',
            'recommended_aspect' => '1:1',
            'fallback_url' => '/favicon.svg',
        ],
        'image_placeholder' => [
            'label' => 'Default image placeholder',
            'purpose' => 'Used when a record does not have its own image.',
            'recommended_aspect' => '4:3',
            'fallback_url' => '/images/platform/default-image.svg',
        ],
    ],
];
