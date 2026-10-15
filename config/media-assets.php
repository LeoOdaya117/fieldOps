<?php

return [
    'disk' => env('MEDIA_ASSET_DISK', 'local'),
    'max_file_size_kilobytes' => 100 * 1024,
    'gallery_max_file_size_kilobytes' => 5 * 1024,
    'allowed_modules' => ['files', 'gallery', 'avatars'],
    'upload_modules' => ['files', 'gallery'],
    'allowed_mime_types' => [
        'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
        'text/plain', 'text/csv', 'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    'preview_max_bytes' => 1024 * 1024,
    'preview_max_xml_bytes' => 1024 * 1024,
    'preview_max_xml_nodes' => 10000,
    'preview_max_rows' => 50,
    'preview_max_columns' => 20,
    'max_dimension_pixels' => 8192,
    'max_image_pixels' => 12000000,
    'thumbnail_size_pixels' => 480,
    'per_user_max_assets' => 100,
    'per_user_max_bytes' => 250 * 1024 * 1024,
    'per_user_files_max_assets' => 200,
    'per_user_files_max_bytes' => 1024 * 1024 * 1024,
    'page_size' => 24,
    'uploads_per_minute' => 12,
    'previews_per_minute' => 30,
];
