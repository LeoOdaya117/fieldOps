<?php

namespace App\Enums;

enum RoleName: string
{
    case User = 'user';
    case Admin = 'admin';
    case SuperAdmin = 'super_admin';

    /**
     * @return list<string>
     */
    public static function elevatedRoleNames(): array
    {
        return [self::SuperAdmin->value];
    }
}
