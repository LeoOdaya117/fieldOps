import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const usePageMock = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        prefetch,
        ...props
    }: {
        href: string | { url: string };
        children?: ReactNode;
        prefetch?: boolean;
    }) => {
        void prefetch;

        return (
            <a href={typeof href === 'string' ? href : href.url} {...props}>
                {children}
            </a>
        );
    },
    usePage: usePageMock,
}));

vi.mock('@/components/app-logo', () => ({
    default: () => <span>FieldOps</span>,
}));

vi.mock('@/components/nav-user', () => ({
    NavUser: () => null,
}));

vi.mock('@/components/nav-main', () => ({
    NavMain: ({
        items,
    }: {
        items: { title: string; href: string | { url: string } }[];
    }) => (
        <nav>
            {items.map((item) => (
                <a
                    key={item.title}
                    href={
                        typeof item.href === 'string'
                            ? item.href
                            : item.href.url
                    }
                >
                    {item.title}
                </a>
            ))}
        </nav>
    ),
}));

vi.mock('@/components/ui/sidebar', () => {
    const Container = ({ children }: { children?: ReactNode }) => (
        <div>{children}</div>
    );

    return {
        Sidebar: Container,
        SidebarContent: Container,
        SidebarFooter: Container,
        SidebarHeader: Container,
        SidebarMenu: Container,
        SidebarMenuButton: Container,
        SidebarMenuItem: Container,
    };
});

import { AppSidebar } from '@/components/app-sidebar';

describe('app sidebar navigation', () => {
    beforeEach(() => {
        usePageMock.mockReset();
    });

    it('renders the server-provided destinations without rebuilding permission rules', () => {
        usePageMock.mockReturnValue({
            url: '/access/users',
            props: {
                name: 'FieldOps',
                auth: {
                    user: { name: 'Admin' },
                    authorization: {
                        permissions: [],
                        isSuperAdmin: false,
                    },
                    navigation: [
                        {
                            label: 'System',
                            items: [
                                {
                                    key: 'system_settings',
                                    title: 'System settings',
                                    href: '/settings/system',
                                    iconKey: 'settings2',
                                },
                            ],
                        },
                    ],
                },
            },
        });

        render(<AppSidebar />);

        expect(
            screen.getByRole('link', { name: 'System settings' }),
        ).toHaveAttribute('href', '/settings/system');
        expect(
            screen.queryByRole('link', { name: 'FieldOps' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Repository')).not.toBeInTheDocument();
        expect(screen.queryByText('Documentation')).not.toBeInTheDocument();
    });

    it('does not expose destinations omitted by the server', () => {
        usePageMock.mockReturnValue({
            url: '/settings/profile',
            props: {
                name: 'FieldOps',
                auth: {
                    user: { name: 'User' },
                    authorization: {
                        permissions: ['users.view', 'settings.view'],
                        isSuperAdmin: false,
                    },
                    navigation: [
                        {
                            label: 'Platform',
                            items: [
                                {
                                    key: 'dashboard',
                                    title: 'Dashboard',
                                    href: '/dashboard',
                                    iconKey: 'layoutGrid',
                                },
                            ],
                        },
                    ],
                },
            },
        });

        render(<AppSidebar />);

        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
            'href',
            '/dashboard',
        );
        expect(screen.getByRole('link', { name: 'FieldOps' })).toHaveAttribute(
            'href',
            '/dashboard',
        );
        expect(
            screen.queryByRole('link', { name: 'Users' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'System settings' }),
        ).not.toBeInTheDocument();
    });

    it('keeps cross-group order when the server repeats a group segment', () => {
        usePageMock.mockReturnValue({
            url: '/dashboard',
            props: {
                name: 'FieldOps',
                auth: {
                    user: { name: 'Operator' },
                    authorization: { permissions: [], isSuperAdmin: false },
                    navigation: [
                        {
                            label: 'Platform',
                            items: [
                                {
                                    key: 'dashboard',
                                    title: 'Dashboard',
                                    href: '/dashboard',
                                    iconKey: 'layoutGrid',
                                },
                            ],
                        },
                        {
                            label: 'Access',
                            items: [
                                {
                                    key: 'users',
                                    title: 'Users',
                                    href: '/access/users',
                                    iconKey: 'users',
                                },
                            ],
                        },
                        {
                            label: 'Platform',
                            items: [
                                {
                                    key: 'notifications',
                                    title: 'Notifications',
                                    href: '/notifications',
                                    iconKey: 'bell',
                                },
                            ],
                        },
                    ],
                },
            },
        });

        render(<AppSidebar />);

        const navigationTitles = screen
            .getAllByRole('navigation')
            .flatMap((navigation) =>
                within(navigation)
                    .getAllByRole('link')
                    .map((link) => link.textContent),
            );

        expect(navigationTitles).toEqual([
            'Dashboard',
            'Users',
            'Notifications',
        ]);
    });

    it('shows security navigation to users with the matching permissions', () => {
        usePageMock.mockReturnValue({
            url: '/access/ip-blocks',
            props: {
                name: 'FieldOps',
                auth: {
                    user: { name: 'Security admin' },
                    authorization: {
                        permissions: ['ip_blocks.view', 'visit_logs.view'],
                        isSuperAdmin: false,
                    },
                    navigation: [
                        {
                            label: 'Access',
                            items: [
                                {
                                    key: 'blocked_ips',
                                    title: 'Blocked IPs',
                                    href: '/access/ip-blocks',
                                    iconKey: 'shieldCheck',
                                },
                                {
                                    key: 'visit_logs',
                                    title: 'Visit logs',
                                    href: '/access/visit-logs',
                                    iconKey: 'scrollText',
                                },
                            ],
                        },
                    ],
                },
            },
        });

        render(<AppSidebar />);

        expect(
            screen.getByRole('link', { name: 'Blocked IPs' }),
        ).toHaveAttribute('href', '/access/ip-blocks');
        expect(
            screen.getByRole('link', { name: 'Visit logs' }),
        ).toHaveAttribute('href', '/access/visit-logs');
    });

    it('shows country and timezone navigation to users with catalog permissions', () => {
        usePageMock.mockReturnValue({
            url: '/system/countries',
            props: {
                name: 'FieldOps',
                auth: {
                    user: { name: 'Administrator' },
                    authorization: {
                        permissions: ['countries.view', 'timezones.view'],
                        isSuperAdmin: false,
                    },
                    navigation: [
                        {
                            label: 'System',
                            items: [
                                {
                                    key: 'countries',
                                    title: 'Countries',
                                    href: '/system/countries',
                                    iconKey: 'globe2',
                                },
                                {
                                    key: 'timezones',
                                    title: 'Timezones',
                                    href: '/system/timezones',
                                    iconKey: 'clock3',
                                },
                            ],
                        },
                    ],
                },
            },
        });

        render(<AppSidebar />);

        expect(screen.getByRole('link', { name: 'Countries' })).toHaveAttribute(
            'href',
            '/system/countries',
        );
        expect(screen.getByRole('link', { name: 'Timezones' })).toHaveAttribute(
            'href',
            '/system/timezones',
        );
    });
});
