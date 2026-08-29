<?php

return [
    'defaults' => [
        'name' => env('APP_NAME', 'FieldOps'),
        'timezone' => env('APP_TIMEZONE', 'UTC'),
        'pagination_size' => 50,
    ],

    'pagination_options' => [25, 50, 75, 100],
];
