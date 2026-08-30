<?php

namespace App\Enums;

enum PermissionKey: string
{
    case DashboardView = 'dashboard.view';
    case UsersView = 'users.view';
    case UsersCreate = 'users.create';
    case UsersInvite = 'users.invite';
    case UsersUpdate = 'users.update';
    case UsersDelete = 'users.delete';
    case UsersSuspend = 'users.suspend';
    case UsersReviewRegistrations = 'users.review_registrations';
    case RolesView = 'roles.view';
    case RolesCreate = 'roles.create';
    case RolesUpdate = 'roles.update';
    case RolesDelete = 'roles.delete';
    case RolesAssign = 'roles.assign';
    case AuditView = 'audit.view';
    case IpBlocksView = 'ip_blocks.view';
    case IpBlocksManage = 'ip_blocks.manage';
    case VisitLogsView = 'visit_logs.view';
    case SettingsManageSystem = 'settings.manage_system';
    case CountriesView = 'countries.view';
    case CountriesManage = 'countries.manage';
    case TimezonesView = 'timezones.view';
    case TimezonesManage = 'timezones.manage';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $permission): string => $permission->value, self::cases());
    }
}
