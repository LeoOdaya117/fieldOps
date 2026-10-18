import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type NavigationIconKey =
    | 'bell'
    | 'layoutGrid'
    | 'users'
    | 'shieldCheck'
    | 'scrollText'
    | 'files'
    | 'globe2'
    | 'clock3'
    | 'settings2'
    | 'databaseBackup'
    | 'activity'
    | 'map'
    | 'folder'
    | 'link'
    | 'building'
    | 'barChart'
    | 'clipboard'
    | 'briefcase';

export type AuthNavigationItem = {
    key: string;
    title: string;
    href: string;
    iconKey: NavigationIconKey;
};

export type AuthNavigationGroup = {
    label: string;
    items: AuthNavigationItem[];
};

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    key?: string;
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    external?: boolean;
    isActive?: boolean;
};
