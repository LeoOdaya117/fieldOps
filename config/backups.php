<?php

return [
    'root' => env('BACKUP_ROOT', storage_path('app/backups')),
    'signing_key' => env('BACKUP_SIGNING_KEY', ''),
    'upload_max_bytes' => (int) env('BACKUP_UPLOAD_MAX_BYTES', 512 * 1024 * 1024),
    'expanded_max_bytes' => (int) env('BACKUP_EXPANDED_MAX_BYTES', 5 * 1024 * 1024 * 1024),
    'process_timeout' => (int) env('BACKUP_PROCESS_TIMEOUT', 3600),
    'drain_timeout' => (int) env('BACKUP_DRAIN_TIMEOUT', 60),
    'mysql_dump' => env('BACKUP_MYSQL_DUMP', 'mysqldump'),
    'mysql_client' => env('BACKUP_MYSQL_CLIENT', 'mysql'),
    'mariadb_dump' => env('BACKUP_MARIADB_DUMP', 'mariadb-dump'),
    'mariadb_client' => env('BACKUP_MARIADB_CLIENT', 'mariadb'),
];
