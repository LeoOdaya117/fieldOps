<?php

use App\Enums\PermissionKey;

return [
    [
        'key' => 'supervisor',
        'label' => 'Supervisor',
        'permissions' => ['dashboard.view', ...PermissionKey::operationalValues()],
    ],
    [
        'key' => 'dispatcher',
        'label' => 'Dispatcher',
        'permissions' => [
            'dashboard.view',
            'assets.view', 'work_orders.view', 'work_orders.create', 'work_orders.update',
            'work_orders.assign', 'inspections.view', 'issues.view',
            'operations_map.view', 'operations_dashboard.view',
        ],
    ],
    [
        'key' => 'technician',
        'label' => 'Technician',
        'permissions' => [
            'dashboard.view',
            'assets.view', 'work_orders.view', 'inspection_templates.view',
            'inspections.view', 'inspections.create', 'inspections.update', 'inspections.submit',
            'issues.view', 'issues.create', 'operations_map.view',
        ],
    ],
    [
        'key' => 'viewer',
        'label' => 'Viewer',
        'permissions' => [
            'dashboard.view',
            'assets.view', 'work_orders.view', 'inspection_templates.view', 'inspections.view',
            'issues.view', 'operations_map.view', 'operations_dashboard.view', 'operational_reports.view',
        ],
    ],
];
