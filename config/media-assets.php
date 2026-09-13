<?php

return [
    'disk' => env('MEDIA_ASSET_DISK', 'local'),
    'max_file_size_kilobytes' => 5 * 1024,
    'max_dimension_pixels' => 8192,
    'thumbnail_size_pixels' => 480,
    'per_user_max_assets' => 100,
    'per_user_max_bytes' => 250 * 1024 * 1024,
    'page_size' => 24,
    'uploads_per_minute' => 12,
];
