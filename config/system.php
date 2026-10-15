<?php

return [
    'defaults' => [
        'name' => env('APP_NAME', 'FieldOps'),
        'timezone' => env('APP_TIMEZONE', 'UTC'),
        'pagination_size' => 50,
        'theme' => 'canvas',
        'idle_timeout_seconds' => 900,
        'login_max_attempts' => 5,
        'login_decay_minutes' => 30,
    ],

    'pagination_options' => [25, 50, 75, 100],

    'themes' => [
        'canvas' => [
            'label' => 'Canvas',
            'description' => 'A calm inset workspace with familiar navigation and generous focus.',
            'traits' => ['Inset sidebar', 'Soft workspace', 'Balanced density'],
        ],
        'atlas' => [
            'label' => 'Atlas',
            'description' => 'An enterprise masthead and docked navigation for dense operational work.',
            'traits' => ['Full masthead', 'Docked navigation', 'Compact controls'],
        ],
        'rail' => [
            'label' => 'Rail',
            'description' => 'A compact icon rail that keeps the maximum width available for content.',
            'traits' => ['Icon navigation', 'Utility header', 'Wide canvas'],
        ],
        'navigator' => [
            'label' => 'Navigator',
            'description' => 'Global navigation and the active section stay visible in two focused columns.',
            'traits' => ['Global rail', 'Context panel', 'Clear hierarchy'],
        ],
        'horizon' => [
            'label' => 'Horizon',
            'description' => 'A two-level horizontal shell for teams that prefer an open workspace.',
            'traits' => ['Top navigation', 'No sidebar', 'Focused content'],
        ],
    ],

    'idle_activity_cookie' => 'fieldops_idle_activity',
];
