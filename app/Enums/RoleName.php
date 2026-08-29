<?php

namespace App\Enums;

enum RoleName: string
{
    case User = 'user';
    case Admin = 'admin';
    case SuperAdmin = 'super_admin';
    case Owner = 'owner';
    case Administrator = 'administrator';
    case Dispatcher = 'dispatcher';
    case Supervisor = 'supervisor';
    case Technician = 'technician';
    case Auditor = 'auditor';

    /**
     * @return list<string>
     */
    public static function ownerRoleNames(): array
    {
        return [self::Owner->value, self::SuperAdmin->value];
    }
}
