import {
    Clock3,
    Globe2,
    LayoutGrid,
    ScrollText,
    Settings2,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { Auth, NavItem } from '@/types';

export type NavigationGroup = {
    label: string;
    items: NavItem[];
};

type NavigationDefinition = NavItem & {
    permission: string;
};

const navigationDefinitions: Array<{
    label: string;
    items: NavigationDefinition[];
}> = [
    {
        label: 'Platform',
        items: [
            {
                title: 'Dashboard',
                href: '/dashboard',
                icon: LayoutGrid,
                permission: 'dashboard.view',
            },
        ],
    },
    {
        label: 'Access',
        items: [
            {
                title: 'Users',
                href: '/access/users',
                icon: Users,
                permission: 'users.view',
            },
            {
                title: 'Roles',
                href: '/access/roles',
                icon: ShieldCheck,
                permission: 'roles.view',
            },
            {
                title: 'Access audit',
                href: '/access/audit',
                icon: ScrollText,
                permission: 'audit.view',
            },
            {
                title: 'Blocked IPs',
                href: '/access/ip-blocks',
                icon: ShieldCheck,
                permission: 'ip_blocks.view',
            },
            {
                title: 'Visit logs',
                href: '/access/visit-logs',
                icon: ScrollText,
                permission: 'visit_logs.view',
            },
        ],
    },
    {
        label: 'System',
        items: [
            {
                title: 'Countries',
                href: '/system/countries',
                icon: Globe2,
                permission: 'countries.view',
            },
            {
                title: 'Timezones',
                href: '/system/timezones',
                icon: Clock3,
                permission: 'timezones.view',
            },
            {
                title: 'System settings',
                href: '/settings/system',
                icon: Settings2,
                permission: 'settings.manage_system',
            },
        ],
    },
];

export function getNavigationGroups(auth: Auth): NavigationGroup[] {
    const can = (permission: string) =>
        auth.authorization.isOwner ||
        auth.authorization.permissions.includes(permission);

    return navigationDefinitions
        .map((group) => ({
            label: group.label,
            items: group.items
                .filter((item) => can(item.permission))
                .map((item): NavItem => ({
                    title: item.title,
                    href: item.href,
                    icon: item.icon,
                })),
        }))
        .filter((group) => group.items.length > 0);
}
