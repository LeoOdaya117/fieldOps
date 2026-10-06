import {
    Bell,
    Clock3,
    DatabaseBackup,
    Files,
    Globe2,
    LayoutGrid,
    ScrollText,
    Settings2,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { index as notificationsIndex } from '@/routes/notifications';
import { index as backupsIndex } from '@/routes/system-settings/backups';
import { toUrl } from '@/lib/utils';
import type { Auth, NavItem } from '@/types';

export type NavigationGroup = {
    label: string;
    items: NavItem[];
};

type NavigationDefinition = NavItem & {
    permission: string | null;
    superAdminOnly?: boolean;
};

const navigationDefinitions: Array<{
    label: string;
    items: NavigationDefinition[];
}> = [
    {
        label: 'Platform',
        items: [
            {
                title: 'Notifications',
                href: notificationsIndex().url,
                icon: Bell,
                permission: null,
            },
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
                title: 'Files',
                href: '/files',
                icon: Files,
                permission: 'files.view',
            },
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
                permission: 'settings.view',
            },
            {
                title: 'Backup & Restore',
                href: backupsIndex.url(),
                icon: DatabaseBackup,
                permission: null,
                superAdminOnly: true,
            },
        ],
    },
];

function normalizePathname(url: string): string | null {
    try {
        return (
            new URL(url, 'http://fieldops.local').pathname.replace(
                /\/+$/,
                '',
            ) || '/'
        );
    } catch {
        return null;
    }
}

export function getActiveNavigationItem(
    items: readonly NavItem[],
    currentUrl: string,
): NavItem | undefined {
    const currentPath = normalizePathname(currentUrl);

    if (!currentPath) {
        return undefined;
    }

    let activeItem: NavItem | undefined;
    let activePathLength = -1;

    for (const item of items) {
        const itemPath = normalizePathname(toUrl(item.href));

        if (!itemPath) {
            continue;
        }

        const matches =
            currentPath === itemPath ||
            (itemPath === '/'
                ? currentPath.startsWith('/')
                : currentPath.startsWith(`${itemPath}/`));

        if (matches && itemPath.length > activePathLength) {
            activeItem = item;
            activePathLength = itemPath.length;
        }
    }

    return activeItem;
}

export function getNavigationGroups(auth: Auth): NavigationGroup[] {
    const can = (permission: string) =>
        auth.authorization.isSuperAdmin ||
        auth.authorization.permissions.includes(permission);

    return navigationDefinitions
        .map((group) => ({
            label: group.label,
            items: group.items
                .filter(
                    (item) =>
                        (!item.superAdminOnly ||
                            auth.authorization.isSuperAdmin) &&
                        (item.permission === null || can(item.permission)),
                )
                .map((item): NavItem => ({
                    title: item.title,
                    href: item.href,
                    icon: item.icon,
                })),
        }))
        .filter((group) => group.items.length > 0);
}
