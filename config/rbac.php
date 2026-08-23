<?php

use App\Enums\PermissionKey;
use App\Enums\RoleName;

return [
    'permissions' => PermissionKey::values(),

    'default_account_password' => env('RBAC_DEFAULT_ACCOUNT_PASSWORD', 'password'),

    'default_accounts' => [
        [
            'name' => 'FieldOps User',
            'email' => 'user@example.com',
            'role' => RoleName::User->value,
        ],
        [
            'name' => 'FieldOps Admin',
            'email' => 'admin@example.com',
            'role' => RoleName::Admin->value,
        ],
        [
            'name' => 'FieldOps Super Admin',
            'email' => 'superadmin@example.com',
            'role' => RoleName::SuperAdmin->value,
        ],
    ],

    'roles' => [
        RoleName::User->value => [
            'display_name' => 'User',
            'description' => 'Basic access to the FieldOps dashboard.',
            'is_system' => true,
            'permissions' => [PermissionKey::DashboardView->value],
        ],
        RoleName::Admin->value => [
            'display_name' => 'Admin',
            'description' => 'Manage users, roles, invitations, and access history.',
            'is_system' => true,
            'permissions' => [
                PermissionKey::DashboardView->value,
                PermissionKey::UsersView->value,
                PermissionKey::UsersInvite->value,
                PermissionKey::UsersUpdate->value,
                PermissionKey::UsersSuspend->value,
                PermissionKey::RolesView->value,
                PermissionKey::RolesCreate->value,
                PermissionKey::RolesUpdate->value,
                PermissionKey::RolesDelete->value,
                PermissionKey::RolesAssign->value,
                PermissionKey::AuditView->value,
            ],
        ],
        RoleName::SuperAdmin->value => [
            'display_name' => 'Super Admin',
            'description' => 'Full enterprise access and ownership controls.',
            'is_system' => true,
            'permissions' => PermissionKey::values(),
        ],
        RoleName::Owner->value => [
            'display_name' => 'Owner',
            'description' => 'Full enterprise access and ownership controls.',
            'is_system' => true,
            'permissions' => [],
        ],
        RoleName::Administrator->value => [
            'display_name' => 'Administrator',
            'description' => 'Manage users, roles, invitations, and access history.',
            'is_system' => true,
            'permissions' => [
                PermissionKey::DashboardView->value,
                PermissionKey::UsersView->value,
                PermissionKey::UsersInvite->value,
                PermissionKey::UsersUpdate->value,
                PermissionKey::UsersSuspend->value,
                PermissionKey::RolesView->value,
                PermissionKey::RolesCreate->value,
                PermissionKey::RolesUpdate->value,
                PermissionKey::RolesDelete->value,
                PermissionKey::RolesAssign->value,
                PermissionKey::AuditView->value,
            ],
        ],
        RoleName::Dispatcher->value => [
            'display_name' => 'Dispatcher',
            'description' => 'Coordinate operational work and view the operating dashboard.',
            'is_system' => true,
            'permissions' => [PermissionKey::DashboardView->value],
        ],
        RoleName::Supervisor->value => [
            'display_name' => 'Supervisor',
            'description' => 'Supervise field work and view the operating dashboard.',
            'is_system' => true,
            'permissions' => [PermissionKey::DashboardView->value],
        ],
        RoleName::Technician->value => [
            'display_name' => 'Technician',
            'description' => 'Perform assigned field work and view the operating dashboard.',
            'is_system' => true,
            'permissions' => [PermissionKey::DashboardView->value],
        ],
        RoleName::Auditor->value => [
            'display_name' => 'Auditor',
            'description' => 'Read-only visibility into access configuration and history.',
            'is_system' => true,
            'permissions' => [PermissionKey::DashboardView->value, PermissionKey::AuditView->value, PermissionKey::UsersView->value, PermissionKey::RolesView->value],
        ],
    ],
];
