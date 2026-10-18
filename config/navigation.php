<?php

return [
    'custom_icon_keys' => [
        'activity',
        'map',
        'folder',
        'link',
        'building',
        'barChart',
        'clipboard',
        'briefcase',
    ],
    'groups' => [
        [
            'label' => 'Platform',
            'items' => [
                [
                    'key' => 'notifications',
                    'title' => 'Notifications',
                    'route' => 'notifications.index',
                    'permission' => null,
                    'iconKey' => 'bell',
                ],
                [
                    'key' => 'dashboard',
                    'title' => 'Dashboard',
                    'route' => 'dashboard',
                    'permission' => 'dashboard.view',
                    'iconKey' => 'layoutGrid',
                ],
            ],
        ],
        [
            'label' => 'Access',
            'items' => [
                [
                    'key' => 'users',
                    'title' => 'Users',
                    'route' => 'access.users.index',
                    'permission' => 'users.view',
                    'iconKey' => 'users',
                ],
                [
                    'key' => 'roles',
                    'title' => 'Roles',
                    'route' => 'access.roles.index',
                    'permission' => 'roles.view',
                    'iconKey' => 'shieldCheck',
                ],
                [
                    'key' => 'access_audit',
                    'title' => 'Access audit',
                    'route' => 'access.audit.index',
                    'permission' => 'audit.view',
                    'iconKey' => 'scrollText',
                ],
                [
                    'key' => 'blocked_ips',
                    'title' => 'Blocked IPs',
                    'route' => 'access.ip-blocks.index',
                    'permission' => 'ip_blocks.view',
                    'iconKey' => 'shieldCheck',
                ],
                [
                    'key' => 'visit_logs',
                    'title' => 'Visit logs',
                    'route' => 'access.visit-logs.index',
                    'permission' => 'visit_logs.view',
                    'iconKey' => 'scrollText',
                ],
            ],
        ],
        [
            'label' => 'System',
            'items' => [
                [
                    'key' => 'files',
                    'title' => 'Files',
                    'route' => 'files.index',
                    'permission' => 'files.view',
                    'iconKey' => 'files',
                ],
                [
                    'key' => 'countries',
                    'title' => 'Countries',
                    'route' => 'system.countries.index',
                    'permission' => 'countries.view',
                    'iconKey' => 'globe2',
                ],
                [
                    'key' => 'timezones',
                    'title' => 'Timezones',
                    'route' => 'system.timezones.index',
                    'permission' => 'timezones.view',
                    'iconKey' => 'clock3',
                ],
                [
                    'key' => 'system_settings',
                    'title' => 'System settings',
                    'route' => 'system-settings.edit',
                    'permission' => 'settings.view',
                    'iconKey' => 'settings2',
                ],
                [
                    'key' => 'backups',
                    'title' => 'Backup & Restore',
                    'route' => 'system-settings.backups.index',
                    'permission' => null,
                    'iconKey' => 'databaseBackup',
                    'superAdminOnly' => true,
                ],
            ],
        ],
    ],
];
