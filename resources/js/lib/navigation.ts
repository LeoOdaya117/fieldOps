import {
    Activity,
    BarChart3,
    Briefcase,
    Building2,
    Bell,
    Clipboard,
    Clock3,
    DatabaseBackup,
    Files,
    Folder,
    Globe2,
    LayoutGrid,
    Link2,
    Map,
    ScrollText,
    Settings2,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toUrl } from '@/lib/utils';
import type {
    Auth,
    AuthNavigationGroup,
    NavigationIconKey,
    NavItem,
} from '@/types';

export type NavigationGroup = {
    label: string;
    items: NavItem[];
};

const navigationIcons: Record<NavigationIconKey, LucideIcon> = {
    bell: Bell,
    layoutGrid: LayoutGrid,
    users: Users,
    shieldCheck: ShieldCheck,
    scrollText: ScrollText,
    files: Files,
    globe2: Globe2,
    clock3: Clock3,
    settings2: Settings2,
    databaseBackup: DatabaseBackup,
    activity: Activity,
    map: Map,
    folder: Folder,
    link: Link2,
    building: Building2,
    barChart: BarChart3,
    clipboard: Clipboard,
    briefcase: Briefcase,
};

export function getNavigationIcon(iconKey: NavigationIconKey) {
    return navigationIcons[iconKey];
}

export function isExternalNavigationHref(href: string): boolean {
    return /^https:\/\//i.test(href);
}

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
        if (item.external || isExternalNavigationHref(String(item.href))) {
            continue;
        }

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
    return (auth.navigation ?? []).map((group: AuthNavigationGroup) => ({
        label: group.label,
        items: group.items.map((item) => ({
            key: item.key,
            title: item.title,
            href: item.href,
            icon: navigationIcons[item.iconKey],
            external: isExternalNavigationHref(item.href),
        })),
    }));
}

export function getNavigationItemByKey(
    groups: readonly NavigationGroup[],
    key: string,
): NavItem | undefined {
    return groups
        .flatMap((group) => group.items)
        .find((item) => item.key === key);
}
